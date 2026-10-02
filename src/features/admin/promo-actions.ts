"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { normalizePromoCode } from "@/features/payments/promo-rules";
import type { AdminResult } from "./actions";

const promoInput = z.object({
  code: z.string().transform(normalizePromoCode).pipe(z.string().min(3).max(24)),
  percent: z.number().int().min(1).max(100),
  plan: z.enum(["PRO", "DIAMOND"]).nullable(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  /** Last day the code works, "2026-12-31" (Tashkent), or null. */
  lastDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  note: z.string().trim().max(200),
  /** The partner whose code this is (payments with it are attributed to them), or null. */
  partnerId: z.string().max(64).nullable(),
});
export type PromoInput = z.input<typeof promoInput>;

/** End of that calendar day in Tashkent (UTC+5). */
const endOfDayTashkent = (day: string) => new Date(new Date(`${day}T00:00:00+05:00`).getTime() + 24 * 60 * 60 * 1000);

export async function createPromo(input: PromoInput): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  const parsed = promoInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { lastDay, note, ...data } = parsed.data;
  const expiresAt = lastDay ? endOfDayTashkent(lastDay) : null;
  if (expiresAt && expiresAt <= new Date()) return { ok: false, error: "promoPast" };
  if (await db.promoCode.findUnique({ where: { code: data.code }, select: { id: true } })) return { ok: false, error: "promoTaken" };
  if (data.partnerId && !(await db.partner.findUnique({ where: { id: data.partnerId }, select: { id: true } }))) return { ok: false, error: "notFound" };

  await db.promoCode.create({ data: { ...data, expiresAt, note: note || null, createdById: admin.id } });
  await audit(db, admin.id, "promo.create", null, { code: data.code, percent: data.percent });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Switch a code off (it stops working at once) or back on. Codes are never deleted: payments point at them. */
export async function setPromoActive(promoId: string, active: boolean): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  const updated = await db.promoCode.updateMany({ where: { id: promoId }, data: { active: active === true } });
  if (!updated.count) return { ok: false, error: "notFound" };
  await audit(db, admin.id, active ? "promo.enable" : "promo.disable", null, { promoId });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
