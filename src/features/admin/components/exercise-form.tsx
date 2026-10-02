"use client";

import { useState } from "react";
import { Eye, Plus, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import type { ContentStatus, ExerciseType } from "@/generated/prisma/enums";
import { BLANK, LANGS, type CodeLang } from "@/features/learn/content-schema";
import { saveCmsExercise } from "../cms-actions";
import type { CmsSkillOption } from "../cms-queries";
import { StatusOptions } from "./cms-status-controls";
import { Field, areaClass, inputClass, useCmsAction } from "./cms-ui";

const TYPES: ExerciseType[] = ["CHOICE", "OUTPUT", "FILL", "ORDER"];

export interface ExerciseFormData {
  id: string;
  key: string;
  skillId: string;
  type: ExerciseType;
  difficulty: number;
  /** Set only when the exercise has its own XP (not the default for its difficulty). */
  customXp?: number;
  status: ContentStatus;
  prompt: string;
  explanation: string;
  lang: CodeLang;
  code: string;
  options?: string[];
  choiceAnswer?: number;
  outputAnswers?: string[];
  /** Per blank: accepted answers. */
  fillAnswers?: string[][];
  fillBank?: string[];
  orderLines?: string[];
}

const splitList = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** One exercise: create (`initial` absent) or edit. A live preview shows roughly what the learner gets. */
export function ExerciseForm({ skills, initial, defaultSkillId }: { skills: CmsSkillOption[]; initial?: ExerciseFormData; defaultSkillId?: string }) {
  const t = useTranslations("admin.cms");
  const tDrill = useTranslations("drill");
  const router = useRouter();
  const { pending, run } = useCmsAction();

  const [skillId, setSkillId] = useState(initial?.skillId ?? skills.find((s) => s.id === defaultSkillId)?.id ?? skills[0]?.id ?? "");
  /** null = follow the suggestion for the chosen skill (use-state-015 after use-state-014). */
  const [typedKey, setTypedKey] = useState<string | null>(initial?.key ?? null);
  const key = typedKey ?? skills.find((s) => s.id === skillId)?.nextKey ?? "";
  const [type, setType] = useState<ExerciseType>(initial?.type ?? "CHOICE");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 1);
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? "PUBLISHED");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [lang, setLang] = useState<CodeLang>(initial?.lang ?? "js");
  const [code, setCode] = useState(initial?.code ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", ""]);
  const [choiceAnswer, setChoiceAnswer] = useState(initial?.choiceAnswer ?? 0);
  const [outputAnswers, setOutputAnswers] = useState<string[]>(initial?.outputAnswers ?? [""]);
  // One line per blank; several accepted answers separated by commas.
  const [fillAnswers, setFillAnswers] = useState((initial?.fillAnswers ?? []).map((b) => b.join(", ")).join("\n"));
  const [fillBank, setFillBank] = useState((initial?.fillBank ?? []).join(", "));
  const [orderLines, setOrderLines] = useState<string[]>(initial?.orderLines ?? ["", "", ""]);

  const prose = lang === "text";
  const blanks = code.split(BLANK).length - 1;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () =>
        saveCmsExercise(
          {
            key,
            skillId,
            type,
            difficulty,
            // An exercise keeps its own XP only while its difficulty stays the same.
            xp: initial && difficulty === initial.difficulty ? initial.customXp : undefined,
            status,
            promptUz: prompt,
            explanationUz: explanation,
            lang,
            code,
            optionsUz: options.map((o) => o.trim()),
            choiceAnswerIndex: choiceAnswer,
            outputAnswers: outputAnswers.map((a) => a.trim()).filter(Boolean),
            fillBlanksAnswers: fillAnswers.split("\n").map(splitList).filter((b) => b.length),
            fillBank: splitList(fillBank),
            // Indentation matters in code; only fully empty lines are dropped.
            orderLines: orderLines.map((l) => l.trimEnd()).filter((l) => l.trim()),
          },
          initial?.id,
        ),
      initial ? t("exercise.saved") : t("exercise.created"),
      () => router.push("/admin/content/exercises"),
    );
  };

  const card = "flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6";
  const addButton = "mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-bold text-brand hover:underline";
  const removeButton = "rounded-lg p-2 text-danger hover:bg-danger/10";

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <form onSubmit={submit} className="flex flex-col gap-6 lg:col-span-7">
        <div className={card}>
          <h2 className="font-display text-lg font-bold">{t("exercise.basics")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("fields.skill")}>
              <select value={skillId} onChange={(e) => setSkillId(e.target.value)} required className={inputClass}>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.track} — {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("fields.type")}>
              <select value={type} onChange={(e) => setType(e.target.value as ExerciseType)} className={inputClass}>
                {TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`exercise.types.${v}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("fields.key")}>
              <input value={key} onChange={(e) => setTypedKey(e.target.value)} required pattern="[a-z0-9\-]+" className={`${inputClass} font-mono text-xs`} />
            </Field>
            <Field label={t("fields.difficulty")}>
              <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className={inputClass}>
                {[1, 2, 3].map((d) => (
                  <option key={d} value={d}>
                    {d} — {tDrill(`difficulty.${d}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("fields.status")}>
              <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={inputClass}>
                <StatusOptions />
              </select>
            </Field>
          </div>
        </div>

        <div className={card}>
          <h2 className="font-display text-lg font-bold">{t("exercise.content")}</h2>
          <Field label={t("fields.prompt")}>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} required rows={3} className={areaClass} />
          </Field>

          <Field label={t("exercise.lang")} hint={t("exercise.langHint")}>
            <select value={lang} onChange={(e) => setLang(e.target.value as CodeLang)} className={`${inputClass} font-mono`}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l === "text" ? t("exercise.langText") : l}
                </option>
              ))}
            </select>
          </Field>

          {type !== "ORDER" && (
            <Field
              label={prose ? t("exercise.text") : t("exercise.code")}
              hint={type === "FILL" ? t("exercise.fillHint", { blank: BLANK, count: blanks }) : type === "CHOICE" ? t("exercise.optional") : undefined}
            >
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={5}
                required={type !== "CHOICE"}
                spellCheck={false}
                className={prose ? areaClass : "w-full rounded-xl border border-border bg-grad-dark p-3 font-mono text-xs text-white outline-none"}
              />
            </Field>
          )}

          {type === "CHOICE" && (
            <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
              <legend className="mb-1 text-sm font-semibold">{t("fields.options")}</legend>
              {options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="choice-answer" checked={choiceAnswer === i} onChange={() => setChoiceAnswer(i)} aria-label={t("fields.correctOption", { n: i + 1 })} className="size-4 cursor-pointer" />
                  <input
                    value={option}
                    onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                    placeholder={t("fields.optionN", { n: i + 1 })}
                    required
                    className={inputClass}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      aria-label={t("delete")}
                      onClick={() => {
                        setOptions(options.filter((_, j) => j !== i));
                        setChoiceAnswer(choiceAnswer > i ? choiceAnswer - 1 : choiceAnswer === i ? 0 : choiceAnswer);
                      }}
                      className={removeButton}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button type="button" onClick={() => setOptions([...options, ""])} className={addButton}>
                  <Plus className="size-3.5" /> {t("fields.addOption")}
                </button>
              )}
            </fieldset>
          )}

          {type === "OUTPUT" && (
            <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
              <legend className="mb-1 text-sm font-semibold">{t("exercise.accepted")}</legend>
              {outputAnswers.map((answer, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={answer}
                    onChange={(e) => setOutputAnswers(outputAnswers.map((a, j) => (j === i ? e.target.value : a)))}
                    required
                    aria-label={t("exercise.accepted")}
                    className={`${inputClass} font-mono`}
                  />
                  {outputAnswers.length > 1 && (
                    <button type="button" aria-label={t("delete")} onClick={() => setOutputAnswers(outputAnswers.filter((_, j) => j !== i))} className={removeButton}>
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setOutputAnswers([...outputAnswers, ""])} className={addButton}>
                <Plus className="size-3.5" /> {t("exercise.addAccepted")}
              </button>
            </fieldset>
          )}

          {type === "FILL" && (
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <Field label={t("exercise.fillAnswers")} hint={t("exercise.fillAnswersHint")}>
                <textarea value={fillAnswers} onChange={(e) => setFillAnswers(e.target.value)} required rows={Math.max(2, blanks)} spellCheck={false} className={`${areaClass} font-mono`} />
              </Field>
              <Field label={t("exercise.bank")} hint={t("exercise.bankHint")}>
                <input value={fillBank} onChange={(e) => setFillBank(e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}

          {type === "ORDER" && (
            <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
              <legend className="mb-1 text-sm font-semibold">{t("exercise.lines")}</legend>
              {orderLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 font-mono text-xs font-bold text-muted">{i + 1}.</span>
                  <input
                    value={line}
                    onChange={(e) => setOrderLines(orderLines.map((l, j) => (j === i ? e.target.value : l)))}
                    required
                    aria-label={t("exercise.lineN", { n: i + 1 })}
                    spellCheck={false}
                    className={`${inputClass} ${prose ? "" : "font-mono text-xs"}`}
                  />
                  {orderLines.length > 3 && (
                    <button type="button" aria-label={t("delete")} onClick={() => setOrderLines(orderLines.filter((_, j) => j !== i))} className={removeButton}>
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {orderLines.length < 12 && (
                <button type="button" onClick={() => setOrderLines([...orderLines, ""])} className={addButton}>
                  <Plus className="size-3.5" /> {t("exercise.addLine")}
                </button>
              )}
            </fieldset>
          )}

          <Field label={t("exercise.explanation")} hint={t("exercise.explanationHint")} className="border-t border-border pt-4">
            <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={areaClass} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.push("/admin/content/exercises")} className={buttonClass("secondary")} disabled={pending}>
            {t("cancel")}
          </button>
          <Button type="submit" disabled={pending || !skillId} className="px-8">
            <Save className="size-4" /> {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>

      {/* What the learner sees (right answers marked) */}
      <aside className="lg:col-span-5">
        <div className="sticky top-20 flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <Eye className="size-4" /> {t("exercise.preview")}
          </p>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              {tDrill(`types.${type}`)} · {tDrill(`difficulty.${difficulty}`)}
            </p>
            <h3 className="font-sans text-base font-bold leading-snug">{prompt || "…"}</h3>

            {code && type !== "ORDER" && (
              <pre
                className={
                  prose
                    ? "whitespace-pre-wrap break-words rounded-xl border border-border bg-surface p-3.5 font-sans text-sm"
                    : "overflow-x-auto rounded-xl bg-grad-dark p-3.5 font-mono text-xs text-white"
                }
              >
                {code}
              </pre>
            )}

            {type === "CHOICE" && (
              <ul className="grid gap-2">
                {options.map((option, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${choiceAnswer === i ? "border-success bg-success/10" : "border-border bg-surface text-muted"}`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-border text-xs font-bold">{i + 1}</span>
                    <span className="min-w-0 break-words">{option || t("fields.optionN", { n: i + 1 })}</span>
                  </li>
                ))}
              </ul>
            )}
            {type === "OUTPUT" && <PreviewAnswer label={t("exercise.accepted")} value={outputAnswers.filter(Boolean).join("  ·  ")} />}
            {type === "FILL" && (
              <>
                <PreviewAnswer label={t("exercise.fillAnswers")} value={fillAnswers.split("\n").filter(Boolean).join("  ·  ")} />
                {splitList(fillBank).length > 0 && <PreviewAnswer label={t("exercise.bank")} value={splitList(fillBank).join("  ·  ")} />}
              </>
            )}
            {type === "ORDER" && (
              <ol className="grid gap-1.5">
                {orderLines.map((line, i) => (
                  <li key={i} className={`rounded-xl border border-border bg-surface p-2.5 ${prose ? "text-sm" : "whitespace-pre font-mono text-xs"}`}>
                    {line || t("exercise.lineN", { n: i + 1 })}
                  </li>
                ))}
              </ol>
            )}
            {explanation && <p className="border-t border-border pt-3 text-sm text-muted">{explanation}</p>}
          </div>
          <p className="text-xs text-muted">{t("exercise.previewNote")}</p>
        </div>
      </aside>
    </div>
  );
}

function PreviewAnswer({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-muted">
      {label}: <b className="font-mono text-success">{value || "—"}</b>
    </p>
  );
}
