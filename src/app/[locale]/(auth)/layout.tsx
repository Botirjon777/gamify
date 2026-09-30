import { redirect } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { getCurrentSession } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/tenant";

export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (await getCurrentSession()) redirect({ href: "/dashboard", locale });
  const tenant = await getCurrentTenant();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div className="mb-8">
        <Logo name={tenant.name} />
      </div>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-brand/5 sm:p-8">
        {children}
      </div>
    </main>
  );
}
