"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { logout } from "../actions";

/** Logs out, then navigates home on the client (see note on logout in ../actions.ts). */
export function LogoutButton({ className, title, children }: { className?: string; title?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={pending}
      className={className}
      onClick={() =>
        start(async () => {
          await logout();
          router.replace("/");
          router.refresh();
        })
      }
    >
      {children}
    </button>
  );
}
