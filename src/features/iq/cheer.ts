/**
 * Encouragement between questions: after every few answers the test pauses for a moment and says how it is going.
 * "Faster than most" is only said when it is true — the person's pace against the usual time per answer.
 */
export const IQ_CHEER_EVERY = 3;
/** The next question's clock starts this much later, so reading the message costs no time. */
export const IQ_CHEER_PAUSE_MS = 6_000;
/** Used until enough answers have been recorded to know the real usual time. */
export const DEFAULT_TYPICAL_ANSWER_MS = 25_000;

export interface IqCheer {
  stage: "start" | "half" | "almost";
  /** Answering faster than people usually do. */
  fast: boolean;
  /** Questions still to answer. */
  left: number;
}

/** The message due after `answered` answers, or null. `elapsedMs` is the time since the test began. */
export function iqCheer({ answered, total, elapsedMs, typicalMs }: { answered: number; total: number; elapsedMs: number; typicalMs: number }): IqCheer | null {
  const left = total - answered;
  if (answered <= 0 || answered % IQ_CHEER_EVERY !== 0 || left < 2) return null;
  // Earlier messages paused the test — that is not answering time.
  const paused = (answered / IQ_CHEER_EVERY - 1) * IQ_CHEER_PAUSE_MS;
  const perAnswer = Math.max(0, elapsedMs - paused) / answered;
  const stage = left <= IQ_CHEER_EVERY ? "almost" : answered * 2 >= total ? "half" : "start";
  return { stage, fast: perAnswer < typicalMs, left };
}
