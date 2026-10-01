import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { getClan } from "@/features/clans/queries";
import { ClanForm } from "@/features/clans/components/clan-form";
import { DeleteClan, TransferLeadership } from "@/features/clans/components/clan-settings-controls";

/** Leader only: edit the clan, hand over leadership, delete it. */
export default async function ClanSettingsPage({ params }: PageProps<"/[locale]/clans/[slug]/settings">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("clans");
  const { user, tenant } = await requireSession();
  const clan = await getClan(slug, tenant.id, user.id);
  if (!clan || clan.myRole !== "LEADER") notFound();

  const others = clan.members.filter((m) => m.id !== user.id).map((m) => ({ id: m.id, username: m.username }));

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/clans/${clan.slug}`} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {clan.name}
      </Link>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <ClanForm clan={clan} />

      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">{t("settings.transfer")}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t("settings.transferHint")}</p>
        <TransferLeadership clanId={clan.id} slug={clan.slug} members={others} />
      </section>

      <section className="rounded-3xl border border-danger/30 bg-danger/5 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-danger">{t("settings.danger")}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t("settings.deleteHint")}</p>
        <DeleteClan clanId={clan.id} name={clan.name} />
      </section>
    </div>
  );
}
