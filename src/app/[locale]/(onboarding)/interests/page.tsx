import { Compass } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { getUpcomingSubjects } from "@/features/learn/queries";
import { InterestsForm } from "@/features/profile/components/interests-form";

/** First step after sign-up: which subjects the user wants. Skippable; editable later in settings. */
export default async function InterestsPage({ params }: PageProps<"/[locale]/interests">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("interests");
  const { user, tenant } = await requireSession();
  const upcoming = await getUpcomingSubjects(tenant.id, locale);
  // New accounts go on to the (optional) placement IQ test offer.
  const next = !user.iqTestedAt && !user.iqPromptHiddenAt ? "/iq/placement" : "/dashboard";

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-surface p-6 text-center shadow-xl shadow-brand/5 sm:p-10">
      <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-grad-brand text-white shadow-xl shadow-brand/20">
        <Compass className="size-8" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mb-8 mt-3 leading-relaxed text-muted">{t("text")}</p>
      <InterestsForm initial={user.interests} upcoming={upcoming} variant="onboarding" next={next} />
    </div>
  );
}
