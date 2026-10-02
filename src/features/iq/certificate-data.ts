import "server-only";
import { getTranslations } from "next-intl/server";
import type { GuestIqTest } from "@/generated/prisma/client";
import { tashkentParts } from "@/lib/format";
import { guestCertificate } from "./guest";
import { iqFromRating, iqPercentile } from "./rating";
import type { CertificateData } from "./certificate-render";

/** Certificates are in Uzbek whatever the reader's language: they are documents, not pages. */
const texts = () => getTranslations({ locale: "uz", namespace: "certificate" });

/** The page a certificate's QR code opens: it confirms the certificate is ours and shows what it says. */
export const guestProofUrl = (origin: string, code: string) => `${origin}/cert/${code}`;
export const userProofUrl = (origin: string, username: string) => `${origin}/cert/u/${username}`;

async function build(input: { name: string; iq: number; date: Date; number: string; numberLabel: "numberLabel" | "userLabel"; site: string; verifyUrl: string }): Promise<CertificateData> {
  const t = await texts();
  const tTime = await getTranslations({ locale: "uz", namespace: "time" });
  const { day, month, year } = tashkentParts(input.date);
  const percentile = iqPercentile(input.iq);
  return {
    name: input.name,
    iq: input.iq,
    percentile,
    date: t("date", { day, month: tTime(`months.${month}`), year }),
    number: input.number,
    site: input.site,
    verifyUrl: input.verifyUrl,
    text: {
      title: t("title"),
      subtitle: t("subtitle"),
      presented: t("presented"),
      body: t("body", { site: input.site, iq: input.iq, percentile }),
      dateLabel: t("dateLabel"),
      numberLabel: t(input.numberLabel),
      scan: t("scan"),
      disclaimer: t("disclaimer"),
    },
  };
}

/** The certificate of a paid test taken without registration. */
export function guestCertificateData(test: GuestIqTest, site: string, origin: string) {
  const c = guestCertificate(test);
  return build({ name: c.name, iq: c.iq, date: c.date, number: `№ ${c.code}`, numberLabel: "numberLabel", site, verifyUrl: guestProofUrl(origin, c.code) });
}

/** A signed-in user's certificate: their current Zukko IQ (it moves with every test they take). */
export function userCertificateData(user: { username: string; iqRating: number; iqTestedAt: Date }, site: string, origin: string) {
  return build({ name: user.username, iq: iqFromRating(user.iqRating), date: user.iqTestedAt, number: `@${user.username}`, numberLabel: "userLabel", site, verifyUrl: userProofUrl(origin, user.username) });
}
