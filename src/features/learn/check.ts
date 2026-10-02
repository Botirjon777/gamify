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

/**
 * Prose answers (`lang: text` — maths, chemistry, chess …): besides whitespace, letter case and
 * the kind of apostrophe don't matter, so "Hujum" = "hujum" and oʻ = o' = o`.
 */
export function normalizeText(text: string): string {
  return normalize(text)
    .toLowerCase()
    .replace(/[ʻʼ’‘`´]/g, "'");
}

export type Reveal =
  | { type: "CHOICE"; index: number }
  | { type: "OUTPUT"; answer: string }
  | { type: "FILL"; blanks: string[] }
  | { type: "ORDER"; lines: string[] }
  /** `move`: from-to squares of the move to show; `san`: the author's move as written in books ("Qh7#"). */
  | { type: "MOVE"; move: string; san: string };

/**
 * Check a submission against the private answer. Returns the correct answer to reveal afterwards.
 * `prose`: the exercise is plain text, not code (see normalizeText).
 */
export function checkAnswer(answer: PrivateAnswer, submission: Submission, prose = false): { correct: boolean; reveal: Reveal } {
  const norm = prose ? normalizeText : normalize;
  switch (answer.type) {
    case "CHOICE":
      return {
        correct: submission.type === "CHOICE" && submission.index === answer.index,
        reveal: { type: "CHOICE", index: answer.index },
      };

    case "OUTPUT": {
      const given = submission.type === "OUTPUT" ? norm(submission.text) : null;
      return {
        correct: given !== null && answer.accepted.some((a) => norm(a) === given),
        reveal: { type: "OUTPUT", answer: answer.accepted[0] },
      };
    }

    case "FILL": {
      const blanks = submission.type === "FILL" ? submission.blanks : [];
      const correct =
        blanks.length === answer.blanks.length &&
        answer.blanks.every((accepted, i) => accepted.some((a) => norm(a) === norm(blanks[i] ?? "")));
      return { correct, reveal: { type: "FILL", blanks: answer.blanks.map((a) => a[0]) } };
    }

    case "ORDER": {
      // Compare text, not ids: identical lines (e.g. two `}`) are interchangeable.
      const lines = submission.type === "ORDER" ? submission.lines : [];
      const correct =
        lines.length === answer.lines.length && answer.lines.every((l, i) => norm(l) === norm(lines[i]));
      return { correct, reveal: { type: "ORDER", lines: answer.lines } };
    }

    case "MOVE": {
      const correct = submission.type === "MOVE" && answer.moves.includes(submission.move);
      // A right move is shown as played: it may be another mate than the author's.
      return { correct, reveal: { type: "MOVE", move: correct ? submission.move : answer.moves[0], san: answer.san[0] } };
    }
  }
}
