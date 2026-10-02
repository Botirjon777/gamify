"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getRateLimiter } from "@/lib/rate-limit";
import { AVATAR_STYLES, type AvatarStyle } from "@/lib/avatar";
import { AVATAR_UNLOCK_LEVEL } from "@/features/badges/catalog";
import { effectivePlan, planAtLeast } from "@/features/plans/plans";
import { normalizeInterests, SUBJECTS } from "@/features/learn/subjects";

export type ProfileResult = { ok: true } | { ok: false; error: "locked" | "planRequired" | "invalid" };

export async function updateBio(bio: string): Promise<ProfileResult> {
  const { user } = await requireSession();
  const parsed = z.string().trim().max(160).safeParse(bio);
  if (!parsed.success) return { ok: false, error: "invalid" };
  await db.user.update({ where: { id: user.id }, data: { bio: parsed.data || null } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Subjects the user follows. Skipping the question saves an empty list — either way they aren't asked again. */
export async function updateInterests(subjects: string[]): Promise<ProfileResult> {
  const { user } = await requireSession();
  const parsed = z.array(z.enum(SUBJECTS)).max(SUBJECTS.length).safeParse(subjects);
  if (!parsed.success) return { ok: false, error: "invalid" };
  await db.user.update({ where: { id: user.id }, data: { interests: normalizeInterests(parsed.data), interestsSetAt: new Date() } });
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

/** Gender drives which hairstyles / facial hair the avatar can have. Not locked — anyone can set it. */
export async function updateGender(gender: string): Promise<ProfileResult> {
  const { user } = await requireSession();
  if (gender !== "MALE" && gender !== "FEMALE") return { ok: false, error: "invalid" };
  await db.user.update({ where: { id: user.id }, data: { gender } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export type PasswordResult = { ok: true } | { ok: false; error: "wrongPassword" | "passwordTooShort" | "passwordTooLong" | "samePassword" | "tooMany" };

/** Change own password (also clears "must change password" after an admin reset). Logs out other devices. */
export async function changePassword(current: string, next: string): Promise<PasswordResult> {
  const { user, session } = await requireSession();
  const limit = await getRateLimiter().hit(`pwchange:${user.id}`, 10, 60 * 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };
  if (next.length < 8) return { ok: false, error: "passwordTooShort" };
  if (next.length > 128) return { ok: false, error: "passwordTooLong" };
  if (!(await verifyPassword(user.passwordHash, current))) return { ok: false, error: "wrongPassword" };
  if (current === next) return { ok: false, error: "samePassword" };

  const passwordHash = await hashPassword(next);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null, id: { not: session.id } }, data: { revokedAt: new Date() } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
