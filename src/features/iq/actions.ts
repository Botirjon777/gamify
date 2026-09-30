"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { tashkentToday } from "@/lib/time";
import { START_RATING, updateRatings, userK } from "./rating";
import { finishSession, isInTime, nextItemId, resultFromSession, toQuestion, withRank } from "./service";
import { IQ_QUESTIONS, IQ_SECONDS_PER_QUESTION, type IqKind, type IqState } from "./types";

const kindSchema = z.enum(["PLACEMENT", "DAILY"]);

/** Current state for the IQ page: an active session to resume, today's finished result, or null (show intro). */
export async function getIqState(rawKind: IqKind): Promise<IqState | null> {
  const kind = kindSchema.parse(rawKind);
  const { user, tenant } = await requireSession();
  const locale = await getLocale();

  const active = await db.iqSession.findFirst({ where: { userId: user.id, kind, status: "ACTIVE" } });
  if (active) {
    return { status: "ACTIVE", sessionId: active.id, kind, question: await toQuestion(db, active, locale) };
  }

  const finished =
    kind === "PLACEMENT"
      ? await db.iqSession.findFirst({ where: { userId: user.id, kind, status: "FINISHED" }, orderBy: { finishedAt: "desc" } })
      : await db.iqSession.findFirst({
          where: { userId: user.id, kind, status: "FINISHED", startedAt: { gte: dayStartUtc() } },
          orderBy: { finishedAt: "desc" },
        });
  if (finished) return { status: "FINISHED", result: await withRank(resultFromSession(finished), user.id, tenant.id) };
  return null;
}

export async function startIq(rawKind: IqKind): Promise<IqState> {
  const kind = kindSchema.parse(rawKind);
  const { user, tenant } = await requireSession();

  const existing = await getIqState(kind);
  if (existing) return existing; // resume, or already done (placement once, daily once a day)

  if (kind === "PLACEMENT" && user.iqTestedAt) throw new Error("Placement test already taken");
  if (kind === "DAILY" && !user.iqTestedAt) throw new Error("Take the placement test first");

  await db.$transaction(async (tx) => {
    if (kind === "DAILY") {
      // One daily IQ test per Tashkent day — the primary key makes this race-safe.
      const claim = await tx.dailyClaim.createMany({
        data: { userId: user.id, day: tashkentToday(), kind: "IQ" },
        skipDuplicates: true,
      });
      if (claim.count === 0) throw new Error("Daily IQ test already taken today");
    }

    const rating = kind === "PLACEMENT" ? START_RATING : user.iqRating;
    const first = await nextItemId(tx, user.id, rating, null);
    if (!first) throw new Error("No IQ items available");

    await tx.iqSession.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        kind,
        total: IQ_QUESTIONS[kind],
        ratingBefore: rating,
        currentItemId: first,
        currentShownAt: new Date(),
      },
    });
    if (kind === "PLACEMENT") await tx.user.update({ where: { id: user.id }, data: { iqRating: rating } });
  });

  return (await getIqState(kind))!;
}

/** Answer the current question (`choice = null` → time ran out). Returns the next question or the result. */
export async function answerIq(sessionId: string, itemId: string, rawChoice: number | null): Promise<IqState> {
  const { user, tenant } = await requireSession();
  const locale = await getLocale();
  const choice = z.number().int().min(0).max(10).nullable().parse(rawChoice);

  const limit = await getRateLimiter().hit(`iq:${user.id}`, 30, 60);
  if (!limit.ok) throw new Error("Too many answers");

  const outcome = await db.$transaction(async (tx) => {
    const session = await tx.iqSession.findFirst({ where: { id: sessionId, userId: user.id } });
    if (!session) throw new Error("Session not found");
    if (session.status === "FINISHED") return { finished: resultFromSession(session) };

    // Claim the current question atomically — a double submit finds nothing to claim and just gets the current state.
    const claimed = await tx.iqSession.updateMany({
      where: { id: session.id, status: "ACTIVE", currentItemId: itemId },
      data: { currentItemId: null },
    });
    if (claimed.count === 0) return { current: true as const };

    const item = await tx.iqItem.findUniqueOrThrow({ where: { id: itemId } });
    const now = Date.now();
    const inTime = isInTime(session.currentShownAt!, now);
    const correct = inTime && choice !== null && choice === item.answer;

    const me = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const ratings = updateRatings(me.iqRating, item.rating, correct, userK(session.kind, session.answered));

    await tx.iqAttempt.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        itemId,
        choice: inTime ? choice : null,
        correct,
        timeMs: Math.min(now - session.currentShownAt!.getTime(), (IQ_SECONDS_PER_QUESTION + 5) * 1000),
        ratingBefore: me.iqRating,
        ratingAfter: ratings.user,
      },
    });
    await tx.iqItem.update({
      where: { id: itemId },
      data: { rating: ratings.item, timesAnswered: { increment: 1 }, timesCorrect: { increment: correct ? 1 : 0 } },
    });
    await tx.user.update({ where: { id: user.id }, data: { iqRating: ratings.user } });

    const updated = await tx.iqSession.update({
      where: { id: session.id },
      data: { answered: { increment: 1 }, correct: { increment: correct ? 1 : 0 } },
    });

    if (updated.answered >= updated.total) {
      return { finished: await finishSession(tx, updated, { ...me, iqRating: ratings.user }, ratings.user) };
    }

    const next = await nextItemId(tx, user.id, ratings.user, itemId);
    if (!next) {
      return { finished: await finishSession(tx, updated, { ...me, iqRating: ratings.user }, ratings.user) };
    }
    await tx.iqSession.update({ where: { id: session.id }, data: { currentItemId: next, currentShownAt: new Date() } });
    return { current: true as const };
  });

  if ("finished" in outcome && outcome.finished) {
    revalidatePath("/", "layout");
    return { status: "FINISHED", result: await withRank(outcome.finished, user.id, tenant.id) };
  }
  const session = await db.iqSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (session.status === "FINISHED") {
    return { status: "FINISHED", result: await withRank(resultFromSession(session), user.id, tenant.id) };
  }
  return { status: "ACTIVE", sessionId, kind: session.kind, question: await toQuestion(db, session, locale) };
}

/** Hide the "take the IQ test" invitation on the dashboard (the test itself stays available). */
export async function hideIqPrompt() {
  const { user } = await requireSession();
  await db.user.update({ where: { id: user.id }, data: { iqPromptHiddenAt: new Date() } });
  revalidatePath("/dashboard");
}

/** UTC instant of today's 00:00 in Tashkent. */
function dayStartUtc() {
  return new Date(tashkentToday().getTime() - 5 * 60 * 60 * 1000);
}
