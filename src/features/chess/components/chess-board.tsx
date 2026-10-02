"use client";

import { useRef, useState } from "react";
import { isDarkSquare, squareName, type PieceCode, type Position } from "../board";

/** Why a square is tinted. */
export type SquareTint = "mark" | "last" | "selected" | "good" | "bad" | "check";

const TINT: Record<SquareTint, string> = {
  mark: "bg-[#ffd400]/45",
  last: "bg-[#9bc700]/45",
  selected: "bg-[#14551e]/50",
  good: "bg-[#22c55e]/60",
  bad: "bg-[#ef4444]/60",
  check: "bg-[radial-gradient(circle,#ff0000_0%,#e70000_25%,rgba(169,0,0,0)_85%)]",
};

export const PIECE_SRC = (piece: PieceCode) => `/chess/pieces/${piece}.svg`;

interface Props {
  position: Position;
  /** Seen from Black's side. */
  flip?: boolean;
  tints?: Record<string, SquareTint>;
  /** Squares the selected piece can go to; `true` = it captures there. */
  targets?: Record<string, boolean>;
  /** What each piece is called, for screen readers: "wK" → "oq shoh". */
  pieceName: (piece: PieceCode) => string;
  label: string;
  /** Full size (a board to play on); diagrams are drawn smaller, the question's options follow them. */
  large?: boolean;
  /**
   * Makes the board playable. `canPick`: may this piece be moved now? `onPick`: a movable piece was pressed.
   * `onSquare`: any other square was pressed. `onDrop`: a piece was dragged from one square to another.
   */
  play?: {
    canPick: (square: string) => boolean;
    onPick: (square: string) => void;
    onSquare: (square: string) => void;
    onDrop: (from: string, to: string) => void;
  };
}

/** A chess board. Without `play` it is a diagram; with it, pieces are moved by tapping or dragging. */
export function ChessBoard({ position, flip = false, tints = {}, targets = {}, pieceName, label, large = false, play }: Props) {
  const root = useRef<HTMLDivElement>(null);
  /** The piece in the hand: where it came from and where the pointer is (px inside the board). */
  const [drag, setDrag] = useState<{ from: string; x: number; y: number; moved: boolean } | null>(null);

  // Screen order: a8 … h1 for White, h1 … a8 for Black.
  const order = Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i));

  const point = (e: React.PointerEvent) => {
    const box = root.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top, size: box.width };
  };
  const squareAt = (x: number, y: number, size: number) => {
    const col = Math.floor((x / size) * 8);
    const row = Math.floor((y / size) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return squareName(order[row * 8 + col]);
  };

  const press = (square: string) => {
    if (!play) return;
    if (play.canPick(square)) play.onPick(square);
    else play.onSquare(square);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!play || e.button > 0) return;
    const { x, y, size } = point(e);
    const square = squareAt(x, y, size);
    if (!square) return;
    press(square);
    if (play.canPick(square)) {
      root.current!.setPointerCapture(e.pointerId);
      setDrag({ from: square, x, y, moved: false });
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = point(e);
    setDrag({ ...drag, x, y, moved: drag.moved || Math.hypot(x - drag.x, y - drag.y) > 4 });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag || !play) return;
    const { x, y, size } = point(e);
    const to = squareAt(x, y, size);
    if (drag.moved && to && to !== drag.from) play.onDrop(drag.from, to);
    setDrag(null);
  };

  const held = drag?.moved ? position[order.find((i) => squareName(i) === drag.from)!] : null;

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      className={`relative mx-auto grid aspect-square w-full select-none ${large ? "max-w-md" : "max-w-xs sm:max-w-sm"} grid-cols-8 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/10 ${play ? "touch-none" : ""}`}
    >
      {order.map((index, at) => {
        const square = squareName(index);
        const piece = position[index];
        const dark = isDarkSquare(index);
        const tint = tints[square];
        const target = square in targets;
        const text = dark ? "text-[#f0d9b5]" : "text-[#b58863]";
        const Tag = play ? "button" : "div";
        return (
          <Tag
            key={square}
            {...(play && {
              type: "button" as const,
              // Pointer presses are handled on the board (so pieces can be dragged); this is for the keyboard.
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  press(square);
                }
              },
            })}
            data-square={square}
            aria-label={piece ? `${square}, ${pieceName(piece)}` : square}
            className={`relative aspect-square ${dark ? "bg-[#b58863]" : "bg-[#f0d9b5]"} ${play ? "cursor-pointer outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand" : ""}`}
          >
            {tint && <span className={`absolute inset-0 ${TINT[tint]}`} />}
            {/* Coordinates: ranks down the left edge, files along the bottom. */}
            {at % 8 === 0 && <span className={`absolute left-0.5 top-0 text-[10px] font-bold leading-tight sm:text-xs ${text}`}>{square[1]}</span>}
            {at >= 56 && <span className={`absolute bottom-0 right-0.5 text-[10px] font-bold leading-tight sm:text-xs ${text}`}>{square[0]}</span>}
            {piece && (
              <span
                className={`absolute inset-0 bg-contain bg-center bg-no-repeat ${drag?.moved && drag.from === square ? "opacity-30" : ""}`}
                style={{ backgroundImage: `url(${PIECE_SRC(piece)})` }}
              />
            )}
            {target &&
              (targets[square] ? (
                <span className="absolute inset-0 rounded-full border-[5px] border-[#14551e]/45" />
              ) : (
                <span className="absolute inset-[35%] rounded-full bg-[#14551e]/45" />
              ))}
          </Tag>
        );
      })}

      {held && drag && (
        <span
          className="pointer-events-none absolute z-20 size-[15%] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat drop-shadow-lg"
          style={{ left: drag.x, top: drag.y, backgroundImage: `url(${PIECE_SRC(held)})` }}
        />
      )}
    </div>
  );
}
