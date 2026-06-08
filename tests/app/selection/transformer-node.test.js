import { describe, expect, it, vi } from "vitest";
import { createSelectionTransformerNode } from "../../../src/app/selection/transformer-node.js";

function createKonvaHarness() {
  let transformerInstance = null;
  class Transformer {
    constructor(config) {
      this.config = config;
      this.width = vi.fn(() => 120);
      this.height = vi.fn(() => 90);
      this.getActiveAnchor = vi.fn(() => "middle-right");
      transformerInstance = this;
    }
  }
  return {
    Konva: { Transformer },
    getTransformer: () => transformerInstance,
  };
}

function createAnchor(names = []) {
  const nameSet = new Set(names);
  return {
    hasName: vi.fn((name) => nameSet.has(name)),
    width: vi.fn(),
    height: vi.fn(),
    offsetX: vi.fn(),
    offsetY: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    cornerRadius: vi.fn(),
  };
}

describe("app selection transformer-node", () => {
  it("creates the Konva transformer and adds it to the overlay layer", () => {
    const { Konva, getTransformer } = createKonvaHarness();
    const overlayLayer = { add: vi.fn() };

    const transformer = createSelectionTransformerNode({
      Konva,
      overlayLayer,
      getSelectionTransformerController: () => ({
        clampAnchorDrag: vi.fn(),
        getActiveElements: vi.fn(() => []),
        getActiveMinWidth: vi.fn(() => 1),
        getActiveMinHeight: vi.fn(() => 1),
      }),
    });

    expect(transformer).toBe(getTransformer());
    expect(overlayLayer.add).toHaveBeenCalledWith(transformer);
    expect(transformer.config.rotateEnabled).toBe(true);
    expect(transformer.config.flipEnabled).toBe(false);
  });

  it("styles wide hit handles for edge anchors", () => {
    const { Konva } = createKonvaHarness();
    const transformer = createSelectionTransformerNode({
      Konva,
      overlayLayer: { add: vi.fn() },
      getSelectionTransformerController: () => ({
        clampAnchorDrag: vi.fn(),
        getActiveElements: vi.fn(() => []),
        getActiveMinWidth: vi.fn(() => 1),
        getActiveMinHeight: vi.fn(() => 1),
      }),
    });
    const topAnchor = createAnchor(["top-center"]);

    transformer.config.anchorStyleFunc(topAnchor);

    expect(topAnchor.width).toHaveBeenCalledWith(92);
    expect(topAnchor.height).toHaveBeenCalledWith(14);
    expect(topAnchor.offsetY).toHaveBeenCalledWith(20);
    expect(topAnchor.fill).toHaveBeenCalledWith("rgba(0,0,0,0)");
  });

  it("delegates anchor drag and clamps resized boxes through the controller", () => {
    const { Konva } = createKonvaHarness();
    const controller = {
      clampAnchorDrag: vi.fn(() => ({ x: 5, y: 6 })),
      getActiveElements: vi.fn(() => [{ type: "text" }]),
      getActiveMinWidth: vi.fn(() => 80),
      getActiveMinHeight: vi.fn(() => 40),
    };
    const getUniformScaledBoxForResize = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 20,
      height: 10,
    }));
    const transformer = createSelectionTransformerNode({
      Konva,
      overlayLayer: { add: vi.fn() },
      getSelectionTransformerController: () => controller,
      getUniformScaledBoxForResize,
    });

    expect(transformer.config.anchorDragBoundFunc({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 5, y: 6 });
    expect(controller.clampAnchorDrag).toHaveBeenCalledWith({ x: 1, y: 2 }, { x: 3, y: 4 });

    const nextBox = transformer.config.boundBoxFunc(
      { x: 10, y: 20, width: 100, height: 70 },
      { x: 10, y: 20, width: 30, height: 20 },
    );

    expect(getUniformScaledBoxForResize).toHaveBeenCalledWith({
      elements: [{ type: "text" }],
      anchor: "middle-right",
      oldBox: { x: 10, y: 20, width: 100, height: 70 },
      newBox: { x: 10, y: 20, width: 30, height: 20 },
      minWidth: 80,
      minHeight: 40,
    });
    expect(nextBox).toEqual({
      x: 0,
      y: 0,
      width: 80,
      height: 40,
    });
  });
});
