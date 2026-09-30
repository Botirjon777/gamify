import { ArrowRight, Brain, Building2, Crosshair, Dumbbell, Shield, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth/session";
import { Reveal } from "@/components/reveal";

const STEPS = [
  { key: "pick", icon: Crosshair, gradient: "bg-grad-brand" },
  { key: "drill", icon: Dumbbell, gradient: "bg-grad-iq" },
  { key: "earn", icon: Zap, gradient: "bg-grad-xp" },
  { key: "climb", icon: Trophy, gradient: "bg-grad-streak" },
] as const;
const TRACKS = ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Git", "SQL"];
const FEATURES = [
  { key: "iq", icon: Brain, gradient: "bg-grad-iq" },
  { key: "friends", icon: Users, gradient: "bg-grad-brand" },
  { key: "clans", icon: Shield, gradient: "bg-grad-dark" },
  { key: "badges", icon: Sparkles, gradient: "bg-grad-gold" },
] as const;

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  const current = await getCurrentSession();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4">
          <Logo name={current?.tenant.name} />
          <nav className="flex items-center gap-2">
            {current ? (
              <Link href="/dashboard" className={buttonClass("primary")}>
                {tNav("dashboard")} <ArrowRight className="size-4" />
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
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="animate-page mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-surface px-3 py-1 text-sm font-semibold text-brand shadow-sm">
              <Sparkles className="size-4" /> {t("badge")}
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
              <span className="text-grad-brand">{t("title")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t("subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonClass("primary", "h-12 px-7 text-base")}>
                {t("cta")} <ArrowRight className="size-5" />
              </Link>
              <Link href="/login" className={buttonClass("secondary", "h-12 px-7 text-base")}>
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* A taste of an exercise */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-grad-brand opacity-20 blur-3xl" />
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-2xl shadow-brand/10 sm:p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="rounded-lg bg-background px-2.5 py-1 font-mono font-semibold">React · useState</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-grad-xp px-2.5 py-1 text-xs font-bold text-white">
                  <Zap className="size-3.5" /> +15 XP
                </span>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-grad-dark p-4 font-mono text-[13px] leading-6 text-white">
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
                <div className="h-full w-3/5 rounded-full bg-grad-brand" />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border/70 bg-surface/70">
          <div className="mx-auto w-full max-w-7xl px-5 py-16">
            <h2 className="font-display text-3xl font-bold">{t("howTitle")}</h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ key, icon: Icon, gradient }, i) => (
                <Reveal as="li" key={key} delay={i * 90} className="rounded-3xl border border-border bg-surface p-6">
                  <span className={`grid size-12 place-items-center rounded-2xl text-white shadow-lg ${gradient}`}>
                    <Icon className="size-6" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">0{i + 1}</p>
                  <h3 className="mt-1 text-lg font-bold">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{t(`steps.${key}.text`)}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-7xl px-5 py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ key, icon: Icon, gradient }, i) => (
              <Reveal key={key} delay={i * 90} className="rounded-3xl border border-border bg-surface p-6">
                <span className={`grid size-12 place-items-center rounded-2xl text-white ${gradient}`}>
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`features.${key}.text`)}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Tracks + aim */}
        <Reveal className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-16 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">{t("tracksTitle")}</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {TRACKS.map((track) => (
                <li key={track} className="rounded-xl border border-border bg-surface px-4 py-2 font-mono font-semibold shadow-sm">
                  {track}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">{t("aimTitle")}</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted">{t("aimText")}</p>
          </div>
        </Reveal>

        {/* For study centers */}
        <Reveal className="mx-auto w-full max-w-7xl px-5 pb-20">
          <div className="relative overflow-hidden rounded-4xl bg-grad-dark p-8 text-white sm:p-12">
            <div className="absolute -right-24 -top-24 size-80 rounded-full bg-grad-brand opacity-40 blur-3xl" />
            <Building2 className="relative size-10 text-white/80" />
            <h2 className="relative mt-4 font-display text-3xl font-bold">{t("centersTitle")}</h2>
            <p className="relative mt-4 max-w-2xl text-lg leading-relaxed text-white/75">{t("centersText")}</p>
            <a href="https://t.me/" className="relative mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-foreground hover:bg-white/90">
              {t("centersCta")} <ArrowRight className="size-4" />
            </a>
          </div>
        </Reveal>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} <span className="font-display font-bold text-grad-brand">Zukkolar</span>
      </footer>
    </>
  );
}
