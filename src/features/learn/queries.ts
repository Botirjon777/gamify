import "server-only";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import { localized, type LocalizedText } from "@/i18n/content";
import { CATEGORIES, type Category } from "./categories";

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

// ─── Catalog ────────────────────────────────────────────────────────────────

export interface CatalogSkill {
  id: string;
  slug: string;
  title: string;
  description: string;
  exerciseCount: number;
}
export interface CatalogTrack {
  id: string;
  slug: string;
  icon: string | null;
  category: Category;
  title: string;
  description: string;
  modules: { slug: string; title: string; skills: CatalogSkill[] }[];
}

/**
 * Tracks → modules → skills (only skills with exercises), the same for everyone in a tenant.
 * Cached for a few minutes; content changes arrive with `pnpm content:sync` + at most this delay.
 */
export function getCatalogStructure(tenantId: string, locale: string): Promise<CatalogTrack[]> {
  return cached(`catalog:${tenantId}:${locale}`, 300, async () => {
    const tracks = await db.track.findMany({
      where: { ...published, ...visibleTo(tenantId) },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { skills: { orderBy: { order: "asc" }, include: skillInclude(tenantId) } },
        },
      },
    });
    return tracks
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        icon: t.icon,
        category: t.category,
        title: localized(t.title as LocalizedText, locale),
        description: localized(t.description as LocalizedText, locale),
        modules: t.modules
          .map((m) => ({
            slug: m.slug,
            title: localized(m.title as LocalizedText, locale),
            skills: m.skills
              .filter((s) => s._count.exercises > 0)
              .map((s) => ({
                id: s.id,
                slug: s.slug,
                title: localized(s.title as LocalizedText, locale),
                description: localized(s.description as LocalizedText, locale),
                exerciseCount: s._count.exercises,
              })),
          }))
          .filter((m) => m.skills.length > 0),
      }))
      .filter((t) => t.modules.length > 0);
  });
}

const masteriesOf = async (userId: string) =>
  new Map((await db.skillMastery.findMany({ where: { userId } })).map((m) => [m.skillId, m]));

function withProgress(skill: CatalogSkill, trackSlug: string, m: MasteryRow | undefined, now: Date): SkillProgress {
  return {
    ...skill,
    trackSlug,
    mastery: m?.score ?? 0,
    attempts: m?.attempts ?? 0,
    due: !!m && m.attempts > 0 && m.nextReviewAt <= now,
  };
}

export interface ProgressSummary {
  skills: number;
  exercises: number;
  /** Average mastery over all skills (0–100); unstarted skills count as 0. */
  mastery: number;
  started: number;
}

function summarize(skills: CatalogSkill[], masteries: Map<string, MasteryRow>): ProgressSummary {
  const scores = skills.map((s) => masteries.get(s.id)?.score ?? 0);
  return {
    skills: skills.length,
    exercises: skills.reduce((n, s) => n + s.exerciseCount, 0),
    mastery: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    started: skills.filter((s) => (masteries.get(s.id)?.attempts ?? 0) > 0).length,
  };
}

const skillsOf = (t: CatalogTrack) => t.modules.flatMap((m) => m.skills);

/** Learn home: every category (empty ones too — shown as "coming soon") with the user's progress. */
export async function getCategories(userId: string, tenantId: string, locale: string) {
  const [tracks, masteries] = await Promise.all([getCatalogStructure(tenantId, locale), masteriesOf(userId)]);
  return CATEGORIES.map((category) => {
    const inCat = tracks.filter((t) => t.category === category);
    return { category, tracks: inCat.map((t) => t.title), ...summarize(inCat.flatMap(skillsOf), masteries) };
  });
}

/** One category: its tracks with the user's progress. */
export async function getCategoryTracks(category: Category, userId: string, tenantId: string, locale: string) {
  const [tracks, masteries] = await Promise.all([getCatalogStructure(tenantId, locale), masteriesOf(userId)]);
  return tracks
    .filter((t) => t.category === category)
    .map((t) => ({ slug: t.slug, icon: t.icon, title: t.title, description: t.description, id: t.id, ...summarize(skillsOf(t), masteries) }));
}

/** One track → modules → skills with mastery. */
export async function getTrack(trackSlug: string, userId: string, tenantId: string, locale: string) {
  const [tracks, masteries] = await Promise.all([getCatalogStructure(tenantId, locale), masteriesOf(userId)]);
  const track = tracks.find((t) => t.slug === trackSlug);
  if (!track) return null;
  const now = new Date();
  return {
    ...track,
    summary: summarize(skillsOf(track), masteries),
    modules: track.modules.map((m) => ({ ...m, skills: m.skills.map((s) => withProgress(s, track.slug, masteries.get(s.id), now)) })),
  };
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
