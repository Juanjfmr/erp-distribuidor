export class Cache {
  constructor() {
    this._store = new Map();
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 3600) {
    this._store.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1_000,
    });
  }

  invalidate(key) {
    this._store.delete(key);
  }

  clear() {
    this._store.clear();
  }

  get size() {
    return this._store.size;
  }
}
