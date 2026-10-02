"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Submission } from "../content-schema";
import type { Reveal } from "../check";
import type { ClientExercise } from "../types";
import { playSound } from "@/lib/sound";

type Of<T extends ClientExercise["type"]> = Extract<ClientExercise, { type: T }>;

interface ViewProps<T extends ClientExercise["type"]> {
  exercise: Of<T>;
  /** True once answered — inputs freeze and the reveal is shown. */
  locked: boolean;
  reveal: Reveal | null;
  onDraft: (draft: Submission | null) => void;
}

/** Plain-text exercises (`lang: text`) read like a card with wrapping text, not like a code editor. */
const isProse = (exercise: ClientExercise) => exercise.lang === "text";
const PROSE_BOX = "rounded-2xl border border-border bg-surface p-4 text-base leading-relaxed sm:p-5";

/** Generated on the server from our own content and escaped there (shiki, or plain escaping for prose). */
export function CodeBlock({ html, prose = false }: { html: string; prose?: boolean }) {
  return (
    <div
      className={
        prose
          ? `${PROSE_BOX} [&_code]:font-sans [&_pre]:whitespace-pre-wrap [&_pre]:break-words`
          : "overflow-hidden rounded-2xl text-[13px] leading-6 sm:text-sm [&_code]:font-mono [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:sm:p-5"
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ChoiceView({ exercise, locked, reveal, onDraft }: ViewProps<"CHOICE">) {
  const [selected, setSelected] = useState<number | null>(null);
  const correctIndex = reveal?.type === "CHOICE" ? reveal.index : null;

  const choose = (i: number) => {
    if (locked) return;
    playSound("tap");
    setSelected(i);
    onDraft({ type: "CHOICE", index: i });
  };

  // Number keys 1–6 pick an option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= exercise.options.length) choose(exercise.options[n - 1].index);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-4">
      {exercise.codeHtml && <CodeBlock html={exercise.codeHtml} prose={isProse(exercise)} />}
      <div className="grid gap-2.5">
        {exercise.options.map((option, position) => {
          // `index` identifies the option; the number shown is just its place on screen.
          const i = option.index;
          const state =
            locked && i === correctIndex
              ? "border-success bg-success/10"
              : locked && i === selected
                ? "border-danger bg-danger/10"
                : i === selected
                  ? "border-brand bg-brand/5"
                  : "border-border bg-surface hover:border-brand/40";
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => choose(i)}
              className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-medium transition ${state}`}
            >
              <span className="mt-px grid size-6 shrink-0 place-items-center rounded-lg border border-border text-xs font-bold text-muted">
                {position + 1}
              </span>
              <span className="min-w-0 break-words">{option.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OutputView({ exercise, locked, onDraft }: ViewProps<"OUTPUT">) {
  const t = useTranslations("drill");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  return (
    <div className="flex flex-col gap-4">
      <CodeBlock html={exercise.codeHtml} prose={isProse(exercise)} />
      <input
        ref={input}
        disabled={locked}
        placeholder={t("outputPlaceholder")}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        enterKeyHint="send"
        spellCheck={false}
        onChange={(e) => onDraft(e.target.value.trim() ? { type: "OUTPUT", text: e.target.value } : null)}
        className={`h-12 rounded-2xl border-2 border-border bg-surface px-4 text-base outline-none transition focus:border-brand disabled:opacity-80 ${isProse(exercise) ? "" : "font-mono"}`}
      />
    </div>
  );
}

export function FillView({ exercise, locked, reveal, onDraft }: ViewProps<"FILL">) {
  const blanks = exercise.parts.length - 1;
  const [values, setValues] = useState<string[]>(() => Array(blanks).fill(""));
  /** Word-bank mode: which bank word sits in each blank (index into `bank`), so equal words stay separate chips. */
  const [picked, setPicked] = useState<(number | null)[]>(() => Array(blanks).fill(null));
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const revealed = reveal?.type === "FILL" ? reveal.blanks : null;
  const bank = exercise.bank;

  const commit = (next: string[]) => {
    setValues(next);
    onDraft(next.every((v) => v.trim()) ? { type: "FILL", blanks: next } : null);
  };
  const update = (i: number, value: string) => commit(values.map((v, j) => (j === i ? value : v)));

  /** Put a bank word into the first empty blank / take a word back out of a blank. */
  const place = (word: number) => {
    const slot = picked.indexOf(null);
    if (locked || !bank || slot < 0) return;
    playSound("tap");
    setPicked(picked.map((p, j) => (j === slot ? word : p)));
    update(slot, bank[word]);
  };
  const clear = (slot: number) => {
    if (locked) return;
    setPicked(picked.map((p, j) => (j === slot ? null : p)));
    update(slot, "");
  };

  const prose = isProse(exercise);
  const Box = prose ? "p" : "pre";
  const field = prose
    ? "mx-1 rounded-lg border-2 border-border bg-background px-2 py-0.5 font-semibold outline-none focus:border-brand disabled:opacity-90"
    : "mx-0.5 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white outline-none focus:border-[var(--brand)] focus:bg-white/15 disabled:opacity-90";

  return (
    <div className="flex flex-col gap-4">
      <Box
        className={
          prose
            ? `${PROSE_BOX} whitespace-pre-wrap break-words leading-10`
            : "overflow-x-auto rounded-2xl bg-[#24292e] p-4 font-mono text-[13px] leading-8 text-[#e1e4e8] sm:p-5 sm:text-sm"
        }
      >
        {exercise.parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blanks &&
              (bank ? (
                <button
                  type="button"
                  disabled={locked || !values[i]}
                  title={revealed ? revealed[i] : undefined}
                  onClick={() => clear(i)}
                  className={`${field} inline-block min-w-16 text-center align-baseline`}
                >
                  {values[i] || " "}
                </button>
              ) : (
                <input
                  ref={i === 0 ? first : undefined}
                  value={values[i]}
                  disabled={locked}
                  title={revealed ? revealed[i] : undefined}
                  onChange={(e) => update(i, e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  enterKeyHint={i === blanks - 1 ? "send" : "next"}
                  spellCheck={false}
                  style={{ width: `${Math.max(6, values[i].length + 2)}ch` }}
                  className={field}
                />
              ))}
          </span>
        ))}
      </Box>

      {bank && !locked && (
        <div className="flex flex-wrap gap-2">
          {bank.map((word, w) => (
            <button
              key={w}
              type="button"
              disabled={picked.includes(w)}
              onClick={() => place(w)}
              className={`rounded-xl border-2 border-border bg-surface px-3.5 py-2 font-semibold transition hover:border-brand/40 disabled:opacity-30 ${prose ? "" : "font-mono text-sm"}`}
            >
              {word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderView({ exercise, locked, onDraft }: ViewProps<"ORDER">) {
  const t = useTranslations("drill");
  /** Keys of lines placed so far, in order. */
  const [placed, setPlaced] = useState<string[]>([]);
  const byKey = new Map(exercise.lines.map((l) => [l.key, l]));
  const pool = exercise.lines.filter((l) => !placed.includes(l.key));

  const commit = (next: string[]) => {
    setPlaced(next);
    onDraft(
      next.length === exercise.lines.length ? { type: "ORDER", lines: next.map((k) => byKey.get(k)!.text) } : null,
    );
  };

  const prose = isProse(exercise);
  const line = prose
    ? "block w-full rounded-lg px-3 py-2 text-left text-sm leading-relaxed transition sm:text-base"
    : "block w-full rounded-lg px-3 py-2 text-left font-mono text-[13px] whitespace-pre transition sm:text-sm";

  return (
    <div className="flex flex-col gap-4">
      <div className={`min-h-32 rounded-2xl p-3 sm:p-4 ${prose ? "border border-border bg-surface" : "bg-[#24292e]"}`}>
        {placed.length === 0 ? (
          <p className={`grid min-h-26 place-items-center text-sm ${prose ? "text-muted" : "text-white/50"}`}>{t("orderEmpty")}</p>
        ) : (
          placed.map((key, n) => (
            <button
              key={key}
              type="button"
              disabled={locked}
              onClick={() => commit(placed.filter((k) => k !== key))}
              className={`${line} ${prose ? "hover:bg-background" : "text-[#e1e4e8] hover:bg-white/10"}`}
            >
              {prose && <span className="mr-2 font-bold text-muted">{n + 1}.</span>}
              {byKey.get(key)!.text}
            </button>
          ))
        )}
      </div>

      {!locked && (
        <>
          <p className="text-sm text-muted">{t("orderHint")}</p>
          <div className="flex flex-col gap-2">
            {pool.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => commit([...placed, l.key])}
                className={`${line} border-2 border-border bg-surface hover:border-brand/40`}
              >
                {l.text.trim()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
