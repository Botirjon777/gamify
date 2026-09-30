"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { addDays, sameDay, tashkentToday } from "@/lib/time";
import { awardXp, bonusForStreak } from "./xp";

export type ClaimResult = { ok: true; xp: number; streak: number } | { ok: false; error: "alreadyClaimed" };

export async function claimDailyBonus(): Promise<ClaimResult> {
  const { user, tenant } = await requireSession();
  const today = tashkentToday();

  const result = await db.$transaction(async (tx) => {
    // Primary key (userId, day, kind) makes a double claim impossible even under races.
    const inserted = await tx.dailyClaim.createMany({
      data: { userId: user.id, day: today, kind: "LOGIN" },
      skipDuplicates: true,
    });
    if (inserted.count === 0) return { ok: false as const, error: "alreadyClaimed" as const };

    const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const continued = sameDay(fresh.lastActiveDay, addDays(today, -1)) || sameDay(fresh.lastActiveDay, today);
    const streak = continued ? fresh.currentStreak + (sameDay(fresh.lastActiveDay, today) ? 0 : 1) : 1;

    await tx.user.update({
      where: { id: user.id },
      data: { currentStreak: streak, longestStreak: Math.max(streak, fresh.longestStreak), lastActiveDay: today },
    });

    const xp = bonusForStreak(streak);
    await awardXp(tx, { userId: user.id, tenantId: tenant.id, amount: xp, reason: "LOGIN_BONUS" });
    return { ok: true as const, xp, streak };
  });

  revalidatePath("/", "layout");
  return result;
}
