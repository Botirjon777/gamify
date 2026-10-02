/**
 * A chess position for drawing: no rules here (those are chess.js, see moves.ts), so diagrams cost nothing to load
 * and may show positions that are not legal games (a lone knight, two pieces to compare).
 */

/** "wK", "bP" … — colour + piece letter; also the file name of the piece picture. */
export type PieceCode = `${"w" | "b"}${"K" | "Q" | "R" | "B" | "N" | "P"}`;
/** 64 squares from a8 (index 0) along the rank to h8, then down to h1 (index 63) — the order of a FEN. */
export type Position = (PieceCode | null)[];

export const FILES = "abcdefgh";
export const SQUARE = /^[a-h][1-8]$/;
/** A move as sent to the server: from, to, and the piece a pawn becomes on the last rank. */
export const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export const squareIndex = (square: string) => (8 - Number(square[1])) * 8 + FILES.indexOf(square[0]);
export const squareName = (index: number) => `${FILES[index % 8]}${8 - Math.floor(index / 8)}`;
/** a1 is dark. */
export const isDarkSquare = (index: number) => (index % 8 + Math.floor(index / 8)) % 2 === 1;

/** The piece placement of a FEN (its first field; the rest may be missing) → 64 squares, or null when malformed. */
export function parsePlacement(fen: string): Position | null {
  const ranks = fen.trim().split(/\s+/)[0].split("/");
  if (ranks.length !== 8) return null;
  const squares: Position = [];
  for (const rank of ranks) {
    let files = 0;
    for (const ch of rank) {
      if (/[1-8]/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) squares.push(null);
        files += Number(ch);
      } else if (/[kqrbnp]/i.test(ch)) {
        squares.push(`${ch === ch.toUpperCase() ? "w" : "b"}${ch.toUpperCase()}` as PieceCode);
        files++;
      } else return null;
    }
    if (files !== 8) return null;
  }
  return squares;
}

/** Whose move it is in a full FEN ("w" when the FEN is only a placement). */
export const sideToMove = (fen: string): "w" | "b" => (fen.trim().split(/\s+/)[1] === "b" ? "b" : "w");

/** A board shown with an exercise (a type, not an interface: it is stored as JSON). */
export type BoardSpec = {
  fen: string;
  /** Squares to highlight ("look here"). */
  marks?: string[];
  /** Seen from Black's side. */
  flip?: boolean;
};
