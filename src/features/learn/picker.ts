import { targetDifficulty } from "./mastery";

export interface PoolItem {
  id: string;
  difficulty: number;
}

export interface History {
  /** Exercise id → was the most recent attempt correct? */
  lastResult: Map<string, boolean>;
}

/**
 * Pick the next exercise for Drill mode:
 * unseen > previously wrong > already solved, close to the target difficulty,
 * never one of the last few shown (unless the pool is tiny). Small jitter keeps it from feeling scripted.
 */
export function pickNext(
  pool: PoolItem[],
  history: History,
  mastery: number,
  recentIds: string[],
  random: () => number = Math.random,
): PoolItem | null {
  if (pool.length === 0) return null;

  const avoid = new Set(recentIds.slice(-Math.min(5, pool.length - 1)));
  const candidates = pool.filter((e) => !avoid.has(e.id));
  const target = targetDifficulty(mastery);

  let best: PoolItem | null = null;
  let bestScore = -Infinity;
  for (const e of candidates.length ? candidates : pool) {
    const last = history.lastResult.get(e.id);
    const freshness = last === undefined ? 3 : last === false ? 2 : 0;
    const score = freshness - Math.abs(e.difficulty - target) * 1.2 + random() * 0.9;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}
