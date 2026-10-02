import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { Avatar } from "@/components/avatar";
import { PlanBadge } from "@/components/plan-badge";
import { effectivePlan } from "@/features/plans/plans";
import { getAdminUser } from "@/features/admin/queries";
import { AccountControls, PlanControl, XpControl } from "@/features/admin/components/user-actions";
import { PaymentStatusPill } from "@/features/admin/components/payment-status";

export default async function AdminUserPage({ params }: PageProps<"/[locale]/admin/users/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user: admin } = await requireAdmin();
  const t = await getTranslations("admin");
  const tAuth = await getTranslations("auth");
  const tLearn = await getTranslations("learn");
  const format = await getFormatter();
  const data = await getAdminUser(id);
  if (!data) notFound();
  const { user, xpEvents, actions } = data;
  const plan = effectivePlan(user);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("user.back")}
      </Link>

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar user={user} className="size-16" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold">
            {user.username}
            <PlanBadge plan={plan} />
            {user.isSuperAdmin && <span className="rounded bg-grad-dark px-2 py-0.5 text-xs font-bold text-white">{t("users.adminBadge")}</span>}
            {user.blockedAt && <span className="rounded bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">{t("users.blockedBadge")}</span>}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("user.stats", {
              xp: user.xp.toLocaleString("uz-UZ"),
              level: user.level,
              attempts: user._count.attempts,
              iq: user._count.iqSessions,
              badges: user._count.badges,
            })}
          </p>
        </div>
        <Link href={`/u/${user.username}`} className="text-sm font-semibold text-brand hover:underline">
          /u/{user.username}
        </Link>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t("user.info")}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <Row label={t("user.phone")} value={user.phone ?? "—"} />
            <Row label={t("user.email")} value={user.email ?? "—"} />
            <Row label={t("user.gender")} value={user.gender ? (user.gender === "MALE" ? tAuth("male") : tAuth("female")) : "—"} />
            <Row label={t("user.interests")} value={user.interests.map((s) => tLearn(`subjects.${s}.title`)).join(", ") || "—"} />
            <Row label={t("user.partner")} value={user.partner?.name ?? "—"} />
            <Row label={t("user.joined")} value={format.dateTime(user.createdAt, { dateStyle: "medium", timeStyle: "short" })} />
            <Row label={t("user.lastActive")} value={user.lastActiveDay ? format.dateTime(user.lastActiveDay, { dateStyle: "medium" }) : "—"} />
            <Row label={t("user.clan")} value={user.clanMembership ? `${user.clanMembership.clan.name} [${user.clanMembership.clan.tag}]` : "—"} />
            <Row label={t("user.plan")} value={`${plan}${user.planExpiresAt && plan !== "FREE" ? ` · ${t("user.planUntil", { date: format.dateTime(user.planExpiresAt, { dateStyle: "medium" }) })}` : ""}`} />
            <Row label="" value={t("user.sessions", { count: user.sessions.length })} />
          </dl>
        </Card>

        <Card title={t("user.setPlan")}>
          <PlanControl userId={user.id} plan={user.plan} />
          <div className="mt-6 border-t border-border pt-5">
            <AccountControls userId={user.id} blocked={!!user.blockedAt} canModerate={!user.isSuperAdmin && user.id !== admin.id} />
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 text-sm font-semibold">{t("user.xp")}</p>
            <XpControl userId={user.id} />
          </div>
        </Card>

        <Card title={t("user.payments")}>
          {user.payments.length === 0 ? (
            <p className="text-sm text-muted">{t("user.noPayments")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {user.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <PaymentStatusPill status={p.status} />
                  <span className="font-semibold">{p.plan ? t("payments.planPeriod", { plan: p.plan, months: p.months }) : t(`payments.products.${p.product}`)}</span>
                  <span>{t("som", { amount: p.amountUzs.toLocaleString("uz-UZ") })}</span>
                  <span className="ml-auto text-muted">{format.dateTime(p.createdAt, { dateStyle: "medium" })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("user.xpEvents")}>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {xpEvents.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-1.5">
                <span className={`w-16 font-bold ${e.amount >= 0 ? "text-success" : "text-danger"}`}>
                  {e.amount > 0 ? "+" : ""}
                  {e.amount}
                </span>
                <span className="flex-1 text-muted">{e.reason}</span>
                <span className="text-xs text-muted">{format.relativeTime(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t("user.history")}>
          {actions.length === 0 ? (
            <p className="text-sm text-muted">{t("user.noHistory")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {actions.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-1.5">
                  <span className="flex-1 font-semibold">{t.has(`actions.${a.action}`) ? t(`actions.${a.action}`) : a.action}</span>
                  <span className="text-xs text-muted">{format.dateTime(a.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="mb-4 font-display text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}
