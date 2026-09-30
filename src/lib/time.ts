/** Asia/Tashkent is UTC+5 all year (no DST), so plain offset math is safe. */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's Tashkent calendar date as a UTC-midnight Date (matches Postgres `@db.Date`). */
export function tashkentToday(now = new Date()): Date {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
}

/** Monday of the current Tashkent week (weekly leaderboards reset Monday 00:00). */
export function tashkentWeekStart(now = new Date()): Date {
  const today = tashkentToday(now);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return addDays(today, -daysSinceMonday);
}

export function sameDay(a: Date | null | undefined, b: Date): boolean {
  return !!a && a.getTime() === b.getTime();
}
