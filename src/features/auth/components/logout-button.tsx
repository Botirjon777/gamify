"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { logout } from "../actions";

/**
 * Asks first ("Hisobdan chiqasizmi?"), then logs out and navigates home on the client
 * (see note on logout in ../actions.ts).
 */
export function LogoutButton({ className, title, children }: { className?: string; title?: string; children: React.ReactNode }) {
  const t = useTranslations("nav");
  const router = useRouter();

  return (
    <ConfirmButton
      className={className}
      label={title}
      title={t("logoutConfirmTitle")}
      text={t("logoutConfirmText")}
      confirmLabel={t("logout")}
      icon={<LogOut className="size-6" />}
      onConfirm={async () => {
        await logout();
        router.replace("/");
        router.refresh();
      }}
    >
      {children}
    </ConfirmButton>
  );
}
