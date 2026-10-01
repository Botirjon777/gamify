import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { awardXp } from "@/features/gamification/xp";
import { notify } from "@/features/notifications/service";
import { TRACK_COMPLETE_XP, WEEKLY_BONUS_SHARE } from "@/features/events/service";

interface TrackRef {
  userId: string;
  tenantId: string;
  trackId: string;
  trackSlug: string;
  trackTitle: string;
  /** The track is this week's bonus topic → the reward is doubled. */
  weekly: boolean;
}

/**
 * Called after a first-time correct answer: when every published exercise of the track is now solved,
 * pay the one-time completion reward (+ the weekly bonus) and notify. Returns what was paid, or null.
 */
export async function completeTrackIfDone(tx: Prisma.TransactionClient, t: TrackRef) {
  const exercises = {
    status: "PUBLISHED" as const,
    skill: { module: { trackId: t.trackId } },
    OR: [{ tenantId: null }, { tenantId: t.tenantId }],
  };
  const total = await tx.exercise.count({ where: exercises });
  if (!total) return null;
  const solved = await tx.attempt.groupBy({ by: ["exerciseId"], where: { userId: t.userId, correct: true, exercise: exercises } });
  if (solved.length < total) return null;
  if (await tx.xpEvent.findFirst({ where: { userId: t.userId, reason: "TRACK_COMPLETE", refId: t.trackId } })) return null;

  const base = await awardXp(tx, { userId: t.userId, tenantId: t.tenantId, amount: TRACK_COMPLETE_XP, reason: "TRACK_COMPLETE", refId: t.trackId });
  const bonus = t.weekly
    ? await awardXp(tx, {
        userId: t.userId,
        tenantId: t.tenantId,
        amount: Math.round(base.awarded * WEEKLY_BONUS_SHARE),
        reason: "WEEKLY_BONUS",
        refId: `track:${t.trackId}`,
      })
    : null;
  await notify(tx, t.userId, "TRACK_COMPLETED", { track: t.trackTitle, trackSlug: t.trackSlug, xp: base.awarded + (bonus?.awarded ?? 0) });
  return { title: t.trackTitle, xp: base.awarded, bonus: bonus?.awarded ?? 0, level: bonus?.level ?? base.level, leveledUp: base.leveledUp || !!bonus?.leveledUp };
}
