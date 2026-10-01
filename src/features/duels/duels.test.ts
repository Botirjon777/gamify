import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

describe("duel winner", async () => {
  const { decideWinner } = await import("./service");

  it("more correct answers wins", () => {
    expect(decideWinner({ userId: "a", correct: 4, timeMs: 90_000 }, { userId: "b", correct: 3, timeMs: 10_000 })).toBe("a");
  });
  it("same score → faster wins", () => {
    expect(decideWinner({ userId: "a", correct: 3, timeMs: 50_000 }, { userId: "b", correct: 3, timeMs: 40_000 })).toBe("b");
  });
  it("same score and time → draw", () => {
    expect(decideWinner({ userId: "a", correct: 2, timeMs: 30_000 }, { userId: "b", correct: 2, timeMs: 30_000 })).toBeNull();
  });
  it("a player who never finished (-1) loses", () => {
    expect(decideWinner({ userId: "a", correct: 0, timeMs: 200_000 }, { userId: "b", correct: -1, timeMs: Number.MAX_SAFE_INTEGER })).toBe("a");
  });
});
