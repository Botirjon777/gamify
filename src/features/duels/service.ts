import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { localized, type LocalizedText } from "@/i18n/content";
import { awardXp } from "@/features/gamification/xp";
import { notify } from "@/features/notifications/service";
import { checkAnswer } from "@/features/learn/check";
import type { PrivateAnswer, Submission } from "@/features/learn/content-schema";
import { shuffle } from "@/features/learn/client-exercise";
import { DUEL_HOURS, DUEL_QUESTIONS, DUEL_STAKES, QUESTION_SECONDS } from "./constants";

const HOUR_MS = 60 * 60 * 1000;
const NO_ANSWER: Submission = { type: "CHOICE", index: -1 };
const GRACE_MS = 5_000;

export type DuelError =
  | "notFound"
  | "self"
  | "notEnoughXp"
  | "opponentNotEnoughXp"
  | "alreadyOpen"
  | "noQuestions"
  | "tooMany"
  | "forbidden"
  | "expired"
  | "late";

export interface RunAnswer {
  correct: boolean;
  timeMs: number;
  /** When it was submitted (ISO) — the next question's clock starts here. */
  at: string;
}

const visibleTo = (tenantId: string) => ({ OR: [{ tenantId: null }, { tenantId }] });

// ─── Create / accept / decline ─────────────────────────────────────────────

export async function createDuel(input: { challengerId: string; opponentId: string; trackId: string; stake: number; tenantId: string }) {
  const { challengerId, opponentId, trackId, stake, tenantId } = input;
  if (challengerId === opponentId) return { error: "self" as const };
  if (!DUEL_STAKES.includes(stake as (typeof DUEL_STAKES)[number])) return { error: "notFound" as const };

  const [me, opponent, track] = await Promise.all([
    db.user.findUnique({ where: { id: challengerId } }),
    db.user.findFirst({ where: { id: opponentId, blockedAt: null, memberships: { some: { tenantId } } } }),
    db.track.findFirst({ where: { id: trackId, status: "PUBLISHED", ...visibleTo(tenantId) } }),
  ]);
  if (!me || !opponent || !track) return { error: "notFound" as const };
  if (me.xp < stake) return { error: "notEnoughXp" as const };
  if (opponent.xp < stake) return { error: "opponentNotEnoughXp" as const };

  const open = await db.duel.findFirst({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [
        { challengerId, opponentId },
        { challengerId: opponentId, opponentId: challengerId },
      ],
    },
  });
  if (open) return { error: "alreadyOpen" as const, duelId: open.id };

  const pool = await db.exercise.findMany({
    where: { status: "PUBLISHED", ...visibleTo(tenantId), skill: { module: { trackId } } },
    select: { id: true },
  });
  if (pool.length < DUEL_QUESTIONS) return { error: "noQuestions" as const };
  const questionIds = shuffle(pool.map((e) => e.id)).slice(0, DUEL_QUESTIONS);

  const duel = await db.$transaction(async (tx) => {
    const d = await tx.duel.create({
      data: { tenantId, challengerId, opponentId, trackId, stake, questionIds, expiresAt: new Date(Date.now() + DUEL_HOURS * HOUR_MS) },
    });
    await notify(tx, opponentId, "DUEL_INVITE", {
      username: me.username,
      track: localized(track.title as LocalizedText, "uz"),
      stake,
      duelId: d.id,
    });
    return d;
  });
  return { duelId: duel.id };
}

export async function acceptDuel(duelId: string, userId: string): Promise<DuelError | null> {
  const duel = await db.duel.findUnique({ where: { id: duelId }, include: { opponent: true } });
  if (!duel || duel.opponentId !== userId) return "notFound";
  if (duel.status !== "PENDING") return "forbidden";
  if (duel.expiresAt <= new Date()) return "expired";
  if (duel.opponent.xp < duel.stake) return "notEnoughXp";
  const { count } = await db.duel.updateMany({
    where: { id: duelId, status: "PENDING" },
    data: { status: "ACTIVE", acceptedAt: new Date(), expiresAt: new Date(Date.now() + DUEL_HOURS * HOUR_MS) },
  });
  return count ? null : "forbidden";
}

export async function declineDuel(duelId: string, userId: string): Promise<DuelError | null> {
  const duel = await db.duel.findUnique({ where: { id: duelId }, include: { opponent: { select: { username: true } } } });
  if (!duel || duel.opponentId !== userId) return "notFound";
  return db.$transaction(async (tx) => {
    const { count } = await tx.duel.updateMany({ where: { id: duelId, status: "PENDING" }, data: { status: "DECLINED", finishedAt: new Date() } });
    if (!count) return "forbidden";
    await notify(tx, duel.challengerId, "DUEL_DECLINED", { username: duel.opponent.username, duelId });
    return null;
  });
}

// ─── Playing ────────────────────────────────────────────────────────────────

/** The challenger may play right away; the opponent after accepting. */
const canPlay = (duel: { status: string; challengerId: string; opponentId: string }, userId: string) =>
  (duel.challengerId === userId && (duel.status === "PENDING" || duel.status === "ACTIVE")) ||
  (duel.opponentId === userId && duel.status === "ACTIVE");

/** Start (once) and return the current question index, or null when finished / not allowed. */
export async function currentQuestion(duelId: string, userId: string) {
  const duel = await db.duel.findUnique({ where: { id: duelId } });
  if (!duel || !canPlay(duel, userId) || duel.expiresAt <= new Date()) return null;

  const run = await db.duelRun.upsert({
    where: { duelId_userId: { duelId, userId } },
    create: { duelId, userId },
    update: {},
  });
  if (run.finishedAt) return null;
  const answers = run.answers as unknown as RunAnswer[];
  const index = answers.length;
  if (index >= duel.questionIds.length) return null;
  const startedAt = new Date(answers.at(-1)?.at ?? run.startedAt);
  const exercise = await db.exercise.findUniqueOrThrow({ where: { id: duel.questionIds[index] } });
  return { index, total: duel.questionIds.length, exercise, deadline: new Date(startedAt.getTime() + QUESTION_SECONDS * 1000) };
}

/** Answer question `index` (null = time ran out). Late answers count as wrong. */
export async function answerQuestion(duelId: string, userId: string, index: number, submission: Submission | null) {
  const duel = await db.duel.findUnique({ where: { id: duelId } });
  if (!duel || !canPlay(duel, userId)) return { error: "forbidden" as const };

  const result = await db.$transaction(async (tx) => {
    // Lock the run row: double clicks can't record two answers.
    await tx.$executeRaw`SELECT 1 FROM "DuelRun" WHERE "duelId" = ${duelId} AND "userId" = ${userId} FOR UPDATE`;
    const run = await tx.duelRun.findUnique({ where: { duelId_userId: { duelId, userId } } });
    if (!run || run.finishedAt) return { error: "forbidden" as const };
    const answers = run.answers as unknown as RunAnswer[];
    if (index !== answers.length || index >= duel.questionIds.length) return { error: "forbidden" as const };

    const now = new Date();
    const startedAt = new Date(answers.at(-1)?.at ?? run.startedAt);
    const timeMs = now.getTime() - startedAt.getTime();
    const late = timeMs > QUESTION_SECONDS * 1000 + GRACE_MS;

    const exercise = await tx.exercise.findUniqueOrThrow({ where: { id: duel.questionIds[index] } });
    // No answer (time ran out) is checked as an impossible choice — still gives us the reveal.
    const checked = checkAnswer(exercise.answer as PrivateAnswer, submission ?? NO_ANSWER);
    const correct = !late && !!submission && checked.correct;
    const next: RunAnswer[] = [...answers, { correct, timeMs: Math.min(timeMs, QUESTION_SECONDS * 1000), at: now.toISOString() }];
    const finished = next.length >= duel.questionIds.length;

    await tx.duelRun.update({
      where: { duelId_userId: { duelId, userId } },
      data: {
        answers: next as unknown as Prisma.InputJsonValue,
        correct: { increment: correct ? 1 : 0 },
        ...(finished && { finishedAt: now }),
      },
    });
    return { correct, reveal: checked.reveal, late, finished };
  });

  if ("finished" in result && result.finished) await resolveDuel(duelId);
  return result;
}

// ─── Results ────────────────────────────────────────────────────────────────

const totalTime = (run: { answers: unknown }) => (run.answers as RunAnswer[]).reduce((n, a) => n + a.timeMs, 0);

/** More correct answers wins; equal → less total time; equal again → draw. */
export function decideWinner(
  a: { userId: string; correct: number; timeMs: number },
  b: { userId: string; correct: number; timeMs: number },
): string | null {
  if (a.correct !== b.correct) return a.correct > b.correct ? a.userId : b.userId;
  if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs ? a.userId : b.userId;
  return null;
}

/**
 * Settle a duel once (advisory lock + status check): both finished → winner by score; past the deadline
 * with only one finished → that one wins; nobody finished → expired, no XP.
 */
export async function resolveDuel(duelId: string) {
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`duel:${duelId}`}))`;
      const duel = await tx.duel.findUnique({
        where: { id: duelId },
        include: { runs: true, challenger: { select: { username: true } }, opponent: { select: { username: true } } },
      });
      if (!duel || (duel.status !== "ACTIVE" && duel.status !== "PENDING")) return;

      const now = new Date();
      const done = duel.runs.filter((r) => r.finishedAt);
      const pastDeadline = duel.expiresAt <= now;

      if (duel.status === "PENDING") {
        // Invite never accepted: expires without XP.
        if (pastDeadline) await tx.duel.update({ where: { id: duelId }, data: { status: "EXPIRED", finishedAt: now } });
        return;
      }
      if (done.length < 2 && !pastDeadline) return;
      if (done.length === 0) {
        await tx.duel.update({ where: { id: duelId }, data: { status: "EXPIRED", finishedAt: now } });
        return;
      }

      const score = (userId: string) => {
        const run = done.find((r) => r.userId === userId);
        return { userId, correct: run ? run.correct : -1, timeMs: run ? totalTime(run) : Number.MAX_SAFE_INTEGER };
      };
      const winnerId = decideWinner(score(duel.challengerId), score(duel.opponentId));
      await tx.duel.update({ where: { id: duelId }, data: { status: "DONE", winnerId, finishedAt: now } });

      const players = [
        { id: duel.challengerId, other: duel.opponent.username },
        { id: duel.opponentId, other: duel.challenger.username },
      ];
      for (const p of players) {
        const result = winnerId === null ? "draw" : winnerId === p.id ? "win" : "lose";
        let xp = 0;
        if (result !== "draw") {
          const r = await awardXp(tx, {
            userId: p.id,
            tenantId: duel.tenantId,
            amount: result === "win" ? duel.stake : -duel.stake,
            reason: "DUEL",
            refId: duelId,
          });
          xp = r.awarded;
        }
        await notify(tx, p.id, "DUEL_RESULT", { username: p.other, result, xp, duelId });
      }
    },
    { timeout: 30_000 },
  );
}

/** Lazily settle this user's duels that ran past their deadline (no job runner needed). */
export async function settleExpired(userId: string) {
  const stale = await db.duel.findMany({
    where: { status: { in: ["PENDING", "ACTIVE"] }, expiresAt: { lte: new Date() }, OR: [{ challengerId: userId }, { opponentId: userId }] },
    select: { id: true },
  });
  for (const d of stale) await resolveDuel(d.id);
}
