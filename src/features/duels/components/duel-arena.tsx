"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, Clock, Loader2, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ChoiceView, FillView, OrderView, OutputView } from "@/features/learn/components/exercise-views";
import type { Submission } from "@/features/learn/content-schema";
import type { Reveal } from "@/features/learn/check";
import { getDuelQuestion, submitDuelAnswer, type DuelQuestion } from "../actions";
import { QUESTION_SECONDS } from "../constants";
import type { DuelPlayer } from "../queries";
import { Versus } from "./versus";

interface Props {
  duelId: string;
  me: DuelPlayer;
  them: DuelPlayer;
  stake: number;
  track: string;
  questions: number;
  /** Already started earlier (page reload mid-duel) → skip the intro. */
  resume: boolean;
}

type Phase = "intro" | "countdown" | "question" | "feedback" | "done";

/** Intro (VS) → 3-2-1 → five timed questions → back to the server for "waiting" / result. */
export function DuelArena({ duelId, me, them, stake, track, questions, resume }: Props) {
  const t = useTranslations("duels");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(resume ? "question" : "intro");
  const [count, setCount] = useState(3);
  const [q, setQ] = useState<DuelQuestion | null>(null);
  const [draft, setDraft] = useState<Submission | null>(null);
  const [left, setLeft] = useState(QUESTION_SECONDS);
  const [result, setResult] = useState<{ correct: boolean; reveal: Reveal; late: boolean } | null>(null);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);

  const load = useCallback(async () => {
    setBusy(true);
    const next = await getDuelQuestion(duelId);
    setBusy(false);
    if (!next) {
      setPhase("done");
      router.refresh();
      return;
    }
    submitted.current = false;
    setQ(next);
    setDraft(null);
    setResult(null);
    setLeft(next.secondsLeft);
    setPhase("question");
  }, [duelId, router]);

  const submit = useCallback(
    async (answer: Submission | null) => {
      if (!q || submitted.current) return;
      submitted.current = true;
      setBusy(true);
      const r = await submitDuelAnswer(duelId, q.index, answer);
      setBusy(false);
      if ("error" in r) {
        // Out of sync (another tab answered) — just reload the current state.
        void load();
        return;
      }
      setResult(r);
      setMarks((m) => [...m, r.correct]);
      setPhase("feedback");
    },
    [duelId, q, load],
  );

  // Resuming after a reload: fetch the question we're on.
  useEffect(() => {
    if (!resume) return;
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [resume, load]);

  // 3-2-1 countdown, then the first question.
  useEffect(() => {
    if (phase !== "countdown") return;
    // 3 → 2 → 1 → "Ketdik!" → first question
    const id = setTimeout(() => (count === 0 ? void load() : setCount((c) => c - 1)), 900);
    return () => clearTimeout(id);
  }, [phase, count, load]);

  // Question clock: at 0 the (possibly empty) answer is sent.
  useEffect(() => {
    if (phase !== "question" || !q) return;
    const id = setTimeout(() => (left <= 1 ? void submit(null) : setLeft((s) => s - 1)), left <= 0 ? 0 : 1000);
    return () => clearTimeout(id);
  }, [phase, q, left, submit]);

  // Enter (the phone keyboard's "send" too) = answer / next question.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || busy) return;
      if (phase === "question" && draft) {
        e.preventDefault();
        void submit(draft);
      } else if (phase === "feedback") {
        e.preventDefault();
        void load();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, draft, busy, submit, load]);

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-6">
        <Versus me={me} them={them} stake={stake} track={track} />
        <div className="rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">{t("rules", { questions, seconds: QUESTION_SECONDS })}</div>
        <Button className="animate-glow h-14 text-lg" onClick={() => setPhase("countdown")}>
          <Swords className="size-5" /> {t("start")}
        </Button>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="grid h-[60vh] place-items-center">
        <span
          key={count}
          className={`animate-count bg-grad-brand bg-clip-text font-display font-black leading-none text-transparent ${
            // A digit can be huge; the word has to fit a phone screen.
            count > 0 ? "text-[8rem] sm:text-[9rem]" : "text-5xl sm:text-7xl"
          }`}
        >
          {count > 0 ? count : t("go")}
        </span>
      </div>
    );
  }

  if (phase === "done" || !q) {
    return (
      <div className="grid h-[50vh] place-items-center text-muted">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  const ex = q.exercise;
  const view = { locked: phase === "feedback", reveal: result?.reveal ?? null, onDraft: setDraft };
  const danger = left <= 10;

  return (
    // pb: room for the fixed answer bar, so it never covers the last option.
    <div className="flex flex-col gap-4 pb-36 sm:gap-5">
      {/* Progress + clock */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: q.total }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full ${
                i < marks.length ? (marks[i] ? "bg-success" : "bg-danger") : i === q.index ? "bg-brand" : "bg-border"
              }`}
            />
          ))}
        </div>
        <span className={`inline-flex w-16 items-center justify-end gap-1 font-mono text-sm font-bold ${danger ? "text-danger" : "text-muted"}`}>
          <Clock className="size-4" /> {phase === "question" ? left : "—"}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${danger ? "bg-danger" : "bg-grad-brand"}`}
          style={{ width: `${phase === "question" ? (left / QUESTION_SECONDS) * 100 : 0}%` }}
        />
      </div>

      <div key={q.index} className="animate-page flex flex-col gap-4 sm:gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("question", { n: q.index + 1, total: q.total })}</p>
          {/* Body font (not the wide display face): long questions stay readable on a phone. */}
          <h1 className="mt-1.5 font-sans text-lg font-bold leading-snug tracking-tight sm:text-2xl">{ex.prompt}</h1>
        </div>
        {ex.type === "CHOICE" && <ChoiceView exercise={ex} {...view} />}
        {ex.type === "OUTPUT" && <OutputView exercise={ex} {...view} />}
        {ex.type === "FILL" && <FillView exercise={ex} {...view} />}
        {ex.type === "ORDER" && <OrderView exercise={ex} {...view} />}
      </div>

      {/* Answer bar: pinned to the bottom of the screen, like the drill. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          {phase === "feedback" && result ? (
            <>
              <p className={`flex flex-1 items-center gap-2 font-bold ${result.correct ? "text-success" : "text-danger"}`}>
                {result.correct ? <CircleCheck className="size-5" /> : <CircleX className="size-5" />}
                {result.correct ? t("correct") : result.late ? t("late") : t("wrong")}
              </p>
              <Button autoFocus className="h-12 shrink-0 px-6 sm:w-44" onClick={() => void load()} disabled={busy}>
                {q.index + 1 >= q.total ? t("finish") : t("next")}
              </Button>
            </>
          ) : (
            <>
              <p className="flex-1 text-sm text-muted">{t("score", { correct: marks.filter(Boolean).length, answered: marks.length })}</p>
              <Button className="h-12 shrink-0 px-6 sm:w-44" disabled={!draft || busy} onClick={() => void submit(draft)}>
                {t("answer")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
