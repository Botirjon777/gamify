import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { getCurrentSession } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/tenant";

/** Pages anyone can open without an account (the public IQ test and its certificates): just the logo and a way in. */
export default async function PublicLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("nav");
  const [tenant, current] = await Promise.all([getCurrentTenant(), getCurrentSession()]);
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 print:hidden">
        <Logo name={tenant.name} />
        <Link href={current ? "/dashboard" : "/login"} className="text-sm font-semibold text-muted hover:text-foreground">
          {current ? t("dashboard") : t("login")} →
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center px-4 pb-16 pt-4 print:p-0">{children}</main>
    </div>
  );
}
