"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { answerIq, startIq } from "../actions";
import { IQ_QUESTIONS, IQ_SECONDS_PER_QUESTION, type IqKind, type IqResult, type IqState } from "../types";

export function IqTest({ kind, initial }: { kind: IqKind; initial: IqState | null }) {
  const t = useTranslations("iq");
  const [state, setState] = useState<IqState | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  /** Returns false when the request failed (the caller may let the user try again). */
  const run = useCallback(async (fn: () => Promise<IqState>) => {
    setBusy(true);
    setError(false);
    try {
      setState(await fn());
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  if (!state) {
    const intro = kind === "PLACEMENT" ? "placement" : "daily";
    return (
      <Card>
        <p className="text-5xl" aria-hidden>
          🧠
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{t(`${intro}.title`)}</h1>
        <p className="mt-3 leading-relaxed text-muted">{t(`${intro}.text`)}</p>
        <ul className="mt-6 grid gap-2 text-sm font-semibold sm:grid-cols-3">
          <Rule icon="❓">{t("rules.questions", { count: IQ_QUESTIONS[kind] })}</Rule>
          <Rule icon="⏱️">{t("rules.time", { seconds: IQ_SECONDS_PER_QUESTION })}</Rule>
          <Rule icon="➡️">{t("rules.noBack")}</Rule>
        </ul>
        {error && <p className="mt-5 text-sm text-danger">{t("error")}</p>}
        <Button onClick={() => run(() => startIq(kind))} disabled={busy} className="mt-8 h-12 w-full text-base sm:w-auto sm:px-10">
          {t("start")}
        </Button>
        <p className="mt-6 text-xs text-muted">{t("disclaimer")}</p>
      </Card>
    );
  }

  if (state.status === "FINISHED") return <Result result={state.result} />;

  return (
    <Question
      key={state.question.itemId}
      state={state}
      busy={busy}
      error={error}
      onAnswer={(choice) => run(() => answerIq(state.sessionId, state.question.itemId, choice))}
    />
  );
}

function Question({
  state,
  busy,
  error,
  onAnswer,
}: {
  state: Extract<IqState, { status: "ACTIVE" }>;
  busy: boolean;
  error: boolean;
  onAnswer: (choice: number | null) => Promise<boolean>;
}) {
  const t = useTranslations("iq");
  const q = state.question;
  const [deadline] = useState(() => Date.now() + q.secondsLeft * 1000);
  const [left, setLeft] = useState(q.secondsLeft);
  const [picked, setPicked] = useState<number | null>(null);
  const sent = useRef(false);

  const answer = useCallback(
    async (choice: number | null) => {
      if (sent.current) return;
      sent.current = true;
      setPicked(choice);
      if (!(await onAnswer(choice))) {
        // Request failed — let the user answer again.
        sent.current = false;
        setPicked(null);
      }
    },
    [onAnswer],
  );

  // Countdown; at zero the question is submitted as "time ran out" (the server enforces it anyway).
  useEffect(() => {
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(seconds);
      if (seconds === 0) void answer(null);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [answer, deadline]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) void answer(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, q.options.length]);

  const share = left / IQ_SECONDS_PER_QUESTION;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-muted">{t("question", { number: q.number, total: q.total })}</span>
        <span className={left <= 10 ? "text-danger" : "text-foreground"}>⏱️ {t("secondsLeft", { seconds: left })}</span>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: q.total }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < q.number - 1 ? "bg-brand" : i === q.number - 1 ? "bg-brand/40" : "bg-border"}`} />
        ))}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${left <= 10 ? "bg-danger" : "bg-xp"}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>

      <h1 className="mt-8 text-xl font-extrabold leading-snug sm:text-2xl">{q.prompt}</h1>
      {q.figure && (
        <p className="mt-5 rounded-2xl border border-border bg-surface px-4 py-6 text-center font-mono text-2xl font-bold tracking-wider sm:text-3xl">
          {q.figure}
        </p>
      )}

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {q.options.map((option, i) => (
          <button
            key={i}
            type="button"
            disabled={busy || picked !== null}
            onClick={() => void answer(i)}
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg font-semibold transition disabled:cursor-default ${
              picked === i ? "border-brand bg-brand/10" : "border-border bg-surface hover:border-brand/40"
            }`}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border text-xs font-bold text-muted">
              {i + 1}
            </span>
            {/* Symbol answers (◐ ▲ →) need to be as big as the figure to be readable. */}
            <span className={[...option].length <= 2 ? "font-mono text-3xl leading-none" : ""}>{option}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 h-5 text-center text-sm text-muted">
        {error ? <span className="text-danger">{t("error")}</span> : busy ? (left === 0 ? t("timeUp") : t("submitting")) : null}
      </p>
    </div>
  );
}

function Result({ result }: { result: IqResult }) {
  const t = useTranslations("iq.result");
  return (
    <Card>
      {result.kind === "DAILY" && <p className="text-sm font-semibold text-success">{t("doneToday")}</p>}
      <p className="mt-2 text-sm font-bold uppercase tracking-wider text-muted">{t("title")}</p>
      <p className="mt-2 text-7xl font-extrabold tracking-tight text-brand sm:text-8xl">{result.iq}</p>
      {result.iqBefore !== null && result.iqBefore !== result.iq && (
        <p className="mt-1 text-sm text-muted">
          {t("change", { before: result.iqBefore })}{" "}
          <span className={result.iq > result.iqBefore ? "font-bold text-success" : "font-bold text-danger"}>
            {result.iq > result.iqBefore ? "▲" : "▼"} {Math.abs(result.iq - result.iqBefore)}
          </span>
        </p>
      )}
      <p className="mt-4 leading-relaxed text-muted">{t("percentile", { percentile: result.percentile })}</p>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <Pill>{t("correct", { correct: result.correct, total: result.total })}</Pill>
        <Pill>{result.rank ? t("rank", { rank: result.rank }) : "—"}</Pill>
        <Pill className="text-xp">{t("xp", { xp: result.xp })}</Pill>
      </div>

      {result.kind === "DAILY" && <p className="mt-6 text-sm text-muted">{t("comeBack")}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard" className={buttonClass("primary", "h-12 sm:px-8")}>
          {t("toDashboard")}
        </Link>
        <Link href="/leaderboard?board=IQ" className={buttonClass("secondary", "h-12 sm:px-8")}>
          {t("toLeaderboard")}
        </Link>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-surface p-6 text-center shadow-xl shadow-brand/5 sm:p-10">
      {children}
    </div>
  );
}

function Rule({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-center gap-2 rounded-xl bg-background px-3 py-2.5">
      <span aria-hidden>{icon}</span>
      {children}
    </li>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-background px-2 py-3 text-xs font-bold sm:text-sm ${className}`}>{children}</div>;
}
