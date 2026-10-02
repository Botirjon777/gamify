/** Promo code rules — pure, shared by the server actions, the admin screens and the tests. */

/** What the user typed → how codes are stored: uppercase letters and digits only. */
export const normalizePromoCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Price after a percent discount, rounded to 100 soʻm (100% → 0). */
export const discountedPrice = (amountUzs: number, percent: number) => Math.max(0, Math.round((amountUzs * (100 - percent)) / 100 / 100) * 100);

export type PromoProblem = "notFound" | "expired" | "usedUp" | "alreadyUsed" | "wrongPlan";

export interface PromoRules {
  active: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  /** null = any paid plan. */
  plan: string | null;
}

/**
 * Why a code can't be used for this purchase, or null when it can.
 * `uses`: payments (pending + approved) that already used it; `usedByUser`: this user is among them.
 */
export function promoProblem(
  promo: PromoRules | null,
  purchase: { plan: string; uses: number; usedByUser: boolean; now?: Date },
): PromoProblem | null {
  // A switched-off code looks like one that doesn't exist.
  if (!promo || !promo.active) return "notFound";
  if (promo.expiresAt && promo.expiresAt <= (purchase.now ?? new Date())) return "expired";
  if (promo.plan && promo.plan !== purchase.plan) return "wrongPlan";
  if (purchase.usedByUser) return "alreadyUsed";
  if (promo.maxUses !== null && purchase.uses >= promo.maxUses) return "usedUp";
  return null;
}
