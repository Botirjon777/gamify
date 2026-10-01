import { describe, expect, it } from "vitest";
import { activeSeason, addMonthsTashkent, daysLeft, nextSeasonDates, rotationIndex, seasonMonths, seasonProgress } from "./season";

// Tashkent midnight = 19:00 UTC the day before
const tk = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - 5 * 3600_000);

const season1 = { id: "s1", number: 1, startsAt: tk(2026, 10, 1), endsAt: tk(2027, 1, 1) };

describe("seasons", () => {
  it("finds the active season", () => {
    expect(activeSeason([season1], tk(2026, 11, 15))?.id).toBe("s1");
    expect(activeSeason([season1], tk(2027, 1, 1))).toBeNull(); // end is exclusive
    expect(activeSeason([season1], tk(2026, 9, 30))).toBeNull();
  });

  it("adds calendar months in Tashkent time", () => {
    expect(addMonthsTashkent(tk(2026, 10, 1), 3)).toEqual(tk(2027, 1, 1));
    expect(addMonthsTashkent(tk(2027, 1, 31), 1)).toEqual(tk(2027, 2, 28));
  });

  it("measures length in months, clamped to 1–3", () => {
    expect(seasonMonths(season1)).toBe(3);
    expect(seasonMonths({ startsAt: tk(2026, 10, 1), endsAt: tk(2026, 11, 1) })).toBe(1);
    expect(seasonMonths({ startsAt: tk(2026, 10, 1), endsAt: tk(2027, 10, 1) })).toBe(3);
  });

  it("next season starts when the last ends and keeps its length", () => {
    expect(nextSeasonDates(season1, tk(2027, 1, 1))).toEqual({ startsAt: tk(2027, 1, 1), endsAt: tk(2027, 4, 1) });
  });

  it("after a gap the next season starts today", () => {
    const now = new Date(tk(2027, 2, 10).getTime() + 3 * 3600_000);
    expect(nextSeasonDates(season1, now)).toEqual({ startsAt: tk(2027, 2, 10), endsAt: tk(2027, 5, 10) });
  });

  it("days left and progress", () => {
    expect(daysLeft(season1.endsAt, tk(2026, 12, 30))).toBe(2);
    expect(daysLeft(season1.endsAt, tk(2027, 2, 1))).toBe(0);
    expect(seasonProgress(season1, season1.startsAt)).toBe(0);
    expect(seasonProgress(season1, tk(2028, 1, 1))).toBe(1);
  });

  it("rotates weekly topics through every track", () => {
    const monday = tk(2026, 9, 28);
    const seen = new Set(Array.from({ length: 9 }, (_, i) => rotationIndex(new Date(monday.getTime() + i * 7 * 86400_000), 9)));
    expect(seen.size).toBe(9);
    expect(rotationIndex(monday, 0)).toBe(-1);
  });
});
