import "server-only";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import type { ContentStatus, ExerciseType, Prisma } from "@/generated/prisma/client";
import { localized, type LocalizedText } from "@/i18n/content";
import { IQ_CATEGORIES } from "@/features/iq/content-schema";
import type { Subject } from "@/features/learn/subjects";

/** Admin screens edit the Uzbek text. */
export const uzText = (field: unknown) => localized(field as LocalizedText | null, "uz");

const STATUSES: ContentStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
/** A value from the URL → a status, or undefined when it isn't one. */
export const toStatus = (value: string | undefined) => STATUSES.find((s) => s === value);
const TYPES: ExerciseType[] = ["CHOICE", "OUTPUT", "FILL", "ORDER"];
export const toExerciseType = (value: string | undefined) => TYPES.find((t) => t === value);

const byStatus = (rows: { status: ContentStatus; _count: number }[]) => {
  const map: Record<ContentStatus, number> = { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
  for (const row of rows) map[row.status] = row._count;
  return map;
};

export async function getCmsOverviewStats() {
  await requireAdmin();
  const [tracks, modules, skills, exercises, iqItems] = await Promise.all([
    db.track.groupBy({ by: ["status"], _count: true }),
    db.module.count(),
    db.skill.count(),
    db.exercise.groupBy({ by: ["status"], _count: true }),
    db.iqItem.groupBy({ by: ["status"], _count: true }),
  ]);
  return { tracks: byStatus(tracks), modules, skills, exercises: byStatus(exercises), iqItems: byStatus(iqItems) };
}

export async function getCmsTracks() {
  await requireAdmin();
  const tracks = await db.track.findMany({
    orderBy: [{ subject: "asc" }, { order: "asc" }, { slug: "asc" }],
    include: { modules: { select: { skills: { select: { _count: { select: { exercises: true } } } } } } },
  });
  return tracks.map(({ modules, ...track }) => {
    const skills = modules.flatMap((m) => m.skills);
    return { ...track, moduleCount: modules.length, skillCount: skills.length, exerciseCount: skills.reduce((n, s) => n + s._count.exercises, 0) };
  });
}

export async function getCmsTrackBySlug(slug: string) {
  await requireAdmin();
  return db.track.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: [{ order: "asc" }, { slug: "asc" }],
        include: {
          skills: {
            orderBy: [{ order: "asc" }, { slug: "asc" }],
            include: { _count: { select: { exercises: { where: { status: { not: "ARCHIVED" } } } } } },
          },
        },
      },
    },
  });
}

const PAGE_SIZE = 20;
const paging = (page: number | undefined) => {
  const current = Number.isInteger(page) && page! > 0 ? page! : 1;
  return { current, skip: (current - 1) * PAGE_SIZE, take: PAGE_SIZE };
};
/** Matches the exercise / IQ key, or the Uzbek question text. */
const searchFilter = (search: string | undefined) => {
  const s = search?.trim();
  if (!s) return {};
  return { OR: [{ key: { contains: s, mode: "insensitive" as const } }, { content: { path: ["prompt", "uz"], string_contains: s } }] };
};

export interface CmsExerciseFilter {
  search?: string;
  subject?: Subject;
  skillId?: string;
  type?: ExerciseType;
  status?: ContentStatus;
  page?: number;
}

export async function getCmsExercises(filter: CmsExerciseFilter) {
  await requireAdmin();
  const { current, skip, take } = paging(filter.page);
  const where: Prisma.ExerciseWhereInput = {
    ...(filter.status && { status: filter.status }),
    ...(filter.type && { type: filter.type }),
    ...(filter.skillId ? { skillId: filter.skillId } : filter.subject ? { skill: { module: { track: { subject: filter.subject } } } } : {}),
    ...searchFilter(filter.search),
  };
  const [items, total] = await Promise.all([
    db.exercise.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { key: "asc" }],
      skip,
      take,
      include: { skill: { select: { title: true, module: { select: { track: { select: { title: true, subject: true } } } } } } },
    }),
    db.exercise.count({ where }),
  ]);
  return { items, total, page: current, pages: Math.ceil(total / PAGE_SIZE) };
}

export async function getCmsExerciseById(id: string) {
  await requireAdmin();
  return db.exercise.findUnique({ where: { id } });
}

/** "use-state-015" after "use-state-014": the next free number for a key prefix. */
function nextKey(prefix: string, keys: string[]) {
  const numbers = keys.map((k) => (k.startsWith(`${prefix}-`) ? Number(k.slice(prefix.length + 1)) : NaN)).filter(Number.isInteger);
  return `${prefix}-${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
}

/** Skills to attach an exercise to, each with a suggested key for a new exercise. */
export async function getCmsSkillOptions() {
  await requireAdmin();
  const skills = await db.skill.findMany({
    orderBy: [{ module: { track: { subject: "asc" } } }, { module: { track: { order: "asc" } } }, { module: { order: "asc" } }, { order: "asc" }],
    select: { id: true, slug: true, title: true, exercises: { select: { key: true } }, module: { select: { track: { select: { title: true, subject: true } } } } },
  });
  return skills.map((s) => ({
    id: s.id,
    title: uzText(s.title),
    track: uzText(s.module.track.title),
    subject: s.module.track.subject,
    nextKey: nextKey(s.slug, s.exercises.map((e) => e.key)),
  }));
}
export type CmsSkillOption = Awaited<ReturnType<typeof getCmsSkillOptions>>[number];

export interface CmsIqFilter {
  search?: string;
  category?: string;
  difficulty?: number;
  status?: ContentStatus;
  page?: number;
}

export async function getCmsIqItems(filter: CmsIqFilter) {
  await requireAdmin();
  const { current, skip, take } = paging(filter.page);
  const where: Prisma.IqItemWhereInput = {
    ...(filter.status && { status: filter.status }),
    ...(filter.category && { category: filter.category }),
    ...(filter.difficulty && { difficulty: filter.difficulty }),
    ...searchFilter(filter.search),
  };
  const [items, total, keys] = await Promise.all([
    db.iqItem.findMany({ where, orderBy: [{ key: "asc" }], skip, take }),
    db.iqItem.count({ where }),
    db.iqItem.findMany({ select: { key: true, category: true } }),
  ]);

  // Suggested key per category, following that category's existing keys (iq-seq-001 → iq-seq-013).
  const nextKeys = Object.fromEntries(
    IQ_CATEGORIES.map((category) => {
      const own = keys.filter((k) => k.category === category).map((k) => k.key);
      const prefix = own[0]?.replace(/-\d+$/, "") ?? `iq-${category}`;
      return [category, nextKey(prefix, keys.map((k) => k.key))];
    }),
  ) as Record<(typeof IQ_CATEGORIES)[number], string>;

  return { items, total, page: current, pages: Math.ceil(total / PAGE_SIZE), nextKeys };
}
