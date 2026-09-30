import "server-only";
import type { IqSession, Prisma, User } from "@/generated/prisma/client";
import { localized, type LocalizedText } from "@/i18n/content";
import { tashkentWeekStart } from "@/lib/time";
import { getLeaderboardStore } from "@/lib/leaderboard";
import { awardXp } from "@/features/gamification/xp";
import type { IqPublicContent } from "./content-schema";
import { iqFromRating, iqPercentile, pickIqItem } from "./rating";
import { IQ_SECONDS_PER_QUESTION, type IqKind, type IqQuestion, type IqResult } from "./types";

type Tx = Prisma.TransactionClient;

/** Answers arriving later than this after the deadline count as "time ran out". */
const GRACE_MS = 5_000;
export const PLACEMENT_XP = 50;
export const DAILY_XP_PER_CORRECT = 5;

export function isInTime(shownAt: Date, now = Date.now()) {
  return now - shownAt.getTime() <= IQ_SECONDS_PER_QUESTION * 1000 + GRACE_MS;
}

/** Choose the next unseen question closest to the user's current rating. */
export async function nextItemId(tx: Tx, userId: string, rating: number, lastItemId: string | null) {
  const [pool, seen, last] = await Promise.all([
    tx.iqItem.findMany({ where: { status: "PUBLISHED" }, select: { id: true, category: true, rating: true } }),
    tx.iqAttempt.findMany({ where: { userId }, select: { itemId: true }, distinct: ["itemId"] }),
    lastItemId ? tx.iqItem.findUnique({ where: { id: lastItemId }, select: { category: true } }) : null,
  ]);
  return pickIqItem(pool, rating, new Set(seen.map((s) => s.itemId)), last?.category ?? null)?.id ?? null;
}

export async function toQuestion(tx: Tx, session: IqSession, locale: string): Promise<IqQuestion> {
  const item = await tx.iqItem.findUniqueOrThrow({ where: { id: session.currentItemId! } });
  const content = item.content as IqPublicContent;
  const elapsed = (Date.now() - session.currentShownAt!.getTime()) / 1000;
  return {
    itemId: item.id,
    number: session.answered + 1,
    total: session.total,
    prompt: localized(content.prompt, locale),
    figure: content.figure,
    options: content.options.map((o: LocalizedText) => localized(o, locale)),
    secondsLeft: Math.max(0, Math.round(IQ_SECONDS_PER_QUESTION - elapsed)),
  };
}

/** Close the session: IQ score, XP, weekly IQ board, placement flag. */
export async function finishSession(tx: Tx, session: IqSession, user: User, rating: number): Promise<Omit<IqResult, "rank">> {
  const kind = session.kind as IqKind;
  const iq = iqFromRating(rating);
  const xp = kind === "PLACEMENT" ? PLACEMENT_XP : session.correct * DAILY_XP_PER_CORRECT;

  await tx.iqSession.update({
    where: { id: session.id },
    data: { status: "FINISHED", finishedAt: new Date(), ratingAfter: rating, currentItemId: null, xpAwarded: xp },
  });
  await tx.user.update({
    where: { id: user.id },
    data: { iqRating: rating, ...(kind === "PLACEMENT" && { iqTestedAt: new Date() }) },
  });

  // Weekly IQ board = IQ of everyone who took a test this week.
  const week = tashkentWeekStart();
  await tx.weeklyScore.upsert({
    where: { userId_tenantId_week_board: { userId: user.id, tenantId: session.tenantId, week, board: "IQ" } },
    create: { userId: user.id, tenantId: session.tenantId, week, board: "IQ", value: iq },
    update: { value: iq },
  });

  if (xp > 0) {
    await awardXp(tx, { userId: user.id, tenantId: session.tenantId, amount: xp, reason: "IQ_TEST", refId: session.id });
  }

  return {
    kind,
    iq,
    iqBefore: kind === "PLACEMENT" ? null : iqFromRating(session.ratingBefore),
    correct: session.correct,
    total: session.total,
    percentile: iqPercentile(iq),
    xp,
  };
}

export async function withRank(result: Omit<IqResult, "rank">, userId: string, tenantId: string): Promise<IqResult> {
  const rank = await getLeaderboardStore().rankOf(userId, { board: "IQ", period: "all-time", tenantId });
  return { ...result, rank };
}

/** Result of an already finished session (e.g. reopening today's daily test). */
export function resultFromSession(session: IqSession): Omit<IqResult, "rank"> {
  const iq = iqFromRating(session.ratingAfter ?? session.ratingBefore);
  return {
    kind: session.kind as IqKind,
    iq,
    iqBefore: session.kind === "PLACEMENT" ? null : iqFromRating(session.ratingBefore),
    correct: session.correct,
    total: session.total,
    percentile: iqPercentile(iq),
    xp: session.xpAwarded,
  };
}
