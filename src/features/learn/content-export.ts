/**
 * Database rows → entries of the files in /content (the inverse of toDbExercise), used by `pnpm content:pull`.
 * Shared with tests, so no server-only imports here.
 */
import type { LocalizedText } from "@/i18n/content";
import { XP_BY_DIFFICULTY, type PrivateAnswer, type PublicContent } from "./content-schema";

/** `{ uz: "…" }` → `"…"`: the files keep Uzbek-only text as a plain string. */
export function fileText(text: LocalizedText | null | undefined): string | LocalizedText | undefined {
  if (!text) return undefined;
  const keys = Object.keys(text);
  if (!keys.length) return undefined;
  return keys.length === 1 && keys[0] === "uz" ? text.uz : text;
}

/** One accepted answer is written as a plain value, several as a list. */
const oneOrMany = (values: string[]) => (values.length === 1 ? values[0] : values);

export interface StoredExercise {
  key: string;
  difficulty: number;
  xp: number;
  status: string;
  content: unknown;
  answer: unknown;
  explanation: unknown;
}

/** Key order is the order in the file: identity first, then the question, then the answer. */
export function toFileExercise(row: StoredExercise): Record<string, unknown> {
  const content = row.content as PublicContent;
  const answer = row.answer as PrivateAnswer;
  const head = {
    id: row.key,
    type: content.type.toLowerCase(),
    difficulty: row.difficulty,
    ...(row.xp !== XP_BY_DIFFICULTY[row.difficulty] && { xp: row.xp }),
    ...(row.status === "DRAFT" && { status: "DRAFT" }),
    lang: content.lang,
    prompt: fileText(content.prompt),
  };
  const explanation = fileText(row.explanation as LocalizedText | null);
  const tail = explanation === undefined ? {} : { explanation };

  if (content.type === "CHOICE" && answer.type === "CHOICE") {
    return { ...head, ...(content.code && { code: content.code }), options: content.options.map(fileText), answer: answer.index, ...tail };
  }
  if (content.type === "OUTPUT" && answer.type === "OUTPUT") {
    return { ...head, code: content.code, answer: oneOrMany(answer.accepted), ...tail };
  }
  if (content.type === "FILL" && answer.type === "FILL") {
    // The stored bank = the right words + the distractors; the file lists only the distractors.
    let distractors: string[] | undefined;
    if (content.bank) {
      distractors = [...content.bank];
      for (const blank of answer.blanks) {
        const at = distractors.indexOf(blank[0]);
        if (at >= 0) distractors.splice(at, 1);
      }
    }
    return { ...head, code: content.code, answer: answer.blanks.map(oneOrMany), ...(distractors?.length && { bank: distractors }), ...tail };
  }
  if (content.type === "ORDER" && answer.type === "ORDER") {
    return { ...head, lines: answer.lines, ...tail };
  }
  throw new Error(`exercise ${row.key}: content is ${content.type} but the answer is ${answer.type}`);
}
