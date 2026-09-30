"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { avatarDataUri, defaultStyleFor } from "@/lib/avatar";

type Gender = "MALE" | "FEMALE";

interface Props {
  /** Form field name (sign-up form). Omit when used with onChange only (settings). */
  name?: string;
  seed: string;
  /** Style for the preview; defaults to the style a new account would get. */
  style?: string;
  defaultValue?: string | null;
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  onChange?: (gender: Gender) => void;
}

/** Two big cards with a live avatar preview for each gender. */
export function GenderPicker({ name, seed, style, defaultValue, label, hint, error, disabled, onChange }: Props) {
  const t = useTranslations("auth");
  const [value, setValue] = useState<Gender | null>(defaultValue === "MALE" || defaultValue === "FEMALE" ? defaultValue : null);
  const previewStyle = style ?? defaultStyleFor(seed);

  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={label}>
        {(["MALE", "FEMALE"] as const).map((g) => {
          const active = value === g;
          return (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setValue(g);
                onChange?.(g);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition disabled:opacity-60 ${
                active ? "border-brand bg-brand/5 shadow-lg shadow-brand/10" : "border-border bg-surface hover:border-brand/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
              <img src={avatarDataUri(seed, previewStyle, g)} alt="" className="size-16 rounded-full" />
              <span className={`text-sm font-semibold ${active ? "text-brand" : ""}`}>{g === "MALE" ? t("male") : t("female")}</span>
            </button>
          );
        })}
      </div>
      {error ? <span className="text-sm text-danger">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </fieldset>
  );
}
