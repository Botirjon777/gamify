import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/page-header";
import { listAudit } from "@/features/admin/queries";

export default async function AdminAudit({ params }: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const items = await listAudit();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("nav.audit")} />
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("audit.empty")}</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface text-sm">
          {items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 last:border-0">
              <span className="w-36 shrink-0 text-muted">{format.dateTime(a.createdAt, { dateStyle: "short", timeStyle: "short" })}</span>
              <span className="font-semibold">{a.adminName}</span>
              <span>{t.has(`actions.${a.action}`) ? t(`actions.${a.action}`) : a.action}</span>
              {a.targetUserId && (
                <Link href={`/admin/users/${a.targetUserId}`} className="font-semibold text-brand hover:underline">
                  {t("audit.target", { user: a.targetName ?? "?" })}
                </Link>
              )}
              {a.data && <code className="ml-auto max-w-full truncate text-xs text-muted">{JSON.stringify(a.data)}</code>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
