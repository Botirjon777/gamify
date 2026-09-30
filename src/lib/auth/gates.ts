import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireSession } from "./session";

/**
 * Session for the main app. New users must finish the placement IQ test first,
 * so everyone on the platform has an IQ score and a place in the rating.
 */
export async function requireOnboardedSession() {
  const current = await requireSession();
  if (!current.user.iqTestedAt) redirect({ href: "/iq/placement", locale: await getLocale() });
  return current;
}
