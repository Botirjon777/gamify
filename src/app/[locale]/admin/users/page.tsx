import { Search } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { PlanBadge } from "@/components/plan-badge";
import { effectivePlan } from "@/features/plans/plans";
import { listUsers, type UserFilter } from "@/features/admin/queries";

const FILTERS: UserFilter[] = ["all", "paid", "blocked", "admins"];

export default async function AdminUsers({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const filter = FILTERS.find((f) => f === sp.filter) ?? "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const t = await getTranslations("admin.users");
  const tn = await getTranslations("admin");
  const format = await getFormatter();
  const { total, users, pages } = await listUsers({ q, filter, page });
  const href = (over: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(q && { q }), filter, page: String(page), ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) });
    return `/admin/users?${p}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={tn("nav.users")} subtitle={t("total", { count: total })} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form className="relative flex-1 lg:max-w-md">
          <input type="hidden" name="filter" value={filter} />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
        </form>
        <div className="inline-flex w-fit rounded-xl border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={href({ filter: f, page: 1 })}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${f === filter ? "bg-grad-brand text-white" : "text-muted hover:text-foreground"}`}
            >
              {t(`filters.${f}`)}
            </Link>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                {(["user", "contact", "plan", "level", "joined", "active"] as const).map((c) => (
                  <th key={c} className="px-4 py-3 font-semibold">
                    {t(`columns.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-background/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5 font-semibold hover:text-brand">
                      <Avatar user={u} className="size-8" />
                      {u.username}
                      {u.isSuperAdmin && <span className="rounded bg-grad-dark px-1.5 py-0.5 text-[10px] font-bold text-white">{t("adminBadge")}</span>}
                      {u.blockedAt && <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">{t("blockedBadge")}</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{u.phone ?? u.email ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <PlanBadge plan={effectivePlan(u)} />
                    {effectivePlan(u) === "FREE" && <span className="text-muted">Free</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.level} <span className="text-muted">· {u.xp.toLocaleString("uz-UZ")} XP</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{format.dateTime(u.createdAt, { dateStyle: "medium" })}</td>
                  <td className="px-4 py-2.5 text-muted">{u.lastActiveDay ? format.dateTime(u.lastActiveDay, { dateStyle: "medium" }) : t("never")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={href({ page: page - 1 })} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold">
              {t("prev")}
            </Link>
          )}
          <span className="text-muted">{t("page", { page, pages })}</span>
          {page < pages && (
            <Link href={href({ page: page + 1 })} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold">
              {t("next")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
