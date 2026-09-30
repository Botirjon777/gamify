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
