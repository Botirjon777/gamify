"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Navigate after a successful server action that returned `redirectTo`.
 * (Server-side redirect() inside actions skips the locale proxy in production — see features/auth/actions.ts.)
 */
export function useRedirectTo(redirectTo: string | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (!redirectTo) return;
    router.replace(redirectTo);
    router.refresh();
  }, [redirectTo, router]);
}
