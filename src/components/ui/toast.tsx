"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (type: ToastType, message: string, duration?: number) => string;
  remove: (id: string) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

let nextId = 0;
const MAX_TOASTS = 3;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message, duration = 4000) => {
    const id = `toast-${++nextId}`;
    set((s) => ({ toasts: [{ id, type, message, duration }, ...s.toasts].slice(0, MAX_TOASTS) }));
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience shorthand: `toast.success("Saved!")` */
export const toast = {
  success: (message: string, duration?: number) => useToastStore.getState().add("success", message, duration),
  error: (message: string, duration?: number) => useToastStore.getState().add("error", message, duration),
  info: (message: string, duration?: number) => useToastStore.getState().add("info", message, duration),
  warning: (message: string, duration?: number) => useToastStore.getState().add("warning", message, duration),
};

// ─── Styling ────────────────────────────────────────────────────────────────

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 shrink-0 text-success" />,
  error: <XCircle className="size-5 shrink-0 text-danger" />,
  info: <Info className="size-5 shrink-0 text-brand" />,
  warning: <AlertTriangle className="size-5 shrink-0 text-xp" />,
};

const borders: Record<ToastType, string> = {
  success: "border-success/30",
  error: "border-danger/30",
  info: "border-brand/30",
  warning: "border-xp/30",
};

// ─── Components ─────────────────────────────────────────────────────────────

function ToastItem({ toast: item, closeLabel, onClose }: { toast: Toast; closeLabel: string; onClose: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);

  // Slide out, then leave the list.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onClose(item.id), 200);
    return () => clearTimeout(timer);
  }, [leaving, item.id, onClose]);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), item.duration);
    return () => clearTimeout(timer);
  }, [item.duration]);

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-xl shadow-foreground/5 transition-all duration-200 ${borders[item.type]} ${
        leaving ? "translate-x-[120%] opacity-0" : "translate-x-0 opacity-100 animate-toast-in"
      }`}
    >
      {icons[item.type]}
      <p className="min-w-0 flex-1 text-sm font-semibold">{item.message}</p>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => setLeaving(true)}
        className="grid size-6 shrink-0 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** Mount once at the root layout (inside the intl provider). Renders all active toasts. */
export function ToastContainer() {
  const t = useTranslations("common");
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  const box = useRef<HTMLDivElement>(null);
  const newest = toasts[0]?.id;

  // A popover lives in the top layer, so toasts stay visible above an open modal <dialog>.
  // Re-showing it for every new toast puts it above a dialog that was opened in the meantime.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (el.matches(":popover-open")) el.hidePopover();
    if (newest) el.showPopover();
  }, [newest]);

  return (
    <div
      ref={box}
      popover="manual"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-auto top-0 mx-auto mt-0 hidden w-full max-w-md flex-col gap-2 overflow-visible border-0 bg-transparent p-4 text-foreground open:flex sm:left-auto sm:right-0 sm:mr-0"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} closeLabel={t("close")} onClose={remove} />
      ))}
    </div>
  );
}
