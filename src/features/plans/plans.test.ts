import { describe, expect, it } from "vitest";
import { effectivePlan, planAtLeast, PLANS } from "./plans";
import { BADGES } from "@/features/badges/catalog";

describe("plans", () => {
  it("Free grows slower than paid plans", () => {
    expect(PLANS.FREE.xpMultiplier).toBeLessThan(PLANS.PRO.xpMultiplier);
    expect(PLANS.PRO.xpMultiplier).toBeLessThan(PLANS.DIAMOND.xpMultiplier);
    expect(PLANS.FREE.dailyExerciseXpCap!).toBeLessThan(PLANS.PRO.dailyExerciseXpCap!);
    expect(PLANS.DIAMOND.dailyExerciseXpCap).toBeNull();
  });

  it("an expired paid plan counts as Free", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(effectivePlan({ plan: "PRO", planExpiresAt: new Date("2026-11-01") }, now)).toBe("PRO");
    expect(effectivePlan({ plan: "PRO", planExpiresAt: new Date("2026-09-01") }, now)).toBe("FREE");
    expect(effectivePlan({ plan: "DIAMOND", planExpiresAt: null }, now)).toBe("DIAMOND");
  });

  it("plan ordering", () => {
    expect(planAtLeast("DIAMOND", "PRO")).toBe(true);
    expect(planAtLeast("PRO", "DIAMOND")).toBe(false);
    expect(planAtLeast("FREE", "FREE")).toBe(true);
  });
});

describe("badge catalog", () => {
  it("has unique keys and a message for each", async () => {
    const messages = (await import("../../../messages/uz.json")).default as { badges: Record<string, { title: string }> };
    expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length);
    for (const b of BADGES) expect(messages.badges[b.key]?.title, b.key).toBeTruthy();
  });
});

describe("pricing", () => {
  it("annual is cheaper per month by the annual discount", async () => {
    const { DEFAULT_PRICING: p, perMonth, priceFor, yearlySaving } = await import("@/features/payments/pricing");
    expect(priceFor(p, "PRO", "monthly")).toBe(p.monthly.PRO);
    expect(priceFor(p, "PRO", "annual")).toBe(Math.round((p.monthly.PRO * 12 * (1 - p.annualDiscount / 100)) / 1000) * 1000);
    expect(perMonth(p, "DIAMOND", "annual")).toBeLessThan(perMonth(p, "DIAMOND", "monthly"));
    expect(yearlySaving(p, "PRO")).toBe(p.monthly.PRO * 12 - priceFor(p, "PRO", "annual"));
  });

  it("follows the prices saved in the settings", async () => {
    const { billingDiscount, perMonth, priceFor, yearlySaving } = await import("@/features/payments/pricing");
    const p = { monthly: { PRO: 50_000, DIAMOND: 100_000 }, annualDiscount: 10 };
    expect(priceFor(p, "PRO", "monthly")).toBe(50_000);
    expect(priceFor(p, "DIAMOND", "annual")).toBe(1_080_000);
    expect(perMonth(p, "DIAMOND", "annual")).toBe(90_000);
    expect(yearlySaving(p, "DIAMOND")).toBe(120_000);
    expect([billingDiscount(p, "monthly"), billingDiscount(p, "annual")]).toEqual([0, 10]);
    // No annual discount → a year costs twelve months.
    expect(yearlySaving({ ...p, annualDiscount: 0 }, "PRO")).toBe(0);
  });

  it("a year extends to the same date next year; renewals stack", async () => {
    const { newExpiry } = await import("@/features/payments/pricing");
    const now = new Date("2026-10-01T10:00:00Z");
    expect(newExpiry({ plan: "FREE", planExpiresAt: null }, "PRO", 12, now).toISOString()).toBe("2027-10-01T10:00:00.000Z");
    const running = { plan: "PRO", planExpiresAt: new Date("2026-11-15T10:00:00Z") };
    expect(newExpiry(running, "PRO", 1, now).toISOString()).toBe("2026-12-15T10:00:00.000Z");
    expect(newExpiry(running, "DIAMOND", 1, now).toISOString()).toBe("2026-11-01T10:00:00.000Z");
  });
});
