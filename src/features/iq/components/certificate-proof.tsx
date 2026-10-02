import { ArrowRight, BadgeCheck, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import type { CertificateData } from "../certificate-render";

const card = "mx-auto w-full max-w-xl rounded-3xl border border-border bg-surface p-6 text-center shadow-xl shadow-brand/5 sm:p-10";

/**
 * What the QR code on a certificate opens: "yes, this certificate is ours", with what it should say — so a printed
 * or forwarded certificate can be compared with the record. `live`: the score belongs to an account and keeps moving.
 */
export async function CertificateProof({ data, live = false, testHref }: { data: CertificateData; live?: boolean; testHref: string }) {
  const t = await getTranslations("certificate.proof");
  const rows = [
    [t("name"), data.name],
    [t("iq"), String(data.iq)],
    [t("percentile"), t("percentileValue", { percentile: data.percentile })],
    [t("date"), data.date],
    [data.text.numberLabel, data.number],
  ];
  return (
    <div className={card}>
      <BadgeCheck className="mx-auto size-14 text-success" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-2 leading-relaxed text-muted">{t("text", { site: data.site })}</p>

      <dl className="mt-6 overflow-hidden rounded-2xl border border-border text-left">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-right font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      {live && <p className="mt-4 text-sm leading-relaxed text-muted">{t("live")}</p>}
      <p className="mt-4 text-xs leading-relaxed text-muted">{data.text.disclaimer}</p>

      <Link href={testHref} className={buttonClass("primary", "mt-6 h-12 w-full text-base")}>
        {t("cta")} <ArrowRight className="size-5" />
      </Link>
    </div>
  );
}

/** No such certificate (a mistyped number, a forged picture) — or too many lookups from one address. */
export async function CertificateNotFound({ reason = "notFound" }: { reason?: "notFound" | "tooMany" }) {
  const t = await getTranslations("certificate.proof");
  return (
    <div className={card}>
      <SearchX className="mx-auto size-14 text-danger" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t(`${reason}Title`)}</h1>
      <p className="mt-2 leading-relaxed text-muted">{t(`${reason}Text`)}</p>
      <Link href="/iq-test" className={buttonClass("secondary", "mt-6 h-12 w-full text-base")}>
        {t("cta")}
      </Link>
    </div>
  );
}
