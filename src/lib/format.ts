/**
 * Numbers and times as text, computed by hand instead of by `Intl`.
 * `toLocaleString("uz-UZ")` and next-intl's formatter depend on the locale data of whoever runs them: the server
 * knows Uzbek, many browsers (and phones) don't, so the same value came out differently on the two sides and
 * React reported a hydration mismatch. Client components use these; they give one answer everywhere.
 */

/** 13000 → "13 000" (non-breaking spaces, as Uzbek groups digits). */
export const groupDigits = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");

/** Asia/Tashkent is UTC+5 all year (no DST). */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const two = (n: number) => String(n).padStart(2, "0");

/** The Tashkent wall clock and calendar for an instant. `month` is 0–11. */
export function tashkentParts(date: Date) {
  const local = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return { day: local.getUTCDate(), month: local.getUTCMonth(), year: local.getUTCFullYear(), clock: `${two(local.getUTCHours())}:${two(local.getUTCMinutes())}` };
}

/** How long ago `date` was, in the largest unit that fits; after a week it is better shown as a date. */
export function timeAgo(date: Date, now: Date): { unit: "now" | "minutes" | "hours" | "days" | "date"; count: number } {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return { unit: "now", count: 0 };
  if (minutes < 60) return { unit: "minutes", count: minutes };
  if (minutes < 24 * 60) return { unit: "hours", count: Math.floor(minutes / 60) };
  const days = Math.floor(minutes / (24 * 60));
  return days <= 7 ? { unit: "days", count: days } : { unit: "date", count: days };
}
