/**
 * Format of the files in /content, validated by `pnpm content:sync`.
 * Shared by the sync script and the app, so no server-only imports here.
 */
import { z } from "zod";
import type { LocalizedText } from "@/i18n/content";

/** Plain strings are Uzbek: `title: useState` → { uz: "useState" }. */
const localized = z
  // Only known language codes as keys: an unquoted "a: b" in YAML becomes {a: "b"} and must fail, not lose text.
  .union([z.string().min(1), z.partialRecord(z.enum(["uz", "ru", "en"]), z.string().min(1))])
  .transform((v): LocalizedText => (typeof v === "string" ? { uz: v } : v));

const toArray = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
const accepted = z.union([z.string(), z.array(z.string()).min(1)]).transform(toArray);

export const LANGS = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "html",
  "css",
  "cpp",
  "python",
  "csharp",
  "bash",
  "sql",
] as const;
export type CodeLang = (typeof LANGS)[number];

/** Marker for a blank in FILL exercises. */
export const BLANK = "___";

const base = {
  id: z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, digits and -"),
  difficulty: z.number().int().min(1).max(3).default(1),
  xp: z.number().int().positive().optional(),
  prompt: localized,
  explanation: localized.optional(),
  lang: z.enum(LANGS).default("jsx"),
};

const choice = z
  .object({
    ...base,
    type: z.literal("choice"),
    code: z.string().optional(),
    options: z.array(localized).min(2).max(6),
    answer: z.number().int().min(0),
  })
  .refine((e) => e.answer < e.options.length, { message: "answer index out of range", path: ["answer"] });

const output = z.object({
  ...base,
  type: z.literal("output"),
  code: z.string(),
  answer: accepted,
});

const fill = z
  .object({
    ...base,
    type: z.literal("fill"),
    code: z.string(),
    /** One entry per ___ in `code`; each entry is the accepted answer(s) for that blank. */
    answer: z.array(accepted).min(1),
  })
  .refine((e) => e.code.split(BLANK).length - 1 === e.answer.length, {
    message: `number of ${BLANK} blanks must equal number of answers`,
    path: ["answer"],
  });

const order = z.object({
  ...base,
  type: z.literal("order"),
  /** Lines in the CORRECT order; they are shuffled when shown. */
  lines: z.array(z.string()).min(3).max(12),
});

export const exerciseDef = z.union([choice, output, fill, order]);
export type ExerciseDef = z.infer<typeof exerciseDef>;

export const skillFile = z.object({ exercises: z.array(exerciseDef).min(1) });

export const trackFile = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: localized,
  description: localized.optional(),
  icon: z.string().optional(),
  order: z.number().int().default(0),
  modules: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9-]+$/),
        title: localized,
        skills: z
          .array(
            z.object({
              slug: z.string().regex(/^[a-z0-9-]+$/),
              title: localized,
              description: localized.optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});
export type TrackDef = z.infer<typeof trackFile>;

// ─── Stored shapes (Exercise.content = public, Exercise.answer = private) ───

export type PublicContent =
  | { type: "CHOICE"; prompt: LocalizedText; code?: string; lang: CodeLang; options: LocalizedText[] }
  | { type: "OUTPUT"; prompt: LocalizedText; code: string; lang: CodeLang }
  | { type: "FILL"; prompt: LocalizedText; code: string; lang: CodeLang }
  /** Lines are stored sorted (not in the correct order) and shuffled per request. */
  | { type: "ORDER"; prompt: LocalizedText; lines: string[]; lang: CodeLang };

export type PrivateAnswer =
  | { type: "CHOICE"; index: number }
  | { type: "OUTPUT"; accepted: string[] }
  | { type: "FILL"; blanks: string[][] }
  | { type: "ORDER"; lines: string[] };

export type Submission =
  | { type: "CHOICE"; index: number }
  | { type: "OUTPUT"; text: string }
  | { type: "FILL"; blanks: string[] }
  | { type: "ORDER"; lines: string[] };

export const submissionSchema: z.ZodType<Submission> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CHOICE"), index: z.number().int().min(0).max(10) }),
  z.object({ type: z.literal("OUTPUT"), text: z.string().max(500) }),
  z.object({ type: z.literal("FILL"), blanks: z.array(z.string().max(200)).max(20) }),
  z.object({ type: z.literal("ORDER"), lines: z.array(z.string().max(500)).max(20) }),
]);

const XP_BY_DIFFICULTY = { 1: 5, 2: 10, 3: 15 } as Record<number, number>;

/** Content file entry → DB columns. */
export function toDbExercise(def: ExerciseDef) {
  const common = {
    key: def.id,
    difficulty: def.difficulty,
    xp: def.xp ?? XP_BY_DIFFICULTY[def.difficulty],
    explanation: def.explanation ?? undefined,
  };

  switch (def.type) {
    case "choice":
      return {
        ...common,
        type: "CHOICE" as const,
        content: { type: "CHOICE", prompt: def.prompt, code: def.code, lang: def.lang, options: def.options } satisfies PublicContent,
        answer: { type: "CHOICE", index: def.answer } satisfies PrivateAnswer,
      };
    case "output":
      return {
        ...common,
        type: "OUTPUT" as const,
        content: { type: "OUTPUT", prompt: def.prompt, code: def.code, lang: def.lang } satisfies PublicContent,
        answer: { type: "OUTPUT", accepted: def.answer } satisfies PrivateAnswer,
      };
    case "fill":
      return {
        ...common,
        type: "FILL" as const,
        content: { type: "FILL", prompt: def.prompt, code: def.code, lang: def.lang } satisfies PublicContent,
        answer: { type: "FILL", blanks: def.answer } satisfies PrivateAnswer,
      };
    case "order":
      return {
        ...common,
        type: "ORDER" as const,
        content: {
          type: "ORDER",
          prompt: def.prompt,
          lines: [...def.lines].sort(),
          lang: def.lang,
        } satisfies PublicContent,
        answer: { type: "ORDER", lines: def.lines } satisfies PrivateAnswer,
      };
  }
}
