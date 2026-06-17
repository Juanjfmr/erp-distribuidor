const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io/v1';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL ?? 'MiniMax-M3';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

const MAX_RPM = Number(process.env.MAX_RPM ?? 190); // keep 10 RPM margin below the 200 limit
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT ?? 40);

export class WorkerPool {
  constructor() {
    this._requestCount = 0;
    this._windowStart = Date.now();
    this._queue = [];
    this._activeWorkers = 0;
  }

  // Token-bucket rate limiter — waits if we'd exceed MAX_RPM
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

  async _callAPI({ prompt, baseUrl, model, apiKey }) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async execute({ prompt }) {
    await this._acquireSlot();

    // Try MiniMax — fallback to DeepSeek if configured
    try {
      return await this._callAPI({
        prompt,
        baseUrl: MINIMAX_BASE_URL,
        model: MINIMAX_MODEL,
        apiKey: process.env.MINIMAX_API_KEY,
      });
    } catch (primaryErr) {
      if (!process.env.DEEPSEEK_API_KEY) throw primaryErr;

      console.error(`[workers] MiniMax failed, falling back to DeepSeek: ${primaryErr.message}`);
      return await this._callAPI({
        prompt,
        baseUrl: DEEPSEEK_BASE_URL,
        model: DEEPSEEK_MODEL,
        apiKey: process.env.DEEPSEEK_API_KEY,
      });
    }
  }

  // Fan-out: respects MAX_CONCURRENT, processes in chunks
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
