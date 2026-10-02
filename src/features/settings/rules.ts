/** Site settings: keys, validation and formatting — pure, shared by the service, the admin form, the CLI and tests. */
import { z } from "zod";

/** Rows of the Setting table. Values are stored as text. */
export const SETTING_KEYS = ["payment.cardNumber", "payment.cardHolder", "payment.contact", "iq.priceUzs", "iq.oldPriceUzs"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/** Used until a price is saved in the database. */
export const DEFAULT_IQ_PRICE_UZS = 13_000;

/** "8600 1234 5678 9012" — how a card number is shown; stored and copied as digits only. */
export const formatCardNumber = (digits: string) => digits.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");

/** Whole percent taken off, e.g. 25 000 → 13 000 = 48. Null when there is no (valid) old price. */
export const discountPercent = (priceUzs: number, oldPriceUzs: number | null) =>
  oldPriceUzs && oldPriceUzs > priceUzs ? Math.round((1 - priceUzs / oldPriceUzs) * 100) : null;

const money = z.number().int().min(1_000).max(100_000_000);

/** What the admin form (and the CLI) may save. Empty text = "not set". */
export const settingsInput = z
  .object({
    cardNumber: z
      .string()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^(\d{16})?$/, "cardNumber")),
    cardHolder: z.string().trim().max(60, "cardHolder"),
    /** Telegram: @username or a t.me link — it becomes the "write to us" button. */
    contact: z
      .string()
      .trim()
      .regex(/^(@\w{4,32}|https:\/\/t\.me\/[\w+]{4,64})?$/, "contact"),
    iqPriceUzs: money,
    /** The crossed-out "before" price; null = no discount shown. */
    iqOldPriceUzs: money.nullable(),
  })
  .refine((s) => s.iqOldPriceUzs === null || s.iqOldPriceUzs > s.iqPriceUzs, { message: "oldPrice", path: ["iqOldPriceUzs"] });
export type SettingsInput = z.input<typeof settingsInput>;

/** Validated form → table rows ("" = remove the row and fall back to the default). */
export function toRows(s: z.output<typeof settingsInput>): Record<SettingKey, string> {
  return {
    "payment.cardNumber": s.cardNumber,
    "payment.cardHolder": s.cardHolder,
    "payment.contact": s.contact,
    "iq.priceUzs": String(s.iqPriceUzs),
    "iq.oldPriceUzs": s.iqOldPriceUzs === null ? "" : String(s.iqOldPriceUzs),
  };
}
