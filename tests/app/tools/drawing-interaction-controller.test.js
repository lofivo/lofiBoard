import { describe, expect, it, vi } from "vitest";
import { createDrawingInteractionController } from "../../../src/app/tools/drawing-interaction-controller.js";

function createNode() {
  return {
    attrs: {},
    destroy: vi.fn(),
    listening: vi.fn(),
    setAttrs: vi.fn(function setAttrs(attrs) {
      this.attrs = { ...this.attrs, ...attrs };
    }),
  };
}

function createLayer() {
  return {
    addedNodes: [],
    add: vi.fn(function add(node) {
      this.addedNodes.push(node);
    }),
    batchDraw: vi.fn(),
  };
}

function createHarness(overrides = {}) {
  const state = {
    elements: overrides.elements ?? [],
    selectedIds: overrides.selectedIds ?? [],
  };
  const layer = createLayer();
  const nodes = [];
  const callbacks = {
    addElement: vi.fn((element) => {
      state.elements = [...state.elements, element];
    }),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    setSelectedIds: vi.fn((ids) => {
      state.selectedIds = ids;
    }),
    ...overrides.callbacks,
  };
  const controller = createDrawingInteractionController({
    contentLayer: layer,
    createNode: (element) => {
      const node = createNode();
      node.element = element;
      nodes.push(node);
      return node;
    },
    getBoardElements: () => state.elements,
    setBoardElements: (elements) => {
      state.elements = elements;
    },
    getSelectedIds: () => state.selectedIds,
    setSelectedIds: callbacks.setSelectedIds,
    getElementIdAtPointer: (target) => target?.elementId ?? null,
    getBrushColor: () => "#111111",
    getStrokeWidth: () => 10,
    getBrushOpacityValue: () => 0.75,
    getBrushCap: () => "round",
    getBrushStyle: () => "solid",
    getBrushSmoothingValue: () => 0.3,
    getBrushInputSmoothingValue: () => 0,
    getScale: overrides.getScale ?? (() => 1),
    getIsLaser: overrides.getIsLaser ?? (() => false),
    getBaseEraserRadius: () => 10,
    getVisibleEraserRadius: overrides.getVisibleEraserRadius ?? ((radius) => radius),
    addElement: callbacks.addElement,
    pushHistory: callbacks.pushHistory,
    renderBoard: callbacks.renderBoard,
    now: overrides.now ?? vi.fn(() => 1000),
    requestAnimationFrame: overrides.requestAnimationFrame,
    cancelAnimationFrame: overrides.cancelAnimationFrame,
    laserFadeDuration: overrides.laserFadeDuration,
  });

  return { callbacks, controller, layer, nodes, state };
}

describe("drawing-interaction-controller", () => {
  it("creates a live pressure stroke preview and commits useful strokes", () => {
    const { callbacks, controller, layer, nodes, state } = createHarness();

    controller.startStroke({ x: 20, y: 30 }, 0.8);
    controller.appendStroke({ x: 35, y: 40 }, 0.4);
    controller.finishStroke();

    expect(layer.add).toHaveBeenCalledWith(nodes[0]);
    expect(nodes[0].setAttrs).toHaveBeenCalled();
    expect(nodes[0].destroy).toHaveBeenCalled();
    expect(callbacks.addElement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "stroke",
        x: 20,
        y: 30,
        stroke: "#111111",
        strokeWidth: 10,
        opacity: 0.75,
        lineCap: "round",
        brushStyle: "solid",
        smoothing: 0.3,
        points: [
          { x: 0, y: 0, pressure: 0.8 },
          { x: 15, y: 10, pressure: 0.4 },
        ],
      }),
      "已添加笔触",
    );
    expect(state.elements[0].points).toHaveLength(2);
    expect(controller.hasStrokeDraft()).toBe(false);
  });

  it("discards taps that never append a second stroke point", () => {
    const { callbacks, controller, nodes } = createHarness();

    controller.startStroke({ x: 0, y: 0 }, 0.5);
    controller.finishStroke();

    expect(nodes[0].destroy).toHaveBeenCalled();
    expect(callbacks.addElement).not.toHaveBeenCalled();
  });

  it("fades laser strokes without adding them to the board or history", () => {
    const frames = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimationFrame = vi.fn();
    const { callbacks, controller, nodes, state } = createHarness({
      getIsLaser: () => true,
      requestAnimationFrame,
      cancelAnimationFrame,
      laserFadeDuration: 100,
    });

    controller.startStroke({ x: 20, y: 30 }, 0.8);
    controller.appendStroke({ x: 35, y: 40 }, 0.4);
    controller.finishStroke();

    expect(callbacks.addElement).not.toHaveBeenCalled();
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
    expect(state.elements).toEqual([]);
    expect(nodes[0].destroy).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    frames.shift()(1000);
    expect(nodes[0].attrs.opacity).toBe(0.75);
    expect(nodes[0].destroy).not.toHaveBeenCalled();
    frames.shift()(1100);
    expect(nodes[0].attrs.opacity).toBe(0);
    expect(nodes[0].destroy).toHaveBeenCalledTimes(1);
  });

  it("samples stroke eraser movement and records history only when the board changed", () => {
    const stroke = {
      id: "stroke_1",
      type: "stroke",
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 100, y: 0, pressure: 0.5 },
      ],
      strokeWidth: 6,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 0,
    };
    const { callbacks, controller, state } = createHarness({
      elements: [stroke],
      now: vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1040),
    });

    const initialRadius = controller.beginEraser({ x: 40, y: 0 });
    controller.eraseStrokeAt({ x: 40, y: 0 }, initialRadius);
    controller.updateStrokeEraser({ x: 70, y: 0 });
    controller.finishEraser();

    expect(state.elements.every((element) => element.type === "stroke")).toBe(true);
    expect(state.elements.length).toBeGreaterThan(1);
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已擦除内容");
    expect(controller.hasActiveEraserSnapshot()).toBe(false);
  });

  it("removes unlocked objects, preserves locked objects, and clears removed selections", () => {
    const { callbacks, controller, state } = createHarness({
      elements: [
        { id: "shape_1", type: "rectangle", x: 0, y: 0, zIndex: 0 },
        { id: "locked_1", type: "rectangle", locked: true, x: 20, y: 20, zIndex: 1 },
      ],
      selectedIds: ["shape_1", "locked_1"],
    });

    controller.beginEraser({ x: 0, y: 0 });
    controller.eraseObjectAt({ elementId: "locked_1" });
    controller.eraseObjectAt({ elementId: "shape_1" });
    controller.finishEraser();

    expect(state.elements.map((element) => element.id)).toEqual(["locked_1"]);
    expect(callbacks.setSelectedIds).toHaveBeenCalledWith(["locked_1"]);
    expect(callbacks.renderBoard).toHaveBeenCalledTimes(1);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已擦除内容");
  });

  it("returns raw unscaled radii so showStrokeEraser avoids double-scaling on zoomed-out canvases", () => {
    const scaleVisual = vi.fn((r) => r / 0.25);
    const harness = createHarness({
      getVisibleEraserRadius: scaleVisual,
    });

    const beginRadius = harness.controller.beginEraser({ x: 50, y: 0 });
    // beginEraser must return the raw base radius (10), NOT the scaled value (40)
    expect(beginRadius).toBe(10);

    const updateRadius = harness.controller.updateStrokeEraser({ x: 80, y: 0 });
    // updateStrokeEraser must return the raw computed radius, NOT scaled by getVisibleEraserRadius
    expect(updateRadius).toBeGreaterThan(0);
    expect(scaleVisual).not.toHaveBeenCalled();
  });

  it("erases the same zoom-adjusted footprint shown by the stroke eraser preview", () => {
    const stroke = {
      id: "stroke_1",
      type: "stroke",
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 100, y: 0, pressure: 0.5 },
      ],
      strokeWidth: 6,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 0,
    };
    const { controller, state } = createHarness({
      elements: [stroke],
      getVisibleEraserRadius: (radius) => radius / 0.25,
    });

    const radius = controller.beginEraser({ x: 50, y: 0 });
    controller.eraseStrokeAt({ x: 50, y: 0 }, radius);

    expect(state.elements).toHaveLength(2);
    expect(state.elements[0].points.at(-1).x).toBe(10);
    expect(state.elements[1].points[0].x).toBe(90);
  });

  it("computes eraser speed from screen movement when the canvas is zoomed out", () => {
    const { controller } = createHarness({
      getScale: () => 0.25,
      now: vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1040),
    });

    controller.beginEraser({ x: 0, y: 0 });
    const radius = controller.updateStrokeEraser({ x: 40, y: 0 });

    expect(radius).toBe(10);
  });

  it("dampens speed growth at very low zoom so slight movement does not balloon the eraser", () => {
    const { controller: tinyZoomController } = createHarness({
      getScale: () => 0.12,
      now: vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1016),
    });
    const { controller: normalZoomController } = createHarness({
      getScale: () => 1,
      now: vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1016),
    });

    tinyZoomController.beginEraser({ x: 0, y: 0 });
    const tinyZoomRadius = tinyZoomController.updateStrokeEraser({ x: 20 / 0.12, y: 0 });

    normalZoomController.beginEraser({ x: 0, y: 0 });
    const normalZoomRadius = normalZoomController.updateStrokeEraser({ x: 20, y: 0 });

    expect(tinyZoomRadius).toBe(10);
    expect(normalZoomRadius).toBeGreaterThan(tinyZoomRadius);
  });
});
