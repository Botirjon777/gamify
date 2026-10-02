"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PriceTag } from "@/features/settings/components/price-tag";
import { discountPercent, formatCardNumber } from "@/features/settings/rules";
import { updateSettings } from "../settings-actions";
import { groupDigits } from "@/lib/format";
import { perMonth, priceFor, type PlanPricing } from "@/features/payments/pricing";

const input = "h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";
const group = groupDigits;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export interface SettingsValues {
  cardNumber: string;
  cardHolder: string;
  contact: string;
  iqPriceUzs: number;
  iqOldPriceUzs: number | null;
  iqPictureShare: number;
  pricing: PlanPricing;
}

/** Everything in the Setting table on one form. */
export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cardNumber, setCardNumber] = useState(formatCardNumber(initial.cardNumber));
  const [cardHolder, setCardHolder] = useState(initial.cardHolder);
  const [contact, setContact] = useState(initial.contact);
  const [price, setPrice] = useState(String(initial.iqPriceUzs));
  const [oldPrice, setOldPrice] = useState(initial.iqOldPriceUzs ? String(initial.iqOldPriceUzs) : "");
  const [pictureShare, setPictureShare] = useState(String(initial.iqPictureShare));
  const [proPrice, setProPrice] = useState(String(initial.pricing.monthly.PRO));
  const [diamondPrice, setDiamondPrice] = useState(String(initial.pricing.monthly.DIAMOND));
  const [annualDiscount, setAnnualDiscount] = useState(String(initial.pricing.annualDiscount));
  const pricing: PlanPricing = { monthly: { PRO: Number(proPrice) || 0, DIAMOND: Number(diamondPrice) || 0 }, annualDiscount: Math.min(90, Math.max(0, Number(annualDiscount) || 0)) };

  const priceUzs = Number(price) || 0;
  const oldPriceUzs = oldPrice.trim() ? Number(oldPrice) || 0 : null;
  const preview = {
    price: group(priceUzs),
    oldPrice: oldPriceUzs && oldPriceUzs > priceUzs ? group(oldPriceUzs) : null,
    discount: discountPercent(priceUzs, oldPriceUzs),
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await updateSettings({
        cardNumber,
        cardHolder,
        contact,
        iqPriceUzs: priceUzs,
        iqOldPriceUzs: oldPriceUzs,
        iqPictureShare: Number(pictureShare),
        proPriceUzs: pricing.monthly.PRO,
        diamondPriceUzs: pricing.monthly.DIAMOND,
        annualDiscount: Number(annualDiscount),
      }).catch(() => ({ ok: false as const, error: "invalid" }));
      if (!result.ok) return void toast.error(t.has(`errors.${result.error}`) ? t(`errors.${result.error}`) : t("errors.invalid"));
      toast.success(t("saved"));
      router.refresh();
    });
  };
  const card = "flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <section className={card}>
        <div>
          <h2 className="font-display text-lg font-bold">{t("payment")}</h2>
          <p className="mt-1 text-sm text-muted">{t("paymentText")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("cardNumber")} hint={t("cardNumberHint")}>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value).slice(0, 19))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000 0000 0000 0000"
              className={`${input} font-mono tracking-wider`}
            />
          </Field>
          <Field label={t("cardHolder")}>
            <input value={cardHolder} onChange={(e) => setCardHolder(e.target.value.toUpperCase())} maxLength={60} autoComplete="off" className={`${input} uppercase`} />
          </Field>
          <Field label={t("contact")} hint={t("contactHint")}>
            <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={80} autoComplete="off" spellCheck={false} placeholder="@username" className={input} />
          </Field>
        </div>
      </section>

      <section className={card}>
        <div>
          <h2 className="font-display text-lg font-bold">{t("iq")}</h2>
          <p className="mt-1 text-sm text-muted">{t("iqText")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("iqPrice")}>
            <input type="number" min={1000} step={100} value={price} onChange={(e) => setPrice(e.target.value)} required className={input} />
          </Field>
          <Field label={t("iqOldPrice")} hint={t("iqOldPriceHint")}>
            <input type="number" min={1000} step={100} value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} className={input} />
          </Field>
          <Field label={t("iqPictureShare")} hint={t("iqPictureShareHint")}>
            <input type="number" min={0} max={100} step={5} value={pictureShare} onChange={(e) => setPictureShare(e.target.value)} required className={input} />
          </Field>
        </div>
        <p className="flex flex-wrap items-center gap-3 rounded-2xl bg-background px-4 py-3 text-sm">
          <span className="text-muted">{t("preview")}</span>
          <span className="text-lg">
            <PriceTag price={preview} />
          </span>
        </p>
      </section>

      <section className={card}>
        <div>
          <h2 className="font-display text-lg font-bold">{t("plans")}</h2>
          <p className="mt-1 text-sm text-muted">{t("plansText")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("proPrice")}>
            <input type="number" min={1000} step={1000} value={proPrice} onChange={(e) => setProPrice(e.target.value)} required className={input} />
          </Field>
          <Field label={t("diamondPrice")}>
            <input type="number" min={1000} step={1000} value={diamondPrice} onChange={(e) => setDiamondPrice(e.target.value)} required className={input} />
          </Field>
          <Field label={t("annualDiscount")} hint={t("annualDiscountHint")}>
            <input type="number" min={0} max={90} step={1} value={annualDiscount} onChange={(e) => setAnnualDiscount(e.target.value)} required className={input} />
          </Field>
        </div>
        <ul className="grid gap-2 rounded-2xl bg-background px-4 py-3 text-sm sm:grid-cols-2">
          {(["PRO", "DIAMOND"] as const).map((plan) => (
            <li key={plan}>
              <b>{plan === "PRO" ? "Pro" : "Diamond"}</b>
              <span className="block text-muted">{t("planMonthly", { price: group(priceFor(pricing, plan, "monthly")) })}</span>
              <span className="block text-muted">{t("planAnnual", { total: group(priceFor(pricing, plan, "annual")), perMonth: group(perMonth(pricing, plan, "annual")) })}</span>
            </li>
          ))}
        </ul>
      </section>

      <Button type="submit" disabled={pending} className="h-12 w-full sm:w-fit sm:px-10">
        {t("save")}
      </Button>
    </form>
  );
}
