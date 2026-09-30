import type { PrivateAnswer, Submission } from "./content-schema";

/**
 * Lenient comparison: ignores all whitespace and one pair of surrounding quotes,
 * so `[1, 2]` = `[1,2]` and `"salom"` = `salom`. Case-sensitive (true ≠ True).
 */
export function normalize(text: string): string {
  return text
    .trim()
    .replace(/^(["'`])([\s\S]*)\1$/, "$2")
    .replace(/\s+/g, "");
}

export type Reveal =
  | { type: "CHOICE"; index: number }
  | { type: "OUTPUT"; answer: string }
  | { type: "FILL"; blanks: string[] }
  | { type: "ORDER"; lines: string[] };

/** Check a submission against the private answer. Returns the correct answer to reveal afterwards. */
export function checkAnswer(answer: PrivateAnswer, submission: Submission): { correct: boolean; reveal: Reveal } {
  switch (answer.type) {
    case "CHOICE":
      return {
        correct: submission.type === "CHOICE" && submission.index === answer.index,
        reveal: { type: "CHOICE", index: answer.index },
      };

    case "OUTPUT": {
      const given = submission.type === "OUTPUT" ? normalize(submission.text) : null;
      return {
        correct: given !== null && answer.accepted.some((a) => normalize(a) === given),
        reveal: { type: "OUTPUT", answer: answer.accepted[0] },
      };
    }

    case "FILL": {
      const blanks = submission.type === "FILL" ? submission.blanks : [];
      const correct =
        blanks.length === answer.blanks.length &&
        answer.blanks.every((accepted, i) => accepted.some((a) => normalize(a) === normalize(blanks[i] ?? "")));
      return { correct, reveal: { type: "FILL", blanks: answer.blanks.map((a) => a[0]) } };
    }

    case "ORDER": {
      // Compare text, not ids: identical lines (e.g. two `}`) are interchangeable.
      const lines = submission.type === "ORDER" ? submission.lines : [];
      const correct =
        lines.length === answer.lines.length && answer.lines.every((l, i) => normalize(l) === normalize(lines[i]));
      return { correct, reveal: { type: "ORDER", lines: answer.lines } };
    }
  }
}
