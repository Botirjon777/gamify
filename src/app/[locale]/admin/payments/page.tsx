import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { effectivePlan } from "@/features/plans/plans";
import { listPayments } from "@/features/admin/queries";
import { PaymentDecision } from "@/features/admin/components/payment-decision";
import { PaymentStatusPill } from "@/features/admin/components/payment-status";

const TABS = ["PENDING", "APPROVED", "REJECTED"] as const;

export default async function AdminPayments({ params, searchParams }: PageProps<"/[locale]/admin/payments">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const sp = await searchParams;
  const status = TABS.find((s) => s === sp.status) ?? "PENDING";
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const payments = await listPayments(status);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("nav.payments")} />
      <div className="inline-flex w-fit rounded-xl border border-border bg-surface p-1">
        {TABS.map((s) => (
          <Link
            key={s}
            href={`/admin/payments?status=${s}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${s === status ? "bg-grad-brand text-white" : "text-muted hover:text-foreground"}`}
          >
            {t(`payments.tabs.${s}`)}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("payments.empty")}</p>
      ) : (
        <ul className="stagger flex flex-col gap-3">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/admin/users/${p.user.id}`} className="flex items-center gap-2 font-semibold hover:text-brand">
                  <Avatar user={p.user} className="size-9" />
                  {p.user.username}
                </Link>
                <span className="text-sm text-muted">{p.user.phone}</span>
                <PaymentStatusPill status={p.status} label={t(`payments.tabs.${p.status}`)} />
                <span className="ml-auto text-sm text-muted">{format.dateTime(p.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="font-display text-xl font-bold">{t("som", { amount: p.amountUzs.toLocaleString("uz-UZ") })}</span>
                <span className="font-semibold">
                  {p.plan} · {p.months} oy
                </span>
                <span className="text-sm text-muted">{t("payments.current", { plan: effectivePlan(p.user) })}</span>
              </div>
              {p.reference && (
                <p className="rounded-xl bg-background px-3 py-2 text-sm">
                  <span className="font-semibold">{t("payments.reference")}:</span> {p.reference}
                </p>
              )}
              {status === "PENDING" ? (
                <PaymentDecision paymentId={p.id} />
              ) : (
                p.reviewedAt && (
                  <p className="text-sm text-muted">
                    {t("payments.reviewed", { date: format.dateTime(p.reviewedAt, { dateStyle: "medium", timeStyle: "short" }), note: p.adminNote ?? "—" })}
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
