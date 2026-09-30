"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { approvePayment, rejectPayment } from "../actions";

export function PaymentDecision({ paymentId }: { paymentId: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const done = (r: { ok: boolean; error?: string }) => setError(r.ok ? null : t(`errors.${r.error}`));
  const input = "h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";
  const btn = "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("payments.note")} className={input} />
          <button className={`${btn} bg-grad-success text-white`} disabled={pending} onClick={() => start(async () => done(await approvePayment(paymentId, text)))}>
            <Check className="size-4" /> {t("payments.approve")}
          </button>
          <button className={`${btn} border border-danger/30 text-danger hover:bg-danger/10`} disabled={pending} onClick={() => (setMode("reject"), setText(""))}>
            <X className="size-4" /> {t("payments.reject")}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("payments.rejectPlaceholder")}
            aria-label={t("payments.rejectReason")}
            className={input}
          />
          <button className={`${btn} bg-danger text-white`} disabled={pending || text.trim().length < 2} onClick={() => start(async () => done(await rejectPayment(paymentId, text)))}>
            <X className="size-4" /> {t("payments.reject")}
          </button>
          <button className={`${btn} border border-border bg-surface`} onClick={() => setMode("idle")}>
            ←
          </button>
        </div>
      )}
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
