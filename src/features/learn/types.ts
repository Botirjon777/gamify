import type { CodeLang } from "./content-schema";
import type { Reveal } from "./check";

/** What the browser gets for an exercise — never includes the answer. */
export type ClientExercise = {
  id: string;
  difficulty: number;
  xp: number;
  prompt: string;
  lang: CodeLang;
} & (
  | { type: "CHOICE"; codeHtml?: string; options: string[] }
  | { type: "OUTPUT"; codeHtml: string }
  /** Code split on the blanks: parts.length = blanks + 1. Rendered as plain monospace with inputs. */
  | { type: "FILL"; parts: string[] }
  /** Shuffled lines; `key` is only for React lists. */
  | { type: "ORDER"; lines: { key: string; text: string }[] }
);

export type SubmitResult = {
  correct: boolean;
  reveal: Reveal;
  explanation: string | null;
  xp: number;
  firstSolve: boolean;
  mastery: number;
  masteryBefore: number;
  level: number;
  leveledUp: boolean;
};
