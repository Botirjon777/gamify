import { redirect } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { getCurrentSession, isJustSignedUp } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/tenant";

export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  const current = await getCurrentSession();
  if (current) {
    // Signing up sets the cookie and Next.js re-renders this layout — so this is also where a brand-new
    // account is asked about its interests and then gets its (optional) IQ test offer.
    // Everyone else who is logged in goes to the dashboard.
    const { user } = current;
    const offerIq = !user.iqTestedAt && !user.iqPromptHiddenAt;
    const isNew = (!user.interestsSetAt || offerIq) && (await isJustSignedUp(user));
    redirect({ href: !isNew ? "/dashboard" : !user.interestsSetAt ? "/interests" : "/iq/placement", locale });
  }
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
