import "server-only";
import { features } from "@/config/features";
import type { Board } from "@/generated/prisma/enums";
import { cached } from "@/lib/cache";
import { PostgresLeaderboardStore } from "./postgres";

export type Period = "all-time" | "weekly" | "season";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarSeed: string;
  avatarStyle: string;
  gender: "MALE" | "FEMALE" | null;
  value: number;
}

export interface LeaderboardQuery {
  board: Board;
  period: Period;
  tenantId: string;
  limit?: number;
  /** Rows to skip (infinite scroll). */
  offset?: number;
  /** period "season": which season (the caller resolves the current one). */
  seasonId?: string;
}

export interface LeaderboardStore {
  top(query: LeaderboardQuery): Promise<LeaderboardEntry[]>;
  /** 1-based rank, or null if the user has no score for this board/period. */
  rankOf(userId: string, query: Omit<LeaderboardQuery, "limit" | "offset">): Promise<number | null>;
}

let instance: LeaderboardStore | undefined;

export function getLeaderboardStore(): LeaderboardStore {
  if (!instance) {
    if (features.redis) throw new Error("RedisLeaderboardStore is not implemented yet (FEATURE_REDIS=true)");
    instance = new CachedLeaderboardStore(new PostgresLeaderboardStore());
  }
  return instance;
}

/**
 * Top lists are the same for everyone in a tenant and get read on every leaderboard view and scroll —
 * keep each page for a few seconds. Your own rank (rankOf) stays live.
 */
class CachedLeaderboardStore implements LeaderboardStore {
  constructor(private inner: LeaderboardStore) {}

  top(q: LeaderboardQuery) {
    const key = `lb:${q.tenantId}:${q.board}:${q.period}:${q.seasonId ?? ""}:${q.offset ?? 0}:${q.limit ?? 50}`;
    return cached(key, 20, () => this.inner.top(q));
  }

  rankOf(userId: string, q: Omit<LeaderboardQuery, "limit" | "offset">) {
    return this.inner.rankOf(userId, q);
  }
}
