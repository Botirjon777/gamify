"use client";

import { BookOpen, Home, Shield, Trophy, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavPending } from "@/components/nav-pending";

const LINKS: { href: string; key: string; icon: LucideIcon; badgeKey?: "friends" | "clans" }[] = [
  { href: "/dashboard", key: "dashboard", icon: Home },
  { href: "/learn", key: "learn", icon: BookOpen },
  { href: "/leaderboard", key: "leaderboard", icon: Trophy },
  { href: "/friends", key: "friends", icon: Users, badgeKey: "friends" },
  { href: "/clans", key: "clans", icon: Shield, badgeKey: "clans" },
];

export function NavLinks({ variant, badges }: { variant: "sidebar" | "bottom"; badges: { friends: number; clans: number } }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return LINKS.map(({ href, key, icon: Icon, badgeKey }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const count = badgeKey ? badges[badgeKey] : 0;
    const dot = count > 0 && (
      <span className="grid min-w-5 place-items-center rounded-full bg-grad-streak px-1 text-[10px] font-bold text-white">
        {count > 9 ? "9+" : count}
      </span>
    );

    if (variant === "bottom") {
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-brand" : "text-muted"}`}
        >
          <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
          {t(key)}
          {count > 0 && <span className="absolute right-[calc(50%-18px)] top-1.5">{dot}</span>}
          <NavPending />
        </Link>
      );
    }

    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition ${
          active
            ? "bg-grad-brand text-brand-foreground shadow-lg shadow-brand/25"
            : "text-muted hover:bg-background hover:text-foreground"
        }`}
      >
        <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
        <span className="flex-1">{t(key)}</span>
        {dot}
        <NavPending />
      </Link>
    );
  });
}
