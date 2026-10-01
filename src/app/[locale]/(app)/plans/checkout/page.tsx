import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { paymentDetails } from "@/features/payments/config";
import { isBilling, PAID_PLANS, type PaidPlan } from "@/features/payments/pricing";
import { CheckoutForm } from "@/features/payments/components/checkout-form";

export default async function CheckoutPage({ params, searchParams }: PageProps<"/[locale]/plans/checkout">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSession();
  const sp = await searchParams;
  const plan = PAID_PLANS.find((p) => p === sp.plan) as PaidPlan | undefined;
  const billing = isBilling(sp.billing) ? sp.billing : "monthly";
  if (!plan) redirect({ href: "/plans", locale });

  const t = await getTranslations("plans");
  return (
    <div className="flex flex-col gap-6">
      <Link href="/plans" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("title")}
      </Link>
      <PageHeader title={t("checkout.title", { plan: t(`names.${plan!}`) })} />
      <CheckoutForm plan={plan!} initialBilling={billing} {...paymentDetails()} />
    </div>
  );
}
