import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { avatarDataUri } from "@/lib/avatar";
import { getLeaderboardStore } from "@/lib/leaderboard";
import { addDays, sameDay, tashkentToday, tashkentWeekStart } from "@/lib/time";
import { DAILY_BONUS_XP, xpForLevel } from "@/features/gamification/xp";
import { DailyBonusCard } from "@/features/gamification/components/daily-bonus-card";

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const { user, tenant } = await requireSession();

  const today = tashkentToday();
  const [claimedToday, weekly, rank] = await Promise.all([
    db.dailyClaim.findUnique({ where: { userId_day_kind: { userId: user.id, day: today, kind: "LOGIN" } } }),
    db.weeklyScore.findUnique({
      where: { userId_tenantId_week_board: { userId: user.id, tenantId: tenant.id, week: tashkentWeekStart(), board: "XP" } },
    }),
    getLeaderboardStore().rankOf(user.id, { board: "XP", period: "all-time", tenantId: tenant.id }),
  ]);

  // A streak is alive only if the last active day is today or yesterday.
  const alive = sameDay(user.lastActiveDay, today) || sameDay(user.lastActiveDay, addDays(today, -1));
  const streak = alive ? user.currentStreak : 0;
  const nextStreak = claimedToday ? streak : streak + 1;
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
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="XP" value={user.xp.toLocaleString("uz-UZ")} accent="text-xp" sub={t("weeklyXp", { xp: weekly?.value ?? 0 })} />
        <Stat label={t("level", { level: user.level })} value={`${Math.round(progress)}%`} accent="text-brand">
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{t("xpToNext", { xp: levelEnd - user.xp })}</p>
        </Stat>
        <Stat
          label="🔥 Streak"
          value={t("streak", { count: streak })}
          accent="text-streak"
          sub={t("longestStreak", { count: user.longestStreak })}
        />
        <Stat label={t("rank")} value={rank ? t("rankValue", { rank }) : t("noRank")} accent="text-foreground" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <DailyBonusCard claimed={!!claimedToday} cycle={DAILY_BONUS_XP} nextDay={cycleDay} />

        <section className="grid gap-3">
          {(["dailyQuiz", "dailyProblem", "iqTest"] as const).map((key) => (
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
