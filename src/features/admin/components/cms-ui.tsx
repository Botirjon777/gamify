"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { CmsResult } from "../cms-actions";

export const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-brand";
export const areaClass = "w-full rounded-xl border border-border bg-background p-3 text-sm font-normal outline-none focus:border-brand";

/** Text → a slug suggestion: "useState bilan ishlash" → "usestate-bilan-ishlash". */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[ʻʼ'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Run a CMS action: toast the outcome (with the validation detail, if any) and refresh the page data. */
export function useCmsAction() {
  const t = useTranslations("admin.cms");
  const router = useRouter();
  const [pending, start] = useTransition();

  const describe = (result: Exclude<CmsResult, { ok: true }> | { ok: false; error: "network"; detail?: string }) =>
    t(`errors.${result.error}`) + (result.detail ? ` (${result.detail})` : "");

  /** Returns the error text (for callers that show it themselves), or null on success. */
  const attempt = async (action: () => Promise<CmsResult>) => {
    const result = await action().catch(() => ({ ok: false as const, error: "network" as const }));
    if (!result.ok) return describe(result);
    router.refresh();
    return null;
  };

  const run = (action: () => Promise<CmsResult>, success: string, after?: () => void) =>
    start(async () => {
      const error = await attempt(action);
      if (error) return void toast.error(error);
      toast.success(success);
      after?.();
    });

  return { pending, run, attempt };
}

/**
 * A modal whose content is mounted only while it is open — so a form inside always starts
 * from its current props and never keeps values from the last time it was opened.
 */
export function useDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = useState(false);
  return {
    isOpen,
    open: () => {
      setOpen(true);
      ref.current?.showModal();
    },
    close: () => ref.current?.close(),
    /** Spread on the <dialog>: wider than the default confirm-sized modal, scrolls when the form is tall. */
    props: {
      ref,
      className: "modal max-h-[calc(100dvh-2rem)] overflow-y-auto",
      style: { width: "min(34rem, calc(100vw - 2rem))" },
      onClose: () => setOpen(false),
      // A click on the backdrop (the dialog element itself, not its content) closes it.
      onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
        if (e.target === ref.current) ref.current?.close();
      },
    },
  };
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-semibold ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

/** Cancel + save at the bottom of a form; `extra` (e.g. a delete button) goes to the left. */
export function FormButtons({ pending, onCancel, extra }: { pending: boolean; onCancel: () => void; extra?: React.ReactNode }) {
  const t = useTranslations("admin.cms");
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <span>{extra}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className={buttonClass("secondary")} disabled={pending}>
          {t("cancel")}
        </button>
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
