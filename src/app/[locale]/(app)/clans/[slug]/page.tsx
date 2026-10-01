import { notFound } from "next/navigation";
import { Crown, Shield, Trophy, Users, Zap } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { Avatar } from "@/components/avatar";
import { GRADIENTS, IconTile, type GradientKey } from "@/components/icon";
import { PlanBadge } from "@/components/plan-badge";
import { getClan } from "@/features/clans/queries";
import { JoinClan, LeaveClan, MemberControls, RequestDecision } from "@/features/clans/components/clan-actions";

export default async function ClanPage({ params }: PageProps<"/[locale]/clans/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("clans");
  const format = await getFormatter();
  const { user, tenant } = await requireSession();
  const clan = await getClan(slug, tenant.id, user.id);
  if (!clan) notFound();

  const color = (clan.color in GRADIENTS ? clan.color : "brand") as GradientKey;
  const isAdmin = clan.myRole === "LEADER" || clan.myRole === "OFFICER";

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-8 ${GRADIENTS[color]}`}>
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-5">
            <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-white/20 ring-4 ring-white/20">
              <IconTile name={clan.emblem} gradient={color} size="lg" className="shadow-none" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                {clan.name} <span className="text-lg text-white/70">[{clan.tag}]</span>
              </h1>
              {clan.description && <p className="mt-1.5 max-w-xl text-white/85">{clan.description}</p>}
              <p className="mt-2 text-sm text-white/70">{t("founded", { date: format.dateTime(clan.createdAt, { dateStyle: "medium" }) })}</p>
            </div>
          </div>
          <div className="relative">
            {clan.myRole ? (
              <LeaveClan isLeader={clan.myRole === "LEADER"} />
            ) : clan.inOtherClan ? (
              <span className="rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">{t("inOtherClan")}</span>
            ) : (
              <JoinClan clanId={clan.id} pending={clan.myRequestPending} full={clan.members.length >= clan.memberLimit} />
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3">
        <Stat icon={<Trophy className="size-5" />} gradient="bg-grad-gold" label={t("weeklyRank")} value={clan.weeklyRank ? `#${clan.weeklyRank}` : "—"} />
        <Stat icon={<Zap className="size-5" />} gradient="bg-grad-xp" label={t("weeklyTitle")} value={t("score", { xp: Math.round(clan.weeklyScore) })} />
        <Stat
          icon={<Users className="size-5" />}
          gradient="bg-grad-brand"
          label={t("membersTitle")}
          value={t("memberLimit", { count: clan.members.length, limit: clan.memberLimit })}
        />
      </section>

      <div className="grid gap-6 2xl:grid-cols-[1fr_380px]">
        {/* Members */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold">{t("membersTitle")}</h2>
          <ol className="stagger overflow-hidden rounded-2xl border border-border bg-surface">
            {clan.members.map((m) => (
              <li key={m.id} className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 ${m.id === user.id ? "bg-brand/5" : ""}`}>
                <Link href={`/u/${m.username}`}>
                  <Avatar user={m} className="size-10" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${m.username}`} className="flex items-center gap-1.5 font-semibold hover:text-brand">
                    <span className="truncate">{m.username}</span>
                    <PlanBadge plan={m.plan} />
                  </Link>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    {m.role === "LEADER" ? <Crown className="size-3.5 text-xp" /> : m.role === "OFFICER" ? <Shield className="size-3.5 text-brand" /> : null}
                    {t(`roles.${m.role}`)}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-bold text-xp">{Math.round(m.weeklyXp)} XP</span>
                {isAdmin && m.id !== user.id && m.role !== "LEADER" && (
                  <MemberControls
                    userId={m.id}
                    username={m.username}
                    canKick={clan.myRole === "LEADER" || m.role === "MEMBER"}
                    canPromote={clan.myRole === "LEADER"}
                    isOfficer={m.role === "OFFICER"}
                  />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Join requests (leaders / officers only) */}
        {isAdmin && (
          <section>
            <h2 className="mb-3 font-display text-sm font-bold">
              {t("requests")} {clan.requests.length > 0 && <span className="text-brand">· {clan.requests.length}</span>}
            </h2>
            {clan.requests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">{t("noRequests")}</p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
                {clan.requests.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Avatar user={r.user} className="size-10" />
                      <Link href={`/u/${r.user.username}`} className="min-w-0 flex-1 truncate font-semibold hover:text-brand">
                        {r.user.username}
                        <span className="ml-2 text-xs font-normal text-muted">Lv {r.user.level}</span>
                      </Link>
                      <RequestDecision requestId={r.id} />
                    </div>
                    {r.message && <p className="rounded-xl bg-background px-3 py-2 text-sm text-muted">“{r.message}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, gradient, label, value }: { icon: React.ReactNode; gradient: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:gap-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${gradient}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="truncate font-display font-bold">{value}</p>
      </div>
    </div>
  );
}
