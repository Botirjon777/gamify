"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { IconTile } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { SUBJECT_STYLE, SUBJECTS, type Subject } from "@/features/learn/subjects";
import { updateInterests } from "../actions";

interface Props {
  initial: Subject[];
  /** Subjects without courses yet — still selectable, marked "coming soon". */
  upcoming: Subject[];
  /**
   * onboarding: "continue" / "skip", then go to `next`.
   * prompt (dashboard, never asked before): "save" / "later".
   * settings: "save" once something changed.
   */
  variant: "onboarding" | "prompt" | "settings";
  next?: string;
}

/** Pick the subjects you follow. Tiles only toggle; nothing is saved until a button is pressed. */
export function InterestsForm({ initial, upcoming, variant, next = "/dashboard" }: Props) {
  const t = useTranslations("interests");
  const tLearn = useTranslations("learn");
  const router = useRouter();
  const [stored, setStored] = useState(initial);
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const changed = value.length !== stored.length || value.some((s) => !stored.includes(s));

  const toggle = (subject: Subject) => {
    setSaved(false);
    setError(false);
    setValue((v) => (v.includes(subject) ? v.filter((s) => s !== subject) : [...v, subject]));
  };

  const save = (subjects: Subject[]) =>
    start(async () => {
      setError(false);
      const ok = await updateInterests(subjects).then(
        (r) => r.ok,
        () => false,
      );
      if (!ok) return setError(true);
      if (variant === "onboarding") router.replace(next);
      else {
        setStored(subjects);
        setSaved(true);
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {SUBJECTS.map((subject) => {
          const active = value.includes(subject);
          const style = SUBJECT_STYLE[subject];
          return (
            <button
              key={subject}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => toggle(subject)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 text-center transition disabled:opacity-60 ${
                active ? "border-brand bg-brand/5 shadow-lg shadow-brand/10" : "border-border bg-surface hover:border-brand/40"
              }`}
            >
              {active && (
                <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-brand text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
              <IconTile name={style.icon} gradient={style.gradient} size="lg" />
              <span className={`text-sm font-semibold ${active ? "text-brand" : ""}`}>{tLearn(`subjects.${subject}.title`)}</span>
              {upcoming.includes(subject) && <span className="text-[11px] font-semibold text-muted">{t("soon")}</span>}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {t("error")}
        </p>
      )}

      {variant === "onboarding" ? (
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button className="h-12 text-base sm:px-10" disabled={pending || !value.length} onClick={() => save(value)}>
            {t("continue")}
          </Button>
          <Button variant="secondary" className="h-12 text-base sm:px-8" disabled={pending} onClick={() => save([])}>
            {t("skip")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button className="h-10" disabled={pending || !changed} onClick={() => save(value)}>
            {t("save")}
          </Button>
          {variant === "prompt" && (
            <Button variant="ghost" className="h-10" disabled={pending} onClick={() => save([])}>
              {t("later")}
            </Button>
          )}
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
              <Check className="size-4" /> {t("saved")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
