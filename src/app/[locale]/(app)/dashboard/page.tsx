import { ArrowRight, Brain, ChevronRight, Code2, Flame, ListChecks, Trophy, X, Zap } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getLeaderboardStore } from "@/lib/leaderboard";
import { addDays, sameDay, tashkentToday, tashkentWeekStart } from "@/lib/time";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/avatar";
import { PlanBadge } from "@/components/plan-badge";
import { buttonClass } from "@/components/ui/button";
import { DAILY_BONUS_XP, xpForLevel } from "@/features/gamification/xp";
import { DailyBonusCard } from "@/features/gamification/components/daily-bonus-card";
import { getPracticeSuggestions, getRecommendedTracks, getUpcomingSubjects } from "@/features/learn/queries";
import { SkillCard } from "@/features/learn/components/skill-card";
import { TrackCard } from "@/features/learn/components/track-card";
import { InterestsForm } from "@/features/profile/components/interests-form";
import { iqFromRating } from "@/features/iq/rating";
import { hideIqPrompt } from "@/features/iq/actions";
import { effectivePlan } from "@/features/plans/plans";
import { GenderSettings } from "@/features/profile/components/gender-settings";
import { currentSeason, finalizeEndedSeasons } from "@/features/events/service";
import { SeasonCard } from "@/features/events/components/season-card";
import { WeeklyTopicCard } from "@/features/events/components/weekly-topic-card";

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tLearn = await getTranslations("learn");
  const tInterests = await getTranslations("interests");
  const { user, tenant } = await requireSession();

  const today = tashkentToday();
  await finalizeEndedSeasons();
  const season = await currentSeason();
  const store = getLeaderboardStore();
  const [claimedToday, iqDoneToday, weekly, rank, iqRank, suggestions, recommended, upcoming] = await Promise.all([
    db.dailyClaim.findUnique({ where: { userId_day_kind: { userId: user.id, day: today, kind: "LOGIN" } } }),
    db.dailyClaim.findUnique({ where: { userId_day_kind: { userId: user.id, day: today, kind: "IQ" } } }),
    db.weeklyScore.findUnique({
      where: { userId_tenantId_week_board: { userId: user.id, tenantId: tenant.id, week: tashkentWeekStart(), board: "XP" } },
    }),
    store.rankOf(user.id, { board: "XP", period: "all-time", tenantId: tenant.id }),
    store.rankOf(user.id, { board: "IQ", period: "all-time", tenantId: tenant.id }),
    getPracticeSuggestions(user.id, tenant.id, locale),
    getRecommendedTracks(user.interests, user.id, tenant.id, locale),
    user.interestsSetAt ? [] : getUpcomingSubjects(tenant.id, locale),
  ]);

  // A streak is alive only if the last active day is today or yesterday.
  const alive = sameDay(user.lastActiveDay, today) || sameDay(user.lastActiveDay, addDays(today, -1));
  const streak = alive ? user.currentStreak : 0;
  // Practicing already counts as today's activity, so the bonus day is only +1 if today isn't counted yet.
  const nextStreak = sameDay(user.lastActiveDay, today) ? streak : streak + 1;
  const cycleDay = ((Math.max(nextStreak, 1) - 1) % 7) + 1;

  const levelStart = xpForLevel(user.level);
  const levelEnd = xpForLevel(user.level + 1);
  const progress = Math.max(0, Math.min(100, ((user.xp - levelStart) / (levelEnd - levelStart)) * 100));

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-grad-brand p-6 text-white shadow-xl shadow-brand/20 sm:p-8">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-40 size-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-4 sm:gap-5">
            <Avatar user={user} className="size-16 ring-4 ring-white/30 sm:size-20" />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
                {t("greeting", { username: user.username })}
                <PlanBadge plan={effectivePlan(user)} className="bg-white/25! bg-none" />
              </h1>
              <p className="mt-1 text-white/80">{t("subtitle")}</p>
            </div>
          </div>
          <div className="w-full lg:w-80">
            <div className="flex items-baseline justify-between text-sm font-semibold">
              <span>{t("level", { level: user.level })}</span>
              <span className="text-white/80">{t("xpToNext", { xp: levelEnd - user.xp })}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Older accounts have no gender yet → their avatar may not fit them */}
      {!user.gender && (
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <GenderSettings seed={user.avatarSeed} style={user.avatarStyle} gender={null} />
        </section>
      )}

      {/* Never asked about interests (accounts older than the question, or sign-ups that left it open) */}
      {!user.interestsSetAt && (
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">{tInterests("title")}</h2>
          <p className="mb-4 mt-1 text-sm leading-relaxed text-muted">{tInterests("text")}</p>
          <InterestsForm initial={user.interests} upcoming={upcoming} variant="prompt" />
        </section>
      )}

      {/* Optional IQ test invitation — hideable */}
      {!user.iqTestedAt && !user.iqPromptHiddenAt && (
        <section className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-grad-iq p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:py-6 sm:pl-6 sm:pr-14">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20">
              <Brain className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">{t("iqPrompt.title")}</h2>
              <p className="mt-0.5 text-sm text-white/85">{t("iqPrompt.text")}</p>
            </div>
          </div>
          <Link href="/iq/placement" className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-foreground hover:bg-white/90">
            {t("iqPrompt.start")}
          </Link>
          <form action={hideIqPrompt} className="absolute right-3 top-3">
            <button
              type="submit"
              aria-label={t("iqPrompt.hide")}
              title={t("iqPrompt.hide")}
              className="grid size-8 place-items-center rounded-lg text-white/75 hover:bg-white/15 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </form>
        </section>
      )}

      {/* Season + weekly bonus topic */}
      <div className="grid gap-4 xl:grid-cols-2">
        {season && <SeasonCard season={season} compact />}
        <WeeklyTopicCard />
      </div>

      {/* Stats */}
      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Zap className="size-5" />} gradient="bg-grad-xp" label="XP" value={user.xp.toLocaleString("uz-UZ")} sub={t("weeklyXp", { xp: weekly?.value ?? 0 })} />
        <Stat icon={<Flame className="size-5" />} gradient="bg-grad-streak" label={t("streakLabel")} value={t("streak", { count: streak })} sub={t("longestStreak", { count: user.longestStreak })} />
        <Stat
          href={user.iqTestedAt ? "/leaderboard?board=IQ" : "/iq/placement"}
          icon={<Brain className="size-5" />}
          gradient="bg-grad-iq"
          label={t("iq")}
          value={user.iqTestedAt ? String(iqFromRating(user.iqRating)) : t("iqNotTested")}
          sub={user.iqTestedAt ? (iqRank ? `${t("rank")}: ${t("rankValue", { rank: iqRank })}` : undefined) : t("iqTake")}
        />
        <Stat href="/leaderboard" icon={<Trophy className="size-5" />} gradient="bg-grad-gold" label={t("rank")} value={rank ? t("rankValue", { rank }) : t("noRank")} sub="XP" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr] 2xl:grid-cols-[1.4fr_1fr]">
        {/* Continue practicing — skills due for review first */}
        <section className="xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">{tLearn("suggestionsTitle")}</h2>
            <Link href="/learn" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              {tLearn("browse")} <ArrowRight className="size-4" />
            </Link>
          </div>
          {suggestions.length ? (
            <div className="stagger mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {suggestions.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted">{tLearn("suggestionsEmpty")}</p>
              <Link href="/learn" className={buttonClass("primary", "shrink-0")}>
                {tLearn("start")}
              </Link>
            </div>
          )}
        </section>

        {/* For you — courses not started yet, from the subjects the user follows */}
        {recommended.length > 0 && (
          <section className="xl:col-span-2">
            <h2 className="font-display text-lg font-bold">{tLearn("forYou")}</h2>
            <p className="mt-0.5 text-sm text-muted">{tLearn("forYouText")}</p>
            <div className="stagger mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {recommended.map((track) => (
                <TrackCard key={track.slug} track={track} />
              ))}
            </div>
          </section>
        )}

        <DailyBonusCard claimed={!!claimedToday} cycle={DAILY_BONUS_XP} nextDay={cycleDay} />

        <section className="flex flex-col gap-3">
          <Link
            href={user.iqTestedAt ? "/iq/daily" : "/iq/placement"}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-grad-iq text-white">
              <Brain className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("dailyIq.title")}</span>
              <span className="text-sm text-muted">{t("dailyIq.text")}</span>
            </span>
            {iqDoneToday ? (
              <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">{t("dailyIq.done")}</span>
            ) : (
              <ChevronRight className="size-5 shrink-0 text-muted" />
            )}
          </Link>
          {[
            { key: "dailyQuiz", icon: <ListChecks className="size-5" /> },
            { key: "dailyProblem", icon: <Code2 className="size-5" /> },
          ].map(({ key, icon }) => (
            <div key={key} className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background text-muted">{icon}</span>
              <span className="flex-1 font-semibold text-muted">{t(key)}</span>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted">{t("comingSoon")}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon,
  gradient,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ReactNode;
  gradient: string;
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const body = (
    <div className="flex h-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/30 sm:gap-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-lg shadow-black/5 sm:size-12 ${gradient}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted sm:text-sm">{label}</p>
        <p className="truncate font-display text-lg font-bold sm:text-xl">{value}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
