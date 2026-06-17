import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { WorkerPool } from './src/workers.js';
import { Cache } from './src/cache.js';
import { routeTask } from './src/router.js';

const server = new McpServer({
  name: 'minimax-workers',
  version: '1.0.0',
});

const pool = new WorkerPool();
const cache = new Cache();

// ─── Tool 1: summarize_file ───────────────────────────────────────────────────
server.tool(
  'summarize_file',
  'Reads a large file and returns a structured summary optimized for Opus to process efficiently.',
  {
    path: z.string().describe('Absolute path to the file'),
    focus: z.string().optional().describe('Specific aspect to focus the summary on (e.g. "authentication logic", "data models")'),
  },
  async ({ path, focus }) => {
    const cacheKey = `summary:${path}:${focus ?? 'general'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: `[CACHED]\n${cached}` }] };
    }

    let content;
    try {
      content = await readFile(path, 'utf-8');
    } catch (err) {
      return { content: [{ type: 'text', text: `Error reading file: ${err.message}` }] };
    }

    const focusInstruction = focus ? `Focus specifically on: ${focus}.` : '';
    const prompt = `You are a senior developer assistant. Summarize the following file so a lead architect can understand it quickly without reading every line. ${focusInstruction}

Return ONLY valid JSON with this structure:
{
  "overview": "one paragraph description of what this file does",
  "key_elements": ["list of important functions, classes, or patterns"],
  "dependencies": ["external libraries or modules used"],
  "state_managed": ["data or state this file manages"],
  "concerns": ["potential issues, TODOs, or things worth noting"],
  "line_count": 0
}

File (${path}):
\`\`\`
${content}
\`\`\``;

    const result = await pool.execute({ prompt, complexity: 'medium' });
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

    const prompt = parts.join('');
    const complexity = routeTask(task);
    const result = await pool.execute({ prompt, complexity });
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
    aggregate: z.boolean().optional().describe('If true, returns a single merged text. If false (default), returns JSON array with per-task results.'),
  },
  async ({ tasks, aggregate }) => {
    const results = await pool.swarm(tasks);

    if (aggregate) {
      const merged = results
        .map(r => `## [${r.id}]\n${r.success ? r.result : `ERROR: ${r.result}`}`)
        .join('\n\n---\n\n');
      return { content: [{ type: 'text', text: merged }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
