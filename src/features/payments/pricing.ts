import { addMonthsTashkent } from "@/features/events/season";

export type PaidPlan = "PRO" | "DIAMOND";
export const PAID_PLANS: PaidPlan[] = ["PRO", "DIAMOND"];

/**
 * What the paid plans cost: a monthly price each, and how much cheaper a year paid at once is (%).
 * Changed in admin → Sozlamalar (the Setting table); DEFAULT_PRICING applies until something is saved.
 */
export interface PlanPricing {
  monthly: Record<PaidPlan, number>;
  annualDiscount: number;
}
export const DEFAULT_PRICING: PlanPricing = { monthly: { PRO: 39_000, DIAMOND: 79_000 }, annualDiscount: 25 };

/** Two ways to pay: month by month, or a year at once for less. */
export const BILLING = {
  monthly: { months: 1 },
  annual: { months: 12 },
} as const;
export type Billing = keyof typeof BILLING;
export const BILLINGS = Object.keys(BILLING) as Billing[];

export const isBilling = (value: unknown): value is Billing => typeof value === "string" && value in BILLING;
export const isPeriod = (months: number) => BILLINGS.some((b) => BILLING[b].months === months);

/** The discount (%) of a way to pay. */
export const billingDiscount = (pricing: PlanPricing, billing: Billing) => (billing === "annual" ? pricing.annualDiscount : 0);

/** Total price in so'm for the whole period, rounded to 1 000. */
export function priceFor(pricing: PlanPricing, plan: PaidPlan, billing: Billing): number {
  const { months } = BILLING[billing];
  return Math.round((pricing.monthly[plan] * months * (1 - billingDiscount(pricing, billing) / 100)) / 1000) * 1000;
}

/** What it comes to per month (annual → total / 12), rounded to 100. */
export const perMonth = (pricing: PlanPricing, plan: PaidPlan, billing: Billing) => Math.round(priceFor(pricing, plan, billing) / BILLING[billing].months / 100) * 100;

/** How much a year paid at once saves compared with paying monthly. */
export const yearlySaving = (pricing: PlanPricing, plan: PaidPlan) => priceFor(pricing, plan, "monthly") * 12 - priceFor(pricing, plan, "annual");

/**
 * New expiry when a payment is approved: same plan still running → extend from its end;
 * otherwise (new / different / expired plan) → start today.
 */
export function newExpiry(
  current: { plan: string; planExpiresAt: Date | null },
  plan: PaidPlan,
  months: number,
  now = new Date(),
): Date {
  const running = current.plan === plan && current.planExpiresAt && current.planExpiresAt > now;
  const from = running ? current.planExpiresAt! : now;
  // Calendar months: a year is a year (not 12 × 30 days).
  return addMonthsTashkent(from, months);
}
