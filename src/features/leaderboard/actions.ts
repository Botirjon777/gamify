"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getLeaderboardStore, type LeaderboardEntry } from "@/lib/leaderboard";
import { LEADERBOARD_PAGE } from "./constants";

/** Next page of the leaderboard (infinite scroll). */
export async function loadLeaderboardPage(board: string, period: string, offset: number): Promise<LeaderboardEntry[]> {
  const { tenant } = await requireSession();
  const q = z
    .object({ board: z.enum(["XP", "IQ"]), period: z.enum(["all-time", "weekly"]), offset: z.number().int().min(0).max(100_000) })
    .parse({ board, period, offset });
  return getLeaderboardStore().top({ ...q, tenantId: tenant.id, limit: LEADERBOARD_PAGE });
}
