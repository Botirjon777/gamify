"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { invalidateCache } from "@/lib/cache";
import { tashkentWeekStart } from "@/lib/time";
import type { AdminResult } from "@/features/admin/actions";
import { addMonthsTashkent, SEASON_MAX_MONTHS, SEASON_MIN_MONTHS } from "./season";
import { setWeeklyTopic } from "./service";

const months = z.number().int().min(SEASON_MIN_MONTHS).max(SEASON_MAX_MONTHS);
const refresh = () => revalidatePath("/", "layout");

/** Pick the bonus topic of a week (this one or a future one); empty trackId = back to automatic rotation. */
export async function setWeeklyTopicAction(weekIso: string, trackId: string): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  const parsed = z.object({ week: z.iso.date(), trackId: z.string().max(40) }).safeParse({ week: weekIso, trackId });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const week = new Date(`${parsed.data.week}T00:00:00Z`);
  if (week.getUTCDay() !== 1 || week < tashkentWeekStart()) return { ok: false, error: "invalid" };
  if (parsed.data.trackId && !(await db.track.findFirst({ where: { id: parsed.data.trackId, status: "PUBLISHED", tenantId: null } }))) {
    return { ok: false, error: "notFound" };
  }

  await setWeeklyTopic(week, parsed.data.trackId || null, admin.id);
  await audit(db, admin.id, "events.weeklyTopic", null, { week: parsed.data.week, trackId: parsed.data.trackId || null });
  refresh();
  return { ok: true };
}

/** Change how long the latest season runs (1–3 months from its start). */
export async function setSeasonLength(seasonId: string, length: number): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  if (!months.safeParse(length).success) return { ok: false, error: "invalid" };

  const [season, last] = await Promise.all([
    db.season.findUnique({ where: { id: seasonId } }),
    db.season.findFirst({ orderBy: { number: "desc" } }),
  ]);
  if (!season || season.id !== last?.id || season.finalizedAt) return { ok: false, error: "invalid" };
  const endsAt = addMonthsTashkent(season.startsAt, length);
  if (endsAt <= new Date()) return { ok: false, error: "seasonPast" };

  await db.season.update({ where: { id: season.id }, data: { endsAt } });
  await invalidateCache("season:");
  await audit(db, admin.id, "events.seasonLength", null, { season: season.number, months: length, endsAt: endsAt.toISOString() });
  refresh();
  return { ok: true };
}

/** Plan the next season right after the latest one. */
export async function planNextSeason(length: number): Promise<AdminResult> {
  const { user: admin } = await requireAdmin();
  if (!months.safeParse(length).success) return { ok: false, error: "invalid" };

  const last = await db.season.findFirst({ orderBy: { number: "desc" } });
  if (last && last.startsAt > new Date()) return { ok: false, error: "alreadyPlanned" };
  const startsAt = last && last.endsAt > new Date() ? last.endsAt : tashkentMidnightNow();
  const endsAt = addMonthsTashkent(startsAt, length);
  const number = (last?.number ?? 0) + 1;

  await db.season.createMany({ data: [{ number, startsAt, endsAt }], skipDuplicates: true });
  await invalidateCache("season:");
  await audit(db, admin.id, "events.planSeason", null, { season: number, months: length });
  refresh();
  return { ok: true };
}

function tashkentMidnightNow() {
  const offset = 5 * 60 * 60 * 1000;
  const local = new Date(Date.now() + offset);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset);
}
