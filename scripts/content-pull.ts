/**
 * Database → /content. The database is the source of truth (content is edited in the admin panel);
 * this writes it to the YAML files so it can be reviewed, versioned in git and edited in bulk.
 *   pnpm content:pull           from the local dev database
 *   pnpm content:pull --prod    from production
 *
 * Writes every global, non-archived track (drafts included; modules without skills are skipped) and IQ item. Files and course folders that
 * no longer exist in the database are removed, so afterwards /content mirrors the database exactly.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { fileText, toFileExercise } from "../src/features/learn/content-export";
import type { LocalizedText } from "../src/i18n/content";
import type { IqPublicContent } from "../src/features/iq/content-schema";
import { CONTENT_DIR, connect } from "./lib/content-db";

const yaml = (value: unknown) => stringify(value, { lineWidth: 0 });
const text = (value: unknown) => fileText(value as LocalizedText | null);
const draft = (status: string) => (status === "DRAFT" ? { status: "DRAFT" } : {});

const IQ_HEADER = `# Zukko IQ — savollar banki.
# difficulty 1–5 faqat boshlangʻich reytingni belgilaydi; keyin reyting javoblar asosida oʻzi kalibrlanadi.
# answer — toʻgʻri variant indeksi (0 dan boshlanadi). Javoblar hech qachon brauzerga yuborilmaydi.
`;

async function main() {
  const { db, target } = connect(process.argv.includes("--prod"));
  console.log(`Pulling content from the ${target}`);
  try {
    const tracks = await db.track.findMany({
      where: { tenantId: null, status: { not: "ARCHIVED" } },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
      include: {
        modules: {
          orderBy: [{ order: "asc" }, { slug: "asc" }],
          include: {
            skills: {
              orderBy: [{ order: "asc" }, { slug: "asc" }],
              include: { exercises: { where: { tenantId: null, status: { not: "ARCHIVED" } }, orderBy: [{ order: "asc" }, { key: "asc" }] } },
            },
          },
        },
      },
    });

    let exercises = 0;
    for (const row of tracks) {
      // A module without skills has nothing to show (often a leftover after its skills moved elsewhere).
      const track = { ...row, modules: row.modules.filter((m) => m.skills.length > 0) };
      const dir = join(CONTENT_DIR, track.slug);
      mkdirSync(dir, { recursive: true });
      const skills = track.modules.flatMap((m) => m.skills);

      const description = text(track.description);
      writeFileSync(
        join(dir, "track.yaml"),
        yaml({
          slug: track.slug,
          title: text(track.title),
          ...(description !== undefined && { description }),
          ...(track.icon && { icon: track.icon }),
          order: track.order,
          ...draft(track.status),
          subject: track.subject,
          ...(track.category && { category: track.category }),
          modules: track.modules.map((m) => ({
            slug: m.slug,
            title: text(m.title),
            skills: m.skills.map((s) => {
              const about = text(s.description);
              return { slug: s.slug, title: text(s.title), ...(about !== undefined && { description: about }) };
            }),
          })),
        }),
      );

      for (const skill of skills) {
        writeFileSync(join(dir, `${skill.slug}.yaml`), yaml({ exercises: skill.exercises.map(toFileExercise) }));
        exercises += skill.exercises.length;
      }

      // Skill files of skills that were deleted / moved to another course.
      const keep = new Set(["track.yaml", ...skills.map((s) => `${s.slug}.yaml`)]);
      for (const file of readdirSync(dir)) {
        if (file.endsWith(".yaml") && !keep.has(file)) {
          rmSync(join(dir, file));
          console.log(`  removed ${track.slug}/${file} (not in the database)`);
        }
      }
      console.log(`✔ ${track.slug}: ${track.modules.length} modules, ${skills.length} skills, ${skills.reduce((n, s) => n + s.exercises.length, 0)} exercises`);
    }

    // Course folders whose track is gone (archived or deleted). Only folders that are courses (have a track.yaml).
    const slugs = new Set(tracks.map((t) => t.slug));
    for (const entry of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && !slugs.has(entry.name) && existsSync(join(CONTENT_DIR, entry.name, "track.yaml"))) {
        rmSync(join(CONTENT_DIR, entry.name), { recursive: true });
        console.log(`  removed ${entry.name}/ (course is archived or deleted in the database)`);
      }
    }

    const items = await db.iqItem.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: [{ difficulty: "asc" }, { key: "asc" }] });
    mkdirSync(join(CONTENT_DIR, "iq"), { recursive: true });
    writeFileSync(
      join(CONTENT_DIR, "iq", "items.yaml"),
      IQ_HEADER +
        yaml({
          items: items.map((item) => {
            const content = item.content as IqPublicContent;
            return {
              id: item.key,
              category: item.category,
              difficulty: item.difficulty,
              ...draft(item.status),
              prompt: text(content.prompt),
              ...(content.figure && { figure: content.figure }),
              options: content.options.map(text),
              answer: item.answer,
            };
          }),
        }),
    );
    console.log(`✔ iq: ${items.length} items`);
    console.log(`Done: ${tracks.length} courses, ${exercises} exercises, ${items.length} IQ items written to /content`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
