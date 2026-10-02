/**
 * The rules of chess (chess.js) for "make the move" exercises: is the position legal, which moves are accepted.
 * Shared by the content scripts, the server and the admin panel — no server-only imports.
 */
import { Chess } from "chess.js";

/** A playable position (both kings, a side to move …)? Returns the problem, or null when it is fine. */
export function positionProblem(fen: string): string | null {
  try {
    const game = new Chess(fen);
    // Only "nobody can move" counts: a lone bishop can't win a game, but it can still show how a bishop gives check.
    if (game.moves().length === 0) return "there is no legal move in this position (mate or stalemate)";
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "invalid FEN";
  }
}

const uci = (move: { from: string; to: string; promotion?: string }) => `${move.from}${move.to}${move.promotion ?? ""}`;

/**
 * Moves written by an author ("Qh7#", "Nf3", "e8=Q", or "e2e4") → what is stored.
 * A mate is a mate: when an accepted move checkmates, every other checkmating move is accepted too.
 */
export function resolveMoves(fen: string, written: string[]): { moves: string[]; san: string[] } | { error: string } {
  const problem = positionProblem(fen);
  if (problem) return { error: problem };
  const legal = new Chess(fen).moves({ verbose: true });
  const moves = new Set<string>();
  const san: string[] = [];
  for (const text of written) {
    const wanted = text.trim().replace(/[+#!?]+$/, "");
    const move = legal.find((m) => m.san.replace(/[+#]+$/, "") === wanted || uci(m) === wanted.toLowerCase());
    if (!move) return { error: `"${text}" is not a legal move here (legal: ${legal.map((m) => m.san).join(" ")})` };
    if (!moves.has(uci(move))) san.push(move.san);
    moves.add(uci(move));
  }
  if (legal.some((m) => moves.has(uci(m)) && m.san.endsWith("#"))) {
    for (const m of legal) if (m.san.endsWith("#")) moves.add(uci(m));
  }
  return { moves: [...moves], san };
}
