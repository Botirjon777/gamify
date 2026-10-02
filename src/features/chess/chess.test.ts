import { describe, expect, it } from "vitest";
import { checkAnswer } from "@/features/learn/check";
import { toFileExercise } from "@/features/learn/content-export";
import { exerciseDef, toDbExercise, type PrivateAnswer } from "@/features/learn/content-schema";
import { isDarkSquare, parsePlacement, sideToMove, squareIndex, squareName } from "./board";
import { positionProblem, resolveMoves } from "./moves";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BACK_RANK = "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1";

describe("board", () => {
  it("reads a FEN from a8 to h1", () => {
    const position = parsePlacement(START)!;
    expect(position).toHaveLength(64);
    expect(position[squareIndex("a8")]).toBe("bR");
    expect(position[squareIndex("e1")]).toBe("wK");
    expect(position[squareIndex("e4")]).toBeNull();
    expect(squareName(0)).toBe("a8");
    expect(squareName(63)).toBe("h1");
  });
  it("accepts a bare placement (a diagram needs no side to move) and positions that are not games", () => {
    expect(parsePlacement("8/8/8/8/3N4/8/8/8")?.filter(Boolean)).toEqual(["wN"]);
    expect(sideToMove("8/8/8/8/3N4/8/8/8")).toBe("w");
    expect(sideToMove("8/8/8/8/3N4/8/8/8 b - - 0 1")).toBe("b");
  });
  it("rejects a malformed placement", () => {
    for (const fen of ["", "8/8/8/8/8/8/8", "9/8/8/8/8/8/8/8", "8/8/8/8/8/8/8/7x", "pppppppp1/8/8/8/8/8/8/8"]) expect(parsePlacement(fen)).toBeNull();
  });
  it("a1 is dark, h1 is light", () => {
    expect(isDarkSquare(squareIndex("a1"))).toBe(true);
    expect(isDarkSquare(squareIndex("h1"))).toBe(false);
  });
});

describe("accepted moves", () => {
  it("reads book notation, with or without the check marks, and from-to squares", () => {
    expect(resolveMoves(START, ["Nf3"])).toEqual({ moves: ["g1f3"], san: ["Nf3"] });
    expect(resolveMoves(START, ["g1f3", "e4"])).toEqual({ moves: ["g1f3", "e2e4"], san: ["Nf3", "e4"] });
    expect(resolveMoves(BACK_RANK, ["Rd8"])).toEqual({ moves: ["d1d8"], san: ["Rd8#"] });
    expect(resolveMoves("8/4P3/8/8/8/2k5/8/4K3 w - - 0 1", ["e8=N"])).toEqual({ moves: ["e7e8n"], san: ["e8=N"] });
  });
  it("accepts every mate when the author's move is mate", () => {
    const both = resolveMoves("4k3/8/4K3/8/8/8/8/Q7 w - - 0 1", ["Qa8#"]);
    expect(both).toEqual({ moves: ["a1a8", "a1h8"], san: ["Qa8#"] });
  });
  it("refuses illegal moves and positions without a move", () => {
    expect(resolveMoves(START, ["Nf6"])).toHaveProperty("error");
    expect(resolveMoves(START, ["e5"])).toHaveProperty("error");
    expect(positionProblem("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")).toMatch(/no legal move/); // stalemate
    expect(positionProblem("8/8/8/8/3N4/8/8/8 w - - 0 1")).not.toBeNull(); // no kings
    // Not enough material to win is still a position to practise in.
    expect(positionProblem("4k3/8/8/8/8/8/4B3/4K3 w - - 0 1")).toBeNull();
  });
});

describe("make-the-move exercises", () => {
  const def = exerciseDef.parse({ id: "mate-001", type: "move", lang: "text", prompt: "Mat qiling", board: BACK_RANK, answer: "Rd8#" });
  const row = toDbExercise(def);
  const answer = row.answer as PrivateAnswer;

  it("keeps the answer out of the public part", () => {
    expect(row.type).toBe("MOVE");
    expect(JSON.stringify(row.content)).not.toMatch(/d1d8|Rd8/);
  });
  it("checks the move made on the board", () => {
    expect(checkAnswer(answer, { type: "MOVE", move: "d1d8" })).toEqual({ correct: true, reveal: { type: "MOVE", move: "d1d8", san: "Rd8#" } });
    expect(checkAnswer(answer, { type: "MOVE", move: "d1d7" })).toEqual({ correct: false, reveal: { type: "MOVE", move: "d1d8", san: "Rd8#" } });
    expect(checkAnswer(answer, { type: "CHOICE", index: 0 }).correct).toBe(false);
  });
  it("survives the database ⇄ file round trip", () => {
    expect(toFileExercise(row)).toMatchObject({ type: "move", board: BACK_RANK, answer: "Rd8#" });
    expect(toDbExercise(exerciseDef.parse(toFileExercise(row)))).toEqual(row);
  });
  it("is rejected when the answer is not a legal move, or the board is not a position", () => {
    const base = { id: "x-001", type: "move", lang: "text", prompt: "?" };
    expect(exerciseDef.safeParse({ ...base, board: BACK_RANK, answer: "Rd9" }).success).toBe(false);
    expect(exerciseDef.safeParse({ ...base, board: "not a fen", answer: "Rd8" }).success).toBe(false);
    expect(exerciseDef.safeParse({ ...base, answer: "Rd8" }).success).toBe(false);
  });
  it("a diagram can sit above any other kind of question", () => {
    const choice = exerciseDef.parse({ id: "c-001", type: "choice", lang: "text", prompt: "?", board: { fen: "8/8/8/8/3N4/8/8/8", marks: ["e6"] }, options: ["a", "b"], answer: 0 });
    const stored = toDbExercise(choice);
    expect(stored.content).toMatchObject({ board: { fen: "8/8/8/8/3N4/8/8/8", marks: ["e6"] } });
    expect(toFileExercise(stored)).toMatchObject({ board: { fen: "8/8/8/8/3N4/8/8/8", marks: ["e6"] } });
    expect(exerciseDef.safeParse({ id: "c-002", type: "choice", lang: "text", prompt: "?", board: { fen: "8/8/8/8/3N4/8/8/8", marks: ["z9"] }, options: ["a", "b"], answer: 0 }).success).toBe(false);
  });
});
