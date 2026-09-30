import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getIqState } from "@/features/iq/actions";
import { IqTest } from "@/features/iq/components/iq-test";
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

  const state = await getIqState(kind);
  return <IqTest kind={kind} initial={state} />;
}
