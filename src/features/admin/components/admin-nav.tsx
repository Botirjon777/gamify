"use client";

import { BarChart3, Brain, CalendarRange, FolderKanban, Handshake, History, TicketPercent, Users, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavPending } from "@/components/nav-pending";

const LINKS: { href: string; key: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", key: "dashboard", icon: BarChart3, exact: true },
  { href: "/admin/content", key: "content", icon: FolderKanban },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/payments", key: "payments", icon: Wallet },
  { href: "/admin/iq-tests", key: "guestIq", icon: Brain },
  { href: "/admin/promos", key: "promos", icon: TicketPercent },
  { href: "/admin/partners", key: "partners", icon: Handshake },
  { href: "/admin/events", key: "events", icon: CalendarRange },
  { href: "/admin/audit", key: "audit", icon: History },
];

export function AdminNav({ pendingPayments }: { pendingPayments: number }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return LINKS.map(({ href, key, icon: Icon, exact }) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          active ? "bg-white text-foreground shadow-lg" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className="size-5" />
        <span className="flex-1">{t(key)}</span>
        {key === "payments" && pendingPayments > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-grad-streak px-1.5 text-[11px] font-bold text-white">
            {pendingPayments}
          </span>
        )}
        <NavPending />
      </Link>
    );
  });
}
