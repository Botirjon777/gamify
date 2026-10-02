"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";
import { useRouter } from "@/i18n/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { toast } from "@/components/ui/toast";
import { setGuestIqPaid } from "../guest-iq-actions";

/** A button that copies `text` and says so. */
function CopyButton({ text, children }: { text: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!(await copyText(text))) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold hover:border-brand/40"
    >
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />} {children}
    </button>
  );
}

/**
 * Waiting: "payment received" (asks first). Paid: copy the certificate link / a ready Telegram message to send
 * to the person, and an undo.
 */
export function GuestIqControls({ id, paid, name, url, message }: { id: string; paid: boolean; name: string; url: string; message: string }) {
  const t = useTranslations("admin.guestIq");
  const te = useTranslations("admin.errors");
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = async (value: boolean) => {
    const result = await setGuestIqPaid(id, value).catch(() => ({ ok: false as const, error: "invalid" }));
    if (!result.ok) return te(result.error);
    toast.success(value ? t("markedPaid") : t("markedUnpaid"));
    router.refresh();
  };

  if (!paid) {
    return (
      <ConfirmButton
        className="inline-flex h-10 w-fit items-center gap-1.5 rounded-xl bg-grad-success px-4 text-sm font-semibold text-white disabled:opacity-60"
        title={t("confirmTitle", { name })}
        text={t("confirmText")}
        confirmLabel={t("confirm")}
        icon={<Check className="size-6" />}
        onConfirm={() => set(true)}
      >
        <Check className="size-4" /> {t("markPaid")}
      </ConfirmButton>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyButton text={url}>{t("copyLink")}</CopyButton>
      <CopyButton text={message}>{t("copyMessage")}</CopyButton>
      <a href={url} target="_blank" rel="noopener" className="text-sm font-semibold text-brand hover:underline">
        {t("open")} →
      </a>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const error = await set(false);
            if (error) toast.error(error);
          })
        }
        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-danger disabled:opacity-60"
      >
        <Undo2 className="size-3.5" /> {t("undo")}
      </button>
    </div>
  );
}
