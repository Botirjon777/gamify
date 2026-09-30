import "server-only";
import { features } from "@/config/features";
import { PostgresRateLimiter } from "./postgres";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiter {
  /** Count one hit for `key`; `ok` is false once `limit` hits happen within `windowSec`. */
  hit(key: string, limit: number, windowSec: number): Promise<RateLimitResult>;
}

let instance: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  if (!instance) {
    if (features.redis) throw new Error("RedisRateLimiter is not implemented yet (FEATURE_REDIS=true)");
    instance = new PostgresRateLimiter();
  }
  return instance;
}
