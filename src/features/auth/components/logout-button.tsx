"use client";

import { useRef, useTransition } from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { logout } from "../actions";

/**
 * Asks first ("Hisobdan chiqasizmi?"), then logs out and navigates home on the client
 * (see note on logout in ../actions.ts).
 */
export function LogoutButton({ className, title, children }: { className?: string; title?: string; children: React.ReactNode }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      await logout();
      dialog.current?.close();
      router.replace("/");
      router.refresh();
    });

  return (
    <>
      <button type="button" title={title} aria-label={title} className={className} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="logout-title"
        className="modal"
        // Click on the backdrop closes it
        onClick={(e) => e.target === dialog.current && !pending && dialog.current.close()}
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
            <LogOut className="size-6" />
          </span>
          <h2 id="logout-title" className="font-display text-lg font-bold">
            {t("logoutConfirmTitle")}
          </h2>
          <p className="text-sm text-muted">{t("logoutConfirmText")}</p>
          <div className="mt-3 grid w-full grid-cols-2 gap-2">
            <button type="button" autoFocus className={buttonClass("secondary")} disabled={pending} onClick={() => dialog.current?.close()}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-danger px-5 text-sm font-semibold text-white shadow-lg shadow-danger/25 transition hover:brightness-110 disabled:opacity-60"
              disabled={pending}
              onClick={confirm}
            >
              {pending ? t("loggingOut") : t("logout")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
