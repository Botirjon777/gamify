import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getCurrentTenant, isDefaultTenant } from "@/lib/tenant";

export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  // Invite links look like /register?ref=K7M2QX
  const { ref } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const tenant = await getCurrentTenant();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{t("registerTitle")}</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted">{t("registerSubtitle")}</p>
      {isDefaultTenant(tenant) ? (
        <RegisterForm referralCode={typeof ref === "string" ? ref : undefined} />
      ) : (
        <p className="rounded-xl bg-background px-4 py-3 text-sm">{t("errors.registrationClosed")}</p>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("submitLogin")}
        </Link>
      </p>
    </>
  );
}
