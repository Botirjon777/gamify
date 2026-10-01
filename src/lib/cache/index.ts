import "server-only";
import { features } from "@/config/features";
import { MemoryCache } from "./memory";

export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Drop every key starting with `prefix` (e.g. "catalog:" after a content change). */
  delPrefix(prefix: string): Promise<void>;
}

/**
 * One cache per process. Kept on globalThis because Next bundles server actions and pages as separate
 * module copies — a module-level variable would give an action (which invalidates) a different cache
 * than the pages (which read).
 */
const shared = globalThis as unknown as { __zkCache?: Cache; __zkInFlight?: Map<string, Promise<unknown>> };

export function getCache(): Cache {
  if (!shared.__zkCache) {
    if (features.redis) throw new Error("RedisCache is not implemented yet (FEATURE_REDIS=true)");
    shared.__zkCache = new MemoryCache();
  }
  return shared.__zkCache;
}

/** Computations in progress, so a burst of requests for a cold key runs the query once. */
const inFlight = (shared.__zkInFlight ??= new Map<string, Promise<unknown>>());

/**
 * Return the cached value or compute, store and return it.
 * Only for data that is the same for everyone who passes the same key — never put per-session data
 * in here unless the user id is part of the key. Values must be plain data (they're shared, don't mutate).
 */
export async function cached<T>(key: string, ttlSec: number, compute: () => Promise<T>): Promise<T> {
  const cache = getCache();
  const hit = await cache.get<T>(key);
  if (hit !== undefined) return hit;

  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const promise = compute()
    .then(async (value) => {
      await cache.set(key, value, ttlSec);
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export const invalidateCache = (prefix: string) => getCache().delPrefix(prefix);
