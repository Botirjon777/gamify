"use client";

import { useRef, useState, useTransition } from "react";
import { Award, Check, Clock, Copy, Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";
import { Link } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { requestIqCertificate } from "@/features/payments/actions";

/** What the result screen knows about the user's certificate. */
export type IqCertificateState =
  | { unlocked: true }
  | { unlocked: false; pending: boolean; /** Already formatted, e.g. "13 000". */ price: string; cardNumber: string | null; cardHolder: string | null; contact: string | null };

/**
 * Under an IQ result: open the certificate, or — for Free users — buy it once (card transfer checked by an admin).
 * The IQ score itself is public either way; only the certificate is paid.
 */
export function IqCertificate({ state }: { state: IqCertificateState }) {
  const t = useTranslations("iq.certificate");
  const dialog = useRef<HTMLDialogElement>(null);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [requested, setRequested] = useState(false);
  const [pending, start] = useTransition();

  if (state.unlocked) {
    return (
      // Plain <a>: a route handler outside the locale routes, opened in its own tab for printing.
      <a href="/api/iq/certificate" target="_blank" rel="noopener" className={buttonClass("success", "mt-6")}>
        <Award className="size-4" /> {t("open")}
      </a>
    );
  }

  if (state.pending || requested) {
    return (
      <p className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-xp/40 bg-xp/10 px-4 py-3 text-sm font-semibold">
        <Clock className="size-4 shrink-0 text-xp" /> {t("pending")}
      </p>
    );
  }

  const { price } = state;
  const submit = () =>
    start(async () => {
      const result = await requestIqCertificate(reference).catch(() => ({ ok: false as const, error: "network" as const }));
      if (!result.ok) return void toast.error(t(`errors.${result.error}`));
      toast.success(t("submitted"));
      dialog.current?.close();
      setRequested(true);
    });

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={buttonClass("secondary", "mt-6")}>
        <Award className="size-4" /> {t("get", { price })}
      </button>

      <dialog
        ref={dialog}
        aria-label={t("title")}
        className="modal"
        onClick={(e) => e.target === dialog.current && !pending && dialog.current.close()}
        onCancel={(e) => pending && e.preventDefault()}
      >
        <div className="flex flex-col gap-4 p-6 text-left text-foreground">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-grad-iq text-white">
              <Award className="size-7" />
            </span>
            <h2 className="font-display text-lg font-bold">{t("title")}</h2>
            <p className="text-sm text-muted">{t("text")}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-3 text-center">
            <p className="font-display text-xl font-bold">{t("price", { price })}</p>
            <p className="text-xs text-muted">{t("oneTime")}</p>
          </div>

          <Link href="/plans" className="flex items-center gap-2 rounded-xl bg-xp/10 px-3 py-2 text-xs font-semibold text-xp hover:bg-xp/15">
            <Crown className="size-4 shrink-0" /> {t("proHint")}
          </Link>

          {state.cardNumber ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-grad-dark p-4 text-white">
              <span className="font-mono text-lg font-bold tracking-widest">{state.cardNumber}</span>
              {state.cardHolder && <span className="text-sm text-white/75">{state.cardHolder}</span>}
              <button
                type="button"
                onClick={async () => {
                  if (!(await copyText(state.cardNumber!.replace(/\s/g, "")))) return;
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
          ) : (
            <p className="rounded-xl bg-background px-3 py-2 text-sm text-muted">{t("cardMissing")}</p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("reference")}</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={120}
              placeholder={t("referencePlaceholder")}
              className="h-11 rounded-xl border border-border bg-surface px-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
          </label>
          {state.contact && <p className="text-xs text-muted">{t("contact", { contact: state.contact })}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass("secondary")} disabled={pending} onClick={() => dialog.current?.close()}>
              {t("cancel")}
            </button>
            <Button disabled={pending || reference.trim().length < 3} onClick={submit}>
              {t("submit")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
