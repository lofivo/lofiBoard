import { describe, expect, it, vi } from "vitest";
import { createSelectionTransformerController } from "../../../src/app/selection/transformer-controller.js";
import { TOOLS } from "../../../src/ui/config.js";

function createNode(id) {
  return { id };
}

function createTransformer(initialNodes = []) {
  let nodesValue = initialNodes;
  const back = { draggable: vi.fn() };
  return {
    enabledAnchors: vi.fn(),
    findOne: vi.fn((selector) => (selector === ".back" ? back : null)),
    forceUpdate: vi.fn(),
    getActiveAnchor: vi.fn(() => "middle-right"),
    nodes: vi.fn(function nodes(nextNodes) {
      if (arguments.length > 0) nodesValue = nextNodes;
      return nodesValue;
    }),
    resizeEnabled: vi.fn(),
    rotateEnabled: vi.fn(),
    shouldOverdrawWholeArea: vi.fn(),
    visible: vi.fn(),
    _back: back,
  };
}

function createHarness(overrides = {}) {
  const nodes = {
    "#shape_1": createNode("shape_1"),
    "#text_1": createNode("text_1"),
  };
  const state = {
    elements: [
      { id: "shape_1", type: "rect" },
      { id: "text_1", type: "text", text: "hello", fontSize: 24 },
    ],
    selectedIds: ["shape_1"],
    ...overrides.state,
  };
  const transformer = overrides.transformer ?? createTransformer();
  const callbacks = {
    clampTransformerAnchorDragBySize: vi.fn(() => ({ x: 9, y: 10 })),
    getTextTransformMinimumSize: vi.fn(() => ({ minWidth: 120, minHeight: 48 })),
    getTransformerAnchorsForSelection: vi.fn(() => ["middle-right"]),
    getTransformerOverdrawForState: vi.fn(() => false),
    measureTextValue: vi.fn(() => 80),
    ...overrides.callbacks,
  };
  const controller = createSelectionTransformerController({
    contentLayer: {
      findOne: vi.fn((selector) => nodes[selector] ?? null),
    },
    transformer,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getCurrentTool: () => overrides.currentTool ?? TOOLS.SELECT,
    getInteractionState: () => overrides.interactionState ?? "idle",
    getStageScale: () => 2,
    getElementIdFromNode: (node) => node?.id ?? null,
    measureTextValue: callbacks.measureTextValue,
    structureInteraction: overrides.structureInteraction ?? {
      hasLinearItemDragState: () => false,
      hasLinearPointerDragState: () => false,
    },
    clampTransformerAnchorDragBySize: callbacks.clampTransformerAnchorDragBySize,
    getTextTransformMinimumSize: callbacks.getTextTransformMinimumSize,
    getTransformerAnchorsForSelection: callbacks.getTransformerAnchorsForSelection,
    getTransformerOverdrawForState: callbacks.getTransformerOverdrawForState,
  });

  return { callbacks, controller, nodes, state, transformer };
}

describe("transformer-controller", () => {
  it("hides transformer handles while linear structure drags are active", () => {
    const { controller, transformer } = createHarness({
      structureInteraction: {
        hasLinearItemDragState: () => true,
        hasLinearPointerDragState: () => false,
      },
    });

    controller.syncSelectionNodes();

    expect(transformer.nodes).toHaveBeenCalledWith([]);
    expect(transformer.visible).toHaveBeenCalledWith(false);
    expect(transformer.resizeEnabled).toHaveBeenCalledWith(false);
    expect(transformer.rotateEnabled).toHaveBeenCalledWith(false);
    expect(transformer.enabledAnchors).toHaveBeenCalledWith([]);
    expect(transformer._back.draggable).toHaveBeenCalledWith(false);
  });

  it("syncs selected nodes and applies type-aware transformer affordances", () => {
    const { callbacks, controller, nodes, transformer } = createHarness({
      state: {
        selectedIds: ["shape_1"],
      },
      callbacks: {
        getTransformerOverdrawForState: vi.fn(() => true),
      },
    });

    controller.syncSelectionNodes();

    expect(transformer.nodes).toHaveBeenCalledWith([nodes["#shape_1"]]);
    expect(transformer.visible).toHaveBeenCalledWith(true);
    expect(transformer.resizeEnabled).toHaveBeenCalledWith(true);
    expect(transformer.rotateEnabled).toHaveBeenCalledWith(true);
    expect(callbacks.getTransformerAnchorsForSelection).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "shape_1" })],
      true,
    );
    expect(transformer.enabledAnchors).toHaveBeenCalledWith(["middle-right"]);
    expect(callbacks.getTransformerOverdrawForState).toHaveBeenCalledWith("idle", [
      expect.objectContaining({ id: "shape_1" }),
    ]);
    expect(transformer.shouldOverdrawWholeArea).toHaveBeenCalledWith(true);
    expect(transformer.forceUpdate).toHaveBeenCalled();
    expect(transformer._back.draggable).toHaveBeenCalledWith(false);
  });

  it("uses text transform minimums when clamping anchor drag bounds", () => {
    const textNode = createNode("text_1");
    const transformer = createTransformer([textNode]);
    const { callbacks, controller } = createHarness({
      transformer,
      state: {
        selectedIds: ["text_1"],
      },
    });

    const result = controller.clampAnchorDrag({ x: 1, y: 2 }, { x: 3, y: 4 });

    expect(callbacks.getTextTransformMinimumSize).toHaveBeenCalledWith({
      element: expect.objectContaining({ id: "text_1" }),
      anchor: "middle-right",
      stageScale: 2,
      measureText: expect.any(Function),
    });
    expect(callbacks.clampTransformerAnchorDragBySize).toHaveBeenCalledWith({
      transformer,
      oldAbsPos: { x: 1, y: 2 },
      newAbsPos: { x: 3, y: 4 },
      minWidth: 120,
      minHeight: 48,
    });
    expect(result).toEqual({ x: 9, y: 10 });
  });
});
