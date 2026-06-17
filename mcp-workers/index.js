import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile, stat } from 'fs/promises';
import { WorkerPool } from './src/workers.js';
import { Cache } from './src/cache.js';
import { routeTask } from './src/router.js';

if (!process.env.MINIMAX_API_KEY) {
  console.error('[mcp-workers] MINIMAX_API_KEY is not set. Configure it in .env or in the env block of ~/.claude/settings.json.');
  process.exit(1);
}

const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES ?? 512_000);

const server = new McpServer({ name: 'minimax-workers', version: '1.3.0' });
const pool = new WorkerPool();
const cache = new Cache();

// Graceful shutdown: flush cache to disk before the process exits
async function onShutdown() {
  await cache.shutdown();
  process.exit(0);
}
process.on('SIGTERM', onShutdown);
process.on('SIGINT', onShutdown);

const SUMMARIZE_SYSTEM = 'You are a senior developer assistant. Summarize source files so a lead architect can understand them quickly without reading every line. Be concise and precise. Return ONLY valid JSON — no markdown fences, no explanation outside the JSON object.';

const EXECUTE_SYSTEM = 'You are an expert software developer. Execute the requested task precisely and return only the requested output — no explanation, no preamble, no apology, unless the task explicitly asks for commentary.';

const SUMMARIZE_SCHEMA = `{
  "overview": "one paragraph description of what this file does",
  "key_elements": ["important functions, classes, or patterns"],
  "dependencies": ["external libraries or modules used"],
  "state_managed": ["data or state this file owns"],
  "concerns": ["potential issues, TODOs, or surprises"],
  "line_count": 0
}`;

// ─── Tool 1: summarize_file ───────────────────────────────────────────────────
server.tool(
  'summarize_file',
  'Reads a large file and returns a structured JSON summary optimized for Opus to process efficiently.',
  {
    filePath: z.string().describe('Absolute path to the file'),
    focus: z.string().optional().describe('Specific aspect to focus on (e.g. "authentication logic", "data models")'),
  },
  async ({ filePath, focus }) => {
    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch (err) {
      return { content: [{ type: 'text', text: `Error accessing file: ${err.message}` }] };
    }

    if (fileStat.size > MAX_FILE_SIZE_BYTES) {
      return {
        content: [{
          type: 'text',
          text: `File too large (${Math.round(fileStat.size / 1024)}KB). Limit is ${Math.round(MAX_FILE_SIZE_BYTES / 1024)}KB. Read specific sections instead.`,
        }],
      };
    }

    const cacheKey = `summary:${filePath}:${focus ?? 'general'}:${fileStat.mtimeMs}`;
    const cached = cache.get(cacheKey);
    if (cached) return { content: [{ type: 'text', text: `[CACHED]\n${cached}` }] };

    let content;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch (err) {
      return { content: [{ type: 'text', text: `Error reading file: ${err.message}` }] };
    }

    const focusLine = focus ? `Focus specifically on: ${focus}.\n\n` : '';
    const prompt = `${focusLine}Return ONLY valid JSON matching this structure:\n${SUMMARIZE_SCHEMA}\n\nFile (${filePath}):\n\`\`\`\n${content}\n\`\`\``;

    const result = await pool.execute({ systemPrompt: SUMMARIZE_SYSTEM, prompt, complexity: 'medium', toolName: 'summarize_file' });
    cache.set(cacheKey, result, 3600);
    return { content: [{ type: 'text', text: result }] };
  }
);

// ─── Tool 2: execute_task ─────────────────────────────────────────────────────
server.tool(
  'execute_task',
  'Delegates a single heavy or repetitive task to a MiniMax worker. Use for code generation, refactoring, documentation, data transformation.',
  {
    task: z.string().describe('Clear description of the task to execute'),
    context: z.string().optional().describe('Relevant code or context the worker needs'),
    output_format: z.string().optional().describe('Expected output format (e.g. "TypeScript function", "JSON array", "markdown list")'),
  },
  async ({ task, context, output_format }) => {
    const parts = [task];
    if (context) parts.push(`\nContext:\n${context}`);
    if (output_format) parts.push(`\nReturn output as: ${output_format}`);

    const complexity = routeTask(task);
    const result = await pool.execute({ systemPrompt: EXECUTE_SYSTEM, prompt: parts.join(''), complexity, toolName: 'execute_task' });
    return { content: [{ type: 'text', text: result }] };
  }
);

// ─── Tool 3: swarm_execute ────────────────────────────────────────────────────
server.tool(
  'swarm_execute',
  'Executes multiple independent tasks in parallel using up to 40 concurrent MiniMax workers. Ideal for batch operations across many files or items.',
  {
    tasks: z.array(
      z.object({
        id: z.string().describe('Unique identifier for this task'),
        task: z.string().describe('Task description'),
        context: z.string().optional().describe('Context or code for this specific task'),
      })
    ).describe('Array of independent tasks to run in parallel'),
    aggregate: z.boolean().optional().describe('If true, returns merged text. If false (default), returns JSON array with per-task results.'),
  },
  async ({ tasks, aggregate }) => {
    const results = await pool.swarm(tasks, { systemPrompt: EXECUTE_SYSTEM });

    if (aggregate) {
      const merged = results
        .map(r => `## [${r.id}]\n${r.success ? r.result : `ERROR: ${r.result}`}`)
        .join('\n\n---\n\n');
      return { content: [{ type: 'text', text: merged }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

await cache.load();
const transport = new StdioServerTransport();
await server.connect(transport);
