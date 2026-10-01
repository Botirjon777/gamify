import { Check, Clock, Gem, Rocket, Sparkles, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { cancelPaymentRequest } from "@/features/payments/actions";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { effectivePlan, PLAN_ORDER, PLANS } from "@/features/plans/plans";
import { BILLING, BILLINGS, isBilling, perMonth, priceFor, yearlySaving, type Billing } from "@/features/payments/pricing";

const som = (n: number) => n.toLocaleString("uz-UZ");

const LOOK = {
  FREE: { icon: Rocket, card: "border-border bg-surface", tile: "bg-grad-success", text: "" },
  PRO: { icon: Zap, card: "border-transparent bg-grad-brand text-white shadow-2xl shadow-brand/30 lg:-translate-y-3", tile: "bg-white/20", text: "text-white/80" },
  DIAMOND: { icon: Gem, card: "border-transparent bg-grad-dark text-white shadow-2xl shadow-black/20", tile: "bg-grad-iq", text: "text-white/75" },
} as const;

export default async function PlansPage({ params, searchParams }: PageProps<"/[locale]/plans">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const billing: Billing = isBilling(sp.billing) ? sp.billing : "monthly";
  const t = await getTranslations("plans");
  const format = await getFormatter();
  const { user } = await requireSession();
  const current = effectivePlan(user);
  const pendingPayment = await db.payment.findFirst({ where: { userId: user.id, status: "PENDING" } });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {pendingPayment && (
        <section className="flex flex-col gap-3 rounded-2xl border border-xp/40 bg-xp/10 p-4 sm:flex-row sm:items-center">
          <Clock className="size-6 shrink-0 text-xp" />
          <div className="flex-1">
            <p className="font-semibold">{t("pending")}</p>
            <p className="text-sm text-muted">
              {t("pendingText", {
                plan: t(`names.${pendingPayment.plan}`),
                period: t(pendingPayment.months === 12 ? "billing.annual" : "billing.monthly"),
                amount: pendingPayment.amountUzs.toLocaleString("uz-UZ"),
              })}
            </p>
          </div>
          <form action={cancelPaymentRequest.bind(null, pendingPayment.id)}>
            <button className="text-sm font-semibold text-muted hover:text-danger">{t("cancelRequest")}</button>
          </form>
        </section>
      )}

      {/* Monthly / annual */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl border border-border bg-surface p-1">
          {BILLINGS.map((b) => (
            <Link
              key={b}
              href={`/plans?billing=${b}`}
              scroll={false}
              aria-current={b === billing ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition ${
                b === billing ? "bg-grad-brand text-white shadow-md shadow-brand/20" : "text-muted hover:text-foreground"
              }`}
            >
              {t(`billing.${b}`)}
              {BILLING[b].discount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${b === billing ? "bg-white/25" : "bg-success/15 text-success"}`}>
                  −{BILLING[b].discount}%
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="stagger grid gap-5 pt-3 lg:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const limits = PLANS[plan];
          const look = LOOK[plan];
          const Icon = look.icon;
          const isCurrent = plan === current;
          const features = [
            t("features.multiplier", { x: limits.xpMultiplier }),
            limits.dailyExerciseXpCap === null ? t("features.noCap") : t("features.cap", { xp: limits.dailyExerciseXpCap }),
            t("features.clan", { n: limits.clanMemberLimit }),
            t("features.friends", { n: limits.maxFriends }),
            ...(plan === "PRO" ? [t("features.avatarsPro"), t("features.badge", { plan: "Pro" })] : []),
            ...(plan === "DIAMOND" ? [t("features.avatarsDiamond"), t("features.badge", { plan: "Diamond" })] : []),
          ];

          return (
            <section key={plan} className={`relative flex flex-col rounded-3xl border p-6 transition sm:p-7 ${look.card}`}>
              {plan === "PRO" && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-grad-xp px-3 py-1 text-xs font-bold text-white shadow-lg">
                  <Sparkles className="size-3.5" /> {t("popular")}
                </span>
              )}
              <span className={`grid size-12 place-items-center rounded-2xl text-white ${look.tile}`}>
                <Icon className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold">{t(`names.${plan}`)}</h2>
              <p className={`text-sm ${look.text || "text-muted"}`}>{t(`taglines.${plan}`)}</p>
              {plan === "FREE" ? (
                <p className="mt-5 font-display text-3xl font-bold">{t("free")}</p>
              ) : (
                <div className="mt-5">
                  {billing === "annual" && (
                    <p className={`text-sm font-medium line-through ${look.text}`}>
                      {som(perMonth(plan, "monthly"))} {t("perMonth")}
                    </p>
                  )}
                  <p className="flex flex-wrap items-baseline gap-x-1.5 font-display text-3xl font-bold">
                    {som(perMonth(plan, billing))}
                    <span className={`font-sans text-sm font-medium ${look.text}`}>{t("perMonth")}</span>
                  </p>
                  {billing === "annual" && (
                    <p className={`mt-1 text-sm ${look.text}`}>
                      {t("annualTotal", { total: som(priceFor(plan, "annual")), saving: som(yearlySaving(plan)) })}
                    </p>
                  )}
                </div>
              )}

              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`mt-0.5 size-4 shrink-0 ${plan === "FREE" ? "text-success" : "text-white"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                {isCurrent ? (
                  <p className={`rounded-xl px-4 py-3 text-center text-sm font-bold ${plan === "FREE" ? "bg-background" : "bg-white/15"}`}>
                    {t("current")}
                    {user.planExpiresAt && plan !== "FREE" && (
                      <span className="block text-xs font-medium opacity-80">
                        {t("until", { date: format.dateTime(user.planExpiresAt, { dateStyle: "medium" }) })}
                      </span>
                    )}
                  </p>
                ) : plan !== "FREE" ? (
                  <Link
                    href={`/plans/checkout?plan=${plan}&billing=${billing}`}
                    className={`block rounded-xl px-4 py-3 text-center text-sm font-bold transition ${
                      plan === "PRO" ? "bg-white text-brand hover:bg-white/90" : "bg-grad-iq text-white hover:brightness-110"
                    }`}
                  >
                    {t("choose")}
                  </Link>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>


    </div>
  );
}
