import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { Monitor, Smartphone } from "lucide-react";
import { RevokeDeviceButton } from "@/features/auth/components/revoke-device-button";

export default async function DevicesPage({ params }: PageProps<"/[locale]/settings/devices">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("devices");
  const format = await getFormatter();
  const { user, session: current } = await requireSession();

  const sessions = await db.session.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastActiveAt: "desc" },
    include: { tenant: { select: { name: true } } },
  });
  // Current device first.
  sessions.sort((a, b) => Number(b.id === current.id) - Number(a.id === current.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <ul className="flex flex-col gap-3">
        {sessions.map((s) => {
          const isCurrent = s.id === current.id;
          return (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-white ${isCurrent ? "bg-grad-success" : "bg-grad-iq"}`}>
                  {/iPhone|iOS|Android|Mobile/i.test(s.deviceName ?? "") ? <Smartphone className="size-5" /> : <Monitor className="size-5" />}
                </span>
                <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {s.deviceName ?? t("unknownDevice")}
                  {isCurrent && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      {t("thisDevice")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {[s.tenant.name, s.ip].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {t("lastActive", { time: format.relativeTime(s.lastActiveAt) })} ·{" "}
                  {t("signedIn", { time: format.dateTime(s.createdAt, { dateStyle: "medium" }) })}
                </p>
                </div>
              </div>
              {!isCurrent && (
                <RevokeDeviceButton sessionId={s.id} className="h-9 w-full sm:w-auto" />
              )}
            </li>
          );
        })}
      </ul>

      {sessions.length > 1 ? (
        <RevokeDeviceButton className="w-fit" />
      ) : (
        <p className="text-sm text-muted">{t("onlyThis")}</p>
      )}
    </div>
  );
}
