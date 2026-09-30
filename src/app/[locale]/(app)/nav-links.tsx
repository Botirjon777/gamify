"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/dashboard", key: "dashboard", icon: "🏠" },
  { href: "/settings/devices", key: "devices", icon: "💻" },
] as const;

export function NavLinks({ variant }: { variant: "sidebar" | "bottom" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return LINKS.map(({ href, key, icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          variant === "sidebar"
            ? `flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition ${
                active ? "bg-brand/10 text-brand" : "text-muted hover:bg-background hover:text-foreground"
              }`
            : `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${active ? "text-brand" : "text-muted"}`
        }
      >
        <span aria-hidden className={variant === "bottom" ? "text-xl" : ""}>
          {icon}
        </span>
        {t(key)}
      </Link>
    );
  });
}
