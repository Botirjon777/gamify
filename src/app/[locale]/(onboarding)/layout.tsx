import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { requireSession } from "@/lib/auth/session";

/** Minimal, distraction-free layout for IQ tests. The user can leave any time via the header link. */
export default async function OnboardingLayout({ children }: LayoutProps<"/[locale]">) {
  const { tenant } = await requireSession();
  const t = await getTranslations("iq");
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5">
        <Logo name={tenant.name} />
        <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-foreground">
          {t("toDashboard")} →
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}
