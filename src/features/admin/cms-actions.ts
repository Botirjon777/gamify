"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { invalidateCache } from "@/lib/cache";
import { ICON_NAMES } from "@/components/icon";
import { Prisma } from "@/generated/prisma/client";
import { exerciseDef, LANGS, toDbExercise, trackFile } from "@/features/learn/content-schema";
import { CATEGORIES } from "@/features/learn/categories";
import { SUBJECTS } from "@/features/learn/subjects";
import { INITIAL_ITEM_RATING, IQ_CATEGORIES, iqItemDef, toIqContent } from "@/features/iq/content-schema";
import { MAX_UPLOAD_BYTES, saveMedia } from "@/lib/media-store";

/**
 * Content management for super admins. The database is the source of truth for content; `pnpm content:pull`
 * mirrors it into /content. Everything is validated with the same schemas as those files, so content made here
 * and content pushed from the files can't disagree about what is valid.
 *
 * Actions return a result instead of throwing: thrown messages are hidden from the browser in production.
 */
export type CmsError = "invalid" | "notFound" | "slugTaken" | "keyTaken" | "inUse";
type CmsFailure = { ok: false; error: CmsError; detail?: string };
export type CmsResult = { ok: true } | CmsFailure;

const fail = (error: CmsError, detail?: string): CmsFailure => ({ ok: false, error, detail });
/** First validation problem, e.g. "category: must be one of the subject's categories…" (admins only see this). */
const invalid = (error: z.ZodError): CmsFailure => {
  const issue = error.issues[0];
  return fail("invalid", issue ? [issue.path.join("."), issue.message].filter(Boolean).join(": ") : undefined);
};

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const statusSchema = z.enum(STATUSES);
type Status = (typeof STATUSES)[number];
/** The file schemas know only DRAFT / PUBLISHED; ARCHIVED exists just in the database. */
const fileStatus = (status: Status) => (status === "DRAFT" ? "DRAFT" : "PUBLISHED");

const id = z.string().min(1).max(64);
const slug = z.string().trim().min(2).max(50).regex(/^[a-z0-9-]+$/);
const title = z.string().trim().min(2).max(100);
const about = z.string().trim().max(500).optional();
const order = z.number().int().min(0).max(10_000).default(0);
const uz = (text: string | undefined) => (text ? { uz: text } : undefined);
/** A cleared optional JSON column is written as SQL NULL. */
const orNull = <T>(value: T | undefined) => value ?? Prisma.DbNull;

/** After every change: audit trail, and learners see it at once (not after the catalog cache expires). */
async function changed(adminId: string, action: string, data: Prisma.InputJsonValue) {
  await audit(db, adminId, action, null, data);
  await Promise.all([invalidateCache("catalog:"), invalidateCache("weekly:")]);
  revalidatePath("/", "layout");
}

/**
 * Attempts, mastery and duels point at exercises / skills and are deleted together with them.
 * So anything a learner has already touched can be archived, but not deleted.
 */
async function hasUserData(skillIds: string[]) {
  if (!skillIds.length) return false;
  const exercises = await db.exercise.findMany({ where: { skillId: { in: skillIds } }, select: { id: true } });
  const exerciseIds = exercises.map((e) => e.id);
  const [attempt, mastery, duel] = await Promise.all([
    db.attempt.findFirst({ where: { exerciseId: { in: exerciseIds } }, select: { id: true } }),
    db.skillMastery.findFirst({ where: { skillId: { in: skillIds } }, select: { skillId: true } }),
    db.duel.findFirst({ where: { questionIds: { hasSome: exerciseIds } }, select: { id: true } }),
  ]);
  return !!(attempt || mastery || duel);
}

// ─── Tracks ─────────────────────────────────────────────────────────────────

const trackInput = z.object({
  slug,
  titleUz: title,
  descriptionUz: about,
  subject: z.enum(SUBJECTS),
  category: z.enum(CATEGORIES).nullable().optional(),
  /** Empty = the subject's icon. */
  icon: z.string().trim().optional(),
  order,
  status: statusSchema.default("DRAFT"),
});
export type CmsTrackInput = z.input<typeof trackInput>;

function trackData(input: unknown) {
  const parsed = trackInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const t = parsed.data;
  if (t.icon && !ICON_NAMES.includes(t.icon)) return fail("invalid", `icon: "${t.icon}" is not a known icon`);
  // Same rules as a track.yaml: category belongs to the subject, slug isn't a page URL.
  const checked = trackFile.safeParse({
    slug: t.slug,
    title: t.titleUz,
    description: t.descriptionUz || undefined,
    subject: t.subject,
    category: t.category ?? undefined,
    status: fileStatus(t.status),
  });
  if (!checked.success) return invalid(checked.error);
  return {
    ok: true as const,
    data: {
      slug: t.slug,
      title: { uz: t.titleUz },
      description: orNull(uz(t.descriptionUz)),
      subject: t.subject,
      category: t.category ?? null,
      icon: t.icon || null,
      order: t.order,
      status: t.status,
    },
  };
}

export async function createCmsTrack(input: CmsTrackInput): Promise<CmsResult> {
  const admin = await requireAdmin();
  const track = trackData(input);
  if (!track.ok) return track;
  if (await db.track.findUnique({ where: { slug: track.data.slug }, select: { id: true } })) return fail("slugTaken");

  await db.track.create({ data: track.data });
  await changed(admin.user.id, "cms.track.create", { slug: track.data.slug });
  return { ok: true };
}

export async function updateCmsTrack(trackId: string, input: CmsTrackInput): Promise<CmsResult> {
  const admin = await requireAdmin();
  const track = trackData(input);
  if (!track.ok) return track;
  const existing = await db.track.findUnique({ where: { id: trackId }, select: { slug: true } });
  if (!existing) return fail("notFound");
  if (existing.slug !== track.data.slug && (await db.track.findUnique({ where: { slug: track.data.slug }, select: { id: true } }))) {
    return fail("slugTaken");
  }

  await db.track.update({ where: { id: trackId }, data: track.data });
  await changed(admin.user.id, "cms.track.update", { id: trackId, slug: track.data.slug });
  return { ok: true };
}

// ─── Modules ────────────────────────────────────────────────────────────────

const moduleInput = z.object({ trackId: id, slug, titleUz: title, order });
export type CmsModuleInput = z.input<typeof moduleInput>;

export async function saveCmsModule(input: CmsModuleInput, moduleId?: string): Promise<CmsResult> {
  const admin = await requireAdmin();
  const parsed = moduleInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { trackId, titleUz, ...rest } = parsed.data;

  const clash = await db.module.findUnique({ where: { trackId_slug: { trackId, slug: rest.slug } }, select: { id: true } });
  if (clash && clash.id !== moduleId) return fail("slugTaken");

  if (moduleId) {
    const existing = await db.module.findUnique({ where: { id: moduleId }, select: { trackId: true } });
    if (!existing || existing.trackId !== trackId) return fail("notFound");
    await db.module.update({ where: { id: moduleId }, data: { ...rest, title: { uz: titleUz } } });
  } else {
    if (!(await db.track.findUnique({ where: { id: trackId }, select: { id: true } }))) return fail("notFound");
    await db.module.create({ data: { trackId, ...rest, title: { uz: titleUz } } });
  }
  await changed(admin.user.id, moduleId ? "cms.module.update" : "cms.module.create", { trackId, slug: rest.slug });
  return { ok: true };
}

/** Only a module no learner has practiced in can be deleted (its skills and exercises go with it). */
export async function deleteCmsModule(moduleId: string): Promise<CmsResult> {
  const admin = await requireAdmin();
  const mod = await db.module.findUnique({ where: { id: moduleId }, select: { slug: true, skills: { select: { id: true } } } });
  if (!mod) return fail("notFound");
  if (await hasUserData(mod.skills.map((s) => s.id))) return fail("inUse");

  await db.module.delete({ where: { id: moduleId } });
  await changed(admin.user.id, "cms.module.delete", { id: moduleId, slug: mod.slug });
  return { ok: true };
}

// ─── Skills ─────────────────────────────────────────────────────────────────

const skillInput = z.object({ moduleId: id, slug, titleUz: title, descriptionUz: about, order });
export type CmsSkillInput = z.input<typeof skillInput>;

export async function saveCmsSkill(input: CmsSkillInput, skillId?: string): Promise<CmsResult> {
  const admin = await requireAdmin();
  const parsed = skillInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { titleUz, descriptionUz, ...rest } = parsed.data;

  // Skill slugs are global: they are the URL (/learn/<track>/<skill>).
  const clash = await db.skill.findUnique({ where: { slug: rest.slug }, select: { id: true } });
  if (clash && clash.id !== skillId) return fail("slugTaken");
  if (!(await db.module.findUnique({ where: { id: rest.moduleId }, select: { id: true } }))) return fail("notFound");

  const data = { ...rest, title: { uz: titleUz }, description: orNull(uz(descriptionUz)) };
  if (skillId) {
    if (!(await db.skill.findUnique({ where: { id: skillId }, select: { id: true } }))) return fail("notFound");
    await db.skill.update({ where: { id: skillId }, data });
  } else {
    await db.skill.create({ data });
  }
  await changed(admin.user.id, skillId ? "cms.skill.update" : "cms.skill.create", { slug: rest.slug });
  return { ok: true };
}

/** Only a skill no learner has practiced can be deleted (its exercises go with it). */
export async function deleteCmsSkill(skillId: string): Promise<CmsResult> {
  const admin = await requireAdmin();
  const skill = await db.skill.findUnique({ where: { id: skillId }, select: { slug: true } });
  if (!skill) return fail("notFound");
  if (await hasUserData([skillId])) return fail("inUse");

  await db.skill.delete({ where: { id: skillId } });
  await changed(admin.user.id, "cms.skill.delete", { id: skillId, slug: skill.slug });
  return { ok: true };
}

// ─── Exercises ──────────────────────────────────────────────────────────────

const exerciseInput = z.object({
  key: z.string().trim().min(2).max(80),
  skillId: id,
  type: z.enum(["CHOICE", "OUTPUT", "FILL", "ORDER"]),
  difficulty: z.number().int(),
  xp: z.number().int().optional(),
  status: statusSchema.default("PUBLISHED"),
  promptUz: z.string().trim(),
  explanationUz: z.string().trim().optional(),
  lang: z.enum(LANGS),
  code: z.string().optional(),
  optionsUz: z.array(z.string()).optional(),
  choiceAnswerIndex: z.number().int().optional(),
  outputAnswers: z.array(z.string()).optional(),
  /** Per blank: the accepted answers. */
  fillBlanksAnswers: z.array(z.array(z.string())).optional(),
  /** Word-bank distractors for a fill exercise (empty = answers are typed). */
  fillBank: z.array(z.string()).optional(),
  orderLines: z.array(z.string()).optional(),
});
export type CmsExerciseInput = z.input<typeof exerciseInput>;

export async function saveCmsExercise(input: CmsExerciseInput, exerciseId?: string): Promise<CmsResult> {
  const admin = await requireAdmin();
  const parsed = exerciseInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const e = parsed.data;

  // The entry as it would be written in a skill file — validated by the very same schema.
  const common = {
    id: e.key,
    difficulty: e.difficulty,
    xp: e.xp,
    status: fileStatus(e.status),
    lang: e.lang,
    prompt: e.promptUz,
    explanation: e.explanationUz || undefined,
  };
  const code = e.code?.trim() ? e.code : undefined;
  const def = exerciseDef.safeParse(
    e.type === "CHOICE"
      ? { ...common, type: "choice", code, options: e.optionsUz ?? [], answer: e.choiceAnswerIndex ?? -1 }
      : e.type === "OUTPUT"
        ? { ...common, type: "output", code: code ?? "", answer: e.outputAnswers ?? [] }
        : e.type === "FILL"
          ? { ...common, type: "fill", code: code ?? "", answer: e.fillBlanksAnswers ?? [], bank: e.fillBank?.length ? e.fillBank : undefined }
          : { ...common, type: "order", lines: e.orderLines ?? [] },
  );
  if (!def.success) return invalid(def.error);
  if (def.data.type === "output" && !def.data.code.trim()) return fail("invalid", "code: required");

  const clash = await db.exercise.findUnique({ where: { key: e.key }, select: { id: true } });
  if (clash && clash.id !== exerciseId) return fail("keyTaken");
  if (!(await db.skill.findUnique({ where: { id: e.skillId }, select: { id: true } }))) return fail("notFound");

  const row = toDbExercise(def.data);
  const data = { ...row, status: e.status, skillId: e.skillId, explanation: orNull(row.explanation) };
  if (exerciseId) {
    if (!(await db.exercise.findUnique({ where: { id: exerciseId }, select: { id: true } }))) return fail("notFound");
    await db.exercise.update({ where: { id: exerciseId }, data });
  } else {
    // New exercises go to the end of their skill.
    const last = await db.exercise.aggregate({ where: { skillId: e.skillId }, _max: { order: true } });
    await db.exercise.create({ data: { ...data, order: (last._max.order ?? -1) + 1 } });
  }
  await changed(admin.user.id, exerciseId ? "cms.exercise.update" : "cms.exercise.create", { key: e.key });
  return { ok: true };
}

// ─── IQ items ───────────────────────────────────────────────────────────────

const iqInput = z.object({
  key: z.string().trim().min(2).max(80),
  category: z.enum(IQ_CATEGORIES),
  difficulty: z.number().int(),
  promptUz: z.string().trim(),
  figure: z.string().trim().optional(),
  /** Media paths, as returned by uploadCmsIqImage. */
  image: z.string().optional(),
  /** All answers as one picture; the text options are then not used. */
  optionsImage: z.object({ src: z.string(), columns: z.number().int(), rows: z.number().int() }).optional(),
  optionsUz: z.array(z.string().trim()),
  answerIndex: z.number().int(),
  status: statusSchema.default("PUBLISHED"),
});
export type CmsIqInput = z.input<typeof iqInput>;

/** Store a picture for an IQ question; the returned media path is saved with the question. */
export async function uploadCmsIqImage(form: FormData): Promise<{ ok: true; path: string } | CmsFailure> {
  await requireAdmin();
  const file = form.get("file");
  const path = file instanceof File && file.size <= MAX_UPLOAD_BYTES ? await saveMedia("iq/u", Buffer.from(await file.arrayBuffer())) : null;
  return path ? { ok: true, path } : fail("invalid", "PNG, JPG, WebP, SVG ≤ 2 MB");
}

export async function saveCmsIqItem(input: CmsIqInput, itemId?: string): Promise<CmsResult> {
  const admin = await requireAdmin();
  const parsed = iqInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const i = parsed.data;
  const def = iqItemDef.safeParse({
    id: i.key,
    category: i.category,
    difficulty: i.difficulty,
    prompt: i.promptUz,
    figure: i.figure || undefined,
    image: i.image || undefined,
    options: i.optionsImage ? undefined : i.optionsUz,
    optionsImage: i.optionsImage,
    answer: i.answerIndex,
    status: fileStatus(i.status),
  });
  if (!def.success) return invalid(def.error);

  const clash = await db.iqItem.findUnique({ where: { key: i.key }, select: { id: true } });
  if (clash && clash.id !== itemId) return fail("keyTaken");

  const content = toIqContent(def.data);
  const data = { key: i.key, category: i.category, difficulty: i.difficulty, content, answer: i.answerIndex, status: i.status };
  if (itemId) {
    if (!(await db.iqItem.findUnique({ where: { id: itemId }, select: { id: true } }))) return fail("notFound");
    // The rating stays: it has been calibrated by real answers.
    await db.iqItem.update({ where: { id: itemId }, data });
  } else {
    await db.iqItem.create({ data: { ...data, rating: INITIAL_ITEM_RATING[i.difficulty] } });
  }
  await changed(admin.user.id, itemId ? "cms.iq.update" : "cms.iq.create", { key: i.key });
  return { ok: true };
}

// ─── Status (publish / draft / archive) ─────────────────────────────────────

/** There is no delete for tracks, exercises and IQ items: archive them — learners' history stays intact. */
export async function setCmsStatus(kind: "track" | "exercise" | "iq", targetId: string, status: string): Promise<CmsResult> {
  const admin = await requireAdmin();
  const next = statusSchema.safeParse(status);
  if (!next.success || !["track", "exercise", "iq"].includes(kind)) return fail("invalid");

  const where = { id: targetId };
  const data = { status: next.data };
  const { count } =
    kind === "track"
      ? await db.track.updateMany({ where, data })
      : kind === "exercise"
        ? await db.exercise.updateMany({ where, data })
        : await db.iqItem.updateMany({ where, data });
  if (!count) return fail("notFound");

  await changed(admin.user.id, `cms.${kind}.status`, { id: targetId, status: next.data });
  return { ok: true };
}
