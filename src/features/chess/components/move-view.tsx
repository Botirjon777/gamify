"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Submission } from "@/features/learn/content-schema";
import type { Reveal } from "@/features/learn/check";
import { playSound } from "@/lib/sound";
import { parsePlacement, sideToMove, type BoardSpec, type PieceCode } from "../board";
import { usePieceName } from "./board-diagram";
import { ChessBoard, PIECE_SRC, type SquareTint } from "./chess-board";

interface Props {
  board: BoardSpec;
  /** True once answered — the board freezes and the right move is shown. */
  locked: boolean;
  reveal: Reveal | null;
  onDraft: (draft: Submission | null) => void;
}

const PROMOTIONS = ["q", "r", "b", "n"] as const;

/**
 * "Make the move": the learner moves a piece of the side to move, by tapping or dragging, and may take it back
 * before checking. The rules (which moves are legal) come from chess.js; whether the move is the right one is
 * decided on the server.
 */
export default function MoveView({ board, locked, reveal, onDraft }: Props) {
  const t = useTranslations("chess");
  const pieceName = usePieceName();
  const side = sideToMove(board.fen);
  /** The move made, as from-to squares (+ promotion piece): "h5h7", "e7e8q". */
  const [made, setMade] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  /** A pawn is about to reach the last rank: which piece should it become? */
  const [promoting, setPromoting] = useState<{ from: string; to: string } | null>(null);

  const start = useMemo(() => new Chess(board.fen), [board.fen]);
  const legal = useMemo(() => start.moves({ verbose: true }), [start]);

  // Once answered the board shows the right move (which is the learner's own when they were right).
  const answer = locked && reveal?.type === "MOVE" ? reveal : null;
  const shown = answer?.move ?? made;
  const missed = answer !== null && made !== answer.move;

  const after = useMemo(() => {
    if (!shown) return null;
    const game = new Chess(board.fen);
    try {
      game.move({ from: shown.slice(0, 2), to: shown.slice(2, 4), promotion: shown[4] });
    } catch {
      return null;
    }
    return { fen: game.fen(), check: game.isCheck() ? kingSquare(game) : null };
  }, [board.fen, shown]);

  const position = parsePlacement(after?.fen ?? board.fen)!;

  const targets: Record<string, boolean> = {};
  if (!made && selected) for (const m of legal) if (m.from === selected) targets[m.to] = m.isCapture() || m.isEnPassant();

  const tints: Record<string, SquareTint> = {};
  for (const mark of board.marks ?? []) tints[mark] = "mark";
  if (missed && made) tints[made.slice(0, 2)] = tints[made.slice(2, 4)] = "bad";
  if (shown && after) {
    tints[shown.slice(0, 2)] = tints[shown.slice(2, 4)] = answer ? "good" : "last";
    if (after.check) tints[after.check] = "check";
  } else if (selected) tints[selected] = "selected";

  const commit = (from: string, to: string, promotion?: string) => {
    const move = legal.find((m) => m.from === from && m.to === to && (m.promotion ?? "") === (promotion ?? ""));
    if (!move) return;
    playSound(move.isCapture() || move.isEnPassant() ? "capture" : "move");
    const uci = `${from}${to}${promotion ?? ""}`;
    setMade(uci);
    setSelected(null);
    setPromoting(null);
    onDraft({ type: "MOVE", move: uci });
  };

  /** False when the piece can't go there. */
  const tryMove = (from: string, to: string) => {
    const options = legal.filter((m) => m.from === from && m.to === to);
    if (!options.length) return false;
    if (options.some((m) => m.promotion)) setPromoting({ from, to });
    else commit(from, to);
    return true;
  };

  const takeBack = () => {
    setMade(null);
    setSelected(null);
    setPromoting(null);
    onDraft(null);
  };

  // Backspace takes the move back.
  useEffect(() => {
    if (locked || !made) return;
    const onKey = (e: KeyboardEvent) => e.key === "Backspace" && takeBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto w-full max-w-md">
        <ChessBoard
          position={position}
          flip={board.flip ?? side === "b"}
          tints={tints}
          targets={targets}
          pieceName={pieceName}
          label={t("board")}
          large
          play={
            locked || made || promoting
              ? undefined
              : {
                  canPick: (square) => start.get(square as Square)?.color === side,
                  onPick: setSelected,
                  onSquare: (square) => {
                    if (selected && !tryMove(selected, square)) setSelected(null);
                  },
                  onDrop: (from, to) => {
                    if (!tryMove(from, to)) setSelected(null);
                  },
                }
          }
        />

        {promoting && (
          <div className="absolute inset-0 z-30 grid place-items-center rounded-xl bg-black/50">
            <div className="rounded-2xl bg-surface p-3 shadow-2xl">
              <p className="px-1 pb-2 text-center text-sm font-bold">{t("promote")}</p>
              <div className="flex gap-2">
                {PROMOTIONS.map((p) => {
                  const piece = `${side}${p.toUpperCase()}` as PieceCode;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-label={pieceName(piece)}
                      onClick={() => commit(promoting.from, promoting.to, p)}
                      className="size-14 rounded-xl border-2 border-border bg-[#f0d9b5] bg-contain bg-center bg-no-repeat transition hover:border-brand sm:size-16"
                      style={{ backgroundImage: `url(${PIECE_SRC(piece)})` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto flex min-h-10 w-full max-w-md items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-muted">
          <span className={`size-3.5 shrink-0 rounded-full border border-black/30 ${side === "w" ? "bg-white" : "bg-[#222]"}`} />
          {missed ? t("answer", { move: answer.san }) : made ? t("made") : t(side === "w" ? "whiteToMove" : "blackToMove")}
        </p>
        {!locked && made && (
          <button type="button" onClick={takeBack} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-border bg-surface px-3 py-1.5 font-bold transition hover:border-brand/40">
            <Undo2 className="size-4" /> {t("takeBack")}
          </button>
        )}
      </div>
    </div>
  );
}

/** The square of the king that is in check (the side to move after the move). */
function kingSquare(game: Chess): string | null {
  for (const row of game.board()) for (const cell of row) if (cell && cell.type === "k" && cell.color === game.turn()) return cell.square;
  return null;
}
