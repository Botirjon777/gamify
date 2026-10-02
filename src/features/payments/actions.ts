"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { notifyMany } from "@/features/notifications/service";
import { IQ_CERTIFICATE_PRICE_UZS, iqCertificateAccess } from "@/features/iq/certificate";
import { BILLING, BILLINGS, priceFor, type PaidPlan } from "./pricing";

export type PaymentRequestResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "pendingExists" | "tooMany" };

const requestSchema = z.object({
  plan: z.enum(["PRO", "DIAMOND"]),
  billing: z.enum(BILLINGS),
  reference: z.string().trim().min(3).max(120),
});

/** User reports a card transfer; an admin checks it and approves → the plan is activated. */
export async function requestPayment(input: { plan: string; billing: string; reference: string }): Promise<PaymentRequestResult> {
  const { user } = await requireSession();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const limit = await getRateLimiter().hit(`payment:${user.id}`, 5, 60 * 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };

  // One open request at a time keeps the admin queue clean.
  if (await db.payment.findFirst({ where: { userId: user.id, status: "PENDING" } })) {
    return { ok: false, error: "pendingExists" };
  }

  const { plan, billing, reference } = parsed.data;
  const { months } = BILLING[billing];
  const amountUzs = priceFor(plan as PaidPlan, billing);
  const admins = await db.user.findMany({ where: { isSuperAdmin: true, blockedAt: null }, select: { id: true } });

  await db.$transaction(async (tx) => {
    await tx.payment.create({ data: { userId: user.id, plan, months, amountUzs, reference } });
    await notifyMany(
      tx,
      admins.map((a) => a.id),
      "PAYMENT_SUBMITTED",
      { username: user.username, plan, amount: amountUzs },
    );
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export type CertificateRequestResult = { ok: true } | { ok: false; error: "invalid" | "pendingExists" | "tooMany" | "alreadyUnlocked" };

/**
 * One-time payment for the printable IQ certificate — the same card transfer + admin approval as a plan.
 * In notifications the product name travels in the `plan` field ("IQ_CERTIFICATE").
 */
export async function requestIqCertificate(reference: string): Promise<CertificateRequestResult> {
  const { user } = await requireSession();
  const ref = z.string().trim().min(3).max(120).safeParse(reference);
  if (!ref.success) return { ok: false, error: "invalid" };

  const limit = await getRateLimiter().hit(`payment:${user.id}`, 5, 60 * 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };

  if ((await iqCertificateAccess(user)).unlocked) return { ok: false, error: "alreadyUnlocked" };
  if (await db.payment.findFirst({ where: { userId: user.id, status: "PENDING" } })) return { ok: false, error: "pendingExists" };

  const admins = await db.user.findMany({ where: { isSuperAdmin: true, blockedAt: null }, select: { id: true } });
  await db.$transaction(async (tx) => {
    await tx.payment.create({ data: { userId: user.id, product: "IQ_CERTIFICATE", months: 0, amountUzs: IQ_CERTIFICATE_PRICE_UZS, reference: ref.data } });
    await notifyMany(
      tx,
      admins.map((a) => a.id),
      "PAYMENT_SUBMITTED",
      { username: user.username, plan: "IQ_CERTIFICATE", amount: IQ_CERTIFICATE_PRICE_UZS },
    );
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelPaymentRequest(paymentId: string) {
  const { user } = await requireSession();
  await db.payment.deleteMany({ where: { id: paymentId, userId: user.id, status: "PENDING" } });
  revalidatePath("/", "layout");
}
