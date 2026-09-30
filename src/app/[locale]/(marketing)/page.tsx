import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth/session";

const STEPS = ["pick", "drill", "earn", "climb"] as const;
const TRACKS = ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Git", "SQL"];

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  const current = await getCurrentSession();

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo name={current?.tenant.name} />
        <nav className="flex items-center gap-2">
          {current ? (
            <Link href="/dashboard" className={buttonClass("primary")}>
              {tNav("dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost")}>
                {tNav("login")}
              </Link>
              <Link href="/register" className={buttonClass("primary", "hidden sm:inline-flex")}>
                {tNav("register")}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
              {t("badge")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t("subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonClass("primary", "h-12 px-7 text-base")}>
                {t("cta")}
              </Link>
              <Link href="/login" className={buttonClass("secondary", "h-12 px-7 text-base")}>
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* A taste of an exercise */}
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-xl shadow-brand/5 sm:p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="rounded-lg bg-background px-2.5 py-1 font-mono font-semibold">React · useState</span>
              <span className="font-bold text-xp">+15 XP</span>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-foreground p-4 font-mono text-[13px] leading-6 text-white">
{`const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
}
// 1 marta bosilgandan keyin count = ?`}
            </pre>
            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
              {["0", "1", "2", "undefined"].map((answer) => (
                <div
                  key={answer}
                  className={`rounded-xl border-2 px-4 py-3 text-center font-semibold ${
                    answer === "1" ? "border-success bg-success/10 text-success" : "border-border"
                  }`}
                >
                  {answer}
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full w-3/5 rounded-full bg-brand" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <h2 className="text-3xl font-extrabold tracking-tight">{t("howTitle")}</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step}>
                  <span className="grid size-10 place-items-center rounded-xl bg-brand/10 font-extrabold text-brand">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t(`steps.${step}.title`)}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{t(`steps.${step}.text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tracks + aim */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">{t("tracksTitle")}</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {TRACKS.map((track) => (
                <li key={track} className="rounded-xl border border-border bg-surface px-4 py-2 font-semibold">
                  {track}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">{t("aimTitle")}</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted">{t("aimText")}</p>
          </div>
        </section>

        {/* For study centers */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20">
          <div className="rounded-3xl bg-foreground p-8 text-white sm:p-12">
            <h2 className="text-3xl font-extrabold tracking-tight">{t("centersTitle")}</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">{t("centersText")}</p>
            <a href="https://t.me/" className={buttonClass("primary", "mt-8")}>
              {t("centersCta")}
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">© {new Date().getFullYear()} Gamify</footer>
    </>
  );
}
