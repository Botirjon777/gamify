import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  Brain,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  Crosshair,
  Dumbbell,
  Flame,
  Lock,
  Send,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconTile } from "@/components/icon";
import { Logo, LogoFull } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { buttonClass } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth/session";
import { siteOrigin } from "@/lib/site-url";
import { telegramUrl } from "@/lib/telegram";
import { getCurrentTenant, isDefaultTenant } from "@/lib/tenant";
import { currentSeason, weeklyTopic } from "@/features/events/service";
import { daysLeft, seasonProgress } from "@/features/events/season";
import { DAILY_BONUS_XP } from "@/features/gamification/xp";
import { GUEST_IQ_QUESTIONS } from "@/features/iq/guest";
import { iqPercentile } from "@/features/iq/rating";
import { IQ_SECONDS_PER_QUESTION } from "@/features/iq/types";
import { groupKey, groupMessageKey, groupStyle, inGroup, TRACK_GROUPS } from "@/features/learn/subjects";
import { getCatalogStructure } from "@/features/learn/queries";
import { paymentDetails } from "@/features/payments/config";
import { ANNUAL_DISCOUNT, perMonth } from "@/features/payments/pricing";
import { PLAN_ORDER, PLANS } from "@/features/plans/plans";
import { PriceTag } from "@/features/settings/components/price-tag";
import { iqPrice } from "@/features/settings/service";

const STEPS = [
  { key: "pick", icon: Crosshair, gradient: "bg-grad-brand" },
  { key: "drill", icon: Dumbbell, gradient: "bg-grad-iq" },
  { key: "earn", icon: Zap, gradient: "bg-grad-xp" },
  { key: "climb", icon: Trophy, gradient: "bg-grad-streak" },
] as const;
const FEATURES = [
  { key: "iq", icon: Brain, gradient: "bg-grad-iq" },
  { key: "friends", icon: Users, gradient: "bg-grad-brand" },
  { key: "clans", icon: Shield, gradient: "bg-grad-dark" },
  { key: "badges", icon: Sparkles, gradient: "bg-grad-gold" },
] as const;
const SECTIONS = ["iq", "how", "directions", "game", "plans", "faq"] as const;
/** The score on the sample certificate in the IQ section. */
const SAMPLE_IQ = 124;

type Faq = { q: string; a: string };

/** The landing page is the canonical home; title / description come from the locale layout. */
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  const tLearn = await getTranslations("learn");
  const tPlans = await getTranslations("plans");
  const tMeta = await getTranslations("meta");

  const tenant = await getCurrentTenant();
  const [current, catalog, season, topic, origin, payment, iq] = await Promise.all([
    getCurrentSession(),
    getCatalogStructure(tenant.id, locale),
    currentSeason(),
    weeklyTopic(undefined, await getLocale()),
    siteOrigin(),
    paymentDetails(),
    iqPrice(),
  ]);
  // The test without registration lives on the main site only (not on a study center's own address).
  const sections = SECTIONS.filter((id) => id !== "iq" || isDefaultTenant(tenant));

  // Real numbers from the catalog — nothing invented.
  const skills = catalog.flatMap((tr) => tr.modules.flatMap((m) => m.skills));
  const stats = [
    { value: skills.reduce((n, s) => n + s.exerciseCount, 0), label: t("stats.exercises") },
    { value: catalog.length, label: t("stats.courses") },
    { value: skills.length, label: t("stats.skills") },
    { value: 4, label: t("stats.types"), hint: t("stats.typesHint") },
  ];
  // Programming is shown by direction (Frontend, Backend …); the other subjects as one card each.
  const directions = TRACK_GROUPS.map((group) => ({
    key: groupKey(group),
    style: groupStyle(group),
    title: tLearn(`${groupMessageKey(group)}.title`),
    text: tLearn(`${groupMessageKey(group)}.text`),
    tracks: catalog
      .filter((tr) => inGroup(group, tr))
      .map((tr) => {
        const s = tr.modules.flatMap((m) => m.skills);
        return { slug: tr.slug, title: tr.title, skills: s.length, exercises: s.reduce((n, x) => n + x.exerciseCount, 0) };
      }),
  }));
  const ready = directions.filter((d) => d.tracks.length > 0);
  const soon = directions.filter((d) => d.tracks.length === 0);

  const faq = t.raw("faq") as Faq[];
  const trust = t.raw("trust") as string[];
  const telegram = telegramUrl(payment.contact);
  const som = (n: number) => n.toLocaleString("uz-UZ");

  // Structured data: who we are, the site, and the FAQ (eligible for rich results).
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "Zukkolar",
      url: origin,
      logo: `${origin}/icon.png`,
      description: tMeta("description"),
      ...(telegram && { sameAs: [telegram] }),
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: "Zukkolar", url: origin, inLanguage: "uz" },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Logo name={current?.tenant.name} />
          <nav aria-label={t("footer.platform")} className="hidden items-center gap-1 lg:flex">
            {sections.map((id) => (
              <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface hover:text-foreground">
                {t(`nav.${id}`)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {current ? (
              <Link href="/dashboard" className={buttonClass("primary")}>
                {tNav("dashboard")} <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost")}>
                  {tNav("login")}
                </Link>
                <Link href="/register" className={buttonClass("primary", "max-sm:hidden")}>
                  {tNav("register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-clip">
        {/* Hero */}
        {/* min-w-0: a grid column otherwise grows to fit the long code line and pushes the page wider */}
        <section className="animate-page mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="min-w-0">
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
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted">
              {trust.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-success" /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* A taste of an exercise */}
          <div className="relative min-w-0">
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

        {/* Numbers */}
        <section aria-label={t("stats.exercises")} className="mx-auto w-full max-w-7xl px-5 pb-16">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 70} className="rounded-3xl border border-border bg-surface p-5 text-center sm:p-6">
                <dd className="font-display text-4xl font-bold text-grad-brand sm:text-5xl">{s.value}</dd>
                <dt className="mt-1 font-semibold">{s.label}</dt>
                {s.hint && <p className="mt-1 text-xs text-muted">{s.hint}</p>}
              </Reveal>
            ))}
          </dl>
        </section>

        {/* IQ test without registration */}
        {sections.includes("iq") && (
          <section id="iq" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 pb-16">
            <Reveal className="relative grid items-center gap-10 overflow-hidden rounded-4xl bg-grad-dark p-8 text-white sm:p-12 lg:grid-cols-[1.3fr_1fr]">
              <div className="absolute -left-24 -top-24 size-80 rounded-full bg-grad-iq opacity-40 blur-3xl" />
              <div className="absolute -bottom-32 right-0 size-80 rounded-full bg-xp/20 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
                  <Brain className="size-4" /> {t("iq.badge")}
                </span>
                <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">{t("iq.title")}</h2>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/75">{t("iq.text")}</p>
                <ul className="mt-6 flex flex-col gap-2.5 font-medium">
                  {[t("iq.points.questions", { count: GUEST_IQ_QUESTIONS, seconds: IQ_SECONDS_PER_QUESTION }), t("iq.points.certificate"), t("iq.points.share")].map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <Check className="mt-1 size-4 shrink-0 text-[#7ff0b6]" /> {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Link href="/iq-test" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-base font-bold text-foreground hover:bg-white/90">
                    {t("iq.cta")} <ArrowRight className="size-5" />
                  </Link>
                  <p className="text-sm text-white/75">{t.rich("iq.price", { price: () => <PriceTag price={iq} /> })}</p>
                </div>
              </div>

              {/* What you get: a sample certificate */}
              <div className="relative mx-auto w-full max-w-sm rotate-2 rounded-3xl bg-surface p-6 text-center text-foreground shadow-2xl">
                <span className="absolute right-4 top-4 rounded-full bg-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted">{t("iq.sample")}</span>
                <Award className="mx-auto size-10 text-xp" />
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">{t("iq.certificate")}</p>
                <p className="mt-2 text-lg font-bold">{t("iq.sampleName")}</p>
                <p className="mt-3 font-display text-7xl font-bold leading-none">
                  <span className="text-grad-brand">{SAMPLE_IQ}</span>
                </p>
                <p className="mt-1 text-sm font-bold">Zukko IQ</p>
                <p className="mt-4 rounded-xl bg-background px-3 py-2.5 text-sm font-semibold">{t("iq.percentile", { percentile: iqPercentile(SAMPLE_IQ) })}</p>
              </div>
            </Reveal>
          </section>
        )}

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-border/70 bg-surface/70">
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

        {/* Directions and courses — straight from the catalog */}
        <section id="directions" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-16">
          <h2 className="font-display text-3xl font-bold">{t("tracksTitle")}</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">{t("tracksText")}</p>
          <div className="mt-10 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ready.map(({ key, style, title, text, tracks }, i) => (
              <Reveal key={key} delay={i * 60} className="rounded-3xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3">
                  <IconTile name={style.icon} gradient={style.gradient} size="md" />
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {tracks.map((tr) => (
                    <li key={tr.slug} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl bg-background/70 px-3 py-2">
                      <span className="font-mono font-semibold">{tr.title}</span>
                      <span className="text-xs text-muted">{t("courseStats", { skills: tr.skills, exercises: tr.exercises })}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          {soon.length > 0 && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {soon.map(({ key, style, title, text }, i) => (
                <Reveal as="li" key={key} delay={i * 50} className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 p-4">
                  <IconTile name={style.icon} gradient={style.gradient} size="sm" className="opacity-60 grayscale" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h3>
                    <p className="truncate text-xs text-muted">{text}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-muted">
                    <Lock className="size-3" /> {t("comingSoon")}
                  </span>
                </Reveal>
              ))}
            </ul>
          )}
        </section>

        {/* Competition */}
        <section id="game" className="scroll-mt-20 border-y border-border/70 bg-surface/70">
          <div className="mx-auto w-full max-w-7xl px-5 py-16">
            <h2 className="font-display text-3xl font-bold">{t("gameTitle")}</h2>
            <p className="mt-3 max-w-2xl text-lg text-muted">{t("gameText")}</p>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {/* Duels */}
              <Reveal className="relative overflow-hidden rounded-3xl bg-grad-dark p-6 text-white sm:p-8">
                <div className="absolute -left-16 -top-16 size-56 rounded-full bg-brand/30 blur-3xl" />
                <div className="absolute -bottom-16 -right-16 size-56 rounded-full bg-streak/30 blur-3xl" />
                <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                  <div>
                    <span className="mx-auto grid size-16 place-items-center rounded-full bg-grad-brand font-display text-xl font-bold ring-4 ring-white/15">S</span>
                    <p className="mt-2 text-sm font-semibold">{t("game.duel.you")}</p>
                    <p className="font-display text-2xl font-bold">4/5</p>
                  </div>
                  <span className="bg-grad-gold bg-clip-text font-display text-4xl font-black italic text-transparent">VS</span>
                  <div>
                    <span className="mx-auto grid size-16 place-items-center rounded-full bg-grad-streak font-display text-xl font-bold ring-4 ring-white/15">R</span>
                    <p className="mt-2 text-sm font-semibold">{t("game.duel.rival")}</p>
                    <p className="font-display text-2xl font-bold">3/5</p>
                  </div>
                </div>
                <div className="relative mt-5 grid grid-cols-2 gap-3 text-sm font-bold">
                  <p className="rounded-2xl bg-success/20 py-2 text-center text-[#7ff0b6]">{t("game.duel.win")}: +50 XP</p>
                  <p className="rounded-2xl bg-danger/20 py-2 text-center text-[#ff9ea1]">{t("game.duel.lose")}: −50 XP</p>
                </div>
                <h3 className="relative mt-6 flex items-center gap-2 text-xl font-bold">
                  <Swords className="size-5" /> {t("game.duel.title")}
                </h3>
                <p className="relative mt-2 leading-relaxed text-white/75">{t("game.duel.text")}</p>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Season */}
                <Reveal delay={80} className="rounded-3xl border border-border bg-surface p-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-grad-gold text-white">
                    <Trophy className="size-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t("game.season.title")}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t("game.season.text")}</p>
                  {season && (
                    <div className="mt-4">
                      <p className="flex items-center justify-between text-xs font-bold">
                        <span>{t("game.season.label", { number: season.number })}</span>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <CalendarClock className="size-3.5" /> {t("game.season.left", { days: daysLeft(season.endsAt) })}
                        </span>
                      </p>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-grad-gold" style={{ width: `${Math.max(4, Math.round(seasonProgress(season) * 100))}%` }} />
                      </div>
                    </div>
                  )}
                </Reveal>

                {/* Weekly bonus */}
                <Reveal delay={140} className="rounded-3xl bg-grad-gold p-6 text-white">
                  <span className="grid size-12 place-items-center rounded-2xl bg-white/20">
                    <Sparkles className="size-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t("game.weekly.title")}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/90">{t("game.weekly.text")}</p>
                  {topic && <p className="mt-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{t("game.weekly.badge", { track: topic.title })}</p>}
                </Reveal>

                {/* Streak */}
                <Reveal delay={200} className="rounded-3xl border border-border bg-surface p-6 sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-grad-streak text-white">
                      <Flame className="size-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold">{t("game.streak.title")}</h3>
                      <p className="text-sm leading-relaxed text-muted">{t("game.streak.text")}</p>
                    </div>
                  </div>
                  <ol className="mt-4 grid grid-cols-7 gap-1.5 text-center">
                    {DAILY_BONUS_XP.map((xp, i) => (
                      <li key={i} className={`rounded-xl py-2 ${i === 6 ? "bg-grad-streak text-white" : i < 3 ? "bg-streak/10" : "bg-background"}`}>
                        <span className="block text-[10px] font-semibold opacity-70">{t("game.streak.day", { n: i + 1 })}</span>
                        <span className="block text-sm font-bold">+{xp}</span>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              </div>
            </div>

            {/* More: IQ, friends, clans, badges */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ key, icon: Icon, gradient }, i) => (
                <Reveal key={key} delay={i * 70} className="rounded-3xl border border-border bg-surface p-6">
                  <span className={`grid size-12 place-items-center rounded-2xl text-white ${gradient}`}>
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t(`features.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`features.${key}.text`)}</p>
                  {key === "iq" && (
                    <Link href="/iq-test" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
                      {t("features.iq.cta")} <ArrowRight className="size-4" />
                    </Link>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-16">
          <h2 className="font-display text-3xl font-bold">{t("plansTitle")}</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">{t("plansText")}</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {PLAN_ORDER.map((plan, i) => {
              const limits = PLANS[plan];
              const paid = plan !== "FREE";
              const highlight = plan === "PRO";
              const features = [
                tPlans("features.multiplier", { x: limits.xpMultiplier }),
                limits.dailyExerciseXpCap === null ? tPlans("features.noCap") : tPlans("features.cap", { xp: limits.dailyExerciseXpCap }),
                tPlans("features.clan", { n: limits.clanMemberLimit }),
                ...(plan === "PRO" ? [tPlans("features.avatarsPro")] : plan === "DIAMOND" ? [tPlans("features.avatarsDiamond")] : []),
              ];
              return (
                <Reveal
                  key={plan}
                  delay={i * 80}
                  className={`flex flex-col rounded-3xl border p-6 sm:p-7 ${
                    highlight ? "border-transparent bg-grad-brand text-white shadow-2xl shadow-brand/25" : "border-border bg-surface"
                  }`}
                >
                  <h3 className="font-display text-2xl font-bold">{tPlans(`names.${plan}`)}</h3>
                  <p className={`text-sm ${highlight ? "text-white/80" : "text-muted"}`}>{tPlans(`taglines.${plan}`)}</p>
                  <p className="mt-5 flex flex-wrap items-baseline gap-x-1.5 font-display text-3xl font-bold">
                    {paid ? som(perMonth(plan, "monthly")) : tPlans("free")}
                    {paid && <span className={`font-sans text-sm font-medium ${highlight ? "text-white/80" : "text-muted"}`}>{tPlans("perMonth")}</span>}
                  </p>
                  <p className={`mt-1 min-h-5 text-sm ${highlight ? "text-white/80" : "text-success"}`}>{paid && t("plansAnnual", { percent: ANNUAL_DISCOUNT })}</p>
                  <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className={`mt-0.5 size-4 shrink-0 ${highlight ? "text-white" : "text-success"}`} /> {f}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <Link href="/register" className={buttonClass("primary", "h-12 px-7 text-base")}>
              {t("plansCta")} <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>

        {/* For study centers */}
        <Reveal className="mx-auto w-full max-w-7xl px-5 pb-16">
          <div className="relative overflow-hidden rounded-4xl bg-grad-dark p-8 text-white sm:p-12">
            <div className="absolute -right-24 -top-24 size-80 rounded-full bg-grad-brand opacity-40 blur-3xl" />
            <Building2 className="relative size-10 text-white/80" />
            <h2 className="relative mt-4 font-display text-3xl font-bold">{t("centersTitle")}</h2>
            <p className="relative mt-4 max-w-2xl text-lg leading-relaxed text-white/75">{t("centersText")}</p>
            {telegram && (
              <a href={telegram} rel="noopener" className="relative mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-foreground hover:bg-white/90">
                <Send className="size-4" /> {t("centersCta")}
              </a>
            )}
          </div>
        </Reveal>

        {/* FAQ — plain <details>, readable without JavaScript */}
        <section id="faq" className="scroll-mt-20 border-y border-border/70 bg-surface/70">
          <div className="mx-auto w-full max-w-3xl px-5 py-16">
            <h2 className="font-display text-3xl font-bold">{t("faqTitle")}</h2>
            <div className="mt-8 flex flex-col gap-3">
              {faq.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-border bg-surface px-5 open:shadow-lg open:shadow-brand/5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Aim + final call */}
        <Reveal className="mx-auto w-full max-w-4xl px-5 py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">{t("aimTitle")}</p>
          <p className="mt-4 font-display text-xl font-bold leading-relaxed sm:text-2xl">{t("aimText")}</p>
          <h2 className="mt-12 font-display text-3xl font-bold sm:text-4xl">
            <span className="text-grad-brand">{t("finalTitle")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{t("finalText")}</p>
          <Link href="/register" className={buttonClass("primary", "mt-8 h-13 px-8 text-base")}>
            {t("cta")} <ArrowRight className="size-5" />
          </Link>
        </Reveal>
      </main>

      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <LogoFull className="w-28" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{t("footer.about")}</p>
          </div>
          <nav aria-label={t("footer.platform")}>
            <h2 className="text-sm font-bold">{t("footer.platform")}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              {sections.map((id) => (
                <li key={id}>
                  <a href={`#${id}`} className="hover:text-foreground">
                    {t(`nav.${id}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={t("footer.account")}>
            <h2 className="text-sm font-bold">{t("footer.account")}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li>
                <Link href="/register" className="hover:text-foreground">
                  {tNav("register")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  {tNav("login")}
                </Link>
              </li>
            </ul>
          </nav>
          {telegram && (
            <div>
              <h2 className="text-sm font-bold">{t("footer.contact")}</h2>
              <a href={telegram} rel="noopener" className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
                <Send className="size-4" /> {t("footer.telegram")}
              </a>
            </div>
          )}
        </div>
        <p className="border-t border-border py-5 text-center text-xs text-muted">
          © {new Date().getFullYear()} Zukkolar. {t("footer.rights")}
        </p>
      </footer>
    </>
  );
}
