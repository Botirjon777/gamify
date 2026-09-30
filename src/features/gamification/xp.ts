import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { XpReason } from "@/generated/prisma/enums";
import { tashkentWeekStart } from "@/lib/time";

/** Level curve: level n needs 50·(n-1)² XP → 1:0, 2:50, 3:200, 4:450, 5:800 … */
export const levelForXp = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1;
export const xpForLevel = (level: number) => 50 * (level - 1) ** 2;

/** XP for day 1…7 of the streak cycle; repeats every 7 days. */
export const DAILY_BONUS_XP = [10, 15, 20, 25, 30, 40, 60] as const;

export const bonusForStreak = (streak: number) => DAILY_BONUS_XP[(Math.max(streak, 1) - 1) % 7];

interface AwardXp {
  userId: string;
  tenantId: string;
  amount: number;
  reason: XpReason;
  refId?: string;
}

/**
 * The ONLY way to change XP (PLAN.md §5): writes the XpEvent, bumps the cached
 * User.xp / level and the weekly leaderboard row — all inside the caller's transaction.
 */
export async function awardXp(tx: Prisma.TransactionClient, { userId, tenantId, amount, reason, refId }: AwardXp) {
  await tx.xpEvent.create({ data: { userId, tenantId, amount, reason, refId } });

  const user = await tx.user.update({ where: { id: userId }, data: { xp: { increment: amount } } });
  const level = levelForXp(user.xp);
  if (level !== user.level) await tx.user.update({ where: { id: userId }, data: { level } });

  const week = tashkentWeekStart();
  await tx.weeklyScore.upsert({
    where: { userId_tenantId_week_board: { userId, tenantId, week, board: "XP" } },
    create: { userId, tenantId, week, board: "XP", value: amount },
    update: { value: { increment: amount } },
  });

  return { xp: user.xp, level, leveledUp: level > user.level };
}
