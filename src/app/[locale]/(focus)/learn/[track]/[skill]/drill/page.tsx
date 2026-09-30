import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { getSkill } from "@/features/learn/queries";
import { DrillSession } from "@/features/learn/components/drill-session";

export default async function DrillPage({ params }: PageProps<"/[locale]/learn/[track]/[skill]/drill">) {
  const { locale, track, skill: skillSlug } = await params;
  setRequestLocale(locale);
  const { user, tenant } = await requireSession();

  const skill = await getSkill(track, skillSlug, user.id, tenant.id, locale);
  if (!skill) notFound();

  return (
    <DrillSession
      skillId={skill.id}
      skillTitle={skill.title}
      skillHref={`/learn/${skill.trackSlug}/${skill.slug}`}
      initialMastery={skill.mastery}
    />
  );
}
