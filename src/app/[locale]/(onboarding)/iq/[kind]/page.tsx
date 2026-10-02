import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getIqState } from "@/features/iq/actions";
import { iqCertificateAccess } from "@/features/iq/certificate";
import { iqPrice } from "@/features/settings/service";
import type { IqCertificateState } from "@/features/iq/components/iq-certificate";
import { IqTest } from "@/features/iq/components/iq-test";
import { paymentDetails } from "@/features/payments/config";
import type { IqKind } from "@/features/iq/types";

const KINDS: Record<string, IqKind> = { placement: "PLACEMENT", daily: "DAILY" };

export default async function IqPage({ params }: PageProps<"/[locale]/iq/[kind]">) {
  const { locale, kind: slug } = await params;
  setRequestLocale(locale);
  const kind = KINDS[slug];
  if (!kind) notFound();

  const { user } = await requireSession();
  // Daily tests need a placement rating first.
  if (kind === "DAILY" && !user.iqTestedAt) redirect({ href: "/iq/placement", locale });

  const [state, access] = await Promise.all([getIqState(kind), iqCertificateAccess(user)]);
  // The result screen offers the certificate: open it, or (Free plan) buy it once.
  const certificate: IqCertificateState = access.unlocked ? access : { ...access, price: await iqPrice(), ...(await paymentDetails()) };
  return <IqTest kind={kind} initial={state} certificate={certificate} />;
}
