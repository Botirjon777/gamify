"use client";

import { create } from "zustand";
import type { Submission } from "./content-schema";
import type { ClientExercise, SubmitResult } from "./types";

type Phase = "loading" | "answering" | "checking" | "feedback" | "empty" | "error";

interface DrillState {
  skillId: string | null;
  phase: Phase;
  exercise: ClientExercise | null;
  /** Current answer being built; null = nothing to check yet. */
  draft: Submission | null;
  result: SubmitResult | null;
  shownAt: number;
  /** Exercise ids shown this session, so the picker can avoid repeats. */
  recentIds: string[];
  mastery: number;
  sessionXp: number;
  answered: number;
  correct: number;
  combo: number;
  /** Increments every time a new exercise is shown (React key for resetting inputs). */
  round: number;

  start: (skillId: string, mastery: number) => void;
  setLoading: () => void;
  setExercise: (exercise: ClientExercise | null) => void;
  setDraft: (draft: Submission | null) => void;
  setChecking: () => void;
  setResult: (result: SubmitResult) => void;
  setError: () => void;
}

export const useDrill = create<DrillState>()((set) => ({
  skillId: null,
  phase: "loading",
  exercise: null,
  draft: null,
  result: null,
  shownAt: 0,
  recentIds: [],
  mastery: 0,
  sessionXp: 0,
  answered: 0,
  correct: 0,
  combo: 0,
  round: 0,

  start: (skillId, mastery) =>
    set({
      skillId,
      mastery,
      phase: "loading",
      exercise: null,
      draft: null,
      result: null,
      recentIds: [],
      sessionXp: 0,
      answered: 0,
      correct: 0,
      combo: 0,
    }),

  setLoading: () => set({ phase: "loading" }),

  setExercise: (exercise) =>
    set((s) => ({
      exercise,
      phase: exercise ? "answering" : "empty",
      draft: null,
      result: null,
      shownAt: Date.now(),
      round: s.round + 1,
      recentIds: exercise ? [...s.recentIds, exercise.id].slice(-20) : s.recentIds,
    })),

  setDraft: (draft) => set({ draft }),

  setChecking: () => set({ phase: "checking" }),

  setResult: (result) =>
    set((s) => ({
      result,
      phase: "feedback",
      mastery: result.mastery,
      sessionXp: s.sessionXp + result.xp + result.bonusXp + (result.trackCompleted?.xp ?? 0),
      answered: s.answered + 1,
      correct: s.correct + (result.correct ? 1 : 0),
      combo: result.correct ? s.combo + 1 : 0,
    })),

  setError: () => set({ phase: "error" }),
}));
