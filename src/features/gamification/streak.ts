import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { addDays, sameDay, tashkentToday } from "@/lib/time";

/**
 * Record activity for today (Tashkent). Any activity — daily bonus, solving an exercise — keeps the streak alive.
 * Returns the streak after today's activity.
 */
export async function touchStreak(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const today = tashkentToday();
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastActiveDay: true },
  });

  if (sameDay(user.lastActiveDay, today)) return user.currentStreak;

  const streak = sameDay(user.lastActiveDay, addDays(today, -1)) ? user.currentStreak + 1 : 1;
  await tx.user.update({
    where: { id: userId },
    data: { currentStreak: streak, longestStreak: Math.max(streak, user.longestStreak), lastActiveDay: today },
  });
  return streak;
}
