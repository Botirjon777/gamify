import { ArrowLeft, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsIqItems, toStatus, uzText } from "@/features/admin/cms-queries";
import { StatusToggle } from "@/features/admin/components/cms-status-controls";
import { IqItemDialog } from "@/features/admin/components/iq-item-dialog";
import { IQ_CATEGORIES, type IqPublicContent } from "@/features/iq/content-schema";
import { IqImage } from "@/features/iq/components/iq-picture";
import { mediaUrl } from "@/lib/media";
import { buttonClass } from "@/components/ui/button";

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"] as const;

/** The IQ question bank. */
export default async function CmsIqPage({ params, searchParams }: PageProps<"/[locale]/admin/content/iq">) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.cms");

  const category = IQ_CATEGORIES.find((c) => c === one(query.category));
  const difficulty = [1, 2, 3, 4, 5].find((d) => String(d) === one(query.difficulty));
  const filter = { search: one(query.search), category, difficulty, status: toStatus(one(query.status)) };
  const result = await getCmsIqItems({ ...filter, page: Number(one(query.page)) });
  const pageHref = (page: number) => {
    const sp = new URLSearchParams({ page: String(page) });
    if (filter.search) sp.set("search", filter.search);
    if (category) sp.set("category", category);
    if (difficulty) sp.set("difficulty", String(difficulty));
    if (filter.status) sp.set("status", filter.status);
    return `/admin/content/iq?${sp}`;
  };
  const selectClass = "h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="size-3.5" /> {t("home")}
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t("iqTitle")}</h1>
          <p className="text-sm text-muted">{t("found", { count: result.total })}</p>
        </div>
        <IqItemDialog nextKeys={result.nextKeys} />
      </div>

      <form className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted" />
          <input
            name="search"
            defaultValue={filter.search ?? ""}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <select name="category" defaultValue={category ?? ""} aria-label={t("fields.category")} className={selectClass}>
          <option value="">{t("allCategories")}</option>
          {IQ_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`iq.categories.${c}`)}
            </option>
          ))}
        </select>
        <select name="difficulty" defaultValue={difficulty ?? ""} aria-label={t("fields.difficulty")} className={selectClass}>
          <option value="">{t("allDifficulties")}</option>
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={d}>
              {t(`iq.difficulty.${d}`)}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filter.status ?? ""} aria-label={t("fields.status")} className={selectClass}>
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClass("secondary", "h-10 text-xs")}>
          {t("filter")}
        </button>
      </form>

      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        {result.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">{t("iq.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-3 font-semibold">{t("columns.question")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("iq.figure")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("fields.category")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("fields.status")}</th>
                  <th className="pb-3 text-right font-semibold">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {result.items.map((item) => {
                  const content = item.content as IqPublicContent;
                  const itemCategory = IQ_CATEGORIES.find((c) => c === item.category) ?? "logic";
                  return (
                    <tr key={item.id} className="hover:bg-background/50">
                      <td className="max-w-xs py-3.5 pr-4 sm:max-w-md">
                        <span className="font-mono text-xs font-bold text-brand">{item.key}</span>
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{uzText(content.prompt)}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold">
                        {content.image ? (
                          <IqImage src={mediaUrl(content.image)} className="size-14 rounded-lg p-0.5" />
                        ) : content.figure ? <span className="block w-fit rounded-lg border border-border bg-background px-2.5 py-1">{content.figure}</span> : <span className="font-normal text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-muted">
                        <span className="block text-foreground">{t(`iq.categories.${itemCategory}`)}</span>
                        {t("iq.rating", { difficulty: item.difficulty, rating: Math.round(item.rating) })}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusToggle id={item.id} status={item.status} kind="iq" />
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <IqItemDialog
                          nextKeys={result.nextKeys}
                          item={{
                            id: item.id,
                            key: item.key,
                            category: itemCategory,
                            difficulty: item.difficulty,
                            prompt: uzText(content.prompt),
                            figure: content.figure ?? "",
                            image: content.image,
                            optionsImage: content.optionsImage,
                            options: content.options.map(uzText),
                            answer: item.answer,
                            status: item.status,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {result.pages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs font-semibold">
            <span className="text-muted">{t("page", { page: result.page, pages: result.pages })}</span>
            <div className="flex gap-2">
              {result.page > 1 && (
                <Link href={pageHref(result.page - 1)} className={buttonClass("secondary", "h-8 px-3 text-xs")}>
                  ← {t("prev")}
                </Link>
              )}
              {result.page < result.pages && (
                <Link href={pageHref(result.page + 1)} className={buttonClass("secondary", "h-8 px-3 text-xs")}>
                  {t("next")} →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
