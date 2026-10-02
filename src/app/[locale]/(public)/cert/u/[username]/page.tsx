import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClientIp } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getRateLimiter } from "@/lib/rate-limit";
import { siteOrigin } from "@/lib/site-url";
import { getCurrentTenant } from "@/lib/tenant";
import { iqCertificateAccess } from "@/features/iq/certificate";
import { userCertificateData } from "@/features/iq/certificate-data";
import { CertificateNotFound, CertificateProof } from "@/features/iq/components/certificate-proof";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("certificate.proof");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** /cert/u/<username> — the proof page of a signed-in user's certificate (its QR code leads here). */
export default async function UserCertificateProofPage({ params }: PageProps<"/[locale]/cert/u/[username]">) {
  const { locale, username } = await params;
  setRequestLocale(locale);

  const limit = await getRateLimiter().hit(`cert:ip:${await getClientIp()}`, 30, 60);
  if (!limit.ok) return <CertificateNotFound reason="tooMany" />;

  const name = decodeURIComponent(username).toLowerCase();
  const user = /^[a-z0-9_.-]{2,40}$/.test(name) ? await db.user.findUnique({ where: { username: name } }) : null;
  // A certificate exists only for someone who took the test and unlocked it.
  if (!user?.iqTestedAt || user.blockedAt || !(await iqCertificateAccess(user)).unlocked) return <CertificateNotFound />;

  const [tenant, origin] = await Promise.all([getCurrentTenant(), siteOrigin()]);
  return <CertificateProof data={await userCertificateData({ ...user, iqTestedAt: user.iqTestedAt }, tenant.name, origin)} live testHref="/iq-test" />;
}
