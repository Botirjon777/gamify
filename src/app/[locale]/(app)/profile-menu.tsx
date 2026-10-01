"use client";

import { useEffect, useRef } from "react";
import { Award, ChevronRight, Crown, Gift, Swords, LogOut, Settings, ShieldCheck, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";

interface Props {
  username: string;
  /** Server-rendered pieces (the avatar SVG is generated on the server, not shipped as code). */
  avatar: React.ReactNode;
  avatarLarge: React.ReactNode;
  planBadge: React.ReactNode;
  /** e.g. "Pro · 12-noyabrgacha" or "Free" */
  planLabel: string;
  level: number;
  xp: number;
  isAdmin: boolean;
  /** Duel invites / turns waiting for you. */
  duels: number;
}

/** Mobile: the avatar in the top bar opens this panel from the right. */
export function ProfileMenu({ username, avatar, avatarLarge, planBadge, planLabel, level, xp, isAdmin, duels }: Props) {
  const t = useTranslations("nav");
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Close when the route changes (a link inside was followed).
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  const item = "flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-background";

  return (
    <>
      <button type="button" aria-label={t("profileMenu")} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()} className="rounded-full">
        {avatar}
      </button>
      <dialog
        ref={dialog}
        aria-label={t("profileMenu")}
        className="drawer"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-end p-3">
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => dialog.current?.close()}
              className="grid size-10 place-items-center rounded-xl text-muted hover:bg-background hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 px-5 pb-5 text-center">
            {avatarLarge}
            <p className="mt-1 font-display text-lg font-bold">{username}</p>
            <p className="text-sm text-muted">
              {t("levelXp", { level, xp: xp.toLocaleString("uz-UZ") })}
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 border-t border-border p-3">
            <Link href={`/u/${username}`} className={item}>
              <User className="size-5 text-muted" />
              <span className="flex-1">{t("profile")}</span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
            <Link href="/duels" className={item}>
              <Swords className="size-5 text-streak" />
              <span className="flex-1">{t("duels")}</span>
              {duels > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-grad-streak px-1 text-[10px] font-bold text-white">{duels}</span>
              )}
              <ChevronRight className="size-4 text-muted" />
            </Link>
            <Link href="/badges" className={item}>
              <Award className="size-5 text-brand" />
              <span className="flex-1">{t("badges")}</span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
            <Link href="/settings#invite" className={item}>
              <Gift className="size-5 text-success" />
              <span className="flex-1">{t("invite")}</span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
            <Link href="/settings" className={item}>
              <Settings className="size-5 text-muted" />
              <span className="flex-1">{t("settings")}</span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
            <Link href="/plans" className={item}>
              <Crown className="size-5 text-xp" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span>{t("plans")}</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  {planBadge} {planLabel}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
            {isAdmin && (
              <Link href="/admin" className={item}>
                <ShieldCheck className="size-5 text-muted" />
                <span className="flex-1">{t("admin")}</span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            )}
          </nav>

          <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <LogoutButton className={`${item} w-full text-danger hover:bg-danger/10`}>
              <LogOut className="size-5" />
              {t("logout")}
            </LogoutButton>
          </div>
        </div>
      </dialog>
    </>
  );
}
