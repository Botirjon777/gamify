import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { IQ_CHEER_PAUSE_MS, iqCheer } from "./cheer";
import { MEDIA_PATH } from "@/lib/media";
import { IQ_FILES, iqFile, iqItemDef, isNumbered } from "./content-schema";
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
  it("chooses at random among everything near the best match, not among the first three", () => {
    // 200 questions with the same rating, as in the real bank: each of them must be reachable.
    const many = Array.from({ length: 200 }, (_, i) => ({ id: `q${i}`, category: "matrix", rating: 1000, picture: true }));
    expect(pickIqItem(many, 1000, new Set(), null, () => 0)?.id).toBe("q0");
    expect(pickIqItem(many, 1000, new Set(), null, () => 0.5)?.id).toBe("q100");
    expect(pickIqItem(many, 1000, new Set(), "matrix", () => 0.999)?.id).toBe("q199");
    // A clearly worse match is never chosen.
    const far = [...many, { id: "hard", category: "matrix", rating: 1300, picture: true }];
    for (const r of [0, 0.5, 0.999]) expect(pickIqItem(far, 1000, new Set(), null, () => r)?.id).not.toBe("hard");
  });
  it("asks picture questions as often as the share says", () => {
    const mixed = [
      { id: "text", category: "sequence", rating: 1000 },
      { id: "pic", category: "matrix", rating: 1000, picture: true },
    ];
    // Share 1: pictures only — even right after another picture question.
    for (const r of [0, 0.5, 0.999]) expect(pickIqItem(mixed, 1000, new Set(), "matrix", () => r, 1)?.id).toBe("pic");
    // Share 0: text only.
    for (const r of [0, 0.5, 0.999]) expect(pickIqItem(mixed, 1000, new Set(), null, () => r, 0)?.id).toBe("text");
    // Share 0.7: the first random number decides the kind.
    expect(pickIqItem(mixed, 1000, new Set(), null, () => 0.69, 0.7)?.id).toBe("pic");
    expect(pickIqItem(mixed, 1000, new Set(), null, () => 0.71, 0.7)?.id).toBe("text");
    // No pictures left unseen → text rather than a repeat.
    expect(pickIqItem(mixed, 1000, new Set(["pic"]), null, () => 0, 1)?.id).toBe("text");
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

describe("encouragement between questions", () => {
  const at = (answered: number, total = 12, elapsedMs = answered * 20_000) => iqCheer({ answered, total, elapsedMs, typicalMs: 25_000 });

  it("comes after every third answer, never before the first or the last question", () => {
    expect([0, 1, 2, 4, 5, 7, 8, 10, 11, 12].map((n) => at(n))).toEqual(Array(10).fill(null));
    expect(at(3)?.stage).toBe("start");
    expect(at(6)?.stage).toBe("half");
    expect(at(9)).toMatchObject({ stage: "almost", left: 3 });
  });
  it("a five-question test gets one, near the end", () => {
    expect(at(3, 5)).toMatchObject({ stage: "almost", left: 2 });
    expect(at(4, 5)).toBeNull();
  });
  it("says \"faster than most\" only to those who are", () => {
    expect(at(3, 12, 3 * 10_000)?.fast).toBe(true);
    expect(at(3, 12, 3 * 40_000)?.fast).toBe(false);
  });
  it("does not count its own pauses as answering time", () => {
    // 6 answers at 24 s each, plus one pause before the fourth question.
    expect(at(6, 12, 6 * 24_000 + IQ_CHEER_PAUSE_MS)?.fast).toBe(true);
  });
});

describe("picture questions", () => {
  const picture = { id: "iq-matrix-x", category: "matrix", difficulty: 2, prompt: "?", image: "iq/sandia/s001.png", answer: 5 };
  const sheet = { src: "iq/sandia/s001-answers.png", columns: 4, rows: 2 };

  it("numbers the answers when they are one picture", () => {
    const item = iqItemDef.parse({ ...picture, optionsImage: sheet });
    expect(item.options).toHaveLength(8);
    expect(isNumbered(item.options)).toBe(true);
  });
  it("rejects an answer outside the grid, a grid that is too big, and no answers at all", () => {
    expect(iqItemDef.safeParse({ ...picture, optionsImage: sheet, answer: 8 }).success).toBe(false);
    expect(iqItemDef.safeParse({ ...picture, optionsImage: { ...sheet, rows: 3 } }).success).toBe(false);
    expect(iqItemDef.safeParse(picture).success).toBe(false);
  });
  it("accepts only paths that stay inside the media store", () => {
    for (const path of ["iq/u/0a1b2c.png", "iq/omib/o001-answers.svg"]) expect(MEDIA_PATH.test(path), path).toBe(true);
    for (const path of ["../.env", "iq/../../etc/passwd.png", "/iq/a.png", "iq/a.php", "iq/a.png.exe", "iq//a.png", "IQ/a.png"]) {
      expect(MEDIA_PATH.test(path), path).toBe(false);
    }
  });
  it("keeps the picture bank valid", () => {
    const { items } = iqFile.parse(parse(readFileSync(join(process.cwd(), "content/iq", IQ_FILES.pictures), "utf8")));
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const item of items) expect(item.image && item.optionsImage, item.id).toBeTruthy();
  });
});
