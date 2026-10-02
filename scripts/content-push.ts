/**
 * /content → database. The database is the source of truth (see content:pull); this uploads what was edited
 * in the files: /content/<track>/track.yaml + /content/<track>/<skill>.yaml and /content/iq/items.yaml.
 *   pnpm content:push              validate, show what differs, write it to the local dev database
 *   pnpm content:push --dry-run    only show what would change
 *   pnpm content:push --prune      also archive exercises / IQ items / courses that are not in the files
 *   pnpm content:push --prod --yes the same against production (without --yes it is a dry run)
 *   pnpm content:check             validate the files only (CI)
 *
 * Upserts by slug / exercise id, so attempts keep pointing at the same rows. Rows that are equal are not
 * touched. Content that exists only in the database (made in the admin panel after the last pull) is left
 * alone and reported — run content:pull first if you want it in the files, or --prune to archive it.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";
import { skillFile, toDbExercise, trackFile, type ExerciseDef, type TrackDef } from "../src/features/learn/content-schema";
import { INITIAL_ITEM_RATING, iqFile, type IqItemDef, type IqPublicContent } from "../src/features/iq/content-schema";
import { CONTENT_DIR, connect } from "./lib/content-db";

const flag = (name: string) => process.argv.includes(`--${name}`);
const checkOnly = flag("check");
const prod = flag("prod");
const prune = flag("prune");
// Production is only written with an explicit --yes.
const dryRun = flag("dry-run") || (prod && !flag("yes"));

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

// ─── Comparing files with the database ──────────────────────────────────────

/** Same data? Key order and null / undefined / missing don't matter. */
const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([, x]) => x !== undefined && x !== null)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([k, x]) => [k, canon(x)]),
        )
      : v;
/** A missing optional JSON column is written as SQL NULL. */
const orNull = <T>(value: T | null | undefined) => value ?? Prisma.DbNull;

const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

class Changes {
  created: string[] = [];
  updated: string[] = [];
  constructor(readonly label: string) {}
  /** Decide what to do with one row; returns whether it has to be written. */
  see(name: string, existing: unknown, wanted: unknown) {
    if (existing === undefined) this.created.push(name);
    else if (!same(existing, wanted)) this.updated.push(name);
    else return false;
    return true;
  }
  print() {
    const list = (items: string[]) => (items.length ? `: ${items.slice(0, 12).join(", ")}${items.length > 12 ? ` … +${items.length - 12}` : ""}` : "");
    if (this.created.length) console.log(`  + ${this.created.length} new ${this.label}${list(this.created)}`);
    if (this.updated.length) console.log(`  ~ ${this.updated.length} changed ${this.label}${list(this.updated)}`);
  }
}

async function push(db: PrismaClient, tracks: Loaded[], iqItems: IqItemDef[]) {
  const [dbTracks, dbExercises, dbIq] = await Promise.all([
    db.track.findMany({ where: { tenantId: null }, include: { modules: { include: { skills: true } } } }),
    db.exercise.findMany({ where: { tenantId: null }, include: { skill: { select: { slug: true } } } }),
    db.iqItem.findMany(),
  ]);
  const trackBySlug = new Map(dbTracks.map((t) => [t.slug, t]));
  const dbSkills = dbTracks.flatMap((t) => t.modules.flatMap((m) => m.skills.map((s) => ({ ...s, modulePath: `${t.slug}/${m.slug}` }))));
  const skillBySlug = new Map(dbSkills.map((s) => [s.slug, s]));
  const exerciseByKey = new Map(dbExercises.map((e) => [e.key, e]));
  const iqByKey = new Map(dbIq.map((i) => [i.key, i]));

  const changes = {
    tracks: new Changes("courses"),
    modules: new Changes("modules"),
    skills: new Changes("skills"),
    exercises: new Changes("exercises"),
    iq: new Changes("IQ items"),
  };
  const fileExerciseKeys = new Set<string>();
  const fileSkillSlugs = new Set<string>();

  for (const { track, exercises } of tracks) {
    const existingTrack = trackBySlug.get(track.slug);
    const trackData = {
      title: track.title,
      description: track.description ?? null,
      icon: track.icon ?? null,
      order: track.order,
      subject: track.subject,
      category: track.category ?? null,
      status: track.status,
    };
    const pick = existingTrack && Object.fromEntries(Object.keys(trackData).map((k) => [k, existingTrack[k as keyof typeof trackData]]));
    const writeTrack = changes.tracks.see(track.slug, pick, trackData);

    // What has to be written below this track — decided before opening a transaction.
    const work = track.modules.map((mod, mi) => {
      const path = `${track.slug}/${mod.slug}`;
      const existingModule = existingTrack?.modules.find((m) => m.slug === mod.slug);
      const moduleData = { title: mod.title, order: mi };
      const writeModule = changes.modules.see(path, existingModule && { title: existingModule.title, order: existingModule.order }, moduleData);

      const skills = mod.skills.map((skill, si) => {
        fileSkillSlugs.add(skill.slug);
        const existingSkill = skillBySlug.get(skill.slug);
        const skillData = { title: skill.title, description: skill.description ?? null, order: si };
        const writeSkill = changes.skills.see(
          skill.slug,
          existingSkill && { modulePath: existingSkill.modulePath, title: existingSkill.title, description: existingSkill.description, order: existingSkill.order },
          { modulePath: path, ...skillData },
        );

        const rows = (exercises.get(skill.slug) ?? []).map((def, ei) => {
          const data = { ...toDbExercise(def), order: ei };
          fileExerciseKeys.add(data.key);
          const existing = exerciseByKey.get(data.key);
          const write = changes.exercises.see(
            data.key,
            existing && {
              skill: existing.skill.slug,
              type: existing.type,
              status: existing.status,
              difficulty: existing.difficulty,
              xp: existing.xp,
              content: existing.content,
              answer: existing.answer,
              explanation: existing.explanation,
              order: existing.order,
            },
            { skill: skill.slug, ...data, key: undefined },
          );
          return { data, write };
        });
        return { skill, skillData, writeSkill, rows };
      });
      return { mod, moduleData, writeModule, skills };
    });

    const dirty = writeTrack || work.some((m) => m.writeModule || m.skills.some((s) => s.writeSkill || s.rows.some((r) => r.write)));
    if (dryRun || !dirty) continue;

    await db.$transaction(
      async (tx) => {
        const trackRow = { ...trackData, description: orNull(track.description) };
        const t = await tx.track.upsert({ where: { slug: track.slug }, create: { slug: track.slug, ...trackRow }, update: trackRow });
        for (const { mod, moduleData, skills } of work) {
          const m = await tx.module.upsert({
            where: { trackId_slug: { trackId: t.id, slug: mod.slug } },
            create: { trackId: t.id, slug: mod.slug, ...moduleData },
            update: moduleData,
          });
          for (const { skill, skillData, rows } of skills) {
            const skillRow = { ...skillData, moduleId: m.id, description: orNull(skill.description) };
            const s = await tx.skill.upsert({ where: { slug: skill.slug }, create: { slug: skill.slug, ...skillRow }, update: skillRow });
            for (const { data, write } of rows) {
              if (write) await tx.exercise.upsert({ where: { key: data.key }, create: { ...data, skillId: s.id }, update: { ...data, skillId: s.id } });
            }
          }
        }
      },
      { timeout: 120_000 },
    );
  }

  const fileIqKeys = new Set(iqItems.map((i) => i.id));
  for (const item of iqItems) {
    const content: IqPublicContent = { prompt: item.prompt, figure: item.figure, options: item.options };
    const data = { category: item.category, difficulty: item.difficulty, content, answer: item.answer, status: item.status };
    const existing = iqByKey.get(item.id);
    const write = changes.iq.see(
      item.id,
      existing && { category: existing.category, difficulty: existing.difficulty, content: existing.content, answer: existing.answer, status: existing.status },
      data,
    );
    if (write && !dryRun) {
      await db.iqItem.upsert({
        where: { key: item.id },
        // Rating is only set on create — afterwards it self-calibrates from real answers.
        create: { key: item.id, rating: INITIAL_ITEM_RATING[item.difficulty], ...data },
        update: data,
      });
    }
  }

  // ─── Report ────────────────────────────────────────────────────────────────
  const all = Object.values(changes);
  if (all.every((c) => !c.created.length && !c.updated.length)) console.log("  nothing to write — the database already matches the files");
  else for (const c of all) c.print();

  // Only in the database: made in the admin panel after the last pull, or removed from the files.
  const live = (status: string) => status !== "ARCHIVED";
  const orphanExercises = dbExercises.filter((e) => live(e.status) && !fileExerciseKeys.has(e.key));
  const orphanIq = dbIq.filter((i) => live(i.status) && !fileIqKeys.has(i.key));
  const fileTrackSlugs = new Set(tracks.map((t) => t.track.slug));
  const orphanTracks = dbTracks.filter((t) => live(t.status) && !fileTrackSlugs.has(t.slug));
  const orphanSkills = dbSkills.filter((s) => !fileSkillSlugs.has(s.slug) && !orphanTracks.some((t) => s.modulePath.startsWith(`${t.slug}/`)));
  const orphans = orphanExercises.length + orphanIq.length + orphanTracks.length;

  if (orphans || orphanSkills.length) {
    const names = (items: string[]) => `${items.slice(0, 8).join(", ")}${items.length > 8 ? ` … +${items.length - 8}` : ""}`;
    console.log(`\n  Only in the database (not in /content):`);
    if (orphanTracks.length) console.log(`    ${orphanTracks.length} courses: ${names(orphanTracks.map((t) => t.slug))}`);
    if (orphanSkills.length) console.log(`    ${orphanSkills.length} skills: ${names(orphanSkills.map((s) => s.slug))}`);
    if (orphanExercises.length) console.log(`    ${orphanExercises.length} exercises: ${names(orphanExercises.map((e) => e.key))}`);
    if (orphanIq.length) console.log(`    ${orphanIq.length} IQ items: ${names(orphanIq.map((i) => i.key))}`);
  }

  if (prune && orphans) {
    if (!dryRun) {
      await db.exercise.updateMany({ where: { id: { in: orphanExercises.map((e) => e.id) } }, data: { status: "ARCHIVED" } });
      await db.iqItem.updateMany({ where: { id: { in: orphanIq.map((i) => i.id) } }, data: { status: "ARCHIVED" } });
      await db.track.updateMany({ where: { id: { in: orphanTracks.map((t) => t.id) } }, data: { status: "ARCHIVED" } });
    }
    console.log(`  --prune: ${dryRun ? "would archive" : "archived"} ${orphanTracks.length} courses, ${orphanExercises.length} exercises, ${orphanIq.length} IQ items`);
  } else if (orphans) {
    console.log("    Left untouched. `pnpm content:pull` brings them into the files; `--prune` archives them.");
  }

  if (dryRun) console.log(`\nDry run — nothing was written.${prod && !flag("yes") ? " Add --yes to write to production." : ""}`);
  else console.log("\n✔ Done. The running app picks changes up within 5 minutes (catalog cache).");
}

async function main() {
  const tracks = load();
  const iqItems = loadIq();
  const total = tracks.reduce((n, t) => n + [...t.exercises.values()].reduce((m, l) => m + l.length, 0), 0);
  console.log(`✔ content valid: ${tracks.length} tracks, ${total} exercises, ${iqItems.length} IQ items`);
  if (checkOnly) return;

  const { db, target } = connect(prod);
  console.log(`${dryRun ? "Comparing with" : "Pushing to"} the ${target}`);
  try {
    await push(db, tracks, iqItems);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
