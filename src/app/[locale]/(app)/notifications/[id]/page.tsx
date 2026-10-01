import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getFormatter, getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { buttonClass } from "@/components/ui/button";
import { getNotification } from "@/features/notifications/queries";
import { NOTIFICATION_STYLE } from "@/features/notifications/styles";
import { MarkRead } from "@/features/notifications/components/mark-read";

/** One notification, full text + where it leads. Opening it marks it read. */
export default async function NotificationPage({ params }: PageProps<"/[locale]/notifications/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user } = await requireSession();
  const n = await getNotification(user.id, id);
  const style = n && NOTIFICATION_STYLE[n.type];
  if (!n || !style) notFound();

  const t = await getTranslations("notifications");
  const tb = await getTranslations("badges");
  const format = await getFormatter();
  const now = await getNow();
  const values = n.type === "BADGE_EARNED" ? { ...n.data, badge: tb(`${n.data.badge}.title`) } : n.data;
  const created = new Date(n.createdAt);
  const Icon = style.icon;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {!n.read && <MarkRead id={n.id} />}
      <Link href="/notifications" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <article className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className={`flex items-center gap-4 p-6 text-white ${style.gradient}`}>
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/20">
            <Icon className="size-7" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-white/75">{t(`titles.${n.type}`)}</p>
            <p className="mt-1 text-sm text-white/85">
              <time dateTime={n.createdAt}>
                {format.dateTime(created, { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tashkent" })}
              </time>{" "}
              · {format.relativeTime(created, now)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-6 p-6">
          <p className="text-lg leading-relaxed">{t.rich(`types.${n.type}`, { ...values, b: (chunks) => <b className="font-bold">{chunks}</b> })}</p>
          <Link href={style.href(n.data, user.username)} className={buttonClass("primary", "h-11 w-full sm:w-fit")}>
            {t("open")} <ArrowRight className="size-4" />
          </Link>
        </div>
      </article>
    </div>
  );
}
