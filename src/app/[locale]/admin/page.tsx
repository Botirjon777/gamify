import { Activity, Brain, Shield, UserPlus, Users, Wallet, Zap, Ban, Gem, ChevronRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/page-header";
import { getAdminStats, getSignupSeries } from "@/features/admin/queries";
import { SignupsChart } from "@/features/admin/components/signups-chart";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");
  const [s, series] = await Promise.all([getAdminStats(), getSignupSeries(30)]);
  const som = (n: number) => n.toLocaleString("uz-UZ");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("nav.dashboard")} />

      {/* Headline numbers */}
      <section className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile icon={<Users className="size-5" />} gradient="bg-grad-brand" label={t("stats.totalUsers")} value={s.totalUsers} href="/admin/users" />
        <Tile icon={<UserPlus className="size-5" />} gradient="bg-grad-success" label={t("stats.newToday")} value={s.newToday} sub={`${t("stats.new7d")}: ${s.new7d} · ${t("stats.new30d")}: ${s.new30d}`} />
        <Tile icon={<Activity className="size-5" />} gradient="bg-grad-iq" label={t("stats.activeToday")} value={s.activeToday} sub={`${t("stats.active7d")}: ${s.active7d}`} />
        <Tile icon={<Gem className="size-5" />} gradient="bg-grad-dark" label={t("stats.paidUsers")} value={s.paidUsers} sub={t("stats.paidSplit", { pro: s.proUsers, diamond: s.diamondUsers })} href="/admin/users?filter=paid" />
      </section>

      <div className="grid gap-6 2xl:grid-cols-[1fr_380px]">
        <SignupsChart
          data={series}
          title={t("chart.title")}
          subtitle={t("chart.subtitle")}
          tooltip={(date, count) => t("chart.tooltip", { date, count })}
          tableLabel={t("chart.table")}
        />

        <section className="stagger flex flex-col gap-3">
          <Link
            href="/admin/payments"
            className={`flex items-center gap-4 rounded-2xl p-4 transition ${
              s.pendingPayments ? "bg-grad-xp text-white shadow-lg shadow-xp/25" : "border border-border bg-surface"
            }`}
          >
            <Wallet className="size-6" />
            <span className="flex-1">
              <span className="block text-sm font-medium opacity-90">{t("stats.pendingPayments")}</span>
              <span className="font-display text-2xl font-bold">{s.pendingPayments}</span>
            </span>
            <ChevronRight className="size-5 opacity-70" />
          </Link>
          <Small icon={<Wallet className="size-4" />} label={t("stats.revenueMonth")} value={t("som", { amount: som(s.revenueMonth) })} sub={t("stats.revenueTotal", { amount: som(s.revenueTotal) })} />
          <Small icon={<Zap className="size-4" />} label={t("stats.attemptsToday")} value={som(s.attemptsToday)} />
          <Small icon={<Brain className="size-4" />} label={t("stats.iqTested")} value={som(s.iqTested)} />
          <Small icon={<Shield className="size-4" />} label={t("stats.clans")} value={som(s.clans)} />
          <Small icon={<Ban className="size-4" />} label={t("stats.blocked")} value={som(s.blockedUsers)} href="/admin/users?filter=blocked" />
        </section>
      </div>
    </div>
  );
}

function Tile({ icon, gradient, label, value, sub, href }: { icon: React.ReactNode; gradient: string; label: string; value: number; sub?: string; href?: string }) {
  const body = (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/30 sm:p-5">
      <span className={`grid size-10 place-items-center rounded-xl text-white ${gradient}`}>{icon}</span>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="font-display text-3xl font-bold">{value.toLocaleString("uz-UZ")}</p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Small({ icon, label, value, sub, href }: { icon: React.ReactNode; label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <span className="grid size-8 place-items-center rounded-lg bg-background text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">{label}</span>
        <span className="block font-semibold">{value}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
