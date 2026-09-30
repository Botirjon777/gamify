import { Logo } from "@/components/logo";
import { requireSession } from "@/lib/auth/session";

/** Minimal layout for the IQ test — reachable before the placement test is done (no gate here). */
export default async function OnboardingLayout({ children }: LayoutProps<"/[locale]">) {
  const { tenant } = await requireSession();
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 py-5">
        <Logo name={tenant.name} />
      </header>
      <main className="flex flex-1 flex-col justify-center px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}
