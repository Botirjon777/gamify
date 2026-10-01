"use client";

import { useEffect, useRef, useState } from "react";
import { Check, KeyRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { PasswordForm } from "./password-form";

/** "Parolni oʻzgartirish" opens the form in a modal. Also opens by itself on /settings#password (the reset banner). */
export function PasswordDialog() {
  const t = useTranslations("settings");
  const tn = useTranslations("nav");
  const dialog = useRef<HTMLDialogElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);

  const open = () => {
    setDone(false);
    setRound((r) => r + 1); // fresh, empty form every time
    dialog.current?.showModal();
  };

  // Arriving from the "change your password" banner: open right away (the form starts empty, no reset needed).
  useEffect(() => {
    if (window.location.hash === "#password") dialog.current?.showModal();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={buttonClass("secondary", "h-10")} onClick={open}>
        <KeyRound className="size-4" /> {t("changePassword")}
      </button>
      {done && (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
          <Check className="size-4" /> {t("passwordChanged")}
        </span>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="password-title"
        className="modal"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="flex flex-col gap-4 p-6 text-foreground">
          <div className="flex items-center justify-between gap-3">
            <h2 id="password-title" className="font-display text-lg font-bold">
              {t("changePassword")}
            </h2>
            <button
              type="button"
              aria-label={tn("close")}
              onClick={() => dialog.current?.close()}
              className="grid size-9 place-items-center rounded-xl text-muted hover:bg-background hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="text-sm text-muted">{t("passwordHint")}</p>
          <PasswordForm
            key={round}
            onDone={() => {
              setDone(true);
              dialog.current?.close();
            }}
          />
        </div>
      </dialog>
    </div>
  );
}
