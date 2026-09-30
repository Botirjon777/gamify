"use client";

import { useState, useTransition } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { avatarDataUri, AVATAR_STYLES, type AvatarStyle } from "@/lib/avatar";
import { planAtLeast } from "@/features/plans/plans";
import { updateAvatar } from "../actions";

interface Props {
  seed: string;
  style: string;
  unlocked: boolean;
  plan: "FREE" | "PRO" | "DIAMOND";
}

export function AvatarPicker({ seed, style, unlocked, plan }: Props) {
  const t = useTranslations("settings");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const choose = (next: string, reroll: boolean) =>
    start(async () => {
      const res = await updateAvatar(next, reroll);
      setError(res.ok ? null : t(`errors.${res.error}`));
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {(Object.keys(AVATAR_STYLES) as AvatarStyle[]).map((key) => {
          const needs = AVATAR_STYLES[key].plan;
          const allowed = unlocked && planAtLeast(plan, needs);
          const active = key === style;
          return (
            <button
              key={key}
              type="button"
              disabled={!allowed || pending}
              onClick={() => choose(key, false)}
              aria-pressed={active}
              className={`relative rounded-2xl p-1 transition ${active ? "ring-2 ring-brand ring-offset-2" : ""} ${allowed ? "hover:scale-105" : "cursor-not-allowed opacity-45"}`}
              title={!allowed && needs !== "FREE" ? t("styleLocked", { plan: needs === "PRO" ? "Pro" : "Diamond" }) : key}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
              <img src={avatarDataUri(seed, key)} alt="" className="aspect-square w-full rounded-xl bg-background" />
              {needs !== "FREE" && (
                <span className={`absolute right-0 top-0 rounded-md px-1 text-[9px] font-bold text-white ${needs === "PRO" ? "bg-grad-brand" : "bg-grad-iq"}`}>
                  {needs === "PRO" ? "PRO" : "DIA"}
                </span>
              )}
              {!allowed && <Lock className="absolute bottom-1 right-1 size-4 text-muted" />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!unlocked || pending}
        onClick={() => choose(style, true)}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold transition hover:border-brand/40 disabled:opacity-50"
      >
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} /> {t("reroll")}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
