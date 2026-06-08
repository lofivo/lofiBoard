import { describe, expect, it, vi } from "vitest";
import { createSelectionTransformCommitController } from "../../../src/app/selection/transform-commit-controller.js";

function createNode({
  id,
  x = 10,
  y = 20,
  width = 100,
  height = 40,
  rotation = 15,
  scaleX = 2,
  scaleY = 1.5,
} = {}) {
  return {
    height: vi.fn(() => height),
    id,
    rotation: vi.fn(() => rotation),
    scaleX: vi.fn(() => scaleX),
    scaleY: vi.fn(() => scaleY),
    width: vi.fn(() => width),
    x: vi.fn(() => x),
    y: vi.fn(() => y),
  };
}

function createHarness(overrides = {}) {
  const state = {
    elements: overrides.elements ?? [],
  };
  const callbacks = {
    getStickyScaleCommitBox: vi.fn(() => ({ width: 240, height: 180, fontSize: 28 })),
    getTextScaleCommitBox: vi.fn(() => ({ width: 180, height: 64, fontSize: 32 })),
    normalizeTextElementBox: vi.fn((element) => ({ ...element, normalized: true })),
    ...overrides.callbacks,
  };
  const controller = createSelectionTransformCommitController({
    getElements: () => state.elements,
    setElements: (elements) => {
      state.elements = elements;
    },
    getElementIdFromNode: (node) => node?.id ?? null,
    getLastTransformAnchor: () => overrides.lastTransformAnchor ?? "bottom-right",
    getStickyScaleCommitBox: callbacks.getStickyScaleCommitBox,
    getTextScaleCommitBox: callbacks.getTextScaleCommitBox,
    normalizeTextElementBox: callbacks.normalizeTextElementBox,
  });

  return { callbacks, controller, state };
}

describe("transform-commit-controller", () => {
  it("commits text transforms through text scale boxes without changing wrapping ratio", () => {
    const textElement = {
      id: "text_1",
      type: "text",
      text: "hello",
      x: 1,
      y: 2,
      width: 100,
      height: 40,
      fontSize: 20,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };
    const { callbacks, controller, state } = createHarness({
      elements: [textElement],
      lastTransformAnchor: "bottom-right",
    });
    const node = createNode({ id: "text_1", x: 11, y: 22, width: 130, height: 50, rotation: 8, scaleX: 1.4, scaleY: 1.3 });

    controller.syncNodeToElement(node);

    expect(callbacks.getTextScaleCommitBox).toHaveBeenCalledWith({
      element: textElement,
      nodeWidth: 130,
      nodeHeight: 50,
      nodeScaleX: 1.4,
      nodeScaleY: 1.3,
      anchor: "bottom-right",
    });
    expect(callbacks.normalizeTextElementBox).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "text_1",
        x: 11,
        y: 22,
        rotation: 8,
        scaleX: 1.4,
        scaleY: 1.3,
        fontSize: 32,
        width: 180,
        height: 64,
      }),
      { preserveHeight: true },
    );
    expect(state.elements[0]).toMatchObject({
      id: "text_1",
      normalized: true,
      fontSize: 32,
      width: 180,
      height: 64,
    });
  });

  it("normalizes sticky transforms by committing size and clearing transient scale", () => {
    const stickyElement = {
      id: "sticky_1",
      type: "sticky",
      width: 160,
      height: 120,
      fontSize: 20,
      scaleX: 1,
      scaleY: 1,
    };
    const { callbacks, controller, state } = createHarness({
      elements: [stickyElement],
    });
    const node = createNode({ id: "sticky_1", x: 30, y: 40, rotation: 4, scaleX: 1.5, scaleY: 1.25 });

    controller.syncNodeToElement(node);

    expect(callbacks.getStickyScaleCommitBox).toHaveBeenCalledWith({
      element: stickyElement,
      nodeScaleX: 1.5,
      nodeScaleY: 1.25,
    });
    expect(state.elements[0]).toMatchObject({
      id: "sticky_1",
      x: 30,
      y: 40,
      rotation: 4,
      width: 240,
      height: 180,
      fontSize: 28,
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("commits coordinate plane resize previews into width, height, and centered origin", () => {
    const { controller, state } = createHarness({
      elements: [
        { id: "plane_1", type: "coordinate-plane", width: 80, height: 60, origin: { x: 40, y: 30 } },
      ],
    });
    const node = createNode({ id: "plane_1", x: 5, y: 6, width: 100, height: 80, rotation: 0, scaleX: 1.5, scaleY: 2 });

    controller.syncNodeToElement(node);

    expect(state.elements[0]).toMatchObject({
      id: "plane_1",
      x: 5,
      y: 6,
      width: 150,
      height: 160,
      origin: { x: 75, y: 80 },
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("commits every active transformer node when syncing selected nodes", () => {
    const { controller, state } = createHarness({
      elements: [
        { id: "shape_1", type: "rect", x: 0, y: 0, scaleX: 1, scaleY: 1 },
        { id: "shape_2", type: "rect", x: 0, y: 0, scaleX: 1, scaleY: 1 },
      ],
    });

    controller.syncSelectedNodes([
      createNode({ id: "shape_1", x: 10, y: 20 }),
      createNode({ id: "shape_2", x: 30, y: 40 }),
    ]);

    expect(state.elements).toMatchObject([
      { id: "shape_1", x: 10, y: 20 },
      { id: "shape_2", x: 30, y: 40 },
    ]);
  });
});
