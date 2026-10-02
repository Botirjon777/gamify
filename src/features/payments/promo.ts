import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { normalizePromoCode, promoProblem, type PromoProblem } from "./promo-rules";

type Db = Prisma.TransactionClient | typeof db;

/** A payment "uses" a code while it is waiting or approved; a rejected / cancelled one frees it again. */
const COUNTED = { in: ["PENDING", "APPROVED"] as ("PENDING" | "APPROVED")[] };

export type PromoCheck = { ok: true; promo: { id: string; code: string; percent: number } } | { ok: false; error: PromoProblem };

/** Can this user use this code for this plan right now? */
export async function checkPromo(client: Db, rawCode: string, userId: string, plan: string): Promise<PromoCheck> {
  const code = normalizePromoCode(rawCode);
  const promo = code ? await client.promoCode.findUnique({ where: { code } }) : null;
  const [uses, own] = promo
    ? await Promise.all([
        client.payment.count({ where: { promoCodeId: promo.id, status: COUNTED } }),
        client.payment.count({ where: { promoCodeId: promo.id, status: COUNTED, userId } }),
      ])
    : [0, 0];
  const error = promoProblem(promo, { plan, uses, usedByUser: own > 0 });
  if (error || !promo) return { ok: false, error: error ?? "notFound" };
  return { ok: true, promo: { id: promo.id, code: promo.code, percent: promo.percent } };
}
