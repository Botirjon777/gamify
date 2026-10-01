"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { planNextSeason, setSeasonLength, setWeeklyTopicAction } from "../actions";

const MONTHS = [1, 2, 3];

const selectClass =
  "h-10 rounded-xl border border-border bg-surface px-3 text-sm font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60";

/** Saves as soon as a track is picked; "" = automatic rotation. */
export function WeeklyTopicSelect({ week, value, tracks }: { week: string; value: string; tracks: { id: string; title: string }[] }) {
  const t = useTranslations("admin.events");
  const te = useTranslations("admin.errors");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label={t("pickTopic")}
        defaultValue={value}
        disabled={pending}
        className={selectClass}
        onChange={(e) => {
          const trackId = e.target.value;
          start(async () => {
            const r = await setWeeklyTopicAction(week, trackId);
            setError(r.ok ? null : te(r.error));
          });
        }}
      >
        <option value="">{t("auto")}</option>
        {tracks.map((tr) => (
          <option key={tr.id} value={tr.id}>
            {tr.title}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

/** Length of the latest season, or the next one to plan. */
export function SeasonMonthsForm({ seasonId, current, mode }: { seasonId?: string; current?: number; mode: "length" | "plan" }) {
  const t = useTranslations("admin.events");
  const te = useTranslations("admin.errors");
  const [pending, start] = useTransition();
  const [months, setMonths] = useState(current ?? 3);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = mode === "length" ? await setSeasonLength(seasonId!, months) : await planNextSeason(months);
          setMessage(r.ok ? { ok: true, text: t("saved") } : { ok: false, text: te(r.error) });
        });
      }}
    >
      <select aria-label={t("length")} value={months} onChange={(e) => setMonths(Number(e.target.value))} disabled={pending} className={selectClass}>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {t("months", { count: m })}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending || (mode === "length" && months === current)} className={buttonClass(mode === "plan" ? "primary" : "secondary", "h-10")}>
        {mode === "plan" ? t("planNext") : t("saveLength")}
      </button>
      {message && <span className={`text-xs font-semibold ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</span>}
    </form>
  );
}
