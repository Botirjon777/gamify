import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { XpReason } from "@/generated/prisma/enums";
import { tashkentToday, tashkentWeekStart } from "@/lib/time";
import { notify } from "@/features/notifications/service";
import { addSeasonXp } from "@/features/events/service";
import { effectivePlan, PLANS } from "@/features/plans/plans";

/** Level curve: level n needs 50·(n-1)² XP → 1:0, 2:50, 3:200, 4:450, 5:800 … 10:4050 */
export const levelForXp = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1;
export const xpForLevel = (level: number) => 50 * (level - 1) ** 2;

/** XP for day 1…7 of the streak cycle; repeats every 7 days. */
export const DAILY_BONUS_XP = [10, 15, 20, 25, 30, 40, 60] as const;

export const bonusForStreak = (streak: number) => DAILY_BONUS_XP[(Math.max(streak, 1) - 1) % 7];

/** Earned by activity → the plan multiplier applies. Rewards (referral, badge, clan) are fixed. */
const MULTIPLIED: XpReason[] = ["EXERCISE", "IQ_TEST", "LOGIN_BONUS", "STREAK_BONUS", "DAILY_QUIZ", "DAILY_PROBLEM"];

/** The invitee must reach this level before the inviter is rewarded (stops fake sign-ups). */
export const REFERRAL_REWARD_LEVEL = 3;
export const REFERRAL_INVITER_XP = 150;

interface AwardXp {
  userId: string;
  tenantId: string;
  amount: number;
  reason: XpReason;
  refId?: string;
}

export interface AwardResult {
  /** XP actually added after multiplier and daily cap. */
  awarded: number;
  xp: number;
  level: number;
  leveledUp: boolean;
  /** True when the Free/Pro daily exercise cap cut this award. */
  capped: boolean;
}

/**
 * The ONLY way to change XP (PLAN.md §5): applies the plan multiplier and daily cap, writes the XpEvent,
 * bumps the cached User.xp / level and the weekly leaderboard row — all inside the caller's transaction.
 */
export async function awardXp(
  tx: Prisma.TransactionClient,
  { userId, tenantId, amount, reason, refId }: AwardXp,
): Promise<AwardResult> {
  const before = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const limits = PLANS[effectivePlan(before)];

  let awarded = MULTIPLIED.includes(reason) ? Math.round(amount * limits.xpMultiplier) : amount;
  let capped = false;

  if (reason === "EXERCISE" && limits.dailyExerciseXpCap !== null) {
    // Today's exercise XP (Tashkent day), counted from the event log.
    const since = new Date(tashkentToday().getTime() - 5 * 60 * 60 * 1000);
    const today = await tx.xpEvent.aggregate({
      where: { userId, reason: "EXERCISE", createdAt: { gte: since } },
      _sum: { amount: true },
    });
    const left = Math.max(0, limits.dailyExerciseXpCap - (today._sum.amount ?? 0));
    if (awarded > left) {
      awarded = left;
      capped = true;
    }
  }

  if (awarded <= 0) return { awarded: 0, xp: before.xp, level: before.level, leveledUp: false, capped };

  await tx.xpEvent.create({ data: { userId, tenantId, amount: awarded, reason, refId } });
  const user = await tx.user.update({ where: { id: userId }, data: { xp: { increment: awarded } } });
  const level = levelForXp(user.xp);
  const leveledUp = level > before.level;
  if (level !== user.level) await tx.user.update({ where: { id: userId }, data: { level } });

  const week = tashkentWeekStart();
  await tx.weeklyScore.upsert({
    where: { userId_tenantId_week_board: { userId, tenantId, week, board: "XP" } },
    create: { userId, tenantId, week, board: "XP", value: awarded },
    update: { value: { increment: awarded } },
  });
  await addSeasonXp(tx, userId, tenantId, awarded);

  if (leveledUp) {
    await notify(tx, userId, "LEVEL_UP", { level });

    // Referral: reward the inviter once this user proves to be real (reaches the level).
    if (level >= REFERRAL_REWARD_LEVEL && before.referredById && !before.referralRewardedAt) {
      await tx.user.update({ where: { id: userId }, data: { referralRewardedAt: new Date() } });
      await awardXp(tx, { userId: before.referredById, tenantId, amount: REFERRAL_INVITER_XP, reason: "REFERRAL", refId: userId });
      await notify(tx, before.referredById, "REFERRAL_REWARD", { username: before.username, xp: REFERRAL_INVITER_XP });
    }
  }

  return { awarded, xp: user.xp, level, leveledUp, capped };
}
