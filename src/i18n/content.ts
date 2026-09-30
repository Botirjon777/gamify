import { features, type Locale } from "@/config/features";

/** Translatable DB field, stored as JSON: { "uz": "...", "ru": "..." }. */
export type LocalizedText = Partial<Record<Locale | string, string>>;

/** Pick the right language from a DB JSON field, falling back to the default locale. */
export function localized(field: LocalizedText | null | undefined, locale: string): string {
  if (!field) return "";
  return field[locale] ?? field[features.defaultLocale] ?? Object.values(field)[0] ?? "";
}
