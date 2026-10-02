"use client";

import { useTranslations } from "next-intl";
import { parsePlacement, type BoardSpec, type PieceCode } from "../board";
import { ChessBoard, type SquareTint } from "./chess-board";

/** "wN" → "oq ot", for screen readers. */
export function usePieceName() {
  const t = useTranslations("chess");
  return (piece: PieceCode) => `${t(piece[0] === "w" ? "white" : "black")} ${t(`pieces.${piece[1]}`)}`;
}

/** A position shown above a question — nothing can be moved. */
export function BoardDiagram({ board }: { board: BoardSpec }) {
  const t = useTranslations("chess");
  const pieceName = usePieceName();
  const position = parsePlacement(board.fen);
  if (!position) return null;
  const tints: Record<string, SquareTint> = Object.fromEntries((board.marks ?? []).map((square) => [square, "mark"]));
  return <ChessBoard position={position} flip={board.flip} tints={tints} pieceName={pieceName} label={t("board")} />;
}
