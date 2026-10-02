import "server-only";
import { db } from "@/lib/db";
import { cached, invalidateCache } from "@/lib/cache";
import { DEFAULT_PRICING, type PlanPricing } from "@/features/payments/pricing";
import { DEFAULT_IQ_PICTURE_SHARE, DEFAULT_IQ_PRICE_UZS, discountPercent, formatCardNumber, type SettingKey } from "./rules";

/**
 * Site-wide values that are changed without a deploy: where card transfers go, what the IQ test and the plans cost.
 * They live in the Setting table (admin → Sozlamalar, or `pnpm settings:set`). Not in the code: the repository
 * is public. PAYMENT_* environment variables are only a fallback for values that were never saved.
 */
export interface SiteSettings {
  /** Digits only, or null when not set. */
  cardNumber: string | null;
  cardHolder: string | null;
  /** Telegram @username or t.me link for payment receipts and questions. */
  contact: string | null;
  iqPriceUzs: number;
  /** "Before" price shown crossed out; null = no discount. */
  iqOldPriceUzs: number | null;
  /** How many of an IQ test's questions are pictures, 0–100 %. */
  iqPictureShare: number;
  /** Paid plans: monthly prices and the discount for a year paid at once. */
  pricing: PlanPricing;
}

const CACHE_KEY = "settings:all";

/** Cached for a minute per server process; saving in the admin panel clears it at once. */
export const getSettings = () =>
  cached<SiteSettings>(CACHE_KEY, 60, async () => {
    const rows = new Map((await db.setting.findMany()).map((r) => [r.key, r.value.trim()]));
    const text = (key: SettingKey, fallback?: string) => rows.get(key) || fallback?.trim() || null;
    const amount = (key: SettingKey) => {
      const n = Number(rows.get(key));
      return Number.isInteger(n) && n > 0 ? n : null;
    };
    const iqPriceUzs = amount("iq.priceUzs") ?? DEFAULT_IQ_PRICE_UZS;
    const old = amount("iq.oldPriceUzs");
    const percent = Number(rows.get("plan.annualDiscount") ?? "x");
    const pictures = Number(rows.get("iq.pictureShare") ?? "x");
    return {
      cardNumber: text("payment.cardNumber", process.env.PAYMENT_CARD_NUMBER)?.replace(/\D/g, "") || null,
      cardHolder: text("payment.cardHolder", process.env.PAYMENT_CARD_HOLDER),
      contact: text("payment.contact", process.env.PAYMENT_CONTACT),
      iqPriceUzs,
      iqOldPriceUzs: old && old > iqPriceUzs ? old : null,
      iqPictureShare: Number.isInteger(pictures) && pictures >= 0 && pictures <= 100 ? pictures : DEFAULT_IQ_PICTURE_SHARE,
      pricing: {
        monthly: { PRO: amount("plan.proPriceUzs") ?? DEFAULT_PRICING.monthly.PRO, DIAMOND: amount("plan.diamondPriceUzs") ?? DEFAULT_PRICING.monthly.DIAMOND },
        annualDiscount: Number.isInteger(percent) && percent >= 0 && percent <= 90 ? percent : DEFAULT_PRICING.annualDiscount,
      },
    };
  });

/** Write the given rows ("" removes a row → its default applies again). */
export async function saveSettings(rows: Partial<Record<SettingKey, string>>, updatedById: string | null) {
  await db.$transaction(
    Object.entries(rows).map(([key, value]) =>
      value === "" ? db.setting.deleteMany({ where: { key } }) : db.setting.upsert({ where: { key }, create: { key, value, updatedById }, update: { value, updatedById } }),
    ),
  );
  await invalidateCache("settings:");
}

/** Card transfers: number (grouped for display), holder, Telegram contact. */
export async function paymentDetails() {
  const s = await getSettings();
  return { cardNumber: s.cardNumber ? formatCardNumber(s.cardNumber) : null, cardHolder: s.cardHolder, contact: s.contact };
}

/** What the paid plans cost now. */
export const planPricing = async () => (await getSettings()).pricing;

/** The IQ result / certificate price, ready to show: "13 000", and when discounted "25 000" and 48. */
export async function iqPrice() {
  const { iqPriceUzs, iqOldPriceUzs } = await getSettings();
  return {
    priceUzs: iqPriceUzs,
    // Formatted on the server: browsers without Uzbek locale data would group the digits differently.
    price: iqPriceUzs.toLocaleString("uz-UZ"),
    oldPrice: iqOldPriceUzs?.toLocaleString("uz-UZ") ?? null,
    discount: discountPercent(iqPriceUzs, iqOldPriceUzs),
  };
}
export type IqPrice = Awaited<ReturnType<typeof iqPrice>>;
