import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, Lock } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { siteOrigin } from "@/lib/site-url";
import { telegramMessageUrl } from "@/lib/telegram";
import { getCurrentTenant } from "@/lib/tenant";
import { GUEST_IQ_PRICE_UZS, GUEST_IQ_SCORE_IS_FREE, guestCertificate, guestQuestion, guestTestByToken } from "@/features/iq/guest";
import { CopyField, GuestIqRunner, TelegramButton } from "@/features/iq/components/guest-iq";
import { PrintButton } from "@/features/iq/components/print-button";
import { paymentDetails } from "@/features/payments/config";

/** Personal pages behind an unguessable link: never in search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * One guest test, by its secret link. Depending on where it is:
 * still running → the questions; finished → how to pay; paid → the certificate.
 */
export default async function GuestIqTestPage({ params }: PageProps<"/[locale]/iq-test/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const test = await guestTestByToken(token);
  if (!test) notFound();
  const t = await getTranslations("guestIq");

  if (test.status === "ACTIVE") {
    if (!test.currentItemId) notFound();
    return <GuestIqRunner token={test.token} initial={await guestQuestion(test, locale)} />;
  }

  const card = "mx-auto w-full max-w-2xl rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-brand/5 sm:p-10";
  const result = guestCertificate(test);

  // ─── Finished, waiting for the payment ───────────────────────────────────
  if (!test.paidAt) {
    const { cardNumber, cardHolder, contact } = paymentDetails();
    const price = GUEST_IQ_PRICE_UZS.toLocaleString("uz-UZ");
    const origin = await siteOrigin();
    const telegram = telegramMessageUrl(contact, t("pay.telegramMessage", { code: test.code, name: result.name }));

    return (
      <div className={card}>
        {/* The admin confirms the payment → this page turns into the certificate by itself. */}
        <AutoRefresh seconds={20} />
        <div className="text-center">
          <CircleCheck className="mx-auto size-12 text-success" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("pay.title", { name: test.firstName })}</h1>
          {GUEST_IQ_SCORE_IS_FREE ? (
            <p className="mt-4 font-display text-7xl font-bold text-grad-brand">{result.iq}</p>
          ) : (
            <p className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-2xl bg-background px-6 py-4">
              <span aria-hidden className="select-none font-display text-6xl font-bold text-brand blur-md">
                1{String(result.total).padStart(2, "0")}
              </span>
              <Lock className="size-6 text-muted" />
              <span className="sr-only">{t("pay.locked")}</span>
            </p>
          )}
          <p className="mt-4 leading-relaxed text-muted">{t("pay.text", { price })}</p>
        </div>

        <ol className="mt-8 flex flex-col gap-6">
          <Step n={1} title={t("pay.step1", { price })}>
            {cardNumber ? (
              <>
                <CopyField value={cardNumber} copyValue={cardNumber.replace(/\s/g, "")} label={t("pay.copy")} />
                {cardHolder && <p className="mt-1.5 text-sm text-muted">{cardHolder}</p>}
              </>
            ) : (
              <p className="rounded-xl bg-xp/10 p-3 text-sm">{t("pay.cardMissing", { contact: contact ?? "—" })}</p>
            )}
          </Step>
          <Step n={2} title={t("pay.step2")}>
            <p className="mb-2 text-sm text-muted">{t("pay.codeHint")}</p>
            <CopyField value={test.code} label={t("pay.copy")} />
            <div className="mt-3">
              {telegram ? <TelegramButton href={telegram}>{t("pay.telegram")}</TelegramButton> : contact && <p className="text-sm font-semibold">{t("pay.contact", { contact })}</p>}
            </div>
          </Step>
          <Step n={3} title={t("pay.step3")}>
            <p className="mb-2 text-sm text-muted">{t("pay.keepLink")}</p>
            <CopyField value={`${origin}/iq-test/${test.token}`} label={t("pay.copy")} mono={false} />
          </Step>
        </ol>
      </div>
    );
  }

  // ─── Paid: the certificate ───────────────────────────────────────────────
  const format = await getFormatter();
  const tIq = await getTranslations("iq");
  const tenant = await getCurrentTenant();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl shadow-brand/5 print:rounded-none print:border-0 print:shadow-none">
        <header className="bg-grad-brand px-6 py-8 text-center text-white [print-color-adjust:exact] sm:py-10">
          <p className="text-sm font-bold uppercase tracking-widest text-white/85">{tenant.name}</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{tIq("certificate.title")}</h1>
        </header>
        <div className="px-6 py-8 text-center sm:px-10">
          <p className="font-display text-2xl font-bold sm:text-3xl">{result.name}</p>
          <p className="mt-4 font-display text-8xl font-bold leading-none text-brand sm:text-9xl">{result.iq}</p>
          <dl className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
            <Fact label={tIq("certificate.percentile")} value={tIq("certificate.percentileValue", { percentile: result.percentile })} />
            <Fact label={t("certificate.correct")} value={`${result.correct} / ${result.total}`} />
            <Fact label={tIq("certificate.date")} value={format.dateTime(result.date, { dateStyle: "medium", timeZone: "Asia/Tashkent" })} />
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            {t("certificate.number", { code: result.code })} · {tIq("disclaimer")}
          </p>
        </div>
      </article>

      <div className="flex justify-center print:hidden">
        <PrintButton>{tIq("certificate.print")}</PrintButton>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-grad-brand text-sm font-bold text-white">{n}</span>
      <div className="min-w-0 flex-1">
        <h2 className="mb-2 font-bold leading-snug">{title}</h2>
        {children}
      </div>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background p-3 [print-color-adjust:exact]">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-bold sm:text-base">{value}</dd>
    </div>
  );
}
