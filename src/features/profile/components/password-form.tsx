"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { changePassword } from "../actions";

/** Current + new password. `onDone` runs after a successful change (the dialog closes). */
export function PasswordForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await changePassword(current, next);
          if (r.ok) {
            setResult({ ok: true, text: t("passwordChanged") });
            setCurrent("");
            setNext("");
            router.refresh();
            onDone?.();
          } else setResult({ ok: false, text: t(`errors.${r.error}`) });
        });
      }}
    >
      <Field label={t("currentPassword")} name="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      <Field label={t("newPassword")} name="new" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {t("changePassword")}
      </Button>
      {result && (
        <p className={`flex items-center gap-1 text-sm font-semibold ${result.ok ? "text-success" : "text-danger"}`}>
          {result.ok && <Check className="size-4" />} {result.text}
        </p>
      )}
    </form>
  );
}
