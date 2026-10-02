import "server-only";
import type { IqSession, Prisma, User } from "@/generated/prisma/client";
import { localized, type LocalizedText } from "@/i18n/content";
import { cached } from "@/lib/cache";
import { db } from "@/lib/db";
import { tashkentWeekStart } from "@/lib/time";
import { getLeaderboardStore } from "@/lib/leaderboard";
import { mediaUrl } from "@/lib/media";
import { awardXp } from "@/features/gamification/xp";
import { evaluateBadges } from "@/features/badges/service";
import { DEFAULT_TYPICAL_ANSWER_MS, IQ_CHEER_PAUSE_MS, iqCheer, type IqCheer } from "./cheer";
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

/** How long people usually take per answer (timeouts aside) — what "faster than most" is measured against. */
export const typicalAnswerMs = () =>
  cached("iq:typical-answer-ms", 600, async () => {
    const { _avg, _count } = await db.iqAttempt.aggregate({ where: { choice: { not: null } }, _avg: { timeMs: true }, _count: true });
    return _count >= 100 && _avg.timeMs ? Math.round(_avg.timeMs) : DEFAULT_TYPICAL_ANSWER_MS;
  });

/**
 * After an answer: the encouragement due now (if any) and when the next question's clock starts.
 * `typicalMs` = typicalAnswerMs(), read before the transaction (it is a query of its own).
 */
export function nextQuestionStart(answered: number, total: number, startedAt: Date, typicalMs: number): { cheer: IqCheer | null; shownAt: Date } {
  const now = Date.now();
  const cheer = iqCheer({ answered, total, elapsedMs: now - startedAt.getTime(), typicalMs });
  return { cheer, shownAt: new Date(now + (cheer ? IQ_CHEER_PAUSE_MS : 0)) };
}

/** Seconds on the clock for a question shown at `shownAt` (which is in the future while a message is on screen). */
export function secondsLeft(shownAt: Date) {
  const elapsed = Math.max(0, Date.now() - shownAt.getTime()) / 1000;
  return Math.max(0, Math.round(IQ_SECONDS_PER_QUESTION - elapsed));
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

/** The stored question in the reader's language, pictures as URLs. */
export function questionContent(content: IqPublicContent, locale: string): Pick<IqQuestion, "prompt" | "figure" | "image" | "options" | "optionsImage"> {
  return {
    prompt: localized(content.prompt, locale),
    figure: content.figure,
    image: content.image && mediaUrl(content.image),
    options: content.options.map((o: LocalizedText) => localized(o, locale)),
    optionsImage: content.optionsImage && { ...content.optionsImage, src: mediaUrl(content.optionsImage.src) },
  };
}

export async function toQuestion(tx: Tx, session: IqSession, locale: string): Promise<IqQuestion> {
  const item = await tx.iqItem.findUniqueOrThrow({ where: { id: session.currentItemId! } });
  return {
    itemId: item.id,
    number: session.answered + 1,
    total: session.total,
    ...questionContent(item.content as IqPublicContent, locale),
    secondsLeft: secondsLeft(session.currentShownAt!),
  };
}

/** Close the session: IQ score, XP, weekly IQ board, placement flag. */
export async function finishSession(tx: Tx, session: IqSession, user: User, rating: number): Promise<Omit<IqResult, "rank">> {
  const kind = session.kind as IqKind;
  const iq = iqFromRating(rating);
  const baseXp = kind === "PLACEMENT" ? PLACEMENT_XP : session.correct * DAILY_XP_PER_CORRECT;

  await tx.iqSession.update({
    where: { id: session.id },
    data: { status: "FINISHED", finishedAt: new Date(), ratingAfter: rating, currentItemId: null },
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

  const xp = baseXp > 0
    ? (await awardXp(tx, { userId: user.id, tenantId: session.tenantId, amount: baseXp, reason: "IQ_TEST", refId: session.id })).awarded
    : 0;
  await tx.iqSession.update({ where: { id: session.id }, data: { xpAwarded: xp } });
  await evaluateBadges(tx, user.id, session.tenantId);

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
