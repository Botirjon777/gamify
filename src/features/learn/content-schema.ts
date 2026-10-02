/**
 * Format of the files in /content, validated by `pnpm content:sync`.
 * Shared by the sync script and the app, so no server-only imports here.
 */
import { CATEGORIES } from "./categories";
import { SUBJECT_CATEGORIES, SUBJECTS } from "./subjects";
import { z } from "zod";
import { parsePlacement, SQUARE, UCI_MOVE, type BoardSpec } from "@/features/chess/board";
import { resolveMoves } from "@/features/chess/moves";
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
  /** Not code: prose, formulas, chess moves. Shown as normal wrapping text; answers are checked leniently. */
  "text",
] as const;
export type CodeLang = (typeof LANGS)[number];

/** Plain-text exercise (not code)? Decides how it is rendered and how typed answers are compared. */
export const isProse = (content: { lang: CodeLang }) => content.lang === "text";

/**
 * Drafts live in the database and in the files, but learners don't see them.
 * (Archived content is not in the files at all: `content:pull` leaves it out.)
 */
const status = z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED");

/** Marker for a blank in FILL exercises. */
export const BLANK = "___";

/**
 * A chess diagram: a FEN (the piece placement is enough for a picture), or `{ fen, marks, flip }` to highlight
 * squares or show the board from Black's side.
 */
const board = z
  .union([
    z.string().min(1),
    z.object({ fen: z.string().min(1), marks: z.array(z.string().regex(SQUARE)).min(1).max(32).optional(), flip: z.boolean().optional() }),
  ])
  .transform((v): BoardSpec => (typeof v === "string" ? { fen: v.trim() } : { ...v, fen: v.fen.trim() }))
  .refine((b) => parsePlacement(b.fen) !== null, { message: "not a FEN (8 ranks of 8 squares, pieces KQRBNP / kqrbnp)" });

const base = {
  id: z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, digits and -"),
  difficulty: z.number().int().min(1).max(3).default(1),
  xp: z.number().int().positive().optional(),
  status,
  prompt: localized,
  explanation: localized.optional(),
  lang: z.enum(LANGS).default("jsx"),
  /** Shown above the question (chess). */
  board: board.optional(),
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
    /**
     * Word bank: wrong words to mix with the right ones. When present the blanks are filled by tapping
     * words instead of typing — use it for prose, where the exact word can't be guessed.
     */
    bank: z.array(z.string().min(1)).min(1).max(8).optional(),
  })
  .refine((e) => e.code.split(BLANK).length - 1 === e.answer.length, {
    message: `number of ${BLANK} blanks must equal number of answers`,
    path: ["answer"],
  })
  .refine((e) => !e.bank?.some((w) => e.answer.flat().includes(w)), {
    message: "a word-bank distractor is also an accepted answer",
    path: ["bank"],
  });

const order = z.object({
  ...base,
  type: z.literal("order"),
  /** Lines in the CORRECT order; they are shuffled when shown. */
  lines: z.array(z.string()).min(3).max(12),
});

/** Chess: make the move on the board. The side to move in the FEN is the learner's side. */
const move = z
  .object({
    ...base,
    type: z.literal("move"),
    /** A full, legal FEN. */
    board,
    /** The right move(s) as written in chess books: "Qh7#", "Nf3", "exd5", "O-O", "e8=Q". Any mate is accepted when one of them is mate. */
    answer: accepted,
  })
  .superRefine((e, ctx) => {
    const resolved = resolveMoves(e.board.fen, e.answer);
    if ("error" in resolved) ctx.addIssue({ code: "custom", message: resolved.error, path: ["answer"] });
  });

export const exerciseDef = z.union([choice, output, fill, order, move]);
export type ExerciseDef = z.infer<typeof exerciseDef>;

/** A skill may have no exercises yet (created in the admin panel, still being written) — learners don't see it. */
export const skillFile = z.object({ exercises: z.array(exerciseDef) });

/** /learn/c/… and /learn/s/… are the category and subject pages, so a track can't live at /learn/c or /learn/s. */
const RESERVED_TRACK_SLUGS = ["c", "s"];

export const trackFile = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .refine((s) => !RESERVED_TRACK_SLUGS.includes(s), { message: "this slug is reserved for a page URL" }),
    title: localized,
    description: localized.optional(),
    icon: z.string().optional(),
    order: z.number().int().default(0),
    status,
    subject: z.enum(SUBJECTS),
    /** Only for subjects that are split into categories (Programming). */
    category: z.enum(CATEGORIES).optional(),
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
            .default([]),
        }),
      )
      .default([]),
  })
  .refine(
    (t) => {
      const allowed = SUBJECT_CATEGORIES[t.subject];
      return allowed.length ? !!t.category && allowed.includes(t.category) : !t.category;
    },
    { message: "must be one of the subject's categories, and left out when the subject has none", path: ["category"] },
  );
export type TrackDef = z.infer<typeof trackFile>;

// ─── Stored shapes (Exercise.content = public, Exercise.answer = private) ───

/** `board`: a chess diagram shown above the question. */
export type PublicContent =
  | { type: "CHOICE"; prompt: LocalizedText; code?: string; lang: CodeLang; options: LocalizedText[]; board?: BoardSpec }
  | { type: "OUTPUT"; prompt: LocalizedText; code: string; lang: CodeLang; board?: BoardSpec }
  /** `bank`: right words (first accepted answer of each blank) + distractors, stored sorted, shuffled per request. */
  | { type: "FILL"; prompt: LocalizedText; code: string; lang: CodeLang; bank?: string[]; board?: BoardSpec }
  /** Lines are stored sorted (not in the correct order) and shuffled per request. */
  | { type: "ORDER"; prompt: LocalizedText; lines: string[]; lang: CodeLang; board?: BoardSpec }
  /** Chess: the learner makes a move on `board` (a full FEN). */
  | { type: "MOVE"; prompt: LocalizedText; lang: CodeLang; board: BoardSpec };

export type PrivateAnswer =
  | { type: "CHOICE"; index: number }
  | { type: "OUTPUT"; accepted: string[] }
  | { type: "FILL"; blanks: string[][] }
  | { type: "ORDER"; lines: string[] }
  /** `moves`: every accepted move as from-to squares ("h5h7", "e7e8q"); `san`: the author's moves, as written in books. */
  | { type: "MOVE"; moves: string[]; san: string[] };

export type Submission =
  | { type: "CHOICE"; index: number }
  | { type: "OUTPUT"; text: string }
  | { type: "FILL"; blanks: string[] }
  | { type: "ORDER"; lines: string[] }
  | { type: "MOVE"; move: string };

export const submissionSchema: z.ZodType<Submission> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CHOICE"), index: z.number().int().min(0).max(10) }),
  z.object({ type: z.literal("OUTPUT"), text: z.string().max(500) }),
  z.object({ type: z.literal("FILL"), blanks: z.array(z.string().max(200)).max(20) }),
  z.object({ type: z.literal("ORDER"), lines: z.array(z.string().max(500)).max(20) }),
  z.object({ type: z.literal("MOVE"), move: z.string().regex(UCI_MOVE) }),
]);

export const XP_BY_DIFFICULTY = { 1: 5, 2: 10, 3: 15 } as Record<number, number>;

/** Content file entry → DB columns. */
export function toDbExercise(def: ExerciseDef) {
  const common = {
    key: def.id,
    status: def.status,
    difficulty: def.difficulty,
    xp: def.xp ?? XP_BY_DIFFICULTY[def.difficulty],
    explanation: def.explanation ?? undefined,
  };
  const board = def.board && { board: def.board };

  switch (def.type) {
    case "choice":
      return {
        ...common,
        type: "CHOICE" as const,
        content: { type: "CHOICE", prompt: def.prompt, code: def.code, lang: def.lang, options: def.options, ...board } satisfies PublicContent,
        answer: { type: "CHOICE", index: def.answer } satisfies PrivateAnswer,
      };
    case "output":
      return {
        ...common,
        type: "OUTPUT" as const,
        content: { type: "OUTPUT", prompt: def.prompt, code: def.code, lang: def.lang, ...board } satisfies PublicContent,
        answer: { type: "OUTPUT", accepted: def.answer } satisfies PrivateAnswer,
      };
    case "fill":
      return {
        ...common,
        type: "FILL" as const,
        content: {
          type: "FILL",
          prompt: def.prompt,
          code: def.code,
          lang: def.lang,
          bank: def.bank && [...def.answer.map((a) => a[0]), ...def.bank].sort(),
          ...board,
        } satisfies PublicContent,
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
          ...board,
        } satisfies PublicContent,
        answer: { type: "ORDER", lines: def.lines } satisfies PrivateAnswer,
      };
    case "move": {
      const resolved = resolveMoves(def.board.fen, def.answer);
      if ("error" in resolved) throw new Error(`${def.id}: ${resolved.error}`); // the schema has already checked this
      return {
        ...common,
        type: "MOVE" as const,
        content: { type: "MOVE", prompt: def.prompt, lang: def.lang, board: def.board } satisfies PublicContent,
        answer: { type: "MOVE", ...resolved } satisfies PrivateAnswer,
      };
    }
  }
}
