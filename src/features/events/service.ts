import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { cached, invalidateCache } from "@/lib/cache";
import { tashkentWeekStart } from "@/lib/time";
import { localized, type LocalizedText } from "@/i18n/content";
import { notify } from "@/features/notifications/service";
import { activeSeason, nextSeasonDates, rotationIndex } from "./season";

type Db = Prisma.TransactionClient;

// ─── Seasons ────────────────────────────────────────────────────────────────

export interface SeasonInfo {
  id: string;
  number: number;
  startsAt: Date;
  endsAt: Date;
  finalizedAt: Date | null;
}

/**
 * All seasons, oldest first. Tiny table; cached and invalidated by the admin actions.
 * `client`: pass the transaction when called inside one — a cold cache must not grab a second
 * connection while the transaction holds one (that blocks when the pool is small).
 */
export const listSeasons = (client: Db = db) =>
  cached<SeasonInfo[]>("season:list", 300, () => client.season.findMany({ orderBy: { number: "asc" } }));

/**
 * The running season. When the last one has ended and nobody planned the next, the next one starts
 * automatically with the same length — leaderboards never sit without a season.
 */
export async function currentSeason(now = new Date(), client: Db = db): Promise<SeasonInfo | null> {
  const seasons = await listSeasons(client);
  const active = activeSeason(seasons, now);
  if (active || !seasons.length) return active;

  const last = seasons[seasons.length - 1];
  if (last.endsAt > now) return null; // planned for later
  await rollOver(last, now, client);
  return activeSeason(await listSeasons(client), now);
}

async function rollOver(last: SeasonInfo, now: Date, client: Db) {
  const { startsAt, endsAt } = nextSeasonDates(last, now);
  // Unique `number` makes concurrent roll-overs safe: only one insert wins.
  await client.season.createMany({ data: [{ number: last.number + 1, startsAt, endsAt }], skipDuplicates: true });
  await invalidateCache("season:");
}

/** Add XP to the running season's leaderboard (called from awardXp, inside its transaction). */
export async function addSeasonXp(tx: Db, userId: string, tenantId: string, amount: number) {
  const season = await currentSeason(new Date(), tx);
  if (!season) return;
  if (amount < 0) {
    // Duel losses: shrink, but never below 0.
    await tx.$executeRaw`
      UPDATE "SeasonScore" SET value = GREATEST(0, value + ${amount})
      WHERE "userId" = ${userId} AND "tenantId" = ${tenantId} AND "seasonId" = ${season.id}`;
    return;
  }
  await tx.seasonScore.upsert({
    where: { userId_tenantId_seasonId: { userId, tenantId, seasonId: season.id } },
    create: { userId, tenantId, seasonId: season.id, value: amount },
    update: { value: { increment: amount } },
  });
}

/**
 * Announce final ranks of seasons that have ended — once (advisory lock + finalizedAt).
 * Runs lazily on the first leaderboard / dashboard view after a season ends.
 */
export async function finalizeEndedSeasons(now = new Date()) {
  const pending = (await listSeasons()).filter((s) => !s.finalizedAt && s.endsAt <= now);
  for (const season of pending) {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`season-final:${season.id}`}))`;
        const fresh = await tx.season.findUniqueOrThrow({ where: { id: season.id } });
        if (fresh.finalizedAt) return;

        const scores = await tx.seasonScore.findMany({
          where: { seasonId: season.id, value: { gt: 0 } },
          orderBy: [{ tenantId: "asc" }, { value: "desc" }, { userId: "asc" }],
        });
        let tenant = "";
        let rank = 0;
        for (const s of scores) {
          rank = s.tenantId === tenant ? rank + 1 : 1;
          tenant = s.tenantId;
          await notify(tx, s.userId, "SEASON_RESULT", { season: season.number, rank, xp: Math.round(s.value) });
        }
        await tx.season.update({ where: { id: season.id }, data: { finalizedAt: new Date() } });
      },
      { timeout: 120_000 },
    );
  }
  if (pending.length) await invalidateCache("season:");
}

// ─── Weekly bonus topic ────────────────────────────────────────────────────

/** Exercise XP in the weekly topic earns this share again as WEEKLY_BONUS (1 = double). */
export const WEEKLY_BONUS_SHARE = 1;

export interface WeeklyTopic {
  week: Date;
  trackId: string;
  trackSlug: string;
  title: string;
  icon: string | null;
  /** true = picked by rotation, not by an admin. */
  auto: boolean;
}

const publishedGlobalTracks = () =>
  cached("weekly:tracks", 300, () =>
    db.track.findMany({
      where: { status: "PUBLISHED", tenantId: null },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
      select: { id: true, slug: true, title: true, icon: true },
    }),
  );

/** The bonus topic of the week starting `week` (Monday, Tashkent). */
export async function weeklyTopic(week = tashkentWeekStart(), locale = "uz"): Promise<WeeklyTopic | null> {
  const key = week.toISOString().slice(0, 10);
  const row = await cached(`weekly:topic:${key}`, 300, () =>
    db.weeklyTopic.findUnique({ where: { week }, include: { track: { select: { id: true, slug: true, title: true, icon: true, status: true } } } }),
  );
  const picked = row?.track.status === "PUBLISHED" ? row.track : null;
  const auto = !picked;
  let track: { id: string; slug: string; title: unknown; icon: string | null } | null = picked;
  if (!track) {
    const tracks = await publishedGlobalTracks();
    track = tracks[rotationIndex(week, tracks.length)] ?? null;
  }
  if (!track) return null;
  return { week, trackId: track.id, trackSlug: track.slug, title: localized(track.title as LocalizedText, locale), icon: track.icon, auto };
}

export async function setWeeklyTopic(week: Date, trackId: string | null, adminId: string) {
  if (trackId) {
    await db.weeklyTopic.upsert({ where: { week }, create: { week, trackId, setById: adminId }, update: { trackId, setById: adminId } });
  } else {
    await db.weeklyTopic.deleteMany({ where: { week } });
  }
  await invalidateCache("weekly:");
}

// ─── Track completion ──────────────────────────────────────────────────────

/** One-time reward for solving every exercise of a track (doubled when it's the weekly topic). */
export const TRACK_COMPLETE_XP = 100;
