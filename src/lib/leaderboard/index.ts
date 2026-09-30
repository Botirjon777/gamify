import "server-only";
import { features } from "@/config/features";
import type { Board } from "@/generated/prisma/enums";
import { PostgresLeaderboardStore } from "./postgres";

export type Period = "all-time" | "weekly";

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
}

export interface LeaderboardStore {
  top(query: LeaderboardQuery): Promise<LeaderboardEntry[]>;
  /** 1-based rank, or null if the user has no score for this board/period. */
  rankOf(userId: string, query: Omit<LeaderboardQuery, "limit">): Promise<number | null>;
}

let instance: LeaderboardStore | undefined;

export function getLeaderboardStore(): LeaderboardStore {
  if (!instance) {
    if (features.redis) throw new Error("RedisLeaderboardStore is not implemented yet (FEATURE_REDIS=true)");
    instance = new PostgresLeaderboardStore();
  }
  return instance;
}
