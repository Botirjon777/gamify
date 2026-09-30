import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";
import { requireSession } from "@/lib/auth/session";
import { avatarDataUri } from "@/lib/avatar";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/[locale]">) {
  const { user, tenant } = await requireSession();
  const t = await getTranslations("nav");

  return (
    <div className="flex flex-1">
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="px-2 py-2">
          <Logo name={tenant.name} />
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          <NavLinks variant="sidebar" />
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
          <img src={avatarDataUri(user.avatarSeed)} alt="" className="size-10 rounded-full" />
          <span className="min-w-0 flex-1 truncate font-semibold">{user.username}</span>
          <form action={logout}>
            <Button variant="ghost" className="h-9 px-3">
              {t("logout")}
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <Logo name={tenant.name} />
          <form action={logout}>
            <Button variant="ghost" className="h-9 px-3">
              {t("logout")}
            </Button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 md:pt-10">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          <NavLinks variant="bottom" />
        </nav>
      </div>
    </div>
  );
}
