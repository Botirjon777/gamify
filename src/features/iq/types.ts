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
  options: string[];
  secondsLeft: number;
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
