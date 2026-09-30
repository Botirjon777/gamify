import { defineRouting } from "next-intl/routing";
import { features } from "@/config/features";

export const routing = defineRouting({
  locales: features.locales,
  defaultLocale: features.defaultLocale,
  // Only "uz" today → clean URLs (/dashboard). When "ru" is added, /ru/dashboard appears automatically.
  localePrefix: "as-needed",
});
