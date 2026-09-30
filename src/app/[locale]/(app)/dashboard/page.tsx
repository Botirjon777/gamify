import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { avatarDataUri } from "@/lib/avatar";
import { getLeaderboardStore } from "@/lib/leaderboard";
import { addDays, sameDay, tashkentToday, tashkentWeekStart } from "@/lib/time";
import { DAILY_BONUS_XP, xpForLevel } from "@/features/gamification/xp";
import { DailyBonusCard } from "@/features/gamification/components/daily-bonus-card";
import { getPracticeSuggestions } from "@/features/learn/queries";
import { SkillCard } from "@/features/learn/components/skill-card";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { iqFromRating } from "@/features/iq/rating";

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tLearn = await getTranslations("learn");
  const { user, tenant } = await requireSession();

  const today = tashkentToday();
  const [claimedToday, iqDoneToday, weekly, rank, iqRank, suggestions] = await Promise.all([
    db.dailyClaim.findUnique({ where: { userId_day_kind: { userId: user.id, day: today, kind: "LOGIN" } } }),
    db.dailyClaim.findUnique({ where: { userId_day_kind: { userId: user.id, day: today, kind: "IQ" } } }),
    db.weeklyScore.findUnique({
      where: { userId_tenantId_week_board: { userId: user.id, tenantId: tenant.id, week: tashkentWeekStart(), board: "XP" } },
    }),
    getLeaderboardStore().rankOf(user.id, { board: "XP", period: "all-time", tenantId: tenant.id }),
    getLeaderboardStore().rankOf(user.id, { board: "IQ", period: "all-time", tenantId: tenant.id }),
    getPracticeSuggestions(user.id, tenant.id, locale),
  ]);

  // A streak is alive only if the last active day is today or yesterday.
  const alive = sameDay(user.lastActiveDay, today) || sameDay(user.lastActiveDay, addDays(today, -1));
  const streak = alive ? user.currentStreak : 0;
  // Practicing already counts as today's activity, so the bonus day is only +1 if today isn't counted yet.
  const nextStreak = sameDay(user.lastActiveDay, today) ? streak : streak + 1;
  const cycleDay = ((Math.max(nextStreak, 1) - 1) % 7) + 1;

  const levelStart = xpForLevel(user.level);
  const levelEnd = xpForLevel(user.level + 1);
  const progress = Math.min(100, ((user.xp - levelStart) / (levelEnd - levelStart)) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Profile header */}
      <section className="flex items-center gap-4 sm:gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
        <img src={avatarDataUri(user.avatarSeed)} alt="" className="size-16 rounded-2xl sm:size-20" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("greeting", { username: user.username })}
          </h1>
          <p className="mt-1 text-muted">{t("subtitle")}</p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="XP" value={user.xp.toLocaleString("uz-UZ")} accent="text-xp" sub={t("weeklyXp", { xp: weekly?.value ?? 0 })} />
        <Stat label={t("level", { level: user.level })} value={`${Math.round(progress)}%`} accent="text-brand">
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{t("xpToNext", { xp: levelEnd - user.xp })}</p>
        </Stat>
        <Stat
          label={t("streakLabel")}
          value={t("streak", { count: streak })}
          accent="text-streak"
          sub={t("longestStreak", { count: user.longestStreak })}
        />
        <Stat
          label={t("iq")}
          value={user.iqTestedAt ? String(iqFromRating(user.iqRating)) : t("iqNotTested")}
          accent="text-brand"
          sub={iqRank ? `${t("rank")}: ${t("rankValue", { rank: iqRank })}` : undefined}
        />
        <Link href="/leaderboard" className="col-span-2 lg:col-span-1">
          <Stat label={t("rank")} value={rank ? t("rankValue", { rank }) : t("noRank")} accent="text-foreground" sub="XP" />
        </Link>
      </section>

      {/* Continue practicing — skills due for review first */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{tLearn("suggestionsTitle")}</h2>
          <Link href="/learn" className="text-sm font-semibold text-brand hover:underline">
            {tLearn("browse")} →
          </Link>
        </div>
        {suggestions.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">{tLearn("suggestionsEmpty")}</p>
            <Link href="/learn/react/use-state" className={buttonClass("primary", "shrink-0")}>
              {tLearn("start")}
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <DailyBonusCard claimed={!!claimedToday} cycle={DAILY_BONUS_XP} nextDay={cycleDay} />

        <section className="grid gap-3">
          <Link
            href="/iq/daily"
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 transition hover:border-brand/40"
          >
            <span>
              <span className="block font-semibold">🧠 {t("dailyIq.title")}</span>
              <span className="text-sm text-muted">{t("dailyIq.text")}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                iqDoneToday ? "bg-success/10 text-success" : "bg-brand text-brand-foreground"
              }`}
            >
              {iqDoneToday ? t("dailyIq.done") : t("dailyIq.start")}
            </span>
          </Link>
          {(["dailyQuiz", "dailyProblem"] as const).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-surface px-5 py-4"
            >
              <span className="font-semibold">{t(key)}</span>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted">
                {t("comingSoon")}
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  sub,
  children,
}: {
  label: string;
  value: string;
  accent: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      {children}
    </div>
  );
}
