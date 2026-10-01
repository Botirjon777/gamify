import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";

/** Only the pages a visitor can open without an account. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  return [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/register`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${origin}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
