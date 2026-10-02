"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PriceTag } from "@/features/settings/components/price-tag";
import { discountPercent, formatCardNumber } from "@/features/settings/rules";
import { updateSettings } from "../settings-actions";

const input = "h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";
const group = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");

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
      const result = await updateSettings({ cardNumber, cardHolder, contact, iqPriceUzs: priceUzs, iqOldPriceUzs: oldPriceUzs }).catch(() => ({ ok: false as const, error: "invalid" }));
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
        </div>
        <p className="flex flex-wrap items-center gap-3 rounded-2xl bg-background px-4 py-3 text-sm">
          <span className="text-muted">{t("preview")}</span>
          <span className="text-lg">
            <PriceTag price={preview} />
          </span>
        </p>
      </section>

      <Button type="submit" disabled={pending} className="h-12 w-full sm:w-fit sm:px-10">
        {t("save")}
      </Button>
    </form>
  );
}
