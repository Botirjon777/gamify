"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { notifyMany } from "@/features/notifications/service";
import { isPeriod, priceFor, type PaidPlan } from "./pricing";

export type PaymentRequestResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "pendingExists" | "tooMany" };

const requestSchema = z.object({
  plan: z.enum(["PRO", "DIAMOND"]),
  months: z.number().int().refine(isPeriod),
  reference: z.string().trim().min(3).max(120),
});

/** User reports a card transfer; an admin checks it and approves → the plan is activated. */
export async function requestPayment(input: { plan: string; months: number; reference: string }): Promise<PaymentRequestResult> {
  const { user } = await requireSession();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const limit = await getRateLimiter().hit(`payment:${user.id}`, 5, 60 * 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };

  // One open request at a time keeps the admin queue clean.
  if (await db.payment.findFirst({ where: { userId: user.id, status: "PENDING" } })) {
    return { ok: false, error: "pendingExists" };
  }

  const { plan, months, reference } = parsed.data;
  const amountUzs = priceFor(plan as PaidPlan, months);
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

export async function cancelPaymentRequest(paymentId: string) {
  const { user } = await requireSession();
  await db.payment.deleteMany({ where: { id: paymentId, userId: user.id, status: "PENDING" } });
  revalidatePath("/", "layout");
}
