import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClientIp } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getRateLimiter } from "@/lib/rate-limit";
import { siteOrigin } from "@/lib/site-url";
import { getCurrentTenant } from "@/lib/tenant";
import { guestCertificateData } from "@/features/iq/certificate-data";
import { CertificateNotFound, CertificateProof } from "@/features/iq/components/certificate-proof";
import { normalizeGuestCode } from "@/features/iq/guest";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("certificate.proof");
  // Personal: reachable from the certificate, not from search results.
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** /cert/ABC123 — the proof page of a certificate from the test without registration (its QR code leads here). */
export default async function GuestCertificateProofPage({ params }: PageProps<"/[locale]/cert/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  // Numbers are short; guessing them one by one must not be a way to read people's results.
  const limit = await getRateLimiter().hit(`cert:ip:${await getClientIp()}`, 30, 60);
  if (!limit.ok) return <CertificateNotFound reason="tooMany" />;

  const number = normalizeGuestCode(code);
  const test = number.length === 6 ? await db.guestIqTest.findUnique({ where: { code: number } }) : null;
  if (!test?.paidAt) return <CertificateNotFound />;

  const [tenant, origin] = await Promise.all([getCurrentTenant(), siteOrigin()]);
  return <CertificateProof data={await guestCertificateData(test, tenant.name, origin)} testHref={`/iq-test?r=${test.code}`} />;
}
