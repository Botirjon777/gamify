import { CalendarRange, Sparkles, Trophy } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { addDays, tashkentWeekStart } from "@/lib/time";
import { localized, type LocalizedText } from "@/i18n/content";
import { PageHeader } from "@/components/page-header";
import { currentSeason, listSeasons, weeklyTopic } from "@/features/events/service";
import { daysLeft, seasonMonths } from "@/features/events/season";
import { SeasonMonthsForm, WeeklyTopicSelect } from "@/features/events/components/admin-controls";

const WEEKS_AHEAD = 6;

export default async function AdminEvents({ params }: PageProps<"/[locale]/admin/events">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tenant } = await requireAdmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();

  const current = await currentSeason();
  const seasons = await listSeasons();
  const last = seasons[seasons.length - 1];
  const now = new Date();
  const planned = last && last.startsAt > now ? last : null;

  const thisWeek = tashkentWeekStart();
  const weeks = Array.from({ length: WEEKS_AHEAD }, (_, i) => addDays(thisWeek, i * 7));
  const [tracks, picked, topics, participants] = await Promise.all([
    db.track.findMany({ where: { status: "PUBLISHED", tenantId: null }, orderBy: [{ order: "asc" }, { slug: "asc" }], select: { id: true, title: true } }),
    db.weeklyTopic.findMany({ where: { week: { in: weeks } } }),
    Promise.all(weeks.map((w) => weeklyTopic(w, locale))),
    current ? db.seasonScore.count({ where: { seasonId: current.id, tenantId: tenant.id, value: { gt: 0 } } }) : 0,
  ]);
  const trackOptions = tracks.map((tr) => ({ id: tr.id, title: localized(tr.title as LocalizedText, locale) }));
  const pickedByWeek = new Map(picked.map((p) => [p.week.getTime(), p.trackId]));
  const day = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", timeZone: "Asia/Tashkent" });
  const range = (s: { startsAt: Date; endsAt: Date }) =>
    format.dateTimeRange(s.startsAt, new Date(s.endsAt.getTime() - 1), { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tashkent" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("nav.events")} subtitle={t("events.subtitle")} />

      {/* Seasons */}
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Trophy className="size-5 text-xp" /> {t("events.seasons")}
        </h2>

        {current ? (
          <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-background/60 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-display text-xl font-bold">{t("events.seasonName", { number: current.number })}</p>
              <p className="text-sm text-muted">{range(current)}</p>
              <p className="mt-1 text-sm">
                {t("events.daysLeft", { count: daysLeft(current.endsAt, now) })} · {t("events.participants", { count: participants })}
              </p>
            </div>
            {current.id === last?.id && <SeasonMonthsForm mode="length" seasonId={current.id} current={seasonMonths(current)} />}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">{t("events.noSeason")}</p>
        )}

        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5">
          {planned ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm">
                <span className="font-semibold">{t("events.nextPlanned", { number: planned.number })}</span>{" "}
                <span className="text-muted">{range(planned)}</span>
              </p>
              <SeasonMonthsForm mode="length" seasonId={planned.id} current={seasonMonths(planned)} />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">{t("events.planHint")}</p>
              <SeasonMonthsForm mode="plan" />
            </>
          )}
        </div>

        {seasons.length > 1 && (
          <ul className="mt-5 flex flex-col gap-1 border-t border-border pt-4 text-sm">
            {[...seasons].reverse().map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <CalendarRange className="size-4 text-muted" />
                <span className="font-semibold">{t("events.seasonName", { number: s.number })}</span>
                <span className="text-muted">{range(s)}</span>
                {s.finalizedAt && <span className="ml-auto text-xs text-muted">{t("events.finished")}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Weekly bonus topics */}
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Sparkles className="size-5 text-xp" /> {t("events.weekly")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("events.weeklyHint")}</p>
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {weeks.map((w, i) => {
            const topic = topics[i];
            return (
              <li key={w.toISOString()} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {day(w)} – {day(addDays(w, 6))} {i === 0 && <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{t("events.thisWeek")}</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {topic ? topic.title : "—"} {topic?.auto && <span className="text-xs">({t("events.autoShort")})</span>}
                  </p>
                </div>
                <WeeklyTopicSelect week={w.toISOString().slice(0, 10)} value={pickedByWeek.get(w.getTime()) ?? ""} tracks={trackOptions} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
