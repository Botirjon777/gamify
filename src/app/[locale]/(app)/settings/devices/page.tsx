import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { revokeAllOtherDevices, revokeDevice } from "@/features/auth/actions";

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
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-xl text-muted">{t("subtitle")}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {sessions.map((s) => {
          const isCurrent = s.id === current.id;
          return (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
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
              {!isCurrent && (
                <form action={revokeDevice.bind(null, s.id)}>
                  <Button variant="danger" className="h-9 w-full sm:w-auto">
                    {t("revoke")}
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {sessions.length > 1 ? (
        <form action={revokeAllOtherDevices}>
          <Button variant="danger">{t("revokeAll")}</Button>
        </form>
      ) : (
        <p className="text-sm text-muted">{t("onlyThis")}</p>
      )}
    </div>
  );
}
