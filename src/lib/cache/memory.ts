import "server-only";
import type { Cache } from "./index";

/** Hard cap so a bug in a key can never eat the server's memory; oldest entries go first. */
const MAX_ENTRIES = 5000;

/** Per-process cache. Fine for a single server; switch to Redis when running several instances. */
export class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSec: number) {
    this.store.delete(key);
    if (this.store.size >= MAX_ENTRIES) this.store.delete(this.store.keys().next().value!);
    this.store.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async delPrefix(prefix: string) {
    for (const key of this.store.keys()) if (key.startsWith(prefix)) this.store.delete(key);
  }
}
