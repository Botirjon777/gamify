"use server";

import { randomUUID } from "node:crypto";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { localized, type LocalizedText } from "@/i18n/content";
import { awardXp } from "@/features/gamification/xp";
import { touchStreak } from "@/features/gamification/streak";
import { BLANK, submissionSchema, type PrivateAnswer, type PublicContent, type Submission } from "./content-schema";
import { checkAnswer } from "./check";
import { highlight } from "./highlight";
import { nextMastery, reviewIntervalDays } from "./mastery";
import { pickNext } from "./picker";
import type { ClientExercise, SubmitResult } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Re-solving an exercise you already solved gives a fraction of its XP (anti-farming). */
const REPEAT_XP_SHARE = 0.2;

/** Global content + the current tenant's own content. */
const visibleTo = (tenantId: string) => ({ OR: [{ tenantId: null }, { tenantId }] });

/** Next exercise for Drill mode. `recentIds` = what this session just showed (client keeps the list). */
export async function getNextExercise(skillId: string, recentIds: string[]): Promise<ClientExercise | null> {
  const { user, tenant } = await requireSession();
  const locale = await getLocale();
  const recent = z.array(z.string()).max(50).parse(recentIds);

  const [pool, mastery] = await Promise.all([
    db.exercise.findMany({
      where: { skillId, status: "PUBLISHED", ...visibleTo(tenant.id) },
      select: { id: true, difficulty: true },
    }),
    db.skillMastery.findUnique({ where: { userId_skillId: { userId: user.id, skillId } } }),
  ]);

  // Most recent result per exercise (attempts ordered newest first → first one wins).
  const attempts = await db.attempt.findMany({
    where: { userId: user.id, exerciseId: { in: pool.map((e) => e.id) } },
    orderBy: { createdAt: "desc" },
    select: { exerciseId: true, correct: true },
  });
  const lastResult = new Map<string, boolean>();
  for (const a of attempts) if (!lastResult.has(a.exerciseId)) lastResult.set(a.exerciseId, a.correct);

  const picked = pickNext(pool, { lastResult }, mastery?.score ?? 0, recent);
  if (!picked) return null;

  const exercise = await db.exercise.findUniqueOrThrow({ where: { id: picked.id } });
  const content = exercise.content as PublicContent;
  const base = {
    id: exercise.id,
    difficulty: exercise.difficulty,
    xp: exercise.xp,
    prompt: localized(content.prompt, locale),
    lang: content.lang,
  };

  switch (content.type) {
    case "CHOICE":
      return {
        ...base,
        type: "CHOICE",
        codeHtml: content.code ? await highlight(content.code, content.lang) : undefined,
        options: content.options.map((o: LocalizedText) => localized(o, locale)),
      };
    case "OUTPUT":
      return { ...base, type: "OUTPUT", codeHtml: await highlight(content.code, content.lang) };
    case "FILL":
      return { ...base, type: "FILL", parts: content.code.split(BLANK) };
    case "ORDER": {
      // Never show the lines already in the correct order.
      const correctOrder = (exercise.answer as Extract<PrivateAnswer, { type: "ORDER" }>).lines.join("\n");
      let lines = shuffle(content.lines);
      for (let i = 0; i < 10 && lines.join("\n") === correctOrder; i++) lines = shuffle(content.lines);
      return { ...base, type: "ORDER", lines: lines.map((text) => ({ key: randomUUID(), text })) };
    }
  }
}

export async function submitAnswer(exerciseId: string, rawSubmission: Submission, timeMs: number): Promise<SubmitResult> {
  const { user, tenant } = await requireSession();
  const locale = await getLocale();
  const submission = submissionSchema.parse(rawSubmission);

  const limit = await getRateLimiter().hit(`submit:${user.id}`, 40, 60);
  if (!limit.ok) throw new Error("Too many submissions");

  const exercise = await db.exercise.findFirstOrThrow({
    where: { id: exerciseId, status: "PUBLISHED", ...visibleTo(tenant.id) },
  });
  const { correct, reveal } = checkAnswer(exercise.answer as PrivateAnswer, submission);

  return db.$transaction(async (tx) => {
    const solvedBefore = correct
      ? (await tx.attempt.count({ where: { userId: user.id, exerciseId, correct: true } })) > 0
      : false;
    const xp = correct ? (solvedBefore ? Math.max(1, Math.round(exercise.xp * REPEAT_XP_SHARE)) : exercise.xp) : 0;

    await tx.attempt.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        exerciseId,
        correct,
        answer: submission,
        timeMs: Math.max(0, Math.min(Math.round(timeMs), 3_600_000)),
        xpAwarded: xp,
      },
    });

    const prev = await tx.skillMastery.findUnique({
      where: { userId_skillId: { userId: user.id, skillId: exercise.skillId } },
    });
    const before = prev?.score ?? 0;
    const score = nextMastery(before, correct, exercise.difficulty);
    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + reviewIntervalDays(score) * DAY_MS);
    await tx.skillMastery.upsert({
      where: { userId_skillId: { userId: user.id, skillId: exercise.skillId } },
      create: {
        userId: user.id,
        skillId: exercise.skillId,
        score,
        attempts: 1,
        correct: correct ? 1 : 0,
        lastPracticedAt: now,
        nextReviewAt,
      },
      update: {
        score,
        attempts: { increment: 1 },
        correct: { increment: correct ? 1 : 0 },
        lastPracticedAt: now,
        nextReviewAt,
      },
    });

    await touchStreak(tx, user.id);
    const award = xp > 0
      ? await awardXp(tx, { userId: user.id, tenantId: tenant.id, amount: xp, reason: "EXERCISE", refId: exerciseId })
      : null;

    return {
      correct,
      reveal,
      explanation: exercise.explanation ? localized(exercise.explanation as LocalizedText, locale) : null,
      xp,
      firstSolve: correct && !solvedBefore,
      mastery: score,
      masteryBefore: before,
      level: award?.level ?? user.level,
      leveledUp: award?.leveledUp ?? false,
    };
  });
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
