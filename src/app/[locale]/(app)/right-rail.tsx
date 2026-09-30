import { ChevronRight, Gift, Rocket, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/avatar";
import { IconTile, type GradientKey } from "@/components/icon";
import { PlanBadge } from "@/components/plan-badge";
import type { User } from "@/generated/prisma/client";
import { tashkentWeekStart } from "@/lib/time";
import { db } from "@/lib/db";
import { xpForLevel } from "@/features/gamification/xp";
import { effectivePlan } from "@/features/plans/plans";
import { getFriends } from "@/features/social/queries";
import { standings } from "@/features/clans/queries";

/** Right column on wide screens: profile card, friends this week, top clans, invite / upgrade. */
export async function RightRail({ user, tenantId }: { user: User; tenantId: string }) {
  const t = await getTranslations("rail");
  const plan = effectivePlan(user);
  const [friends, clans] = await Promise.all([getFriends(user.id, tenantId), standings(db, tenantId, tashkentWeekStart())]);

  const start = xpForLevel(user.level);
  const progress = Math.min(100, ((user.xp - start) / (xpForLevel(user.level + 1) - start)) * 100);

  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border/70 bg-surface/60 p-5 backdrop-blur xl:flex">
      {/* Profile card */}
      <Link href={`/u/${user.username}`} className="relative overflow-hidden rounded-3xl bg-grad-brand p-5 text-brand-foreground shadow-xl shadow-brand/20">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <Avatar user={user} className="size-14 ring-4 ring-white/30" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-display text-base font-bold">
              {user.username}
              <PlanBadge plan={plan} className="bg-white/25! bg-none" />
            </p>
            <p className="text-sm text-white/80">{t("level", { level: user.level })}</p>
          </div>
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
        <p className="relative mt-1.5 text-xs text-white/80">{user.xp.toLocaleString("uz-UZ")} XP</p>
      </Link>

      {/* Friends this week */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <Header title={t("friendsTitle")} href="/friends" more={t("seeAll")} />
        {friends.length === 0 ? (
          <div className="mt-3 text-sm text-muted">
            <p>{t("noFriends")}</p>
            <Link href="/friends?tab=search" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand">
              <Users className="size-4" /> {t("findFriends")}
            </Link>
          </div>
        ) : (
          <ol className="mt-2 flex flex-col">
            {friends.slice(0, 5).map((f, i) => (
              <li key={f.id}>
                <Link href={`/u/${f.username}`} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-background">
                  <span className="w-4 text-center text-xs font-bold text-muted">{i + 1}</span>
                  <Avatar user={f} className="size-8" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.username}</span>
                  <span className="text-xs font-bold text-xp">{f.weeklyXp} XP</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Top clans this week */}
      {clans.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <Header title={t("clansTitle")} href="/clans" more={t("seeAll")} />
          <ol className="mt-2 flex flex-col">
            {clans.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link href={`/clans/${c.slug}`} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-background">
                  <IconTile name={c.emblem} gradient={c.color as GradientKey} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
                  <span className="text-xs font-bold text-xp">{Math.round(c.score)} XP</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Invite */}
      <Link href="/settings#invite" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40">
        <span className="grid size-10 place-items-center rounded-xl bg-grad-success text-white">
          <Gift className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{t("inviteTitle")}</span>
          <span className="block text-xs text-muted">{t("inviteText")}</span>
        </span>
        <ChevronRight className="size-4 text-muted" />
      </Link>

      {/* Upgrade (Free only) */}
      {plan === "FREE" && (
        <Link href="/plans" className="relative overflow-hidden rounded-2xl bg-grad-dark p-4 text-white">
          <Rocket className="absolute -bottom-2 -right-2 size-20 text-white/10" />
          <p className="font-display text-sm font-bold">{t("upgradeTitle")}</p>
          <p className="mt-1 text-xs text-white/75">{t("upgradeText")}</p>
          <span className="mt-3 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-foreground">{t("upgradeCta")}</span>
        </Link>
      )}
    </aside>
  );
}

function Header({ title, href, more }: { title: string; href: string; more: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-sm font-bold">{title}</h2>
      <Link href={href} className="text-xs font-semibold text-brand hover:underline">
        {more}
      </Link>
    </div>
  );
}
