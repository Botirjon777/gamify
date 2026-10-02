import { MousePointerClick, UserPlus, Users, Wallet } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { partnerStats } from "@/features/partners/service";
import { PartnerForm, PartnerRowControls } from "@/features/admin/components/partner-controls";

/** Partners: who recommends us, their links, and what each one brought (clicks → sign-ups → paying users → revenue). */
export default async function AdminPartners({ params }: PageProps<"/[locale]/admin/partners">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();

  const [partners, stats, origin] = await Promise.all([
    db.partner.findMany({ orderBy: { createdAt: "desc" }, include: { promoCodes: { select: { code: true, percent: true, active: true } } } }),
    partnerStats(),
    siteOrigin(),
  ]);
  const som = (n: number) => t("som", { amount: n.toLocaleString("uz-UZ") });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("nav.partners")} subtitle={t("partners.subtitle")} />

      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-bold">{t("partners.new")}</h2>
        <PartnerForm origin={origin} />
      </section>

      {partners.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("partners.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {partners.map((partner) => {
            const s = stats.get(partner.id) ?? { signups: 0, payers: 0, revenue: 0 };
            return (
              <li key={partner.id} className={`flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5 ${partner.active ? "" : "opacity-70"}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-display text-lg font-bold">{partner.name}</h2>
                  {partner.contact && <span className="text-sm text-muted">{partner.contact}</span>}
                  {!partner.active && <span className="rounded bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">{t("partners.off")}</span>}
                  <span className="ml-auto text-xs text-muted">{format.dateTime(partner.createdAt, { dateStyle: "medium" })}</span>
                </div>
                {partner.note && <p className="-mt-2 text-sm text-muted">{partner.note}</p>}

                <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <Stat icon={<MousePointerClick className="size-4" />} label={t("partners.clicks")} value={String(partner.clicks)} />
                  <Stat
                    icon={<UserPlus className="size-4" />}
                    label={t("partners.signups")}
                    value={String(s.signups)}
                    sub={partner.clicks ? t("partners.rate", { percent: Math.round((s.signups / partner.clicks) * 100) }) : undefined}
                  />
                  <Stat icon={<Users className="size-4" />} label={t("partners.payers")} value={String(s.payers)} />
                  <Stat icon={<Wallet className="size-4" />} label={t("partners.revenue")} value={som(s.revenue)} />
                </dl>

                <PartnerRowControls
                  partner={{ id: partner.id, code: partner.code, name: partner.name, contact: partner.contact ?? "", note: partner.note ?? "" }}
                  active={partner.active}
                  origin={origin}
                />

                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {s.signups > 0 && (
                    <Link href={`/admin/users?partner=${partner.id}`} className="font-semibold text-brand hover:underline">
                      {t("partners.seeUsers", { count: s.signups })} →
                    </Link>
                  )}
                  <span className="text-muted">
                    {t("partners.promoCodes")}:{" "}
                    {partner.promoCodes.length
                      ? partner.promoCodes.map((p) => (
                          <span key={p.code} className={`mr-2 font-mono font-bold ${p.active ? "text-foreground" : "line-through"}`}>
                            {p.code} −{p.percent}%
                          </span>
                        ))
                      : "—"}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon} {label}
      </dt>
      <dd className="mt-1 font-display text-lg font-bold">
        {value} {sub && <span className="font-sans text-xs font-medium text-muted">{sub}</span>}
      </dd>
    </div>
  );
}
