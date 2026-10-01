import "server-only";
import { db } from "@/lib/db";
import { tashkentWeekStart } from "@/lib/time";
import { iqFromRating } from "@/features/iq/rating";
import type { LeaderboardEntry, LeaderboardQuery, LeaderboardStore } from "./index";

const userSelect = { id: true, username: true, avatarSeed: true, avatarStyle: true, gender: true } as const;

/**
 * All-time boards read the cached columns on User (indexed); weekly boards read WeeklyScore.
 * Both are scoped to members of the tenant.
 */
export class PostgresLeaderboardStore implements LeaderboardStore {
  async top({ board, period, tenantId, limit = 50, offset = 0, seasonId }: LeaderboardQuery): Promise<LeaderboardEntry[]> {
    if (period === "season") {
      if (!seasonId || board !== "XP") return [];
      const rows = await db.seasonScore.findMany({
        where: { tenantId, seasonId, value: { gt: 0 } },
        orderBy: [{ value: "desc" }, { userId: "asc" }],
        skip: offset,
        take: limit,
        include: { user: { select: userSelect } },
      });
      return rows.map((r, i) => ({
        rank: offset + i + 1,
        userId: r.user.id,
        username: r.user.username,
        avatarSeed: r.user.avatarSeed,
        avatarStyle: r.user.avatarStyle,
        gender: r.user.gender,
        value: r.value,
      }));
    }

    if (period === "weekly") {
      const rows = await db.weeklyScore.findMany({
        where: { tenantId, board, week: tashkentWeekStart() },
        orderBy: [{ value: "desc" }, { userId: "asc" }],
        skip: offset,
        take: limit,
        include: { user: { select: userSelect } },
      });
      return rows.map((r, i) => ({
        rank: offset + i + 1,
        userId: r.user.id,
        username: r.user.username,
        avatarSeed: r.user.avatarSeed,
        avatarStyle: r.user.avatarStyle,
        gender: r.user.gender,
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
      // Stable tie-break so pages never repeat or skip a user.
      orderBy: [{ [column]: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: { ...userSelect, xp: true, iqRating: true },
    });
    return users.map((u, i) => ({
      rank: offset + i + 1,
      userId: u.id,
      username: u.username,
      avatarSeed: u.avatarSeed,
      avatarStyle: u.avatarStyle,
      gender: u.gender,
      value: board === "XP" ? u.xp : iqFromRating(u.iqRating),
    }));
  }

  async rankOf(userId: string, { board, period, tenantId, seasonId }: Omit<LeaderboardQuery, "limit" | "offset">) {
    if (period === "season") {
      if (!seasonId || board !== "XP") return null;
      const mine = await db.seasonScore.findUnique({ where: { userId_tenantId_seasonId: { userId, tenantId, seasonId } } });
      if (!mine || mine.value <= 0) return null;
      const ahead = await db.seasonScore.count({ where: { tenantId, seasonId, value: { gt: mine.value } } });
      return ahead + 1;
    }

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
