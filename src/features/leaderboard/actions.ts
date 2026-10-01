"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getLeaderboardStore, type LeaderboardEntry } from "@/lib/leaderboard";
import { currentSeason } from "@/features/events/service";
import { LEADERBOARD_PAGE } from "./constants";

/** Next page of the leaderboard (infinite scroll). */
export async function loadLeaderboardPage(board: string, period: string, offset: number): Promise<LeaderboardEntry[]> {
  const { tenant } = await requireSession();
  const q = z
    .object({ board: z.enum(["XP", "IQ"]), period: z.enum(["all-time", "weekly", "season"]), offset: z.number().int().min(0).max(100_000) })
    .parse({ board, period, offset });
  const seasonId = q.period === "season" ? (await currentSeason())?.id : undefined;
  return getLeaderboardStore().top({ ...q, tenantId: tenant.id, seasonId, limit: LEADERBOARD_PAGE });
}
