import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const LOG_DIR = process.env.CACHE_DIR ?? join(homedir(), '.cache', 'mcp-workers');
const LOG_FILE = join(LOG_DIR, 'usage.log');

export function estimateTokens(text) {
  return Math.ceil((text ?? '').length / 4);
}

export async function logUsage(entry) {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  } catch {
    // logging is best-effort — never block execution
  }
}
