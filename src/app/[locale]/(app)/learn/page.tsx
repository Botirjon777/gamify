import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { getCatalog } from "@/features/learn/queries";
import { SkillCard } from "@/features/learn/components/skill-card";
import { IconTile } from "@/components/icon";
import { PageHeader } from "@/components/page-header";

export default async function LearnPage({ params }: PageProps<"/[locale]/learn">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const { user, tenant } = await requireSession();
  const catalog = await getCatalog(user.id, tenant.id, locale);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {catalog.map((track) => (
        <section key={track.slug}>
          <div className="flex items-center gap-3">
            <IconTile name={track.icon ?? "braces"} gradient={track.slug === "react" ? "iq" : "xp"} size="lg" />
            <div>
              <h2 className="font-display text-xl font-bold">{track.title}</h2>
              {track.description && <p className="text-sm text-muted">{track.description}</p>}
            </div>
          </div>

          {track.modules.map((mod) => (
            <div key={mod.slug} className="mt-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted">{mod.title}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {mod.skills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
