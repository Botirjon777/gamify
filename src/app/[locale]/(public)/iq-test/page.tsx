import type { Metadata } from "next";
import { ArrowRight, Award, Brain, HelpCircle, Timer } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GUEST_IQ_PRICE_UZS, GUEST_IQ_QUESTIONS } from "@/features/iq/guest";
import { GuestIqForm } from "@/features/iq/components/guest-iq";
import { IQ_SECONDS_PER_QUESTION } from "@/features/iq/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guestIq");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/iq-test" } };
}

/** IQ test without an account: a short form, then the questions. ?r=<code> = came from someone's share link. */
export default async function GuestIqStartPage({ params, searchParams }: PageProps<"/[locale]/iq-test">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { r } = await searchParams;
  const t = await getTranslations("guestIq");
  const tIq = await getTranslations("iq");
  const price = GUEST_IQ_PRICE_UZS.toLocaleString("uz-UZ");

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-surface p-6 text-center shadow-xl shadow-brand/5 sm:p-10">
      <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-grad-iq text-white shadow-xl shadow-brand/20">
        <Brain className="size-8" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-3 leading-relaxed text-muted">{t("text")}</p>

      <ul className="mt-6 grid gap-2 text-sm font-semibold sm:grid-cols-3">
        <Rule icon={<HelpCircle className="size-4 text-brand" />}>{tIq("rules.questions", { count: GUEST_IQ_QUESTIONS })}</Rule>
        <Rule icon={<Timer className="size-4 text-brand" />}>{tIq("rules.time", { seconds: IQ_SECONDS_PER_QUESTION })}</Rule>
        <Rule icon={<ArrowRight className="size-4 text-brand" />}>{tIq("rules.noBack")}</Rule>
      </ul>

      {/* Said before the test starts, not after it: what is free and what is paid. */}
      <p className="mt-4 flex items-start gap-3 rounded-2xl border border-xp/40 bg-xp/10 p-4 text-left text-sm leading-relaxed">
        <Award className="mt-0.5 size-5 shrink-0 text-xp" />
        <span>{t("priceNote", { price })}</span>
      </p>

      <div className="mt-6">
        <GuestIqForm refCode={typeof r === "string" ? r.slice(0, 20) : undefined} />
      </div>
      <p className="mt-6 text-xs text-muted">{tIq("disclaimer")}</p>
    </div>
  );
}

function Rule({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-center gap-2 rounded-xl bg-background px-3 py-2.5">
      {icon}
      {children}
    </li>
  );
}
