import { logUsage, estimateTokens } from './logger.js';

const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io/v1';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL ?? 'MiniMax-M3';
const MINIMAX_MODEL_SIMPLE = process.env.MINIMAX_MODEL_SIMPLE;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

const MAX_RPM = Number(process.env.MAX_RPM ?? 190);
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT ?? 40);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS ?? 60_000);

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

class Semaphore {
  constructor(limit) {
    this._limit = limit;
    this._active = 0;
    this._queue = [];
  }

  async acquire() {
    if (this._active < this._limit) { this._active++; return; }
    await new Promise(resolve => this._queue.push(resolve));
    this._active++;
  }

  release() {
    this._active--;
    const next = this._queue.shift();
    if (next) next();
  }
}

export class WorkerPool {
  constructor() {
    this._timestamps = []; // sliding window: array of request timestamps
    this._semaphore = new Semaphore(MAX_CONCURRENT);
  }

  // Sliding window rate limiter: no burst at window boundaries
  async _acquireSlot() {
    for (;;) {
      const now = Date.now();
      while (this._timestamps.length > 0 && now - this._timestamps[0] >= 60_000) {
        this._timestamps.shift();
      }
      if (this._timestamps.length < MAX_RPM) {
        this._timestamps.push(now);
        return;
      }
      // Wait exactly until the oldest request exits the 60s window
      const wait = 60_000 - (now - this._timestamps[0]) + 10;
      await new Promise(r => setTimeout(r, wait));
    }
  }

  _selectModel(complexity) {
    if (complexity === 'simple' && MINIMAX_MODEL_SIMPLE) return MINIMAX_MODEL_SIMPLE;
    return MINIMAX_MODEL;
  }

  async _callAPI({ systemPrompt, userPrompt, baseUrl, model, apiKey }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });

    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 4096 }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`);
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`API ${response.status}: ${body.slice(0, 200)}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  _shouldFallback(err) {
    return !err.status || RETRYABLE_STATUS.has(err.status);
  }

  async execute({ prompt, systemPrompt, complexity = 'medium', toolName = 'execute' }) {
    await this._acquireSlot();

    const model = this._selectModel(complexity);
    const startMs = Date.now();
    const promptTokens = estimateTokens((systemPrompt ?? '') + prompt);

    try {
      const result = await this._callAPI({
        systemPrompt, userPrompt: prompt,
        baseUrl: MINIMAX_BASE_URL, model, apiKey: process.env.MINIMAX_API_KEY,
      });
      logUsage({ tool: toolName, model, tokens: promptTokens, success: true, latencyMs: Date.now() - startMs });
      return result;
    } catch (primaryErr) {
      if (!process.env.DEEPSEEK_API_KEY || !this._shouldFallback(primaryErr)) {
        logUsage({ tool: toolName, model, tokens: promptTokens, success: false, latencyMs: Date.now() - startMs, error: primaryErr.message });
        throw primaryErr;
      }
      console.error(`[workers] MiniMax failed (${primaryErr.message}), falling back to DeepSeek`);
      try {
        const result = await this._callAPI({
          systemPrompt, userPrompt: prompt,
          baseUrl: DEEPSEEK_BASE_URL, model: DEEPSEEK_MODEL, apiKey: process.env.DEEPSEEK_API_KEY,
        });
        logUsage({ tool: toolName, model: DEEPSEEK_MODEL, tokens: promptTokens, success: true, latencyMs: Date.now() - startMs, fallback: true });
        return result;
      } catch (fallbackErr) {
        logUsage({ tool: toolName, model: DEEPSEEK_MODEL, tokens: promptTokens, success: false, latencyMs: Date.now() - startMs, error: fallbackErr.message });
        throw fallbackErr;
      }
    }
  }

  async swarm(tasks, { systemPrompt, toolName = 'swarm_execute' } = {}) {
    return Promise.all(
      tasks.map(async (task) => {
        await this._semaphore.acquire();
        try {
          const prompt = task.context ? `${task.task}\n\nContext:\n${task.context}` : task.task;
          const result = await this.execute({ prompt, systemPrompt, toolName });
          return { id: task.id, result, success: true };
        } catch (err) {
          return { id: task.id, result: err.message, success: false };
        } finally {
          this._semaphore.release();
        }
      })
    );
  }
}
