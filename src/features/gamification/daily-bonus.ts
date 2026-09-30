"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { tashkentToday } from "@/lib/time";
import { touchStreak } from "./streak";
import { evaluateBadges } from "@/features/badges/service";
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

    const streak = await touchStreak(tx, user.id);
    const award = await awardXp(tx, { userId: user.id, tenantId: tenant.id, amount: bonusForStreak(streak), reason: "LOGIN_BONUS" });
    await evaluateBadges(tx, user.id, tenant.id);
    return { ok: true as const, xp: award.awarded, streak };
  });

  revalidatePath("/", "layout");
  return result;
}
