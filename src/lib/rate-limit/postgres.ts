import "server-only";
import { db } from "@/lib/db";
import type { RateLimiter, RateLimitResult } from "./index";

/** Fixed-window counter in the RateLimitHit table. Old rows are cleaned up by a scheduled job. */
export class PostgresRateLimiter implements RateLimiter {
  async hit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
    const windowMs = windowSec * 1000;
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

    const row = await db.rateLimitHit.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart },
      update: { count: { increment: 1 } },
    });

    return {
      ok: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      resetAt: new Date(windowStart.getTime() + windowMs),
    };
  }
}
