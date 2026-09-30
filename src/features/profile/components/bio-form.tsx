"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateBio } from "../actions";

export function BioForm({ bio }: { bio: string }) {
  const t = useTranslations("settings");
  const [value, setValue] = useState(bio);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateBio(value);
          setSaved(res.ok);
        });
      }}
    >
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        maxLength={160}
        rows={3}
        placeholder={t("bioPlaceholder")}
        aria-label={t("bio")}
        className="rounded-xl border border-border bg-surface px-3.5 py-2.5 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-10">
          {t("save")}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
            <Check className="size-4" /> {t("saved")}
          </span>
        )}
        <span className="ml-auto text-xs text-muted">{value.length}/160</span>
      </div>
    </form>
  );
}
