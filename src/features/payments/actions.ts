"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { notifyMany } from "@/features/notifications/service";
import { iqCertificateAccess } from "@/features/iq/certificate";
import { iqPrice, planPricing } from "@/features/settings/service";
import { BILLING, BILLINGS, priceFor, type PaidPlan } from "./pricing";
import { checkPromo } from "./promo";
import { discountedPrice, type PromoProblem } from "./promo-rules";

export type PaymentRequestResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "pendingExists" | "tooMany" | `promo.${PromoProblem}` };

const requestSchema = z.object({
  plan: z.enum(["PRO", "DIAMOND"]),
  billing: z.enum(BILLINGS),
  /** Transfer details; may be empty only when a promo code makes the purchase free. */
  reference: z.string().trim().max(120),
  promo: z.string().trim().max(40).optional(),
});

export type PromoPreview = { ok: true; code: string; percent: number } | { ok: false; error: PromoProblem | "tooMany" };

/** "Apply" on the checkout page: is the code valid for this plan, and how much does it take off? */
export async function previewPromo(code: string, plan: string): Promise<PromoPreview> {
  const { user } = await requireSession();
  // Guessing codes is not a game: a handful of tries per hour.
  const limit = await getRateLimiter().hit(`promo:${user.id}`, 15, 60 * 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };
  const checked = await checkPromo(db, String(code).slice(0, 40), user.id, plan);
  return checked.ok ? { ok: true, code: checked.promo.code, percent: checked.promo.percent } : checked;
}

/** User reports a card transfer; an admin checks it and approves → the plan is activated. */
export async function requestPayment(input: { plan: string; billing: string; reference: string; promo?: string }): Promise<PaymentRequestResult> {
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
  const fullPrice = priceFor(await planPricing(), plan as PaidPlan, billing);

  // The price is always computed here — the browser only shows a preview.
  const promo = parsed.data.promo ? await checkPromo(db, parsed.data.promo, user.id, plan) : null;
  if (promo && !promo.ok) return { ok: false, error: `promo.${promo.error}` };
  const amountUzs = promo ? discountedPrice(fullPrice, promo.promo.percent) : fullPrice;
  // Nothing to transfer → nothing to describe; otherwise the admin needs the transfer details.
  if (amountUzs > 0 && reference.length < 3) return { ok: false, error: "invalid" };
  const admins = await db.user.findMany({ where: { isSuperAdmin: true, blockedAt: null }, select: { id: true } });

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: { userId: user.id, plan, months, amountUzs, reference: reference || null, promoCodeId: promo?.promo.id, discountUzs: fullPrice - amountUzs },
    });
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

  const [admins, { priceUzs }] = await Promise.all([db.user.findMany({ where: { isSuperAdmin: true, blockedAt: null }, select: { id: true } }), iqPrice()]);
  await db.$transaction(async (tx) => {
    await tx.payment.create({ data: { userId: user.id, product: "IQ_CERTIFICATE", months: 0, amountUzs: priceUzs, reference: ref.data } });
    await notifyMany(
      tx,
      admins.map((a) => a.id),
      "PAYMENT_SUBMITTED",
      { username: user.username, plan: "IQ_CERTIFICATE", amount: priceUzs },
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
