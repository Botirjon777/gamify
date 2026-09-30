"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

export function InviteBox({ code, link }: { code: string; link: string }) {
  const t = useTranslations("settings");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
      <CopyField label={t("code")} value={code} mono big onCopy={copy} copied={copied === code} copyLabel={t("copy")} copiedLabel={t("copied")} />
      <CopyField label={t("link")} value={link} onCopy={copy} copied={copied === link} copyLabel={t("copy")} copiedLabel={t("copied")} />
    </div>
  );
}

function CopyField({
  label,
  value,
  mono,
  big,
  onCopy,
  copied,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  big?: boolean;
  onCopy: (v: string) => void;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-semibold text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <span className={`min-w-0 flex-1 truncate ${mono ? "font-mono" : ""} ${big ? "text-xl font-bold tracking-[0.2em]" : "text-sm"}`}>{value}</span>
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-grad-brand px-2.5 py-1.5 text-xs font-bold text-white"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
