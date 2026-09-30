import { notFound } from "next/navigation";
import { Brain, Flame, Lock, Pencil, Trophy, Zap } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getLeaderboardStore } from "@/lib/leaderboard";
import { Avatar } from "@/components/avatar";
import { IconTile, type GradientKey } from "@/components/icon";
import { PlanBadge } from "@/components/plan-badge";
import { buttonClass } from "@/components/ui/button";
import { BADGES, BADGE_BY_KEY } from "@/features/badges/catalog";
import { publicUserSelect, relationsTo, toPublicUser } from "@/features/social/queries";
import { FriendButton } from "@/features/social/components/friend-button";

export default async function ProfilePage({ params }: PageProps<"/[locale]/u/[username]">) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const tb = await getTranslations("badges");
  const format = await getFormatter();
  const { user: me, tenant } = await requireSession();

  const row = await db.user.findFirst({
    where: { username: username.toLowerCase(), memberships: { some: { tenantId: tenant.id } } },
    select: {
      ...publicUserSelect,
      bio: true,
      createdAt: true,
      longestStreak: true,
      badges: { orderBy: { earnedAt: "desc" } },
      clanMembership: { select: { role: true, clan: { select: { tag: true, slug: true, name: true, emblem: true, color: true } } } },
    },
  });
  if (!row) notFound();
  const user = toPublicUser(row);
  const isMe = user.id === me.id;

  const store = getLeaderboardStore();
  const [rank, relations] = await Promise.all([
    store.rankOf(user.id, { board: "XP", period: "all-time", tenantId: tenant.id }),
    relationsTo(me.id, [user.id]),
  ]);
  const rel = relations.get(user.id)!;
  const earned = new Set(row.badges.map((b) => b.badge));
  const clan = row.clanMembership?.clan;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-grad-brand p-6 text-white shadow-xl shadow-brand/20 sm:p-8">
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 size-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar user={user} className="size-24 ring-4 ring-white/30 sm:size-28" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{user.username}</h1>
              {clan && (
                <Link href={`/clans/${clan.slug}`} className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-bold hover:bg-white/30">
                  [{clan.tag}]
                </Link>
              )}
              <PlanBadge plan={user.plan} className="bg-white/25! bg-none" />
            </div>
            {row.bio && <p className="mt-2 max-w-xl text-white/85">{row.bio}</p>}
            <p className="mt-2 text-sm text-white/70">{t("memberSince", { date: format.dateTime(row.createdAt, { dateStyle: "medium" }) })}</p>
          </div>
          <div className="relative">
            {isMe ? (
              <Link href="/settings" className={buttonClass("secondary", "border-white/30 bg-white/15 text-white hover:bg-white/25")}>
                <Pencil className="size-4" /> {t("edit")}
              </Link>
            ) : (
              <FriendButton userId={user.id} relation={rel.relation} requestId={rel.requestId} />
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Zap className="size-5" />} gradient="bg-grad-xp" label={t("level")} value={`${user.level}`} sub={`${user.xp.toLocaleString("uz-UZ")} XP`} />
        <Stat icon={<Brain className="size-5" />} gradient="bg-grad-iq" label={t("iq")} value={user.iq === null ? "—" : String(user.iq)} />
        <Stat icon={<Trophy className="size-5" />} gradient="bg-grad-gold" label={t("rank")} value={rank ? `#${rank}` : "—"} />
        <Stat icon={<Flame className="size-5" />} gradient="bg-grad-streak" label={t("streak")} value={t("days", { count: row.longestStreak })} />
      </section>

      {/* Badges */}
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">
          {t("badges")} <span className="text-muted">· {earned.size}/{BADGES.length}</span>
        </h2>
        <ul className="stagger mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {BADGES.map((b) => {
            const has = earned.has(b.key);
            const def = BADGE_BY_KEY.get(b.key)!;
            return (
              <li
                key={b.key}
                title={tb(`${b.key}.text`)}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${
                  has ? "border-border bg-background/60" : "border-dashed border-border opacity-50 grayscale"
                }`}
              >
                <span className="relative">
                  <IconTile name={def.icon} gradient={def.gradient as GradientKey} size="lg" />
                  {!has && (
                    <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-surface text-muted shadow">
                      <Lock className="size-3.5" />
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold">{tb(`${b.key}.title`)}</span>
                <span className="text-xs text-muted">{tb(`${b.key}.text`)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Clan */}
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">{t("clan")}</h2>
        {clan ? (
          <Link href={`/clans/${clan.slug}`} className="mt-3 flex items-center gap-3 rounded-2xl p-2 hover:bg-background">
            <IconTile name={clan.emblem} gradient={clan.color as GradientKey} size="md" />
            <span className="font-semibold">{clan.name}</span>
            <span className="text-sm text-muted">[{clan.tag}]</span>
          </Link>
        ) : (
          <p className="mt-2 text-sm text-muted">{t("noClan")}</p>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, gradient, label, value, sub }: { icon: React.ReactNode; gradient: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-lg shadow-black/5 ${gradient}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="truncate font-display text-lg font-bold">{value}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
