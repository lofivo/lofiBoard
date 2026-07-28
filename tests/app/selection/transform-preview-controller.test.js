import { describe, expect, it, vi } from "vitest";
import { createSelectionTransformPreviewController } from "../../../src/app/selection/transform-preview-controller.js";

function createNode({
  id,
  x = 10,
  y = 20,
  width = 100,
  height = 40,
  scaleX = 1,
  scaleY = 1,
  rotation = 0,
} = {}) {
  let attrs = { x, y, width, height, scaleX, scaleY, rotation };
  return {
    id,
    attrs,
    height: vi.fn(() => attrs.height),
    rotation: vi.fn(() => attrs.rotation),
    scaleX: vi.fn(function scaleX(value) {
      if (arguments.length > 0) attrs.scaleX = value;
      return attrs.scaleX;
    }),
    scaleY: vi.fn(function scaleY(value) {
      if (arguments.length > 0) attrs.scaleY = value;
      return attrs.scaleY;
    }),
    width: vi.fn(() => attrs.width),
    x: vi.fn(() => attrs.x),
    y: vi.fn(() => attrs.y),
  };
}

function createHarness(overrides = {}) {
  const node = overrides.node ?? createNode({ id: "text_1", scaleX: 2, scaleY: 1.5 });
  const state = {
    elements: overrides.elements ?? [
      { id: "text_1", type: "text", text: "hello", fontSize: 20, padding: 4 },
    ],
  };
  const transformer = {
    forceUpdate: vi.fn(),
    getActiveAnchor: vi.fn(() => overrides.activeAnchor ?? "middle-right"),
    nodes: vi.fn(() => overrides.nodes ?? [node]),
  };
  const callbacks = {
    getMinimumTextElementWidth: vi.fn(() => 120),
    getTextElementWrappedHeight: vi.fn(() => 64),
    onTextFontSizePreview: vi.fn(),
    rerenderCoordinatePlaneNode: vi.fn(),
    syncTextNodeScalePreview: vi.fn(),
    syncTextNodeSize: vi.fn((targetNode, size) => {
      targetNode.attrs.width = size.width;
      targetNode.attrs.height = size.height;
    }),
    syncTextOverlays: vi.fn(),
    ...overrides.callbacks,
  };
  const contentLayer = { batchDraw: vi.fn() };
  const overlayLayer = { batchDraw: vi.fn() };
  const controller = createSelectionTransformPreviewController({
    contentLayer,
    overlayLayer,
    transformer,
    getElements: () => state.elements,
    getElementIdFromNode: (targetNode) => targetNode?.id ?? null,
    getMinimumTextElementWidth: callbacks.getMinimumTextElementWidth,
    getTextElementWrappedHeight: callbacks.getTextElementWrappedHeight,
    onTextFontSizePreview: callbacks.onTextFontSizePreview,
    rerenderCoordinatePlaneNode: callbacks.rerenderCoordinatePlaneNode,
    syncTextNodeScalePreview: callbacks.syncTextNodeScalePreview,
    syncTextNodeSize: callbacks.syncTextNodeSize,
    syncTextOverlays: callbacks.syncTextOverlays,
  });

  return { callbacks, contentLayer, controller, node, overlayLayer, state, transformer };
}

describe("transform-preview-controller", () => {
  it("normalizes text width resize previews and syncs text overlays", () => {
    const { callbacks, contentLayer, controller, node, overlayLayer, transformer } = createHarness({
      activeAnchor: "middle-right",
    });

    controller.syncTextWidthResize();

    expect(callbacks.getMinimumTextElementWidth).toHaveBeenCalledWith(expect.objectContaining({ id: "text_1" }));
    expect(callbacks.getTextElementWrappedHeight).toHaveBeenCalledWith(expect.objectContaining({ id: "text_1" }), 200);
    expect(callbacks.syncTextNodeSize).toHaveBeenCalledWith(node, {
      width: 200,
      height: 64,
      padding: 4,
    });
    expect(node.attrs.scaleX).toBe(1);
    expect(node.attrs.scaleY).toBe(1);
    expect(transformer.forceUpdate).toHaveBeenCalled();
    expect(contentLayer.batchDraw).toHaveBeenCalled();
    expect(overlayLayer.batchDraw).toHaveBeenCalled();
    expect(callbacks.syncTextOverlays).toHaveBeenCalledWith({
      elements: [expect.objectContaining({ id: "text_1", width: 200, height: 64, fontSize: 20 })],
    });
  });

  it("corrects text width resize previews from rendered overlay measurements", async () => {
    const { callbacks, controller, node } = createHarness({
      activeAnchor: "middle-right",
      callbacks: {
        syncTextOverlays: vi.fn(() => Promise.resolve([{ id: "text_1", height: 88 }])),
      },
    });

    controller.syncTextWidthResize();
    await Promise.resolve();

    expect(callbacks.syncTextNodeSize).toHaveBeenLastCalledWith(node, {
      width: 200,
      height: 88,
      padding: 4,
    });
  });

  it("previews text scaling without resetting node scale during corner transforms", () => {
    const { callbacks, contentLayer, controller, node } = createHarness({
      activeAnchor: "bottom-right",
    });

    controller.syncTextTransformPreview();

    expect(callbacks.syncTextNodeScalePreview).toHaveBeenCalledWith(
      node,
      expect.objectContaining({
        id: "text_1",
        width: 200,
        height: 60,
        fontSize: 40,
      }),
      { scaleX: 2, scaleY: 1.5 },
    );
    expect(node.attrs.scaleX).toBe(2);
    expect(node.attrs.scaleY).toBe(1.5);
    expect(contentLayer.batchDraw).toHaveBeenCalled();
    expect(callbacks.syncTextOverlays).toHaveBeenCalledWith({
      elements: [expect.objectContaining({ id: "text_1", fontSize: 40 })],
    });
    expect(callbacks.onTextFontSizePreview).toHaveBeenCalledWith(40);
  });

  it("corrects corner scale previews from rendered overlay measurements", async () => {
    const { callbacks, controller, node } = createHarness({
      activeAnchor: "bottom-right",
      callbacks: {
        syncTextOverlays: vi.fn(() => Promise.resolve([{ id: "text_1", height: 88 }])),
      },
    });

    controller.syncTextTransformPreview();
    await Promise.resolve();

    expect(callbacks.syncTextNodeSize).toHaveBeenLastCalledWith(node, {
      width: 100,
      height: 88 / 1.5,
      padding: 4,
    });
    expect(callbacks.syncTextNodeScalePreview).toHaveBeenLastCalledWith(
      node,
      expect.objectContaining({ id: "text_1", height: 88, fontSize: 40 }),
      { scaleX: 2, scaleY: 1.5 },
    );
  });

  it("rerenders coordinate plane resize previews and clears transient scale", () => {
    const coordinateNode = createNode({
      id: "plane_1",
      width: 100,
      height: 80,
      scaleX: 1.5,
      scaleY: 2,
    });
    const { callbacks, contentLayer, controller, overlayLayer, transformer } = createHarness({
      node: coordinateNode,
      elements: [
        { id: "plane_1", type: "coordinate-plane", width: 100, height: 80, origin: { x: 50, y: 40 } },
      ],
    });

    controller.syncCoordinatePlaneTransformPreview();

    expect(callbacks.rerenderCoordinatePlaneNode).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "plane_1",
        width: 150,
        height: 160,
        origin: { x: 75, y: 80 },
      }),
      coordinateNode,
    );
    expect(coordinateNode.attrs.scaleX).toBe(1);
    expect(coordinateNode.attrs.scaleY).toBe(1);
    expect(transformer.forceUpdate).toHaveBeenCalled();
    expect(contentLayer.batchDraw).toHaveBeenCalled();
    expect(overlayLayer.batchDraw).toHaveBeenCalled();
  });

  it("previews graph resize by clearing scale and applying real size (floored at count min)", () => {
    const graphNode = createNode({ id: "graph_1", width: 200, height: 200, scaleX: 2, scaleY: 2 });
    graphNode.applyGraphResize = vi.fn();
    const { controller, transformer } = createHarness({
      node: graphNode,
      elements: [
        { id: "graph_1", type: "graph-structure", width: 200, height: 200, style: { nodeRadius: 26 }, nodes: [{ id: "A" }, { id: "B" }], edges: [] },
      ],
    });

    controller.syncGraphTransformPreview();

    // scale 复位为 1,改用真实尺寸(200*2=400,>下限 234)
    expect(graphNode.attrs.scaleX).toBe(1);
    expect(graphNode.attrs.scaleY).toBe(1);
    expect(graphNode.applyGraphResize).toHaveBeenCalledWith(400, 400);
    expect(transformer.forceUpdate).toHaveBeenCalled();
  });

  it("floors graph resize preview at the count-derived minimum size", () => {
    const graphNode = createNode({ id: "graph_1", width: 400, height: 400, scaleX: 0.3, scaleY: 0.3 });
    graphNode.applyGraphResize = vi.fn();
    const { controller } = createHarness({
      node: graphNode,
      elements: [
        { id: "graph_1", type: "graph-structure", width: 400, height: 400, style: { nodeRadius: 26 }, nodes: [{ id: "A" }, { id: "B" }], edges: [] },
      ],
    });

    controller.syncGraphTransformPreview();

    // 400*0.3=120 < min 234 → 钳到 234
    expect(graphNode.applyGraphResize).toHaveBeenCalledWith(234, 234);
  });
});
