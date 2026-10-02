import { describe, expect, it } from "vitest";
import { groupDigits, tashkentParts, timeAgo } from "./format";

describe("groupDigits", () => {
  it("groups thousands with non-breaking spaces, like the server's Uzbek formatting", () => {
    expect(groupDigits(0)).toBe("0");
    expect(groupDigits(999)).toBe("999");
    expect(groupDigits(13000)).toBe("13\u00a0000");
    expect(groupDigits(1234567)).toBe("1\u00a0234\u00a0567");
    for (const n of [5, 49000, 79000, 470400, 1234567]) expect(groupDigits(n)).toBe(n.toLocaleString("uz-UZ"));
  });
});

describe("Tashkent time", () => {
  it("is UTC+5, also across midnight and the year's end", () => {
    expect(tashkentParts(new Date("2026-10-02T09:05:00Z"))).toEqual({ day: 2, month: 9, year: 2026, clock: "14:05" });
    expect(tashkentParts(new Date("2026-12-31T20:30:00Z"))).toEqual({ day: 1, month: 0, year: 2027, clock: "01:30" });
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const ago = (ms: number) => timeAgo(new Date(now.getTime() - ms), now);
  const MIN = 60_000;
  it("picks the largest unit that fits", () => {
    expect(ago(20_000)).toEqual({ unit: "now", count: 0 });
    expect(ago(5 * MIN)).toEqual({ unit: "minutes", count: 5 });
    expect(ago(59 * MIN)).toEqual({ unit: "minutes", count: 59 });
    expect(ago(60 * MIN)).toEqual({ unit: "hours", count: 1 });
    expect(ago(23.9 * 60 * MIN)).toEqual({ unit: "hours", count: 23 });
    expect(ago(3 * 24 * 60 * MIN)).toEqual({ unit: "days", count: 3 });
    expect(ago(30 * 24 * 60 * MIN).unit).toBe("date");
  });
  it("a moment in the future (clock skew) is just now", () => {
    expect(ago(-30_000)).toEqual({ unit: "now", count: 0 });
  });
});
