import "server-only";
import { db } from "@/lib/db";
import { effectivePlan, planAtLeast } from "@/features/plans/plans";
import type { UserPlan } from "@/generated/prisma/enums";

/** One-time price of the printable IQ certificate (≈ $1). Free with Pro / Diamond. */
export const IQ_CERTIFICATE_PRICE_UZS = 13_000;

export type IqCertificateAccess = { unlocked: true } | { unlocked: false; /** A payment for it is waiting for an admin. */ pending: boolean };

/**
 * May this user open their IQ certificate? Yes with an active Pro / Diamond plan, or after an approved
 * one-time payment (which stays valid when a plan ends). The IQ score itself is public either way.
 */
export async function iqCertificateAccess(user: { id: string; plan: UserPlan; planExpiresAt: Date | null }): Promise<IqCertificateAccess> {
  if (planAtLeast(effectivePlan(user), "PRO")) return { unlocked: true };
  const payments = await db.payment.findMany({
    where: { userId: user.id, product: "IQ_CERTIFICATE", status: { in: ["APPROVED", "PENDING"] } },
    select: { status: true },
  });
  if (payments.some((p) => p.status === "APPROVED")) return { unlocked: true };
  return { unlocked: false, pending: payments.length > 0 };
}
