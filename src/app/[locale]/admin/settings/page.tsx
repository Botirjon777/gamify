import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/page-header";
import { getSettings } from "@/features/settings/service";
import { SettingsForm } from "@/features/admin/components/settings-form";

/** Site settings kept in the database: where payments go, what the IQ test and the plans cost. */
export default async function AdminSettings({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");
  const s = await getSettings();

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <SettingsForm
        initial={{ cardNumber: s.cardNumber ?? "", cardHolder: s.cardHolder ?? "", contact: s.contact ?? "", iqPriceUzs: s.iqPriceUzs, iqOldPriceUzs: s.iqOldPriceUzs, iqPictureShare: s.iqPictureShare, pricing: s.pricing }}
      />
    </div>
  );
}
