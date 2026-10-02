"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Send, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";
import { buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { CopyField } from "./guest-iq";

interface Props {
  /** t.me share link with the generated message. */
  telegramHref: string;
  /** The story picture (PNG), same origin. */
  storyUrl: string;
  /** The person's referral link: the IQ test with their code. */
  shareUrl: string;
  /** How many people took the test through that link. */
  referrals: number;
}

/**
 * Under a paid certificate: send the result to someone in Telegram, or post it as a story
 * (Instagram / Telegram) — a picture that carries the referral link as text and as a QR code.
 */
export function GuestIqShare({ telegramHref, storyUrl, shareUrl, referrals }: Props) {
  const t = useTranslations("guestIq.share");
  const [busy, setBusy] = useState(false);

  // Phones: the system share sheet (Instagram Stories, Telegram, …) with the picture attached.
  // Elsewhere there is no way to hand a picture to those apps → download it instead.
  const shareStory = async () => {
    setBusy(true);
    try {
      const file = new File([await (await fetch(storyUrl)).blob()], "zukkolar-iq.png", { type: "image/png" });
      // Stories can't take a link with the picture — put it on the clipboard for the "link" sticker.
      const copied = await copyText(shareUrl);
      if (navigator.canShare?.({ files: [file] })) {
        if (copied) toast.info(t("linkCopied"), 6000);
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.info(t("downloaded"), 7000);
      }
    } catch (e) {
      // Closing the share sheet is not an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 print:hidden sm:p-6">
      <h2 className="font-display text-lg font-bold">{t("title")}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{t("text")}</p>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <a href={telegramHref} target="_blank" rel="noopener" className={buttonClass("primary", "h-12")}>
          <Send className="size-5" /> {t("telegram")}
        </a>
        <button type="button" onClick={shareStory} disabled={busy} className={buttonClass("success", "h-12")}>
          <ImageIcon className="size-5" /> {busy ? t("preparing") : t("story")}
        </button>
      </div>
      <a href={storyUrl} download="zukkolar-iq.png" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <Download className="size-4" /> {t("download")}
      </a>

      <p className="mb-2 mt-5 text-sm font-semibold">{t("link")}</p>
      <CopyField value={shareUrl} label={t("copy")} mono={false} />
      <p className="mt-3 flex items-center gap-2 text-sm text-muted">
        <Users className="size-4 shrink-0" /> {t("referrals", { count: referrals })}
      </p>
    </section>
  );
}
