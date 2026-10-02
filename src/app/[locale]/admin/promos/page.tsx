import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PromoForm, PromoToggle } from "@/features/admin/components/promo-controls";

/** Promo codes for subscriptions: create, switch on / off, see how much each one was used. */
export default async function AdminPromos({ params }: PageProps<"/[locale]/admin/promos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();

  const [promos, partners, usage] = await Promise.all([
    db.promoCode.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { partner: { select: { name: true } } } }),
    db.partner.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // Per code and status: how many payments, and how much discount was given.
    db.payment.groupBy({ by: ["promoCodeId", "status"], where: { promoCodeId: { not: null } }, _count: true, _sum: { discountUzs: true, amountUzs: true } }),
  ]);
  const stats = (id: string) => {
    const rows = usage.filter((u) => u.promoCodeId === id);
    const of = (status: string) => rows.find((r) => r.status === status);
    return {
      // What counts against the limit: waiting + approved.
      used: (of("PENDING")?._count ?? 0) + (of("APPROVED")?._count ?? 0),
      approved: of("APPROVED")?._count ?? 0,
      revenue: of("APPROVED")?._sum.amountUzs ?? 0,
      discount: of("APPROVED")?._sum.discountUzs ?? 0,
    };
  };
  const now = new Date();
  const som = (n: number) => t("som", { amount: n.toLocaleString("uz-UZ") });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("nav.promos")} subtitle={t("promos.subtitle")} />

      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-bold">{t("promos.new")}</h2>
        <PromoForm partners={partners} />
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        {promos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t("promos.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-3 font-semibold">{t("promos.code")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("promos.percent")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("promos.used")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("promos.revenue")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("promos.lastDay")}</th>
                  <th className="pb-3 text-right font-semibold">{t("promos.active")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {promos.map((promo) => {
                  const s = stats(promo.id);
                  const expired = !!promo.expiresAt && promo.expiresAt <= now;
                  const usedUp = promo.maxUses !== null && s.used >= promo.maxUses;
                  return (
                    <tr key={promo.id} className={promo.active && !expired && !usedUp ? "" : "text-muted"}>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-base font-bold">{promo.code}</span>
                        {promo.partner && <span className="block text-xs font-semibold text-brand">{promo.partner.name}</span>}
                        {promo.note && <span className="block text-xs text-muted">{promo.note}</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        −{promo.percent}%<span className="block text-xs font-normal text-muted">{promo.plan ?? t("promos.anyPlan")}</span>
                      </td>
                      <td className="px-4 py-3">
                        {promo.maxUses === null ? s.used : `${s.used} / ${promo.maxUses}`}
                        {usedUp && <span className="block text-xs font-semibold text-danger">{t("promos.usedUp")}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {som(s.revenue)}
                        <span className="block text-xs text-muted">{t("promos.discountGiven", { amount: s.discount.toLocaleString("uz-UZ"), count: s.approved })}</span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Stored as the first moment after the last day. */}
                        {promo.expiresAt ? format.dateTime(new Date(promo.expiresAt.getTime() - 1), { dateStyle: "medium", timeZone: "Asia/Tashkent" }) : "—"}
                        {expired && <span className="block text-xs font-semibold text-danger">{t("promos.expired")}</span>}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <PromoToggle id={promo.id} active={promo.active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
