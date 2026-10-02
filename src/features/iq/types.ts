import type { IqCheer } from "./cheer";

export type IqKind = "PLACEMENT" | "DAILY";

export const IQ_QUESTIONS: Record<IqKind, number> = { PLACEMENT: 12, DAILY: 5 };
export const IQ_SECONDS_PER_QUESTION = 60;

/** A question as the browser sees it — no answer. */
export interface IqQuestion {
  itemId: string;
  number: number;
  total: number;
  prompt: string;
  figure?: string;
  /** Picture of the question (URL). */
  image?: string;
  options: string[];
  /** The answers as one picture: a grid of cells, one per option (URL). */
  optionsImage?: { src: string; columns: number; rows: number };
  secondsLeft: number;
  /** Shown before this question: a word of encouragement (only right after the previous answer). */
  cheer?: IqCheer;
}

export interface IqResult {
  kind: IqKind;
  iq: number;
  /** IQ before this test (null for placement). */
  iqBefore: number | null;
  correct: number;
  total: number;
  percentile: number;
  rank: number | null;
  xp: number;
}

export type IqState =
  | { status: "ACTIVE"; sessionId: string; kind: IqKind; question: IqQuestion }
  | { status: "FINISHED"; result: IqResult };
