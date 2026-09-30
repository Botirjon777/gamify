"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { updateGender } from "../actions";
import { GenderPicker } from "./gender-picker";

/** Gender picker that saves immediately (settings page, dashboard prompt). */
export function GenderSettings({ seed, style, gender }: { seed: string; style: string; gender: string | null }) {
  const t = useTranslations("settings");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <GenderPicker
        seed={seed}
        style={style}
        defaultValue={gender}
        label={t("gender")}
        hint={gender ? t("genderText") : t("genderNotSet")}
        disabled={pending}
        onChange={(g) =>
          start(async () => {
            setSaved((await updateGender(g)).ok);
          })
        }
      />
      {saved && (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
          <Check className="size-4" /> {t("saved")}
        </span>
      )}
    </div>
  );
}
