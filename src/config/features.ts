/**
 * Feature switches for things that are built but not turned on yet (PLAN.md §3.5).
 * Turning one on = flip the env var + provide the missing implementation.
 */
export const features = {
  /** SMS OTP for phone verification and self-service password reset. */
  smsOtp: process.env.FEATURE_SMS_OTP === "true",
  /** Redis-backed leaderboards / rate limiting / cache. Postgres + memory are used when off. */
  redis: process.env.FEATURE_REDIS === "true",
  /** Enabled UI languages. Later: ["uz", "ru", "en"]. */
  locales: ["uz"] as const,
  defaultLocale: "uz" as const,
};

export type Locale = (typeof features.locales)[number];
