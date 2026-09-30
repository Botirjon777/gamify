import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentTenant, isDefaultTenant } from "@/lib/tenant";

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const tenant = await getCurrentTenant();

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">{t("loginTitle")}</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted">{t("loginSubtitle")}</p>
      <LoginForm />
      <p className="mt-5 text-xs leading-relaxed text-muted">{t("forgotPassword")}</p>
      {isDefaultTenant(tenant) && (
        <p className="mt-5 text-center text-sm text-muted">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            {t("submitRegister")}
          </Link>
        </p>
      )}
    </>
  );
}
