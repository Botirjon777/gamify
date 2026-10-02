import type { UserPlan } from "@/generated/prisma/enums";

export interface PlanLimits {
  /** Multiplier for XP earned by activity (exercises, IQ tests, daily bonus). */
  xpMultiplier: number;
  /** Max XP per Tashkent day from exercises (after the multiplier); null = unlimited. */
  dailyExerciseXpCap: number | null;
  /** Max members in a clan this user leads. */
  clanMemberLimit: number;
  maxFriends: number;
}

/** Free grows slower on purpose; Pro and Diamond remove the brakes. (What they cost: payments/pricing.) */
export const PLANS: Record<UserPlan, PlanLimits> = {
  FREE: { xpMultiplier: 1, dailyExerciseXpCap: 150, clanMemberLimit: 15, maxFriends: 50 },
  PRO: { xpMultiplier: 1.5, dailyExerciseXpCap: 600, clanMemberLimit: 30, maxFriends: 300 },
  DIAMOND: { xpMultiplier: 2, dailyExerciseXpCap: null, clanMemberLimit: 50, maxFriends: 1000 },
};

export const PLAN_ORDER: UserPlan[] = ["FREE", "PRO", "DIAMOND"];

/** A paid plan that has expired counts as FREE. */
export function effectivePlan(user: { plan: UserPlan; planExpiresAt: Date | null }, now = new Date()): UserPlan {
  if (user.plan === "FREE") return "FREE";
  if (user.planExpiresAt && user.planExpiresAt <= now) return "FREE";
  return user.plan;
}

export const planAtLeast = (plan: UserPlan, required: UserPlan) => PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(required);
