import { PLANS } from "@/features/plans/plans";
import { addMonthsTashkent } from "@/features/events/season";

export type PaidPlan = "PRO" | "DIAMOND";
export const PAID_PLANS: PaidPlan[] = ["PRO", "DIAMOND"];

/** Annual billing discount (%) — change here, everything else follows. */
export const ANNUAL_DISCOUNT = 25;

/** Two ways to pay: month by month, or a year at once for less. */
export const BILLING = {
  monthly: { months: 1, discount: 0 },
  annual: { months: 12, discount: ANNUAL_DISCOUNT },
} as const;
export type Billing = keyof typeof BILLING;
export const BILLINGS = Object.keys(BILLING) as Billing[];

export const isBilling = (value: unknown): value is Billing => typeof value === "string" && value in BILLING;
export const isPeriod = (months: number) => BILLINGS.some((b) => BILLING[b].months === months);

/** Total price in so'm for the whole period, rounded to 1 000. */
export function priceFor(plan: PaidPlan, billing: Billing): number {
  const { months, discount } = BILLING[billing];
  return Math.round((PLANS[plan].priceUzs * months * (1 - discount / 100)) / 1000) * 1000;
}

/** What it comes to per month (annual → total / 12), rounded to 100. */
export const perMonth = (plan: PaidPlan, billing: Billing) => Math.round(priceFor(plan, billing) / BILLING[billing].months / 100) * 100;

/** How much a year of `billing` saves compared with paying monthly. */
export const yearlySaving = (plan: PaidPlan) => priceFor(plan, "monthly") * 12 - priceFor(plan, "annual");

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
