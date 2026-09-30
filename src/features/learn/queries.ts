import "server-only";
import { db } from "@/lib/db";
import { localized, type LocalizedText } from "@/i18n/content";

const visibleTo = (tenantId: string) => ({ OR: [{ tenantId: null }, { tenantId }] });
const published = { status: "PUBLISHED" as const };

export interface SkillProgress {
  id: string;
  slug: string;
  trackSlug: string;
  title: string;
  description: string;
  exerciseCount: number;
  mastery: number;
  attempts: number;
  due: boolean;
}

type MasteryRow = { skillId: string; score: number; attempts: number; nextReviewAt: Date };

function toProgress(
  skill: { id: string; slug: string; title: unknown; description: unknown; _count: { exercises: number } },
  trackSlug: string,
  mastery: MasteryRow | undefined,
  locale: string,
  now: Date,
): SkillProgress {
  return {
    id: skill.id,
    slug: skill.slug,
    trackSlug,
    title: localized(skill.title as LocalizedText, locale),
    description: localized(skill.description as LocalizedText, locale),
    exerciseCount: skill._count.exercises,
    mastery: mastery?.score ?? 0,
    attempts: mastery?.attempts ?? 0,
    due: !!mastery && mastery.attempts > 0 && mastery.nextReviewAt <= now,
  };
}

const skillInclude = (tenantId: string) => ({
  _count: { select: { exercises: { where: { ...published, ...visibleTo(tenantId) } } } },
});

/** All tracks → modules → skills with the user's mastery. */
export async function getCatalog(userId: string, tenantId: string, locale: string) {
  const [tracks, masteries] = await Promise.all([
    db.track.findMany({
      where: { ...published, ...visibleTo(tenantId) },
      orderBy: { order: "asc" },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { skills: { orderBy: { order: "asc" }, include: skillInclude(tenantId) } },
        },
      },
    }),
    db.skillMastery.findMany({ where: { userId } }),
  ]);
  const bySkill = new Map(masteries.map((m) => [m.skillId, m]));
  const now = new Date();

  return tracks.map((t) => ({
    slug: t.slug,
    icon: t.icon,
    title: localized(t.title as LocalizedText, locale),
    description: localized(t.description as LocalizedText, locale),
    modules: t.modules.map((m) => ({
      slug: m.slug,
      title: localized(m.title as LocalizedText, locale),
      skills: m.skills
        .filter((s) => s._count.exercises > 0)
        .map((s) => toProgress(s, t.slug, bySkill.get(s.id), locale, now)),
    })),
  }));
}

/** One skill with its track, the user's mastery and how many exercises they've solved. */
export async function getSkill(trackSlug: string, skillSlug: string, userId: string, tenantId: string, locale: string) {
  const skill = await db.skill.findUnique({
    where: { slug: skillSlug },
    include: { module: { include: { track: true } }, ...skillInclude(tenantId) },
  });
  const track = skill?.module.track;
  if (!skill || !track || track.slug !== trackSlug || track.status !== "PUBLISHED") return null;
  if (track.tenantId && track.tenantId !== tenantId) return null;

  const [mastery, solved] = await Promise.all([
    db.skillMastery.findUnique({ where: { userId_skillId: { userId, skillId: skill.id } } }),
    db.attempt.groupBy({
      by: ["exerciseId"],
      where: { userId, correct: true, exercise: { skillId: skill.id, ...published } },
    }),
  ]);

  return {
    ...toProgress(skill, track.slug, mastery ?? undefined, locale, new Date()),
    trackTitle: localized(track.title as LocalizedText, locale),
    moduleTitle: localized(skill.module.title as LocalizedText, locale),
    solved: solved.length,
    correct: mastery?.correct ?? 0,
    lastPracticedAt: mastery?.lastPracticedAt ?? null,
  };
}

/** For the dashboard: skills due for review first, then the most recently practiced. */
export async function getPracticeSuggestions(userId: string, tenantId: string, locale: string, limit = 3) {
  const masteries = await db.skillMastery.findMany({
    where: { userId, attempts: { gt: 0 } },
    orderBy: { lastPracticedAt: "desc" },
    take: 20,
    include: { skill: { include: { module: { include: { track: true } }, ...skillInclude(tenantId) } } },
  });
  const now = new Date();

  return masteries
    .map((m) => toProgress(m.skill, m.skill.module.track.slug, m, locale, now))
    .sort((a, b) => Number(b.due) - Number(a.due))
    .slice(0, limit);
}
