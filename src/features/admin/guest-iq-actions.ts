"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { iqPrice } from "@/features/settings/service";
import type { AdminResult } from "./actions";

/**
 * The transfer for a guest IQ test arrived (the person sent the receipt in Telegram) → their page becomes
 * the certificate. `paid = false` undoes a mistake.
 */
export async function setGuestIqPaid(testId: string, paid: boolean): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  // Recorded at today's price (it can be changed in the settings).
  const { priceUzs } = await iqPrice();
  const updated = await db.guestIqTest.updateMany({
    // Only a finished test can be paid for; "unpaid → paid" and back are both exact, so a double click changes nothing.
    where: { id: testId, status: "FINISHED", paidAt: paid ? null : { not: null } },
    data: paid ? { paidAt: new Date(), paidById: admin.id, amountUzs: priceUzs } : { paidAt: null, paidById: null, amountUzs: 0 },
  });
  if (!updated.count) return { ok: false, error: "notFound" };
  await audit(db, admin.id, paid ? "guestIq.paid" : "guestIq.unpaid", null, { testId });
  revalidatePath("/", "layout");
  return { ok: true };
}
