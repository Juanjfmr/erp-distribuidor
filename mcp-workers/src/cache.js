import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CACHE_DIR = process.env.CACHE_DIR ?? join(homedir(), '.cache', 'mcp-workers');
const CACHE_FILE = join(CACHE_DIR, 'cache.json');
const MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES ?? 500);
const SAVE_DEBOUNCE_MS = 1_000;

export class Cache {
  constructor() {
    this._store = new Map();
    this._saveTimer = null;
  }

  async load() {
    try {
      const raw = await readFile(CACHE_FILE, 'utf-8');
      const entries = JSON.parse(raw);
      const now = Date.now();
      let loaded = 0;
      for (const [key, entry] of Object.entries(entries)) {
        if (entry.expires > now) {
          this._store.set(key, entry);
          loaded++;
        }
      }
      console.error(`[cache] Loaded ${loaded} valid entries from disk`);
    } catch {
      // File doesn't exist or is corrupted — start fresh
    }
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this._store.delete(key);
      return null;
    }
    // LRU: re-insert to move to end of Map iteration order
    this._store.delete(key);
    this._store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds = 3600) {
    if (this._store.size >= MAX_ENTRIES && !this._store.has(key)) {
      // Evict least recently used (first entry in Map)
      this._store.delete(this._store.keys().next().value);
    }
    this._store.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1_000,
    });
    this._scheduleSave();
  }

  invalidate(key) {
    this._store.delete(key);
    this._scheduleSave();
  }

  clear() {
    this._store.clear();
    this._scheduleSave();
  }

  get size() {
    return this._store.size;
  }

  _scheduleSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._persistToDisk(), SAVE_DEBOUNCE_MS);
  }

  async _persistToDisk() {
    try {
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(this._store)));
    } catch (err) {
      console.error(`[cache] Failed to persist: ${err.message}`);
    }
  }
}
