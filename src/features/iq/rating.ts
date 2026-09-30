/**
 * Elo-style rating for IQ questions: the user and each question have a rating; answering is a "match".
 * The user's rating is shown as "Gamify IQ" (mean 100, 15 points per 100 rating) — an estimate of
 * logical reasoning, not a clinical IQ test.
 */

export const START_RATING = 1000;
const ITEM_K = 8;

/** Probability that a user with `user` rating answers an item with `item` rating correctly. */
export function expectedScore(user: number, item: number): number {
  return 1 / (1 + 10 ** ((item - user) / 400));
}

/** Placement moves fast at first and settles; daily tests nudge. */
export function userK(kind: "PLACEMENT" | "DAILY", answeredSoFar: number): number {
  return kind === "PLACEMENT" ? Math.max(32, 96 - 6 * answeredSoFar) : 24;
}

export function updateRatings(user: number, item: number, correct: boolean, k: number) {
  const expected = expectedScore(user, item);
  const score = correct ? 1 : 0;
  return {
    user: user + k * (score - expected),
    item: item - ITEM_K * (score - expected),
  };
}

export function iqFromRating(rating: number): number {
  return Math.round(Math.min(160, Math.max(55, 100 + (rating - START_RATING) * 0.15)));
}

/** Rough share of people below this IQ (normal distribution, mean 100, SD 15). */
export function iqPercentile(iq: number): number {
  const z = (iq - 100) / 15;
  // Abramowitz–Stegun approximation of the normal CDF.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.round((z > 0 ? 1 - p : p) * 100);
}

export interface IqCandidate {
  id: string;
  category: string;
  rating: number;
}

/**
 * Next question: never seen before, closest to the user's current rating,
 * not the same category as the previous one; random among the 3 best so tests differ.
 */
export function pickIqItem(
  pool: IqCandidate[],
  userRating: number,
  seen: Set<string>,
  lastCategory: string | null,
  random: () => number = Math.random,
): IqCandidate | null {
  const fresh = pool.filter((i) => !seen.has(i.id));
  const candidates = fresh.length ? fresh : pool;
  if (!candidates.length) return null;

  const ranked = [...candidates].sort(
    (a, b) =>
      Math.abs(a.rating - userRating) +
      (a.category === lastCategory ? 150 : 0) -
      (Math.abs(b.rating - userRating) + (b.category === lastCategory ? 150 : 0)),
  );
  const top = ranked.slice(0, 3);
  return top[Math.floor(random() * top.length)];
}
