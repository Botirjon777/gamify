"use client";

import { useState, useTransition } from "react";
import { Check, Copy, TicketPercent, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { previewPromo, requestPayment } from "../actions";
import { discountedPrice } from "../promo-rules";
import { billingDiscount, BILLINGS, perMonth, priceFor, yearlySaving, type Billing, type PaidPlan, type PlanPricing } from "../pricing";
import { groupDigits } from "@/lib/format";

interface Props {
  plan: PaidPlan;
  initialBilling: Billing;
  /** Today's prices (from the settings); the server computes the amount again when the request is sent. */
  pricing: PlanPricing;
  cardNumber: string | null;
  cardHolder: string | null;
  contact: string | null;
}

export function CheckoutForm({ plan, initialBilling, pricing, cardNumber, cardHolder, contact }: Props) {
  const t = useTranslations("plans.checkout");
  const router = useRouter();
  const [billing, setBilling] = useState<Billing>(initialBilling);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [promoInput, setPromoInput] = useState("");
  /** A code the server accepted; the final price is computed again on the server when the request is sent. */
  const [promo, setPromo] = useState<{ code: string; percent: number } | null>(null);
  const fullPrice = priceFor(pricing, plan, billing);
  const amount = promo ? discountedPrice(fullPrice, promo.percent) : fullPrice;
  const free = amount === 0;
  const som = groupDigits;

  const applyPromo = () =>
    start(async () => {
      const r = await previewPromo(promoInput, plan);
      if (!r.ok) return void toast.error(t(r.error === "tooMany" ? "errors.tooMany" : `errors.promo.${r.error}`));
      setPromo({ code: r.code, percent: r.percent });
      setPromoInput("");
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Period */}
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-3 font-display text-base font-bold">{t("period")}</h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("period")}>
          {BILLINGS.map((b) => {
            const discount = billingDiscount(pricing, b);
            const active = b === billing;
            return (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setBilling(b)}
                className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4 transition ${
                  active ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"
                }`}
              >
                {discount > 0 && (
                  <span className="absolute -top-2.5 rounded-full bg-grad-success px-2 py-0.5 text-[11px] font-bold text-white">
                    {t("discount", { percent: discount })}
                  </span>
                )}
                <span className="font-display text-lg font-bold">{t(`billing.${b}`)}</span>
                <span className="text-sm text-muted">{t("perMonthPrice", { price: som(perMonth(pricing, plan, b)) })}</span>
                {b === "annual" && discount > 0 && <span className="text-xs font-semibold text-success">{t("saving", { saving: som(yearlySaving(pricing, plan)) })}</span>}
              </button>
            );
          })}
        </div>
        {/* Promo code */}
        <div className="mt-4 border-t border-border pt-4">
          {promo ? (
            <p className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-semibold text-success">
              <TicketPercent className="size-4 shrink-0" />
              <span className="flex-1">{t("promo.applied", { code: promo.code, percent: promo.percent })}</span>
              <button type="button" aria-label={t("promo.remove")} title={t("promo.remove")} onClick={() => setPromo(null)} className="rounded-md p-1 hover:bg-success/15">
                <X className="size-4" />
              </button>
            </p>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                applyPromo();
              }}
            >
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                maxLength={40}
                placeholder={t("promo.placeholder")}
                aria-label={t("promo.placeholder")}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 font-mono uppercase outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
              />
              <Button type="submit" variant="secondary" disabled={pending || promoInput.trim().length < 2}>
                {t("promo.apply")}
              </Button>
            </form>
          )}
        </div>

        {promo && (
          <p className="mt-3 flex items-baseline justify-between text-sm text-muted">
            <span>{t("promo.discount", { percent: promo.percent })}</span>
            <span>−{som(fullPrice - amount)} soʻm</span>
          </p>
        )}
        <p className="mt-3 flex items-baseline justify-between border-t border-border pt-4">
          <span className="font-semibold">{t("total")}</span>
          <span className="font-display text-2xl font-bold">
            {promo && <s className="mr-2 text-base font-semibold text-muted">{som(fullPrice)}</s>}
            {som(amount)} soʻm
          </span>
        </p>
      </section>

      {/* Transfer — skipped when a promo code covers the whole price */}
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        {free ? (
          <p className="mb-2 rounded-xl bg-success/10 p-3 text-sm font-semibold text-success">{t("promo.free")}</p>
        ) : (
          <>
            <h2 className="mb-3 font-display text-base font-bold">{t("step1", { amount: som(amount) })}</h2>
            {cardNumber ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-grad-dark p-5 text-white sm:max-w-md">
                <span className="font-mono text-xl font-bold tracking-widest sm:text-2xl">{cardNumber}</span>
                <span className="text-sm text-white/75">{cardHolder}</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await copyText(cardNumber.replace(/\s/g, "")))) return;
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t("copied") : t("copy")}
                </button>
              </div>
            ) : (
              <p className="rounded-xl bg-xp/10 p-3 text-sm">
                {t("cardMissing")} <b>{contact ?? "—"}</b>
              </p>
            )}
            {contact && cardNumber && <p className="mt-3 text-sm text-muted">{t("contact", { contact })}</p>}

            <h2 className="mb-3 mt-6 font-display text-base font-bold">{t("step2")}</h2>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t("reference")}</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={120}
                placeholder={t("referencePlaceholder")}
                className="h-11 rounded-xl border border-border bg-surface px-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
              />
              <span className="text-xs text-muted">{t("referenceHint")}</span>
            </label>
          </>
        )}
        <Button
          className="mt-5 h-12 w-full sm:w-auto sm:px-10"
          disabled={pending || (!free && reference.trim().length < 3)}
          onClick={() =>
            start(async () => {
              const r = await requestPayment({ plan, billing, reference: free ? "" : reference, promo: promo?.code });
              if (r.ok) {
                toast.success(t("submitted"));
                // The plans page shows the request as "being checked".
                router.push("/plans");
                router.refresh();
              } else {
                toast.error(t(`errors.${r.error}`));
              }
            })
          }
        >
          {free ? t("promo.submitFree") : t("submit")}
        </Button>
      </section>
    </div>
  );
}
