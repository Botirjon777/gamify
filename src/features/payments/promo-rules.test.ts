import { describe, expect, it } from "vitest";
import { discountedPrice, normalizePromoCode, promoProblem, type PromoRules } from "./promo-rules";

const promo: PromoRules = { active: true, expiresAt: null, maxUses: null, plan: null };
const buy = { plan: "PRO", uses: 0, usedByUser: false, now: new Date("2026-10-02T12:00:00Z") };

describe("promo codes", () => {
  it("normalizes what the user typed", () => {
    expect(normalizePromoCode("  yoz-25 ")).toBe("YOZ25");
  });

  it("discount is rounded to 100 soʻm and never negative", () => {
    expect(discountedPrice(39_000, 20)).toBe(31_200);
    expect(discountedPrice(39_000, 33)).toBe(26_100);
    expect(discountedPrice(39_000, 100)).toBe(0);
  });

  it("a usable code has no problem", () => {
    expect(promoProblem(promo, buy)).toBeNull();
  });

  it("unknown and switched-off codes look the same", () => {
    expect(promoProblem(null, buy)).toBe("notFound");
    expect(promoProblem({ ...promo, active: false }, buy)).toBe("notFound");
  });

  it("expires at its end moment", () => {
    expect(promoProblem({ ...promo, expiresAt: new Date("2026-10-02T12:00:00Z") }, buy)).toBe("expired");
    expect(promoProblem({ ...promo, expiresAt: new Date("2026-10-02T12:00:01Z") }, buy)).toBeNull();
  });

  it("can be limited to a plan, a number of uses, and one use per user", () => {
    expect(promoProblem({ ...promo, plan: "DIAMOND" }, buy)).toBe("wrongPlan");
    expect(promoProblem({ ...promo, maxUses: 2 }, { ...buy, uses: 2 })).toBe("usedUp");
    expect(promoProblem({ ...promo, maxUses: 2 }, { ...buy, uses: 1 })).toBeNull();
    expect(promoProblem(promo, { ...buy, usedByUser: true })).toBe("alreadyUsed");
  });
});
