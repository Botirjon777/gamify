import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) — built locally, uploaded to the VPS by scripts/deploy.
  output: "standalone",
  // Loaded lazily at runtime (languages/themes) — keep as a real node_modules package so nothing is missed.
  serverExternalPackages: ["shiki"],
};

export default withNextIntl(nextConfig);
