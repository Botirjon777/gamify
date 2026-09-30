import "server-only";
import { db } from "@/lib/db";
import { tashkentWeekStart } from "@/lib/time";
import { iqFromRating } from "@/features/iq/rating";
import type { LeaderboardEntry, LeaderboardQuery, LeaderboardStore } from "./index";

const userSelect = { id: true, username: true, avatarSeed: true } as const;

/**
 * All-time boards read the cached columns on User (indexed); weekly boards read WeeklyScore.
 * Both are scoped to members of the tenant.
 */
export class PostgresLeaderboardStore implements LeaderboardStore {
  async top({ board, period, tenantId, limit = 50 }: LeaderboardQuery): Promise<LeaderboardEntry[]> {
    if (period === "weekly") {
      const rows = await db.weeklyScore.findMany({
        where: { tenantId, board, week: tashkentWeekStart() },
        orderBy: { value: "desc" },
        take: limit,
        include: { user: { select: userSelect } },
      });
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.user.id,
        username: r.user.username,
        avatarSeed: r.user.avatarSeed,
        value: r.value,
      }));
    }

    const column = board === "XP" ? "xp" : "iqRating";
    const users = await db.user.findMany({
      // Untested users (no placement test yet) don't appear on the IQ board.
      // XP board: only people who earned something. IQ board: only people who took the placement test.
      where: {
        memberships: { some: { tenantId } },
        ...(board === "IQ" ? { iqTestedAt: { not: null } } : { xp: { gt: 0 } }),
      },
      orderBy: { [column]: "desc" },
      take: limit,
      select: { ...userSelect, xp: true, iqRating: true },
    });
    return users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      avatarSeed: u.avatarSeed,
      value: board === "XP" ? u.xp : iqFromRating(u.iqRating),
    }));
  }

  async rankOf(userId: string, { board, period, tenantId }: Omit<LeaderboardQuery, "limit">) {
    if (period === "weekly") {
      const week = tashkentWeekStart();
      const mine = await db.weeklyScore.findUnique({
        where: { userId_tenantId_week_board: { userId, tenantId, week, board } },
      });
      if (!mine) return null;
      const ahead = await db.weeklyScore.count({ where: { tenantId, board, week, value: { gt: mine.value } } });
      return ahead + 1;
    }

    const me = await db.user.findUnique({ where: { id: userId }, select: { xp: true, iqRating: true, iqTestedAt: true } });
    if (!me || (board === "IQ" ? !me.iqTestedAt : me.xp === 0)) return null;
    const ahead = await db.user.count({
      where: {
        memberships: { some: { tenantId } },
        ...(board === "XP" ? { xp: { gt: me.xp } } : { iqTestedAt: { not: null }, iqRating: { gt: me.iqRating } }),
      },
    });
    return ahead + 1;
  }
}
