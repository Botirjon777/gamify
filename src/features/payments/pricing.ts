import { PLANS } from "@/features/plans/plans";

export type PaidPlan = "PRO" | "DIAMOND";
export const PAID_PLANS: PaidPlan[] = ["PRO", "DIAMOND"];

/** Longer periods are cheaper per month. */
export const PERIODS = [
  { months: 1, discount: 0 },
  { months: 3, discount: 10 },
  { months: 6, discount: 15 },
  { months: 12, discount: 25 },
] as const;

export const isPeriod = (months: number) => PERIODS.some((p) => p.months === months);

/** Total price in so'm, rounded to 1 000. */
export function priceFor(plan: PaidPlan, months: number): number {
  const period = PERIODS.find((p) => p.months === months);
  if (!period) throw new Error(`Unsupported period: ${months}`);
  const total = PLANS[plan].priceUzs * months * (1 - period.discount / 100);
  return Math.round(total / 1000) * 1000;
}

const DAY_MS = 24 * 60 * 60 * 1000;

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
  return new Date(from.getTime() + months * 30 * DAY_MS);
}
