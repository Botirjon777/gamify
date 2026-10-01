/** Pure season / weekly-topic math (no DB) — shared by the services and tests. */

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export const SEASON_MIN_MONTHS = 1;
export const SEASON_MAX_MONTHS = 3;

export interface SeasonLike {
  id: string;
  number: number;
  startsAt: Date;
  endsAt: Date;
}

export function activeSeason<T extends SeasonLike>(seasons: T[], now = new Date()): T | null {
  return seasons.find((s) => s.startsAt <= now && now < s.endsAt) ?? null;
}

/** Same Tashkent wall-clock time, `months` calendar months later (end of month clamps: 31 Jan + 1 → 28 Feb). */
export function addMonthsTashkent(date: Date, months: number): Date {
  const local = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  return new Date(local.getTime() - TASHKENT_OFFSET_MS);
}

/** Whole months between start and end, rounded (a season is 1–3 months long). */
export function seasonMonths(s: { startsAt: Date; endsAt: Date }): number {
  const months = Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / (30.44 * DAY_MS));
  return Math.min(SEASON_MAX_MONTHS, Math.max(SEASON_MIN_MONTHS, months));
}

/**
 * The season after `last`: starts when `last` ends — or at `now` (Tashkent midnight) if there was a gap —
 * and lasts as many months as `last` did.
 */
export function nextSeasonDates(last: { startsAt: Date; endsAt: Date }, now = new Date()) {
  let startsAt = last.endsAt;
  if (now.getTime() - startsAt.getTime() > DAY_MS) {
    const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
    startsAt = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TASHKENT_OFFSET_MS);
  }
  return { startsAt, endsAt: addMonthsTashkent(startsAt, seasonMonths(last)) };
}

export function daysLeft(endsAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS));
}

/** 0–1 share of the season that has passed. */
export function seasonProgress(s: { startsAt: Date; endsAt: Date }, now = new Date()): number {
  const total = s.endsAt.getTime() - s.startsAt.getTime();
  return total > 0 ? Math.min(1, Math.max(0, (now.getTime() - s.startsAt.getTime()) / total)) : 1;
}

/** Automatic weekly topic when an admin didn't pick one: walk through the tracks one week at a time. */
export function rotationIndex(week: Date, count: number): number {
  if (count <= 0) return -1;
  return Math.floor(week.getTime() / WEEK_MS) % count;
}
