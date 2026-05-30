import { describe, expect, it } from "vitest";
import {
  BOARD_VERSION,
  createEmptyBoard,
  moveElementsByLayer,
  normalizeBoard,
  reorderElements,
  serializeBoard,
} from "../../src/board/board-model.js";

describe("board model", () => {
  it("creates a versioned offline whiteboard document", () => {
    const board = createEmptyBoard();

    expect(board).toEqual({
      version: BOARD_VERSION,
      app: "lofiBoard",
      canvas: { backgroundMode: "plain" },
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
    expect(board.canvas).toEqual({ backgroundMode: "plain" });
    expect(board.elements.map((element) => element.id)).toEqual(["a", "b"]);
    expect(board.elements[0]).toMatchObject({
      type: "text",
      text: "A",
      x: 0,
      y: 0,
      fontSize: 28,
      fontFamily: "Inter, system-ui, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
      align: "left",
    });
  });

  it("normalizes invalid viewport values to a usable canvas view", () => {
    const board = normalizeBoard({
      version: 1,
      viewport: { x: "bad", y: Infinity, scale: 0 },
      elements: [],
    });

    expect(board.viewport).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("clamps imported viewport zoom to the supported canvas zoom range", () => {
    expect(normalizeBoard({
      version: 1,
      viewport: { x: 10, y: 20, scale: 0.01 },
      elements: [],
    }).viewport).toEqual({ x: 10, y: 20, scale: 0.12 });

    expect(normalizeBoard({
      version: 1,
      viewport: { x: 10, y: 20, scale: 99 },
      elements: [],
    }).viewport).toEqual({ x: 10, y: 20, scale: 4 });
  });

  it("normalizes brush stroke styling defaults for older files", () => {
    const board = normalizeBoard({
      version: 1,
      elements: [
        {
          id: "stroke_1",
          type: "stroke",
          points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        },
      ],
    });

    expect(board.elements[0]).toMatchObject({
      type: "stroke",
      stroke: "#111827",
      strokeWidth: 6,
      opacity: 1,
      lineCap: "round",
      brushStyle: "solid",
      smoothing: 0.45,
    });
  });

  it("normalizes structure element defaults", () => {
    const board = normalizeBoard({
      version: 1,
      elements: [
        {
          id: "graph_1",
          type: "graph-structure",
          nodes: [{ id: "A", label: "A", x: 10, y: 20 }],
          edges: [],
        },
      ],
    });

    expect(board.elements[0]).toMatchObject({
      id: "graph_1",
      type: "graph-structure",
      x: 0,
      y: 0,
      width: 240,
      height: 240,
      nodes: [{ id: "A", label: "A", x: 10, y: 20 }],
      edges: [],
      settings: {},
      style: {},
    });
  });

  it("merges partial structure settings and styles with defaults", () => {
    const board = normalizeBoard({
      version: 1,
      elements: [
        {
          id: "array_1",
          type: "array-structure",
          items: [{ value: "A" }],
          settings: { indexBase: 1 },
          style: { stroke: "#2563eb" },
        },
        {
          id: "graph_1",
          type: "graph-structure",
          nodes: [],
          edges: [],
          style: { nodeFill: "#dbeafe" },
        },
        {
          id: "tree_1",
          type: "tree-structure",
          nodes: [{ id: "node_a", label: "A", x: 24, y: 24 }],
          edges: [],
          settings: { rootId: "node_a" },
          style: { nodeStroke: "#dc2626" },
        },
      ],
    });

    expect(board.elements[0].settings).toEqual({ indexBase: 1, showIndexes: true });
    expect(board.elements[0].style).toMatchObject({
      cellWidth: 72,
      cellHeight: 44,
      stroke: "#2563eb",
      valueFill: "#ffffff",
    });
    expect(board.elements[1].style).toMatchObject({
      nodeRadius: 26,
      nodeFill: "#dbeafe",
      stroke: "#94a3b8",
    });
    expect(board.elements[2].style).toMatchObject({
      nodeRadius: 24,
      nodeStroke: "#dc2626",
      stroke: "#94a3b8",
    });
    expect(board.elements[2].settings).toEqual({ rootId: "node_a" });
  });

  it("normalizes independent linear structure defaults", () => {
    const board = normalizeBoard({
      version: 1,
      elements: [
        { id: "stack_1", type: "stack-structure", items: [{ value: "A" }] },
        { id: "queue_1", type: "queue-structure", items: [{ value: "B" }] },
        { id: "deque_1", type: "deque-structure", items: [{ value: "C" }] },
      ],
    });

    expect(board.elements.map((element) => element.type)).toEqual([
      "stack-structure",
      "queue-structure",
      "deque-structure",
    ]);
    expect(board.elements[0]).toMatchObject({
      height: 44,
      settings: { indexBase: 0, showIndexes: false },
    });
  });

  it("normalizes coordinate plane defaults for older files", () => {
    const board = normalizeBoard({
      version: 1,
      elements: [
        {
          id: "plane_1",
          type: "coordinate-plane",
          x: 10,
          y: 20,
          width: 320,
          height: 240,
        },
      ],
    });

    expect(board.elements[0]).toMatchObject({
      id: "plane_1",
      type: "coordinate-plane",
      x: 10,
      y: 20,
      width: 320,
      height: 240,
      unitSize: 40,
      origin: { x: 160, y: 120 },
      settings: { showGrid: true, showTicks: true, showLabels: true },
      style: {},
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

  it("moves selected elements one layer while preserving selection order", () => {
    const elements = reorderElements([
      { id: "a", type: "rect" },
      { id: "b", type: "rect" },
      { id: "c", type: "rect" },
      { id: "d", type: "rect" },
    ]);

    expect(moveElementsByLayer(elements, ["b"], 1).map((element) => element.id)).toEqual(["a", "c", "b", "d"]);
    expect(moveElementsByLayer(elements, ["c"], -1).map((element) => element.id)).toEqual(["a", "c", "b", "d"]);
    expect(moveElementsByLayer(elements, ["b", "c"], 1).map((element) => element.id)).toEqual(["a", "d", "b", "c"]);
    expect(moveElementsByLayer(elements, ["b", "c"], -1).map((element) => element.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("keeps layer moves stable at the front and back boundaries", () => {
    const elements = reorderElements([
      { id: "a", type: "rect" },
      { id: "b", type: "rect" },
      { id: "c", type: "rect" },
    ]);

    expect(moveElementsByLayer(elements, ["a"], -1)).toEqual(elements);
    expect(moveElementsByLayer(elements, ["c"], 1)).toEqual(elements);
  });
});
