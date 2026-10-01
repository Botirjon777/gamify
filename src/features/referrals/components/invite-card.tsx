"use client";

import { useState } from "react";
import { Check, Gift, Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";

/** Right rail: invite code + one-tap "copy link" / "share" (phone share sheet when available). */
export function InviteCard({ code, link }: { code: string; link: string }) {
  const t = useTranslations("rail");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!(await copyText(link))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const share = async () => {
    if (navigator.share) {
      // Closing the share sheet rejects — that's fine.
      await navigator.share({ title: "Zukkolar", text: t("shareText", { code }), url: link }).catch(() => undefined);
    } else await copy();
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-grad-success text-white">
          <Gift className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{t("inviteTitle")}</h2>
          <p className="text-xs text-muted">{t("inviteText")}</p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-background px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.25em]" aria-label={t("code")}>
        {code}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-bold transition hover:border-brand/40"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Link2 className="size-3.5" />}
          {copied ? t("copied") : t("copyLink")}
        </button>
        <button
          type="button"
          onClick={share}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-grad-success text-xs font-bold text-white shadow-md shadow-success/20 hover:brightness-110"
        >
          <Share2 className="size-3.5" /> {t("share")}
        </button>
      </div>
    </section>
  );
}
