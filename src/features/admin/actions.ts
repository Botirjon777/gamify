"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { notify } from "@/features/notifications/service";
import { evaluateBadges } from "@/features/badges/service";
import { levelForXp } from "@/features/gamification/xp";
import { newExpiry, type PaidPlan } from "@/features/payments/pricing";

export type AdminResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const refresh = () => revalidatePath("/admin", "layout");
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Payments ────────────────────────────────────────────────────────────────

/** Approve a pending payment → activate / extend the user's plan. */
export async function approvePayment(paymentId: string, note?: string): Promise<AdminResult> {
  const { user: admin, tenant } = await requireAdmin();

  const result = await db.$transaction(async (tx) => {
    // Claim atomically: a second click / second admin finds nothing to approve.
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: admin.id, adminNote: note || null },
    });
    if (claimed.count === 0) return { ok: false as const, error: "notPending" };

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { user: true } });
    const until = newExpiry(payment.user, payment.plan as PaidPlan, payment.months);
    await tx.user.update({ where: { id: payment.userId }, data: { plan: payment.plan, planExpiresAt: until } });
    await notify(tx, payment.userId, "PAYMENT_APPROVED", { plan: payment.plan, until: until.toISOString() });
    await evaluateBadges(tx, payment.userId, tenant.id);
    await audit(tx, admin.id, "payment.approve", payment.userId, {
      paymentId,
      plan: payment.plan,
      months: payment.months,
      amountUzs: payment.amountUzs,
      until: until.toISOString(),
    });
    return { ok: true as const };
  });
  refresh();
  return result;
}

export async function rejectPayment(paymentId: string, reason: string): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  const text = z.string().trim().min(2).max(300).safeParse(reason);
  if (!text.success) return { ok: false, error: "reasonRequired" };

  const result = await db.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: admin.id, adminNote: text.data },
    });
    if (claimed.count === 0) return { ok: false as const, error: "notPending" };
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await notify(tx, payment.userId, "PAYMENT_REJECTED", { plan: payment.plan, reason: text.data });
    await audit(tx, admin.id, "payment.reject", payment.userId, { paymentId, reason: text.data });
    return { ok: true as const };
  });
  refresh();
  return result;
}

// ─── Users ───────────────────────────────────────────────────────────────────

/** Set a user's plan directly (e.g. gifts, corrections). FREE clears the expiry. */
export async function setUserPlan(userId: string, plan: string, days: number): Promise<AdminResult> {
  const { user: admin, tenant } = await requireAdmin();
  const parsed = z.object({ plan: z.enum(["FREE", "PRO", "DIAMOND"]), days: z.number().int().min(1).max(3650) }).safeParse({ plan, days });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const until = parsed.data.plan === "FREE" ? null : new Date(Date.now() + parsed.data.days * DAY_MS);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { plan: parsed.data.plan, planExpiresAt: until } });
    await evaluateBadges(tx, userId, tenant.id);
    await audit(tx, admin.id, "user.setPlan", userId, { plan: parsed.data.plan, until: until?.toISOString() ?? null });
  });
  refresh();
  return { ok: true };
}

export async function setBlocked(userId: string, blocked: boolean): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "self" };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "notFound" };
  if (target.isSuperAdmin) return { ok: false, error: "adminTarget" };

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { blockedAt: blocked ? new Date() : null } });
    // Blocking logs them out everywhere.
    if (blocked) await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(tx, admin.id, blocked ? "user.block" : "user.unblock", userId);
  });
  refresh();
  return { ok: true };
}

/** Generate a temporary password (shown once to the admin); the user must change it after logging in. */
export async function resetPassword(userId: string): Promise<AdminResult<{ tempPassword: string }>> {
  const { user: admin } = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "notFound" };
  if (target.isSuperAdmin && target.id !== admin.id) return { ok: false, error: "adminTarget" };

  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const tempPassword = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
  const passwordHash = await hashPassword(tempPassword);

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } });
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(tx, admin.id, "user.resetPassword", userId); // never log the password itself
  });
  refresh();
  return { ok: true, tempPassword };
}

/** Add or remove XP (corrections, rewards). Removal never drops below 0. */
export async function adjustXp(userId: string, amount: number, reason: string): Promise<AdminResult> {
  const { user: admin, tenant } = await requireAdmin();
  const parsed = z
    .object({ amount: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0), reason: z.string().trim().min(2).max(200) })
    .safeParse({ amount, reason });
  if (!parsed.success) return { ok: false, error: "invalid" };

  await db.$transaction(async (tx) => {
    const target = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const delta = Math.max(parsed.data.amount, -target.xp);
    if (delta === 0) return;
    await tx.xpEvent.create({ data: { userId, tenantId: tenant.id, amount: delta, reason: "ADMIN_ADJUST", refId: admin.id } });
    const xp = target.xp + delta;
    await tx.user.update({ where: { id: userId }, data: { xp, level: levelForXp(xp) } });
    await audit(tx, admin.id, "user.adjustXp", userId, { amount: delta, reason: parsed.data.reason });
  });
  refresh();
  return { ok: true };
}

export async function revokeUserSessions(userId: string): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  await db.$transaction(async (tx) => {
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(tx, admin.id, "user.revokeSessions", userId);
  });
  refresh();
  return { ok: true };
}
