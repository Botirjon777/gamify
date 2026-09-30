/**
 * Mastery per (user, skill), 0–100.
 * Correct answers close part of the gap to 100 (harder = bigger step);
 * wrong answers take away a share of the current score.
 */
export function nextMastery(score: number, correct: boolean, difficulty: number): number {
  const next = correct ? score + (100 - score) * (0.08 + 0.04 * difficulty) : score - score * 0.12;
  return Math.round(Math.min(100, Math.max(0, next)) * 10) / 10;
}

/** Spaced repetition: the better you know it, the longer until the next review. */
export function reviewIntervalDays(score: number): number {
  if (score < 40) return 1;
  if (score < 70) return 3;
  if (score < 90) return 7;
  return 14;
}

/** Target difficulty for the next exercise based on mastery. */
export function targetDifficulty(score: number): number {
  if (score < 35) return 1;
  if (score < 70) return 2;
  return 3;
}

export type MasteryLevel = "new" | "learning" | "good" | "mastered";

export function masteryLevel(score: number, attempts: number): MasteryLevel {
  if (attempts === 0) return "new";
  if (score < 50) return "learning";
  if (score < 85) return "good";
  return "mastered";
}
