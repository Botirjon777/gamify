/**
 * Report EVERY content problem at once (content:check stops at the first one):
 * YAML syntax, schema, duplicate ids/slugs, unknown icons / code languages, missing skill files,
 * and whether each exercise accepts its own correct answer.
 *   pnpm content:lint
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument, visit } from "yaml";
import { skillFile, toDbExercise, trackFile, LANGS, type PrivateAnswer, type Submission } from "../src/features/learn/content-schema";
import { iqFile } from "../src/features/iq/content-schema";
import { checkAnswer } from "../src/features/learn/check";

const ROOT = join(process.cwd(), "content");
const iconSource = readFileSync(join(process.cwd(), "src/components/icon.tsx"), "utf8");
const knownIcons = new Set([...iconSource.matchAll(/^\s+"?([a-z-]+)"?: [A-Z]\w+,$/gm)].map((m) => m[1]));

const problems: string[] = [];
const add = (file: string, msg: string) => problems.push(`${file.replace(process.cwd() + "\\", "").replace(/\\/g, "/")}: ${msg}`);

function load(file: string): unknown {
  const source = readFileSync(file, "utf8");
  const doc = parseDocument(source, { prettyErrors: true });
  for (const e of doc.errors) add(file, `YAML line ${e.linePos?.[0]?.line}: ${e.message.split("\n")[0]}`);
  // An unquoted " #" starts a YAML comment and the rest of the text silently disappears.
  // Content files don't put comments after values, so any trailing comment on a scalar is a bug.
  visit(doc, {
    Scalar(_key, node) {
      if (node.comment && node.range) {
        const line = source.slice(0, node.range[0]).split("\n").length;
        add(file, `line ${line}: text "${String(node.value).slice(0, 40)}" is cut off by " #" — quote the value`);
      }
    },
  });
  return doc.errors.length ? undefined : doc.toJS();
}

const exerciseIds = new Map<string, string>();
const skillSlugs = new Map<string, string>();
let exercises = 0;

for (const dir of readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  if (dir.name === "iq") continue;
  const trackPath = join(ROOT, dir.name, "track.yaml");
  if (!existsSync(trackPath)) {
    add(join(ROOT, dir.name), "missing track.yaml");
    continue;
  }
  const raw = load(trackPath);
  if (raw === undefined) continue;
  const track = trackFile.safeParse(raw);
  if (!track.success) {
    for (const i of track.error.issues) add(trackPath, `${i.path.join(".")}: ${i.message}`);
    continue;
  }
  if (track.data.icon && !knownIcons.has(track.data.icon)) add(trackPath, `icon "${track.data.icon}" is not in src/components/icon.tsx`);

  const declared = new Set<string>();
  for (const skill of track.data.modules.flatMap((m) => m.skills)) {
    declared.add(`${skill.slug}.yaml`);
    if (skillSlugs.has(skill.slug)) add(trackPath, `skill slug "${skill.slug}" also used in ${skillSlugs.get(skill.slug)}`);
    skillSlugs.set(skill.slug, dir.name);

    const file = join(ROOT, dir.name, `${skill.slug}.yaml`);
    if (!existsSync(file)) {
      add(trackPath, `skill "${skill.slug}" has no file ${skill.slug}.yaml`);
      continue;
    }
    const data = load(file);
    if (data === undefined) continue;
    const parsed = skillFile.safeParse(data);
    if (!parsed.success) {
      for (const i of parsed.error.issues.slice(0, 10)) add(file, `${i.path.join(".")}: ${i.message}`);
      continue;
    }
    for (const def of parsed.data.exercises) {
      exercises++;
      if (exerciseIds.has(def.id)) add(file, `duplicate exercise id "${def.id}" (also in ${exerciseIds.get(def.id)})`);
      exerciseIds.set(def.id, file);
      if (!(LANGS as readonly string[]).includes(def.lang)) add(file, `${def.id}: unknown lang ${def.lang}`);
      const db = toDbExercise(def);
      const a = db.answer as PrivateAnswer;
      const submission: Submission =
        a.type === "CHOICE"
          ? { type: "CHOICE", index: a.index }
          : a.type === "OUTPUT"
            ? { type: "OUTPUT", text: a.accepted[0] }
            : a.type === "FILL"
              ? { type: "FILL", blanks: a.blanks.map((b) => b[0]) }
              : { type: "ORDER", lines: a.lines };
      if (!checkAnswer(a, submission, def.lang === "text").correct) add(file, `${def.id}: its own answer is not accepted`);
      if (def.type === "choice" && new Set(def.options.map((o) => o.uz)).size !== def.options.length) add(file, `${def.id}: duplicate options`);
      if (def.type === "order" && new Set(def.lines).size === 1) add(file, `${def.id}: all lines identical`);
    }
  }
  for (const f of readdirSync(join(ROOT, dir.name))) {
    if (f.endsWith(".yaml") && f !== "track.yaml" && !declared.has(f)) add(join(ROOT, dir.name, f), "file is not listed as a skill in track.yaml (it would be ignored)");
  }
}

const iq = load(join(ROOT, "iq", "items.yaml"));
if (iq !== undefined) {
  const r = iqFile.safeParse(iq);
  if (!r.success) for (const i of r.error.issues) add(join(ROOT, "iq/items.yaml"), `${i.path.join(".")}: ${i.message}`);
}

console.log(`checked ${exercises} exercises in ${skillSlugs.size} skills`);
if (problems.length) {
  console.log(`\n✘ ${problems.length} problem(s):\n` + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log("✔ no problems");
