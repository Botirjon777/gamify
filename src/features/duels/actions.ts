"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { submissionSchema } from "@/features/learn/content-schema";
import { toClientExercise } from "@/features/learn/client-exercise";
import type { Reveal } from "@/features/learn/check";
import type { ClientExercise } from "@/features/learn/types";
import { acceptDuel, answerQuestion, createDuel, currentQuestion, declineDuel, type DuelError } from "./service";

const id = z.string().min(1).max(40);

export type CreateDuelState = { redirectTo?: string; error?: DuelError };

export async function createDuelAction(_prev: CreateDuelState, formData: FormData): Promise<CreateDuelState> {
  const { user, tenant } = await requireSession();
  const parsed = z
    .object({ opponentId: id, trackId: id, stake: z.coerce.number().int() })
    .safeParse({ opponentId: formData.get("opponentId"), trackId: formData.get("trackId"), stake: formData.get("stake") });
  if (!parsed.success) return { error: "notFound" };

  const limit = await getRateLimiter().hit(`duel-create:${user.id}`, 15, 24 * 60 * 60);
  if (!limit.ok) return { error: "tooMany" };

  const r = await createDuel({ challengerId: user.id, tenantId: tenant.id, ...parsed.data });
  if ("error" in r && r.error) return r.error === "alreadyOpen" && r.duelId ? { redirectTo: `/duels/${r.duelId}` } : { error: r.error };
  // No revalidatePath: the client navigates to the duel and refreshes.
  return { redirectTo: `/duels/${r.duelId}` };
}

export async function acceptDuelAction(duelId: string): Promise<{ error?: DuelError }> {
  const { user } = await requireSession();
  const error = await acceptDuel(id.parse(duelId), user.id);
  if (error) return { error };
  revalidatePath("/", "layout");
  return {};
}

export async function declineDuelAction(duelId: string): Promise<{ error?: DuelError }> {
  const { user } = await requireSession();
  const error = await declineDuel(id.parse(duelId), user.id);
  if (error) return { error };
  revalidatePath("/", "layout");
  return {};
}

export interface DuelQuestion {
  index: number;
  total: number;
  exercise: ClientExercise;
  /** Seconds left on this question (the clock keeps running across reloads). */
  secondsLeft: number;
}

/** Starts the run on first call; returns the question to answer now, or null when done. */
export async function getDuelQuestion(duelId: string): Promise<DuelQuestion | null> {
  const { user } = await requireSession();
  const q = await currentQuestion(id.parse(duelId), user.id);
  if (!q) return null;
  return {
    index: q.index,
    total: q.total,
    exercise: await toClientExercise(q.exercise, await getLocale()),
    secondsLeft: Math.max(0, Math.round((q.deadline.getTime() - Date.now()) / 1000)),
  };
}

export type DuelAnswerResult = { correct: boolean; reveal: Reveal; late: boolean; finished: boolean } | { error: "forbidden" };

/** `submission` null = time ran out. */
export async function submitDuelAnswer(duelId: string, index: number, submission: unknown): Promise<DuelAnswerResult> {
  const { user } = await requireSession();
  const sub = submission === null ? null : submissionSchema.parse(submission);
  return answerQuestion(id.parse(duelId), user.id, z.number().int().min(0).max(50).parse(index), sub);
}
