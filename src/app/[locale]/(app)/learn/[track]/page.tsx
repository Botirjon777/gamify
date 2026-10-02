import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getTrack } from "@/features/learn/queries";
import { groupMessageKey, SUBJECT_STYLE, trackParentHref } from "@/features/learn/subjects";
import { TRACK_GRADIENTS } from "@/features/learn/track-style";
import { SkillCard } from "@/features/learn/components/skill-card";
import { TRACK_COMPLETE_XP, WEEKLY_BONUS_SHARE, weeklyTopic } from "@/features/events/service";
import { IconTile } from "@/components/icon";

/** One track → modules → skills. */
export default async function TrackPage({ params }: PageProps<"/[locale]/learn/[track]">) {
  const { locale, track: slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const { user, tenant } = await requireSession();
  const [track, topic] = await Promise.all([getTrack(slug, user.id, tenant.id, locale), weeklyTopic(undefined, locale)]);
  if (!track) notFound();
  const weekly = topic?.trackId === track.id;
  const subject = SUBJECT_STYLE[track.subject];

  return (
    <div className="flex flex-col gap-6">
      <Link href={trackParentHref(track)} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t(`${groupMessageKey(track)}.title`)}
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <IconTile name={track.icon ?? subject.icon} gradient={TRACK_GRADIENTS[track.slug] ?? subject.gradient} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{track.title}</h1>
          {track.description && <p className="mt-1 max-w-2xl text-muted">{track.description}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-brand">{Math.round(track.summary.mastery)}%</p>
          <p className="text-xs text-muted">{t("trackProgress")}</p>
        </div>
      </header>

      <p
        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
          weekly ? "bg-grad-gold text-white" : "border border-border bg-surface text-muted"
        }`}
      >
        {weekly ? <Sparkles className="size-4 shrink-0" /> : <Trophy className="size-4 shrink-0 text-xp" />}
        {weekly
          ? t("completeRewardWeekly", { xp: TRACK_COMPLETE_XP, double: Math.round(TRACK_COMPLETE_XP * (1 + WEEKLY_BONUS_SHARE)) })
          : t("completeReward", { xp: TRACK_COMPLETE_XP })}
      </p>

      {track.modules.map((mod) => (
        <section key={mod.slug}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{mod.title}</h2>
          <div className="stagger mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {mod.skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
