import { describe, expect, it } from "vitest";
import {
  BOARD_VERSION,
  createEmptyBoard,
  normalizeBoard,
  serializeBoard,
} from "../src/board-model.js";

describe("board model", () => {
  it("creates a versioned offline whiteboard document", () => {
    const board = createEmptyBoard();

    expect(board).toEqual({
      version: BOARD_VERSION,
      app: "lofiBoard",
      canvas: { backgroundMode: "dots" },
      viewport: { x: 0, y: 0, scale: 1 },
      elements: [],
    });
  });

  it("normalizes element order, viewport defaults, and canvas defaults from JSON", () => {
    const board = normalizeBoard({
      version: 1,
      elements: [
        { id: "b", type: "rect", zIndex: 3, x: 10, y: 20 },
        { id: "a", type: "text", zIndex: 1, text: "A" },
      ],
    });

    expect(board.viewport).toEqual({ x: 0, y: 0, scale: 1 });
    expect(board.canvas).toEqual({ backgroundMode: "dots" });
    expect(board.elements.map((element) => element.id)).toEqual(["a", "b"]);
    expect(board.elements[0]).toMatchObject({
      type: "text",
      text: "A",
      x: 0,
      y: 0,
      fontSize: 28,
      fill: "#111827",
    });
  });

  it("serializes viewport and elements without mutating the source board", () => {
    const board = createEmptyBoard();
    board.elements.push({
      id: "rect_1",
      type: "rect",
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      zIndex: 0,
    });

    const serialized = serializeBoard(board, { x: 40, y: -20, scale: 1.5 });
    serialized.elements[0].x = 999;

    expect(serialized.viewport).toEqual({ x: 40, y: -20, scale: 1.5 });
    expect(board.elements[0].x).toBe(10);
  });

  it("serializes the selected canvas background mode", () => {
    const board = createEmptyBoard();
    board.canvas.backgroundMode = "plain";

    const serialized = serializeBoard(board, { x: 0, y: 0, scale: 1 });

    expect(serialized.canvas).toEqual({ backgroundMode: "plain" });
  });
});
