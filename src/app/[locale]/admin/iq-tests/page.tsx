import { Search } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";
import type { Prisma } from "@/generated/prisma/client";
import { PageHeader } from "@/components/page-header";
import { GuestIqControls } from "@/features/admin/components/guest-iq-controls";

const TABS = ["waiting", "paid", "all"] as const;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

/**
 * IQ tests taken without an account. "Waiting" = finished and not paid yet: when the person sends the receipt in
 * Telegram with their code, find it here and confirm — their link becomes the certificate.
 */
export default async function AdminGuestIq({ params, searchParams }: PageProps<"/[locale]/admin/iq-tests">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((x) => x === sp.tab) ?? "waiting";
  const q = one(sp.q).trim();
  const t = await getTranslations("admin");
  const format = await getFormatter();

  const search: Prisma.GuestIqTestWhereInput = q
    ? {
        OR: [
          { code: { contains: q.toUpperCase().replace(/[^A-Z0-9]/g, "") || q } },
          { phone: { contains: q.replace(/[\s()-]/g, "") } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const byTab: Prisma.GuestIqTestWhereInput = tab === "waiting" ? { status: "FINISHED", paidAt: null } : tab === "paid" ? { paidAt: { not: null } } : {};

  const [tests, waiting, paid, revenue, origin] = await Promise.all([
    db.guestIqTest.findMany({
      where: { AND: [byTab, search] },
      orderBy: tab === "paid" ? { paidAt: "desc" } : { createdAt: "desc" },
      take: 100,
      include: { partner: { select: { name: true } }, referredBy: { select: { code: true } }, _count: { select: { referrals: true } } },
    }),
    db.guestIqTest.count({ where: { status: "FINISHED", paidAt: null } }),
    db.guestIqTest.count({ where: { paidAt: { not: null } } }),
    db.guestIqTest.aggregate({ _sum: { amountUzs: true } }),
    siteOrigin(),
  ]);
  const counts = { waiting, paid, all: null };
  const when = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("nav.guestIq")} subtitle={t("guestIq.subtitle", { amount: (revenue._sum.amountUzs ?? 0).toLocaleString("uz-UZ") })} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="inline-flex w-fit rounded-xl border border-border bg-surface p-1">
          {TABS.map((x) => (
            <Link
              key={x}
              href={`/admin/iq-tests?tab=${x}`}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${x === tab ? "bg-grad-brand text-white" : "text-muted hover:text-foreground"}`}
            >
              {t(`guestIq.tabs.${x}`)}
              {counts[x] !== null && ` · ${counts[x]}`}
            </Link>
          ))}
        </div>
        <form className="relative flex-1 lg:max-w-md">
          <input type="hidden" name="tab" value={tab} />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t("guestIq.search")}
            aria-label={t("guestIq.search")}
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
        </form>
      </div>

      {tests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("guestIq.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tests.map((test) => {
            const name = `${test.firstName} ${test.lastName}`;
            const url = `${origin}/iq-test/${test.token}`;
            return (
              <li key={test.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="rounded-lg bg-background px-2.5 py-1 font-mono text-base font-bold tracking-wider">{test.code}</span>
                  <span className="font-semibold">
                    {name}, {t("guestIq.age", { age: test.age })}
                  </span>
                  <span className="text-sm text-muted">{test.phone}</span>
                  <span className="ml-auto text-sm text-muted">{when(test.createdAt)}</span>
                </div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {test.status === "FINISHED" ? (
                    <span className="font-semibold">{t("guestIq.result", { iq: test.iq ?? 0, correct: test.correct, total: test.total })}</span>
                  ) : (
                    <span className="text-muted">{t("guestIq.unfinished", { answered: test.answered, total: test.total })}</span>
                  )}
                  {test.paidAt && <span className="font-semibold text-success">{t("guestIq.paidAt", { date: when(test.paidAt), amount: test.amountUzs.toLocaleString("uz-UZ") })}</span>}
                  {test.partner && <span className="text-muted">{t("guestIq.partner", { name: test.partner.name })}</span>}
                  {test.referredBy && <span className="text-muted">{t("guestIq.referredBy", { code: test.referredBy.code })}</span>}
                  {test._count.referrals > 0 && <span className="text-muted">{t("guestIq.brought", { count: test._count.referrals })}</span>}
                </p>
                {test.status === "FINISHED" && (
                  <GuestIqControls id={test.id} paid={!!test.paidAt} name={name} url={url} message={t("guestIq.message", { name: test.firstName, url })} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
