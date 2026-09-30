import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { getMyClan } from "@/features/clans/queries";
import { CreateClanForm } from "@/features/clans/components/create-clan-form";

export default async function NewClanPage({ params }: PageProps<"/[locale]/clans/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("clans");
  const { user } = await requireSession();
  const mine = await getMyClan(user.id);
  if (mine) redirect({ href: `/clans/${mine.slug}`, locale });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("form.title")} />
      <CreateClanForm />
    </div>
  );
}
