"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClass } from "./button";

interface Props {
  /** The visible trigger. */
  children: React.ReactNode;
  className?: string;
  /** Tooltip / accessible name of the trigger (icon-only buttons). */
  label?: string;
  disabled?: boolean;
  title: string;
  text?: string;
  /** Text on the confirming button, e.g. "Chiqish", "Oʻchirish". */
  confirmLabel: string;
  icon?: React.ReactNode;
  /** For the worst cases (delete a clan): the confirm button unlocks only after typing this exactly. */
  requireText?: string;
  requireLabel?: string;
  /** Return an error message to keep the dialog open and show it; nothing = done. */
  onConfirm: () => Promise<string | void | null>;
}

/**
 * A button that asks before doing something destructive (leave, remove, kick, log out…).
 * Native <dialog>: Esc and a backdrop click cancel; "Bekor qilish" has focus, so Enter is safe.
 */
export function ConfirmButton({ children, className, label, disabled, title, text, confirmLabel, icon, requireText, requireLabel, onConfirm }: Props) {
  const t = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const locked = !!requireText && typed.trim() !== requireText;

  const confirm = () =>
    start(async () => {
      const result = await onConfirm();
      if (result) setError(result);
      else dialog.current?.close();
    });

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={disabled || pending}
        className={className}
        onClick={() => {
          setError(null);
          setTyped("");
          dialog.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-label={title}
        className="modal"
        onClick={(e) => e.target === dialog.current && !pending && dialog.current.close()}
        onCancel={(e) => pending && e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center text-foreground">
          <span className="grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">{icon ?? <AlertTriangle className="size-6" />}</span>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {text && <p className="text-sm text-muted">{text}</p>}
          {requireText && (
            <label className="flex w-full flex-col gap-1.5 text-left text-sm">
              <span className="font-medium">{requireLabel}</span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-danger focus:ring-4 focus:ring-danger/15"
              />
            </label>
          )}
          {error && <p className="text-sm font-semibold text-danger">{error}</p>}
          <div className="mt-3 grid w-full grid-cols-2 gap-2">
            <button type="button" autoFocus className={buttonClass("secondary")} disabled={pending} onClick={() => dialog.current?.close()}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-danger px-4 text-sm font-semibold text-white shadow-lg shadow-danger/25 transition hover:brightness-110 disabled:opacity-60"
              disabled={pending || locked}
              onClick={confirm}
            >
              {pending ? t("wait") : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
