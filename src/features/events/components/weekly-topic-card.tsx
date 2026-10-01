import { Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { addDays, tashkentWeekStart } from "@/lib/time";
import { daysLeft } from "../season";
import { TRACK_COMPLETE_XP, WEEKLY_BONUS_SHARE, weeklyTopic } from "../service";

/** "This week: HTML — double XP". Hidden when there is no published track. */
export async function WeeklyTopicCard() {
  const locale = await getLocale();
  const topic = await weeklyTopic(undefined, locale);
  if (!topic) return null;
  const t = await getTranslations("weekly");
  // Week ends Monday 00:00 Tashkent = Sunday 19:00 UTC
  const ends = new Date(addDays(tashkentWeekStart(), 7).getTime() - 5 * 60 * 60 * 1000);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-grad-gold p-5 text-white shadow-lg shadow-xp/20 sm:p-6">
      <div className="absolute -right-12 -top-12 size-44 rounded-full bg-white/10" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20">
          <Sparkles className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/75">
            {t("label")} · {t("endsIn", { count: daysLeft(ends) })}
          </p>
          <h2 className="font-display text-xl font-bold">{t("title", { track: topic.title })}</h2>
          <p className="mt-1 text-sm text-white/85">
            {t("text", { xp: TRACK_COMPLETE_XP, double: Math.round(TRACK_COMPLETE_XP * (1 + WEEKLY_BONUS_SHARE)) })}
          </p>
        </div>
        <Link
          href={`/learn/${topic.trackSlug}`}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 font-semibold text-[#8a5300] shadow hover:bg-white/90"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
