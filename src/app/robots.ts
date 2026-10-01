import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";

/** Everything behind the login: nothing for a crawler there (it would only see redirects to /login). */
const PRIVATE = [
  "/dashboard",
  "/learn",
  "/leaderboard",
  "/friends",
  "/clans",
  "/chat",
  "/duels",
  "/badges",
  "/notifications",
  "/plans",
  "/settings",
  "/u/",
  "/iq/",
  "/admin",
  "/api/",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${origin}/sitemap.xml`,
  };
}
