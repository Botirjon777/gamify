import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) — built locally, uploaded to the VPS by scripts/deploy.
  output: "standalone",
  // Loaded lazily at runtime (languages/themes) — keep as a real node_modules package so nothing is missed.
  serverExternalPackages: ["shiki"],
  experimental: {
    // Client router cache: going back to a page seen in the last 30 s is instant (no server round trip).
    // Every server action that changes data calls revalidatePath, which clears this cache.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default withNextIntl(nextConfig);
