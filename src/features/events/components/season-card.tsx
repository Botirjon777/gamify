import { CalendarClock, Trophy } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { SeasonInfo } from "../service";
import { daysLeft, seasonProgress } from "../season";

/** "1-mavsum · 92 kun qoldi" with a progress bar through the season. */
export async function SeasonCard({ season, compact = false }: { season: SeasonInfo; compact?: boolean }) {
  const t = await getTranslations("season");
  const format = await getFormatter();
  const now = new Date();
  const left = daysLeft(season.endsAt, now);
  const progress = Math.round(seasonProgress(season, now) * 100);
  // endsAt is the first moment after the season → show the last day.
  const lastDay = new Date(season.endsAt.getTime() - 1);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-grad-dark p-5 text-white shadow-lg shadow-black/10 sm:p-6">
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/5" />
      <div className="relative flex flex-wrap items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-grad-gold shadow-lg">
          <Trophy className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">{t("label")}</p>
          <h2 className="font-display text-xl font-bold">{t("name", { number: season.number })}</h2>
          {!compact && (
            <p className="mt-0.5 text-sm text-white/70">
              {format.dateTimeRange(season.startsAt, lastDay, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tashkent" })}
            </p>
          )}
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
          <CalendarClock className="size-4" /> {t("daysLeft", { count: left })}
        </p>
      </div>
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("progress")}>
        <div className="h-full rounded-full bg-grad-gold" style={{ width: `${progress}%` }} />
      </div>
      {!compact && <p className="relative mt-3 text-xs text-white/60">{t("hint")}</p>}
    </section>
  );
}
