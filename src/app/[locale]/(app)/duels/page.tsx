import { Swords } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { listMyDuels } from "@/features/duels/queries";

const GROUPS = ["invites", "yourTurn", "waiting", "history"] as const;

export default async function DuelsPage({ params }: PageProps<"/[locale]/duels">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("duels");
  const { user } = await requireSession();
  const duels = await listMyDuels(user.id, locale);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link href="/duels/new" className={buttonClass("primary", "h-11")}>
            <Swords className="size-4" /> {t("new")}
          </Link>
        }
      />

      {duels.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface p-10 text-center text-muted">
          <Swords className="size-10" />
          <p>{t("empty")}</p>
        </div>
      )}

      {GROUPS.map((group) => {
        const items = duels.filter((d) => d.group === group);
        if (!items.length) return null;
        return (
          <section key={group}>
            <h2 className="mb-3 font-display text-sm font-bold">
              {t(`groups.${group}`)} <span className="text-muted">· {items.length}</span>
            </h2>
            <ul className="stagger overflow-hidden rounded-2xl border border-border bg-surface">
              {items.map((d) => (
                <li key={d.id} className="border-b border-border last:border-b-0">
                  <Link href={`/duels/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
                    <img src={d.them.avatar} alt="" className="size-10 shrink-0 rounded-full bg-background" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{d.them.username}</span>
                      <span className="block truncate text-sm text-muted">
                        {d.track} · {t("stakeShort", { xp: d.stake })}
                      </span>
                    </span>
                    <Badge group={group} status={d.status} result={d.result} label={(k) => t(k)} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Badge({ group, status, result, label }: { group: string; status: string; result: string | null; label: (key: string) => string }) {
  const style =
    result === "win"
      ? "bg-success/15 text-success"
      : result === "lose"
        ? "bg-danger/10 text-danger"
        : group === "invites" || group === "yourTurn"
          ? "bg-grad-brand text-white"
          : "bg-background text-muted";
  const key = result ? `results.${result}` : group === "history" ? `statuses.${status}` : `badges.${group}`;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label(key)}</span>;
}
