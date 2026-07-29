import { describe, expect, it, vi } from "vitest";
import { createSelectionDragController } from "../../../src/app/selection/drag-controller.js";
import { createStructureInteraction } from "../../../src/structures/interaction.js";

function createNode({ id, x = 0, y = 0, width = 20, height = 20 } = {}) {
  let position = { x, y };
  return {
    draggable: vi.fn(),
    getClientRect: vi.fn(() => ({
      x: position.x,
      y: position.y,
      width,
      height,
    })),
    getId: () => id,
    position: vi.fn((nextPosition) => {
      position = nextPosition;
    }),
    stopDrag: vi.fn(),
    x: vi.fn(() => position.x),
    y: vi.fn(() => position.y),
  };
}

function createHarness(overrides = {}) {
  const state = {
    elements: [
      { id: "shape_1", type: "rectangle", x: 0, y: 0 },
      { id: "tree_1", type: "tree-structure", settings: { treeKind: "binary" }, x: 10, y: 10 },
      { id: "array_1", type: "array-structure", x: 20, y: 20 },
      { id: "locked_1", type: "rectangle", locked: true, x: 30, y: 30 },
    ],
    selectedIds: ["shape_1", "tree_1", "array_1", "locked_1"],
    suppressSelectionDragOnce: false,
    ...overrides.state,
  };
  const nodes = {
    "#shape_1": createNode({ id: "shape_1" }),
    "#tree_1": createNode({ id: "tree_1" }),
    "#array_1": createNode({ id: "array_1" }),
    ...overrides.nodes,
  };
  const structureInteraction = overrides.structureInteraction ?? createStructureInteraction();
  const callbacks = {
    clearAlignmentGuides: vi.fn(),
    enterDragging: vi.fn(),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    selectElementById: vi.fn((id) => { state.selectedIds = [id]; }),
    setHandledNodeDragEnd: vi.fn(),
    setSuppressNextSelectionClick: vi.fn(),
    snapBoxToAlignment: vi.fn(() => ({ dx: 0, dy: 0, snapX: null, snapY: null })),
    snapNodeToAlignment: vi.fn(),
    suppressNextLinearItemSelect: vi.fn(),
    syncNodeToElement: vi.fn(),
    syncTextOverlays: vi.fn(),
    updateTreeControlsPosition: vi.fn(),
    ...overrides.callbacks,
  };
  const contentLayer = {
    batchDraw: vi.fn(),
    findOne: vi.fn((selector) => nodes[selector] ?? null),
  };
  const transformer = {
    forceUpdate: vi.fn(),
  };
  const controller = createSelectionDragController({
    contentLayer,
    clearAlignmentGuides: callbacks.clearAlignmentGuides,
    enterDragging: callbacks.enterDragging,
    getElementIdFromNode: (node) => node?.getId?.() ?? null,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getSuppressSelectionDragOnce: () => state.suppressSelectionDragOnce,
    isBinaryTreeElement: (element) => element?.type === "tree-structure" && element.settings?.treeKind === "binary",
    isElementDraggable: (element) => Boolean(element && !element.locked),
    isElementLocked: (id) => Boolean(state.elements.find((element) => element.id === id)?.locked),
    isLinearGestureElement: vi.fn(() => false),
    isLinearStructureElement: (element) => element?.type === "array-structure",
    pushHistory: callbacks.pushHistory,
    renderBoard: callbacks.renderBoard,
    selectElementById: callbacks.selectElementById,
    setElements: (elements) => { state.elements = elements; },
    setHandledNodeDragEnd: callbacks.setHandledNodeDragEnd,
    setSuppressNextSelectionClick: callbacks.setSuppressNextSelectionClick,
    snapBoxToAlignment: callbacks.snapBoxToAlignment,
    snapNodeToAlignment: callbacks.snapNodeToAlignment,
    structureInteraction,
    suppressNextLinearItemSelect: callbacks.suppressNextLinearItemSelect,
    syncNodeToElement: callbacks.syncNodeToElement,
    syncTextOverlays: callbacks.syncTextOverlays,
    transformer,
    updateTreeControlsPosition: callbacks.updateTreeControlsPosition,
    ...overrides.controller,
  });
  return { callbacks, contentLayer, controller, nodes, state, structureInteraction, transformer };
}

describe("drag-controller", () => {
  it("moves unlocked selected elements and suppresses structure clicks after a drag", () => {
    const { callbacks, contentLayer, controller, nodes, state, structureInteraction, transformer } = createHarness();

    controller.beginSelectionDrag({ x: 0, y: 0 });
    controller.updateSelectionDrag({ x: 5, y: 7 });
    controller.finishSelectionDrag();

    expect(callbacks.enterDragging).toHaveBeenCalled();
    expect(nodes["#shape_1"].draggable).toHaveBeenCalledWith(false);
    expect(nodes["#locked_1"]?.draggable).toBeUndefined();
    expect(state.elements).toMatchObject([
      { id: "shape_1", x: 5, y: 7 },
      { id: "tree_1", x: 15, y: 17 },
      { id: "array_1", x: 25, y: 27 },
      { id: "locked_1", x: 30, y: 30 },
    ]);
    expect(transformer.forceUpdate).toHaveBeenCalled();
    expect(contentLayer.batchDraw).toHaveBeenCalled();
    expect(nodes["#shape_1"].position).toHaveBeenCalledWith({ x: 5, y: 7 });
    expect(nodes["#tree_1"].position).toHaveBeenCalledWith({ x: 15, y: 17 });
    expect(callbacks.updateTreeControlsPosition).toHaveBeenCalled();
    expect(callbacks.setSuppressNextSelectionClick).toHaveBeenCalledWith(true);
    expect(callbacks.suppressNextLinearItemSelect).toHaveBeenCalledWith("array_1");
    expect(structureInteraction.consumeSuppressedBinaryTreeNodeClick("tree_1")).toBe(true);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已移动对象");
  });

  it("updates sibling node positions during native node drag", () => {
    const { callbacks, contentLayer, controller, nodes, state, transformer } = createHarness({
      state: {
        selectedIds: ["shape_1", "array_1"],
      },
    });
    controller.beginNodeDragSelection(nodes["#shape_1"]);
    nodes["#shape_1"].x = vi.fn(() => 6);
    nodes["#shape_1"].y = vi.fn(() => 8);
    controller.updateNodeDragSelection(nodes["#shape_1"]);
    controller.finishNodeDragSelection(nodes["#shape_1"]);

    expect(nodes["#array_1"].position).toHaveBeenCalledWith({ x: 26, y: 28 });
    expect(state.elements.find((element) => element.id === "shape_1")).toMatchObject({ x: 6, y: 8 });
    expect(state.elements.find((element) => element.id === "array_1")).toMatchObject({ x: 26, y: 28 });
    expect(transformer.forceUpdate).toHaveBeenCalled();
    expect(contentLayer.batchDraw).toHaveBeenCalled();
    expect(callbacks.syncTextOverlays).toHaveBeenCalled();
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.setHandledNodeDragEnd).toHaveBeenCalledWith(true);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已移动对象");
  });

  it("clears root drag state and cancels active selection drag", () => {
    const { controller, nodes } = createHarness();

    controller.beginSelectionDrag({ x: 0, y: 0 });
    controller.clearRootDragState("shape_1");
    controller.finishNodeDragSelection(nodes["#shape_1"]);

    expect(nodes["#shape_1"].stopDrag).toHaveBeenCalled();
    expect(controller.hasSelectionDrag()).toBe(false);
    expect(nodes["#shape_1"].draggable).toHaveBeenLastCalledWith(true);
  });

  it("snaps with guides during native node drag and excludes moving elements from targets", () => {
    const { callbacks, controller, nodes } = createHarness({
      state: {
        selectedIds: ["shape_1", "array_1", "locked_1"],
      },
    });

    controller.beginNodeDragSelection(nodes["#shape_1"]);
    controller.updateNodeDragSelection(nodes["#shape_1"]);

    // 随拖拽移动的元素(shape_1、array_1)不能作为吸附目标;锁定元素 locked_1 不移动,仍是有效参照
    expect(callbacks.snapNodeToAlignment).toHaveBeenCalledWith(nodes["#shape_1"], {
      excludeIds: ["shape_1", "array_1"],
      showGuides: true,
    });
  });

  it("clears alignment guides when a native node drag finishes", () => {
    const { callbacks, controller, nodes } = createHarness({
      state: {
        selectedIds: ["shape_1"],
      },
    });

    controller.beginNodeDragSelection(nodes["#shape_1"]);
    controller.updateNodeDragSelection(nodes["#shape_1"]);
    controller.finishNodeDragSelection(nodes["#shape_1"]);

    expect(callbacks.clearAlignmentGuides).toHaveBeenCalled();
  });

  it("commits only position when moving rendered latex text", () => {
    const latexNode = createNode({ id: "text_1", x: 10, y: 20, width: 40, height: 60 });
    const { callbacks, controller } = createHarness({
      state: {
        elements: [{
          id: "text_1",
          type: "text",
          text: "$$\\frac{a+b+c+d+e}{x+y}$$",
          x: 10,
          y: 20,
          width: 40,
          height: 60,
          editWidth: 220,
          editHeight: 72,
        }],
        selectedIds: ["text_1"],
      },
      nodes: { "#text_1": latexNode },
    });

    controller.beginNodeDragSelection(latexNode);
    latexNode.position({ x: 30, y: 40 });
    controller.updateNodeDragSelection(latexNode);
    controller.finishNodeDragSelection(latexNode);

    expect(callbacks.syncNodeToElement).toHaveBeenCalledWith(latexNode, { positionOnly: true });
  });

  it("clears alignment guides when a multi-selection node drag finishes", () => {
    const { callbacks, controller, nodes } = createHarness({
      state: {
        selectedIds: ["shape_1", "array_1"],
      },
    });

    controller.beginNodeDragSelection(nodes["#shape_1"]);
    controller.updateNodeDragSelection(nodes["#shape_1"]);
    controller.finishNodeDragSelection(nodes["#shape_1"]);

    expect(callbacks.clearAlignmentGuides).toHaveBeenCalled();
  });

  it("clears alignment guides when the root drag state is reset", () => {
    const { callbacks, controller } = createHarness();

    controller.clearRootDragState("shape_1");

    expect(callbacks.clearAlignmentGuides).toHaveBeenCalled();
  });

  it("snaps selection drag against stationary elements and shows guides", () => {
    const { callbacks, controller, state } = createHarness({
      state: {
        elements: [
          { id: "shape_1", type: "rectangle", x: 0, y: 0 },
          { id: "shape_2", type: "ellipse", x: 30, y: 0 },
        ],
        selectedIds: ["shape_1"],
      },
      nodes: {
        "#shape_1": createNode({ id: "shape_1", x: 0, y: 0 }),
        "#shape_2": createNode({ id: "shape_2", x: 30, y: 0 }),
      },
      callbacks: {
        snapBoxToAlignment: vi.fn(() => ({ dx: 2, dy: 0, snapX: 30, snapY: null })),
      },
    });

    controller.beginSelectionDrag({ x: 0, y: 0 });
    controller.updateSelectionDrag({ x: 8, y: 0 });

    expect(callbacks.snapBoxToAlignment).toHaveBeenCalledWith(
      { x: 8, y: 0, width: 20, height: 20 },
      { excludeIds: ["shape_1"], showGuides: true },
    );
    expect(state.elements.find((element) => element.id === "shape_1")).toMatchObject({ x: 10, y: 0 });
  });

  it("clears alignment guides when selection drag finishes or cancels", () => {
    const { callbacks, controller } = createHarness();

    controller.beginSelectionDrag({ x: 0, y: 0 });
    controller.updateSelectionDrag({ x: 4, y: 0 });
    controller.finishSelectionDrag();
    expect(callbacks.clearAlignmentGuides).toHaveBeenCalled();

    callbacks.clearAlignmentGuides.mockClear();
    controller.beginSelectionDrag({ x: 0, y: 0 });
    controller.cancelSelectionDrag();
    expect(callbacks.clearAlignmentGuides).toHaveBeenCalled();
  });

});
