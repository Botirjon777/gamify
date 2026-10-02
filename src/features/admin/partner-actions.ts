"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { normalizePartnerCode } from "@/features/partners/service";
import type { AdminResult } from "./actions";

const partnerInput = z.object({
  code: z.string().transform(normalizePartnerCode).pipe(z.string().min(2).max(40)),
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().max(120),
  note: z.string().trim().max(300),
});
export type PartnerInput = z.input<typeof partnerInput>;

/** Create a partner, or edit one (`partnerId` given). The code is the link, so it must be unique. */
export async function savePartner(input: PartnerInput, partnerId?: string): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  const parsed = partnerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { code, name, contact, note } = parsed.data;

  const clash = await db.partner.findUnique({ where: { code }, select: { id: true } });
  if (clash && clash.id !== partnerId) return { ok: false, error: "partnerTaken" };

  const data = { code, name, contact: contact || null, note: note || null };
  if (partnerId) {
    const updated = await db.partner.updateMany({ where: { id: partnerId }, data });
    if (!updated.count) return { ok: false, error: "notFound" };
  } else {
    await db.partner.create({ data });
  }
  await audit(db, admin.id, partnerId ? "partner.update" : "partner.create", null, { code });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Off: the link still opens the site, but no new people are attributed. Existing attribution stays. */
export async function setPartnerActive(partnerId: string, active: boolean): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  const updated = await db.partner.updateMany({ where: { id: partnerId }, data: { active: active === true } });
  if (!updated.count) return { ok: false, error: "notFound" };
  await audit(db, admin.id, active ? "partner.enable" : "partner.disable", null, { partnerId });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
