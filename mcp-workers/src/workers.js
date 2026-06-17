const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io/v1';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL ?? 'MiniMax-M3';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

const MAX_RPM = Number(process.env.MAX_RPM ?? 190);
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT ?? 40);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS ?? 60_000);

// Only fall back to secondary provider on transient/server errors, not on client errors (4xx)
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export class WorkerPool {
  constructor() {
    this._requestCount = 0;
    this._windowStart = Date.now();
  }

  async _acquireSlot() {
    const now = Date.now();
    const elapsed = now - this._windowStart;

    if (elapsed >= 60_000) {
      this._requestCount = 0;
      this._windowStart = now;
    }

    if (this._requestCount >= MAX_RPM) {
      const wait = 60_000 - elapsed;
      await new Promise(r => setTimeout(r, wait + 100));
      this._requestCount = 0;
      this._windowStart = Date.now();
    }

    this._requestCount++;
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
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
    // Network errors have no status; server/rate-limit errors are retryable
    return !err.status || RETRYABLE_STATUS.has(err.status);
  }

  async execute({ prompt, systemPrompt, complexity }) {
    await this._acquireSlot();

    try {
      return await this._callAPI({
        systemPrompt,
        userPrompt: prompt,
        baseUrl: MINIMAX_BASE_URL,
        model: MINIMAX_MODEL,
        apiKey: process.env.MINIMAX_API_KEY,
      });
    } catch (primaryErr) {
      if (!process.env.DEEPSEEK_API_KEY || !this._shouldFallback(primaryErr)) throw primaryErr;

      console.error(`[workers] MiniMax failed (${primaryErr.message}), falling back to DeepSeek`);
      return await this._callAPI({
        systemPrompt,
        userPrompt: prompt,
        baseUrl: DEEPSEEK_BASE_URL,
        model: DEEPSEEK_MODEL,
        apiKey: process.env.DEEPSEEK_API_KEY,
      });
    }
  }

  async swarm(tasks) {
    const results = [];

    for (let i = 0; i < tasks.length; i += MAX_CONCURRENT) {
      const chunk = tasks.slice(i, i + MAX_CONCURRENT);

      const chunkResults = await Promise.all(
        chunk.map(async (task) => {
          const prompt = task.context
            ? `${task.task}\n\nContext:\n${task.context}`
            : task.task;
          try {
            const result = await this.execute({ prompt });
            return { id: task.id, result, success: true };
          } catch (err) {
            return { id: task.id, result: err.message, success: false };
          }
        })
      );

      results.push(...chunkResults);
    }

    return results;
  }
}
