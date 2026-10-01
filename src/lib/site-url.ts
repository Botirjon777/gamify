import "server-only";
import { headers } from "next/headers";

/**
 * Origin of the site the visitor is on, e.g. "https://zukkolar.uz" — or a study center's own
 * subdomain, so links, canonical URLs and sitemaps always point at the host they were asked on.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${h.get("host") ?? process.env.ROOT_DOMAIN ?? "localhost:3000"}`;
}
