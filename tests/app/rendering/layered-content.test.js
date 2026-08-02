import { describe, expect, it, vi } from "vitest";
import { createLayeredContentController } from "../../../src/app/rendering/layered-content.js";

class FakeLayer {
  constructor(config = {}) {
    this.name = config.name;
    this.parent = null;
    this.visibleValue = true;
    this.listeningValue = true;
    this.nativeCanvas = { style: { setProperty: vi.fn() } };
    this.destroy = vi.fn(() => { this.destroyed = true; });
  }

  getParent() {
    return this.parent;
  }

  visible(value) {
    if (value !== undefined) this.visibleValue = value;
    return this.visibleValue;
  }

  listening(value) {
    if (value !== undefined) this.listeningValue = value;
    return this.listeningValue;
  }

  getNativeCanvasElement() {
    return this.nativeCanvas;
  }
}

function createHarness() {
  const stage = {
    children: [],
    add: vi.fn((layer) => {
      if (!stage.children.includes(layer)) stage.children.push(layer);
      layer.parent = stage;
    }),
  };
  const interactionLayer = new FakeLayer({ name: "interaction" });
  const overlayLayer = new FakeLayer({ name: "overlay" });
  const controller = createLayeredContentController({
    Konva: { Layer: FakeLayer },
    stage,
    interactionLayer,
    overlayLayer,
  });
  return { controller, interactionLayer, overlayLayer, stage };
}

describe("layered content", () => {
  it("renders A -> webpage -> B -> webpage -> C in separate canvas bands", () => {
    const { controller, interactionLayer, overlayLayer, stage } = createHarness();
    const elements = [
      { id: "canvas-a", type: "stroke", zIndex: 0 },
      { id: "webpage-a", type: "webpage", zIndex: 1 },
      { id: "canvas-b", type: "stroke", zIndex: 2 },
      { id: "webpage-b", type: "webpage", zIndex: 3 },
      { id: "canvas-c", type: "stroke", zIndex: 4 },
    ];

    controller.sync(elements);

    const layers = controller.getLayers();
    expect(layers).toHaveLength(3);
    expect(controller.getLayerForElement(elements[0])).toBe(layers[0]);
    expect(controller.getLayerForElement(elements[2])).toBe(layers[1]);
    expect(controller.getLayerForElement(elements[4])).toBe(layers[2]);
    expect(stage.children).toEqual([...layers, interactionLayer, overlayLayer]);
    expect(layers.map((layer) => layer.nativeCanvas.style.setProperty.mock.calls.at(-1))).toEqual([
      ["z-index", "0"],
      ["z-index", "2"],
      ["z-index", "4"],
    ]);
    expect(interactionLayer.nativeCanvas.style.setProperty).toHaveBeenLastCalledWith("z-index", "7");
    expect(overlayLayer.nativeCanvas.style.setProperty).toHaveBeenLastCalledWith("z-index", "8");
  });

  it("keeps unused canvas bands hidden and non-listening", () => {
    const { controller } = createHarness();

    controller.sync([
      { id: "canvas-a", type: "stroke", zIndex: 0 },
      { id: "webpage-a", type: "webpage", zIndex: 1 },
    ]);

    const layers = controller.getLayers();
    expect(layers).toHaveLength(2);
    expect(layers[0].visibleValue).toBe(true);
    expect(layers[0].listeningValue).toBe(true);
    expect(layers[1].visibleValue).toBe(true);
    expect(layers[1].listeningValue).toBe(true);

    controller.sync([{ id: "canvas-a", type: "stroke", zIndex: 0 }]);

    expect(layers[0].visibleValue).toBe(true);
    expect(layers[1].visibleValue).toBe(false);
    expect(layers[1].listeningValue).toBe(false);
  });
});
