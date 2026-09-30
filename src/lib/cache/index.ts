import "server-only";
import { features } from "@/config/features";
import { MemoryCache } from "./memory";

export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
}

let instance: Cache | undefined;

export function getCache(): Cache {
  if (!instance) {
    if (features.redis) throw new Error("RedisCache is not implemented yet (FEATURE_REDIS=true)");
    instance = new MemoryCache();
  }
  return instance;
}

/** Return the cached value or compute, store and return it. */
export async function cached<T>(key: string, ttlSec: number, compute: () => Promise<T>): Promise<T> {
  const cache = getCache();
  const hit = await cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await compute();
  await cache.set(key, value, ttlSec);
  return value;
}
