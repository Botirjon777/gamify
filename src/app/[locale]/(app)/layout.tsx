import { Bell, Crown, KeyRound, LogOut, Settings, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/avatar";
import { PlanBadge } from "@/components/plan-badge";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireSession } from "@/lib/auth/session";
import { effectivePlan } from "@/features/plans/plans";
import { unreadCount } from "@/features/notifications/queries";
import { countIncomingRequests } from "@/features/social/queries";
import { pendingClanRequestsFor } from "@/features/clans/queries";
import { NavLinks } from "./nav-links";
import { RightRail } from "./right-rail";

export default async function AppLayout({ children }: LayoutProps<"/[locale]">) {
  const { user, tenant } = await requireSession();
  const t = await getTranslations("nav");
  const tSettings = await getTranslations("settings");
  const [unread, friendRequests, clanRequests] = await Promise.all([
    unreadCount(user.id),
    countIncomingRequests(user.id),
    pendingClanRequestsFor(user.id),
  ]);
  const badges = { friends: friendRequests, clans: clanRequests };
  const plan = effectivePlan(user);

  return (
    <div className="flex flex-1">
      {/* Left sidebar (tablet / desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/70 bg-surface/80 p-4 backdrop-blur md:flex">
        <div className="px-3 py-3">
          <Logo name={tenant.name} href="/dashboard" />
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          <NavLinks variant="sidebar" badges={badges} />
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          {user.isSuperAdmin && (
            <Link href="/admin" className="flex items-center gap-3 rounded-xl bg-grad-dark px-3 py-2.5 font-semibold text-white hover:brightness-110">
              <ShieldCheck className="size-5" />
              {t("admin")}
            </Link>
          )}
          <Link href="/plans" className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-muted hover:bg-background hover:text-foreground">
            <Crown className="size-5 text-xp" />
            {t("plans")}
          </Link>
          <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-muted hover:bg-background hover:text-foreground">
            <Settings className="size-5" />
            {t("settings")}
          </Link>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-2">
            <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar user={user} className="size-9" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{user.username}</span>
                <PlanBadge plan={plan} />
              </span>
            </Link>
            <LogoutButton
              title={t("logout")}
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger"
            >
              <LogOut className="size-4" />
            </LogoutButton>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur sm:px-6 md:justify-end lg:px-8">
          <div className="md:hidden">
            <Logo name={tenant.name} href="/dashboard" />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label={t("notifications")}
              className="relative grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:border-brand/40 hover:text-foreground"
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-grad-streak px-1 text-[10px] font-bold text-white ring-2 ring-background">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link href={`/u/${user.username}`} className="md:hidden" aria-label={t("profile")}>
              <Avatar user={user} className="size-10" />
            </Link>
            <Link
              href="/settings"
              className="grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted md:hidden"
              aria-label={t("settings")}
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </header>

        <main className="w-full flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-8 lg:pt-8">
          {/* After an admin password reset (or the seeded admin's default password) */}
          {user.mustChangePassword && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center">
              <KeyRound className="size-5 shrink-0 text-danger" />
              <p className="flex-1 text-sm font-semibold">{tSettings("mustChange")}</p>
              <Link href="/settings#password" className="text-sm font-bold text-danger hover:underline">
                {tSettings("mustChangeCta")} →
              </Link>
            </div>
          )}
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <NavLinks variant="bottom" badges={badges} />
        </nav>
      </div>

      <RightRail user={user} tenantId={tenant.id} />
    </div>
  );
}
