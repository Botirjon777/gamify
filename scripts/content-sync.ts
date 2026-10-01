/**
 * Sync /content/<track>/track.yaml + /content/<track>/<skill>.yaml and /content/iq/items.yaml into the database.
 *   pnpm content:sync            validate + write
 *   pnpm content:sync --check    validate only (CI)
 *
 * Upserts by slug / exercise id, so attempts keep pointing at the same rows.
 * Exercises removed from the files are ARCHIVED, never deleted.
 */
import "dotenv/config";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { skillFile, toDbExercise, trackFile, type ExerciseDef, type TrackDef } from "../src/features/learn/content-schema";
import { INITIAL_ITEM_RATING, iqFile, type IqItemDef, type IqPublicContent } from "../src/features/iq/content-schema";

const CONTENT_DIR = join(process.cwd(), "content");
const checkOnly = process.argv.includes("--check");

type Loaded = { track: TrackDef; exercises: Map<string, ExerciseDef[]> };

function load(): Loaded[] {
  const errors: string[] = [];
  const loaded: Loaded[] = [];
  const skillSlugs = new Set<string>();
  const exerciseIds = new Set<string>();

  for (const dir of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const trackPath = join(CONTENT_DIR, dir.name, "track.yaml");
    if (!existsSync(trackPath)) continue;

    const parsedTrack = trackFile.safeParse(parse(readFileSync(trackPath, "utf8")));
    if (!parsedTrack.success) {
      errors.push(`${trackPath}:\n${parsedTrack.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
      continue;
    }
    const track = parsedTrack.data;
    const exercises = new Map<string, ExerciseDef[]>();

    for (const skill of track.modules.flatMap((m) => m.skills)) {
      if (skillSlugs.has(skill.slug)) errors.push(`duplicate skill slug "${skill.slug}"`);
      skillSlugs.add(skill.slug);

      const file = join(CONTENT_DIR, dir.name, `${skill.slug}.yaml`);
      if (!existsSync(file)) {
        errors.push(`missing ${file}`);
        continue;
      }
      const parsed = skillFile.safeParse(parse(readFileSync(file, "utf8")));
      if (!parsed.success) {
        errors.push(`${file}:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
        continue;
      }
      for (const e of parsed.data.exercises) {
        if (exerciseIds.has(e.id)) errors.push(`duplicate exercise id "${e.id}" in ${file}`);
        exerciseIds.add(e.id);
      }
      exercises.set(skill.slug, parsed.data.exercises);
    }
    loaded.push({ track, exercises });
  }

  if (errors.length) {
    console.error(`✘ Content errors:\n${errors.join("\n")}`);
    process.exit(1);
  }
  return loaded;
}

function loadIq(): IqItemDef[] {
  const file = join(CONTENT_DIR, "iq", "items.yaml");
  if (!existsSync(file)) return [];
  const parsed = iqFile.safeParse(parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.error(`✘ ${file}:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    process.exit(1);
  }
  const ids = new Set<string>();
  for (const item of parsed.data.items) {
    if (ids.has(item.id)) {
      console.error(`✘ duplicate IQ item id "${item.id}"`);
      process.exit(1);
    }
    ids.add(item.id);
  }
  return parsed.data.items;
}

async function syncIq(db: PrismaClient, items: IqItemDef[]) {
  for (const item of items) {
    const content: IqPublicContent = { prompt: item.prompt, figure: item.figure, options: item.options };
    const data = { category: item.category, difficulty: item.difficulty, content, answer: item.answer, status: "PUBLISHED" as const };
    await db.iqItem.upsert({
      where: { key: item.id },
      // Rating is only set on create — afterwards it self-calibrates from real answers.
      create: { key: item.id, rating: INITIAL_ITEM_RATING[item.difficulty], ...data },
      update: data,
    });
  }
  const archived = await db.iqItem.updateMany({
    where: { key: { notIn: items.map((i) => i.id) }, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED" },
  });
  console.log(`✔ iq: ${items.length} items${archived.count ? `, archived ${archived.count}` : ""}`);
}

async function sync(tracks: Loaded[], iqItems: IqItemDef[]) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const seenKeys: string[] = [];

  try {
    for (const { track, exercises } of tracks) {
      await db.$transaction(
        async (tx) => {
          const t = await tx.track.upsert({
            where: { slug: track.slug },
            create: { slug: track.slug, title: track.title, description: track.description, icon: track.icon, order: track.order, category: track.category },
            update: { title: track.title, description: track.description, icon: track.icon, order: track.order, category: track.category, status: "PUBLISHED" },
          });

          for (const [mi, mod] of track.modules.entries()) {
            const m = await tx.module.upsert({
              where: { trackId_slug: { trackId: t.id, slug: mod.slug } },
              create: { trackId: t.id, slug: mod.slug, title: mod.title, order: mi },
              update: { title: mod.title, order: mi },
            });

            for (const [si, skill] of mod.skills.entries()) {
              const s = await tx.skill.upsert({
                where: { slug: skill.slug },
                create: { moduleId: m.id, slug: skill.slug, title: skill.title, description: skill.description, order: si },
                update: { moduleId: m.id, title: skill.title, description: skill.description, order: si },
              });

              for (const [ei, def] of (exercises.get(skill.slug) ?? []).entries()) {
                const data = { ...toDbExercise(def), skillId: s.id, order: ei, status: "PUBLISHED" as const };
                await tx.exercise.upsert({ where: { key: data.key }, create: data, update: data });
                seenKeys.push(data.key);
              }
            }
          }
        },
        { timeout: 60_000 },
      );
      const count = [...exercises.values()].reduce((n, list) => n + list.length, 0);
      console.log(`✔ ${track.slug}: ${track.modules.length} modules, ${exercises.size} skills, ${count} exercises`);
    }

    const archived = await db.exercise.updateMany({
      where: { tenantId: null, key: { notIn: seenKeys }, status: { not: "ARCHIVED" } },
      data: { status: "ARCHIVED" },
    });
    if (archived.count) console.log(`✔ archived ${archived.count} exercises no longer in /content`);

    if (iqItems.length) await syncIq(db, iqItems);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const tracks = load();
  const iqItems = loadIq();
  const total = tracks.reduce((n, t) => n + [...t.exercises.values()].reduce((m, l) => m + l.length, 0), 0);
  console.log(`✔ content valid: ${tracks.length} tracks, ${total} exercises, ${iqItems.length} IQ items`);
  if (!checkOnly) await sync(tracks, iqItems);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
