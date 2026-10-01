import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { AdminNav } from "@/features/admin/components/admin-nav";

/** Admin panel shell — super admins only (everyone else gets a 404 from requireAdmin). */
/** Behind the login: keep it out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  const { user } = await requireAdmin();
  const t = await getTranslations("admin");
  const pending = await db.payment.count({ where: { status: "PENDING" } });

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 bg-grad-dark p-4 text-white lg:sticky lg:top-0 lg:h-dvh lg:w-64">
        <div className="flex items-center gap-2 px-2 py-2">
          <ShieldCheck className="size-6" />
          <span className="font-display text-lg font-bold">{t("title")}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          <AdminNav pendingPayments={pending} />
        </nav>
        <div className="mt-auto hidden flex-col gap-2 lg:flex">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="size-4" /> {t("backToSite")}
          </Link>
          <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2">
            <Avatar user={user} className="size-8" />
            <span className="min-w-0 truncate text-sm font-semibold">{user.email ?? user.username}</span>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
