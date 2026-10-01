"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { updateGender } from "../actions";
import { GenderPicker } from "./gender-picker";

type Gender = "MALE" | "FEMALE";

/**
 * Gender picker for settings / the dashboard prompt. Picking a card only previews it;
 * "Saqlash" saves — and changing an already chosen gender asks first (the avatar changes).
 */
export function GenderSettings({ seed, style, gender }: { seed: string; style: string; gender: string | null }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [choice, setChoice] = useState<Gender | null>(null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const changed = choice !== null && choice !== gender;

  const save = async () => {
    if (!choice) return;
    const result = await updateGender(choice);
    if (!result.ok) return t(`errors.${result.error}`);
    setSaved(true);
    setChoice(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <GenderPicker
        seed={seed}
        style={style}
        defaultValue={gender}
        label={t("gender")}
        hint={gender ? t("genderText") : t("genderNotSet")}
        disabled={pending}
        onChange={(g) => {
          setSaved(false);
          setChoice(g);
        }}
      />
      {changed &&
        (gender ? (
          <ConfirmButton
            className={buttonClass("primary", "h-10 w-fit")}
            title={t("genderConfirmTitle")}
            text={t("genderConfirmText")}
            confirmLabel={t("save")}
            onConfirm={save}
          >
            {t("save")}
          </ConfirmButton>
        ) : (
          <Button className="h-10 w-fit" disabled={pending} onClick={() => start(async () => void (await save()))}>
            {t("save")}
          </Button>
        ))}
      {saved && (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
          <Check className="size-4" /> {t("saved")}
        </span>
      )}
    </div>
  );
}
