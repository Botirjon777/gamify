"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Award, CircleCheck, CircleX, Flame, Gauge, PartyPopper, Sparkles, Trophy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SoundToggle } from "@/components/sound-toggle";
import { playSound } from "@/lib/sound";
import { getNextExercise, leaveDrill, submitAnswer } from "../actions";
import { useDrill } from "../store";
import type { Reveal } from "../check";
import type { ClientExercise } from "../types";
import { ExerciseView } from "./exercise-views";

interface Props {
  skillId: string;
  skillHref: string;
  skillTitle: string;
  initialMastery: number;
}

export function DrillSession({ skillId, skillHref, skillTitle, initialMastery }: Props) {
  const t = useTranslations("drill");
  const router = useRouter();
  const s = useDrill();
  const [checkError, setCheckError] = useState(false);

  // Only the latest request may update the screen — a slow earlier response (StrictMode double mount,
  // double Enter) must not replace an exercise the user already started answering.
  const requestId = useRef(0);
  const loadNext = useCallback(async () => {
    const id = ++requestId.current;
    const { setLoading, setExercise, setError, recentIds } = useDrill.getState();
    setLoading();
    try {
      const exercise = await getNextExercise(skillId, recentIds);
      if (id === requestId.current) setExercise(exercise);
    } catch {
      if (id === requestId.current) setError();
    }
  }, [skillId]);

  // Fresh session on mount.
  useEffect(() => {
    useDrill.getState().start(skillId, initialMastery);
    void loadNext();
  }, [skillId, initialMastery, loadNext]);

  const check = useCallback(async () => {
    const { exercise, draft, shownAt, setChecking, setResult } = useDrill.getState();
    if (!exercise || !draft) return;
    setChecking();
    setCheckError(false);
    try {
      const result = await submitAnswer(exercise.id, draft, Date.now() - shownAt);
      setResult(result);
      // The biggest thing that just happened wins.
      playSound(!result.correct ? "wrong" : result.trackCompleted ? "complete" : result.leveledUp || result.badges.length ? "levelUp" : "correct");
    } catch {
      setCheckError(true);
      useDrill.setState({ phase: "answering" });
    }
  }, []);

  // Enter = check / continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const { phase, draft } = useDrill.getState();
      if (phase === "answering" && draft) {
        e.preventDefault();
        void check();
      } else if (phase === "feedback") {
        e.preventDefault();
        void loadNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [check, loadNext]);

  const locked = s.phase === "feedback" || s.phase === "checking";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:gap-4">
          <Link
            href={skillHref}
            aria-label={t("close")}
            onClick={async (e) => {
              // Answers don't revalidate (too costly per answer) — drop cached pages once on the way out,
              // so mastery / XP on the pages we go back to are fresh.
              e.preventDefault();
              await leaveDrill();
              router.push(skillHref);
            }}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-xl text-muted hover:bg-surface hover:text-foreground"
          >
            <X className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-xs font-semibold">
              <span className="truncate text-muted">{skillTitle}</span>
              <span className="text-brand">{Math.round(s.mastery)}%</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-grad-brand transition-[width] duration-700 ease-out"
                style={{ width: `${s.mastery}%` }}
              />
            </div>
          </div>
          {s.combo >= 2 && (
            <span className="shrink-0 rounded-full bg-streak/10 px-2.5 py-1 text-xs font-bold text-streak">
              <Flame className="mr-1 inline size-3.5" />
              {t("combo", { count: s.combo })}
            </span>
          )}
          <span className="shrink-0 text-sm font-bold text-xp">+{s.sessionXp} XP</span>
          <SoundToggle className="-mr-2" />
        </div>
      </header>

      {/* Exercise */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-48 pt-6 sm:pt-10">
        {s.phase === "loading" && <p className="py-20 text-center text-muted">{t("loading")}</p>}
        {s.phase === "empty" && <p className="py-20 text-center text-muted">{t("empty")}</p>}
        {s.phase === "error" && (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-muted">{t("error")}</p>
            <Button onClick={loadNext}>{t("retry")}</Button>
          </div>
        )}
        {s.exercise && s.phase !== "loading" && s.phase !== "error" && (
          <ExerciseBody
            key={s.round}
            exercise={s.exercise}
            locked={locked}
            reveal={s.result?.reveal ?? null}
          />
        )}
      </main>

      {/* Bottom action bar */}
      {s.exercise && (s.phase === "answering" || s.phase === "checking" || s.phase === "feedback") && (
        <footer
          className={`fixed inset-x-0 bottom-0 border-t-2 pb-[env(safe-area-inset-bottom)] ${
            s.phase === "feedback"
              ? s.result?.correct
                ? "border-success/30 bg-[#e9f9f0]"
                : "border-danger/30 bg-[#fdecec]"
              : "border-border bg-surface"
          }`}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:py-5">
            {s.phase === "feedback" && s.result ? (
              <Feedback exercise={s.exercise} />
            ) : (
              <p className="hidden text-sm text-muted sm:block">
                {checkError ? <span className="text-danger">{t("error")}</span> : t("session", { correct: s.correct, total: s.answered })}
              </p>
            )}
            {s.phase === "feedback" ? (
              <Button
                onClick={loadNext}
                autoFocus
                className={`h-12 w-full shrink-0 sm:w-44 ${s.result?.correct ? "bg-success!" : "bg-danger!"}`}
              >
                {t("continue")}
              </Button>
            ) : (
              <Button onClick={check} disabled={!s.draft || s.phase === "checking"} className="h-12 w-full shrink-0 sm:w-44">
                {t("check")}
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

function ExerciseBody({ exercise, locked, reveal }: { exercise: ClientExercise; locked: boolean; reveal: Reveal | null }) {
  const t = useTranslations("drill");
  const setDraft = useDrill((s) => s.setDraft);
  const props = { locked, reveal, onDraft: setDraft };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          {t(`types.${exercise.type}`)} · {t(`difficulty.${exercise.difficulty}`)}
        </p>
        <h1 className="mt-2 font-sans text-xl font-bold leading-snug tracking-tight sm:text-2xl">{exercise.prompt}</h1>
      </div>
      <ExerciseView exercise={exercise} {...props} />
    </div>
  );
}

function Feedback({ exercise }: { exercise: ClientExercise }) {
  const t = useTranslations("drill");
  const tb = useTranslations("badges");
  const result = useDrill((s) => s.result)!;
  const answer = revealText(exercise, result.reveal);

  return (
    <div className={`min-w-0 flex-1 ${result.correct ? "text-[#0b7a47]" : "text-[#b42318]"}`}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-bold">
        {result.correct ? <CircleCheck className="size-6" /> : <CircleX className="size-6" />}
        {result.correct ? t("correct") : t("wrong")}
        {result.xp > 0 && <span className="text-base text-xp">{t("xp", { xp: result.xp })}</span>}
        {result.bonusXp > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-grad-gold px-2 py-0.5 text-xs text-white">
            <Sparkles className="size-3.5" /> {t("weeklyBonus", { xp: result.bonusXp })}
          </span>
        )}
        {result.leveledUp && (
          <span className="inline-flex items-center gap-1 text-base text-brand">
            <PartyPopper className="size-4" /> {t("levelUp", { level: result.level })}
          </span>
        )}
      </p>
      {!result.correct && answer && (
        <div className="mt-1.5 text-sm">
          <span className="font-semibold">{t("correctAnswer")} </span>
          {answer.includes("\n") ? (
            <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-white/60 p-2 font-mono text-xs">{answer}</pre>
          ) : (
            <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono">{answer}</code>
          )}
        </div>
      )}
      {result.explanation && <p className="mt-1.5 max-h-32 overflow-auto text-sm leading-relaxed">{result.explanation}</p>}
      {result.capped && (
        <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-foreground">
          <Gauge className="size-4 text-xp" /> {t("capped")}
          <Link href="/plans" className="text-brand underline">
            {t("upgrade")}
          </Link>
        </p>
      )}
      {result.trackCompleted && (
        <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-grad-success px-2.5 py-1.5 text-xs font-bold text-white">
          <Trophy className="size-4" /> {t("trackCompleted", { track: result.trackCompleted.title, xp: result.trackCompleted.xp })}
        </p>
      )}
      {result.badges.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-2">
          {result.badges.map((b) => (
            <span key={b} className="inline-flex items-center gap-1 rounded-full bg-grad-xp px-2.5 py-1 text-xs font-bold text-white">
              <Award className="size-3.5" /> {t("badgeEarned", { badge: tb(`${b}.title`) })}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function revealText(exercise: ClientExercise, reveal: Reveal): string | null {
  switch (reveal.type) {
    case "CHOICE":
      return exercise.type === "CHOICE" ? (exercise.options.find((o) => o.index === reveal.index)?.text ?? null) : null;
    case "OUTPUT":
      return reveal.answer;
    case "FILL":
      return reveal.blanks.join(" · ");
    case "ORDER":
      return reveal.lines.join("\n");
    case "MOVE":
      return reveal.san;
  }
}
