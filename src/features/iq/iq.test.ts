import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { iqFile } from "./content-schema";
import { expectedScore, iqFromRating, iqPercentile, pickIqItem, START_RATING, updateRatings, userK } from "./rating";

describe("Elo rating", () => {
  it("expects 50% against an equal item and more against an easier one", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.7);
  });
  it("correct answers raise the user and lower the item; wrong answers the opposite", () => {
    const up = updateRatings(1000, 1000, true, 32);
    expect(up.user).toBeGreaterThan(1000);
    expect(up.item).toBeLessThan(1000);
    const down = updateRatings(1000, 1000, false, 32);
    expect(down.user).toBeLessThan(1000);
    expect(down.item).toBeGreaterThan(1000);
  });
  it("beating a hard item gains more than beating an easy one", () => {
    expect(updateRatings(1000, 1300, true, 32).user - 1000).toBeGreaterThan(updateRatings(1000, 700, true, 32).user - 1000);
  });
  it("placement K shrinks but never below the floor; daily K is small", () => {
    expect(userK("PLACEMENT", 0)).toBeGreaterThan(userK("PLACEMENT", 8));
    expect(userK("PLACEMENT", 50)).toBe(32);
    expect(userK("DAILY", 0)).toBe(24);
  });
});

describe("IQ mapping", () => {
  it("maps the start rating to 100 and clamps extremes", () => {
    expect(iqFromRating(START_RATING)).toBe(100);
    expect(iqFromRating(1100)).toBe(115);
    expect(iqFromRating(-5000)).toBe(55);
    expect(iqFromRating(9000)).toBe(160);
  });
  it("percentile follows the normal curve", () => {
    expect(iqPercentile(100)).toBe(50);
    expect(iqPercentile(115)).toBeGreaterThanOrEqual(83);
    expect(iqPercentile(115)).toBeLessThanOrEqual(85);
    expect(iqPercentile(85)).toBeLessThanOrEqual(17);
  });
});

describe("pickIqItem", () => {
  const pool = [
    { id: "easy", category: "sequence", rating: 700 },
    { id: "mid-seq", category: "sequence", rating: 1000 },
    { id: "mid-logic", category: "logic", rating: 1020 },
    { id: "hard", category: "math", rating: 1300 },
  ];
  const first = () => 0;

  it("picks the closest unseen item", () => {
    expect(pickIqItem(pool, 1000, new Set(), null, first)?.id).toBe("mid-seq");
  });
  it("avoids repeating the previous category", () => {
    expect(pickIqItem(pool, 1000, new Set(), "sequence", first)?.id).toBe("mid-logic");
  });
  it("skips seen items, falls back to the whole pool when all are seen", () => {
    expect(pickIqItem(pool, 1000, new Set(["mid-seq", "mid-logic"]), null, first)?.id).not.toMatch(/^mid/);
    expect(pickIqItem(pool, 1000, new Set(pool.map((p) => p.id)), null, first)).not.toBeNull();
  });
});

describe("IQ item bank", () => {
  const { items } = iqFile.parse(parse(readFileSync(join(process.cwd(), "content/iq/items.yaml"), "utf8")));

  it("has enough items for a placement test plus several daily tests", () => {
    expect(items.length).toBeGreaterThanOrEqual(12 + 5 * 4);
  });
  it("covers every difficulty level", () => {
    expect(new Set(items.map((i) => i.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
  });
  it("has unique ids and no duplicate options within an item", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const item of items) {
      const opts = item.options.map((o) => o.uz);
      expect(new Set(opts).size, item.id).toBe(opts.length);
    }
  });
});
