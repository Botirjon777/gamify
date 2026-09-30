"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { AVATAR_STYLES, type AvatarStyle } from "@/lib/avatar";
import { AVATAR_UNLOCK_LEVEL } from "@/features/badges/catalog";
import { effectivePlan, planAtLeast } from "@/features/plans/plans";

export type ProfileResult = { ok: true } | { ok: false; error: "locked" | "planRequired" | "invalid" };

export async function updateBio(bio: string): Promise<ProfileResult> {
  const { user } = await requireSession();
  const parsed = z.string().trim().max(160).safeParse(bio);
  if (!parsed.success) return { ok: false, error: "invalid" };
  await db.user.update({ where: { id: user.id }, data: { bio: parsed.data || null } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Change avatar style and/or generate a new look. Unlocks at level 10; premium styles need a paid plan. */
export async function updateAvatar(style: string, reroll: boolean): Promise<ProfileResult> {
  const { user } = await requireSession();
  if (user.level < AVATAR_UNLOCK_LEVEL) return { ok: false, error: "locked" };

  const def = AVATAR_STYLES[style as AvatarStyle];
  if (!def) return { ok: false, error: "invalid" };
  if (!planAtLeast(effectivePlan(user), def.plan)) return { ok: false, error: "planRequired" };

  await db.user.update({
    where: { id: user.id },
    data: { avatarStyle: style, ...(reroll && { avatarSeed: `${user.username}-${randomBytes(4).toString("hex")}` }) },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
