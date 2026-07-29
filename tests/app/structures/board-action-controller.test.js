import { describe, expect, it, vi } from "vitest";
import { createStructureBoardActionController } from "../../../src/app/structures/board-action-controller.js";

function createLinearElement(overrides = {}) {
  return {
    id: "array_1",
    type: "array-structure",
    items: [
      { id: "item_1", index: 0, value: "1" },
      { id: "item_2", index: 1, value: "2" },
      { id: "item_3", index: 2, value: "3" },
    ],
    ...overrides,
  };
}

function createBinaryTreeElement(overrides = {}) {
  return {
    id: "tree_1",
    type: "tree-structure",
    settings: { treeKind: "binary", rootId: "root" },
    nodes: [{ id: "root", label: "1" }],
    edges: [],
    ...overrides,
  };
}

function createController({
  elements = [],
  selectedIds = [],
  currentTool = "select",
  keepToolActive = false,
  arrayAlgorithmLocked = false,
  activeStructureType = "array",
  activeArrayInitMode = "manual",
  activeLinearItemResult = {
    previousActiveLinearItem: { elementId: "previous_array", index: 0 },
    activeLinearItem: { elementId: "array_1", index: 1 },
  },
} = {}) {
  let currentElements = elements;
  let currentSelectedIds = selectedIds;
  const callOrder = [];
  const structureInteraction = {
    clearActiveLinearItem: vi.fn(),
    setActiveLinearItem: vi.fn(() => activeLinearItemResult),
    syncActiveLinearItemAfterEdit: vi.fn(),
  };
  const callbacks = {
    beginSelectionDrag: vi.fn(),
    batchDraw: vi.fn(() => callOrder.push("batch")),
    getElementIdFromNode: vi.fn((node) => (typeof node?.id === "function" ? node.id() : node?.id ?? null)),
    getTreeNodePressWorldPoint: vi.fn(() => ({ x: 30, y: 40 })),
    getViewportCenterPoint: vi.fn(() => ({ x: 100, y: 80 })),
    pushHistory: vi.fn((message) => callOrder.push(`history:${message}`)),
    renderBinaryTreeControls: vi.fn(() => callOrder.push("binary-controls")),
    renderBoard: vi.fn(() => callOrder.push("render")),
    renderLinearItemControls: vi.fn(() => callOrder.push("linear-controls")),
    selectIds: vi.fn((ids) => {
      currentSelectedIds = ids;
      callOrder.push(`select:${ids.join(",")}`);
    }),
    setStructurePanelOpen: vi.fn((open) => callOrder.push(`panel:${open}`)),
    setTool: vi.fn((tool) => callOrder.push(`tool:${tool}`)),
    syncLinearItemActiveVisual: vi.fn((elementId) => callOrder.push(`visual:${elementId}`)),
    syncLinearPanelState: vi.fn(() => callOrder.push("panel-sync")),
    syncTreeStructurePanelState: vi.fn(() => callOrder.push("tree-panel-sync")),
  };
  const structurePanelController = {
    getActiveArrayInitMode: vi.fn(() => activeArrayInitMode),
    getActiveStructureItem: vi.fn(() => ({ label: activeStructureType === "matrix" ? "二维数组" : "数组" })),
    getActiveStructureType: vi.fn(() => activeStructureType),
    isRandomStructureInitSupported: vi.fn(() => true),
  };
  const controller = createStructureBoardActionController({
    getArrayRandomCountValue: () => "5",
    getMatrixRandomRowsValue: () => "2",
    getMatrixRandomColumnsValue: () => "3",
    getCurrentTool: () => currentTool,
    getKeepToolActive: () => keepToolActive,
    getElements: () => currentElements,
    getSelectedIds: () => currentSelectedIds,
    getStructureInputValue: () => "1,2",
    isArrayAlgorithmLocked: () => arrayAlgorithmLocked,
    isTemporaryPanActive: () => false,
    selectTool: "select",
    setElements: (nextElements) => { currentElements = nextElements; },
    structureInteraction,
    structurePanelController,
    ...callbacks,
  });
  return {
    callbacks,
    callOrder,
    controller,
    getElements: () => currentElements,
    getSelectedIds: () => currentSelectedIds,
    structureInteraction,
    structurePanelController,
  };
}

describe("board-action-controller", () => {
  it("inserts structures from the panel before selecting the new element", () => {
    const { callbacks, callOrder, controller, getElements } = createController({
      elements: [{ id: "rect_1", type: "rect", zIndex: 0 }],
      currentTool: "structure",
    });

    controller.insertStructureFromPanel();

    expect(getElements()).toHaveLength(2);
    expect(getElements()[1]).toMatchObject({ type: "array-structure", zIndex: 1 });
    expect(callbacks.setStructurePanelOpen).toHaveBeenCalledWith(false);
    expect(callbacks.setTool).toHaveBeenCalledWith("select");
    expect(callbacks.selectIds.mock.calls[0][0]).toHaveLength(1);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已添加数组");
    expect(callOrder.indexOf("tool:select")).toBeLessThan(callOrder.indexOf("render"));
    expect(callOrder.indexOf("render")).toBeLessThan(callOrder.findIndex((item) => item.startsWith("select:")));
  });

  it("keeps the structure tool active after insertion when tool locking is enabled", () => {
    const { callbacks, controller } = createController({
      currentTool: "structure",
      keepToolActive: true,
    });

    controller.insertStructureFromPanel();

    expect(callbacks.setStructurePanelOpen).toHaveBeenCalledWith(false);
    expect(callbacks.setTool).not.toHaveBeenCalled();
    expect(callbacks.selectIds).toHaveBeenCalled();
  });

  it("inserts a random matrix using separate row and column counts", () => {
    const { controller, getElements } = createController({
      activeStructureType: "matrix",
      activeArrayInitMode: "random",
    });

    controller.insertStructureFromPanel();

    expect(getElements()[0]).toMatchObject({
      type: "matrix-structure",
      rows: 2,
      columns: 3,
    });
    expect(getElements()[0].items).toHaveLength(6);
  });

  it("edits the selected linear structure unless an array algorithm locks it", () => {
    const locked = createController({
      elements: [createLinearElement()],
      selectedIds: ["array_1"],
      arrayAlgorithmLocked: true,
    });

    locked.controller.editSelectedArrayStructure((element) => ({ ...element, edited: true }));

    expect(locked.getElements()[0].edited).toBeUndefined();
    expect(locked.callbacks.renderBoard).not.toHaveBeenCalled();

    const editable = createController({
      elements: [createLinearElement()],
      selectedIds: ["array_1"],
    });

    editable.controller.editSelectedArrayStructure((element) => ({ ...element, edited: true }));

    expect(editable.getElements()[0].edited).toBe(true);
    expect(editable.structureInteraction.syncActiveLinearItemAfterEdit).toHaveBeenCalledWith({
      elements: editable.getElements(),
      elementId: "array_1",
      preferredIndex: null,
    });
    expect(editable.callbacks.selectIds).toHaveBeenCalledWith(["array_1"]);
    expect(editable.callbacks.pushHistory).toHaveBeenCalledWith("已更新线性结构");
  });

  it("syncs active linear item visuals without a full rerender when requested", () => {
    const { callbacks, controller, structureInteraction } = createController({
      elements: [createLinearElement()],
      selectedIds: ["array_1"],
    });

    controller.setActiveLinearItem("array_1", 1, { rerender: false });

    expect(structureInteraction.setActiveLinearItem).toHaveBeenCalledWith({
      elements: [createLinearElement()],
      elementId: "array_1",
      index: 1,
    });
    expect(callbacks.syncLinearPanelState).toHaveBeenCalled();
    expect(callbacks.renderBoard).not.toHaveBeenCalled();
    expect(callbacks.syncLinearItemActiveVisual).toHaveBeenCalledWith("previous_array");
    expect(callbacks.syncLinearItemActiveVisual).toHaveBeenCalledWith("array_1");
    expect(callbacks.renderLinearItemControls).toHaveBeenCalled();
    expect(callbacks.renderBinaryTreeControls).toHaveBeenCalled();
    expect(callbacks.batchDraw).toHaveBeenCalled();
  });

  it("edits selected structures and keeps dependent panels in sync", () => {
    const { callbacks, controller, getElements } = createController({
      elements: [createBinaryTreeElement()],
      selectedIds: ["tree_1"],
    });

    controller.editSelectedStructure("tree-structure", (element) => ({ ...element, edited: true }), "已更新树");

    expect(getElements()[0].edited).toBe(true);
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.selectIds).toHaveBeenCalledWith(["tree_1"]);
    expect(callbacks.syncTreeStructurePanelState).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已更新树");
  });

  it("skips history when editSelectedStructure is called with history:false (live preview)", () => {
    const { callbacks, controller, getElements } = createController({
      elements: [createBinaryTreeElement()],
      selectedIds: ["tree_1"],
    });

    controller.editSelectedStructure("tree-structure", (element) => ({ ...element, edited: true }), "已更新树", { history: false });

    expect(getElements()[0].edited).toBe(true);
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
  });

  it("routes binary tree node press into whole-tree selection drag without changing active tree nodes", () => {
    const { callbacks, controller, structureInteraction } = createController({
      elements: [createBinaryTreeElement()],
      selectedIds: [],
    });

    controller.handleTreeStructureNodePress({ evt: { shiftKey: false } }, { id: "tree_1" });

    expect(callbacks.selectIds).toHaveBeenCalledWith(["tree_1"]);
    expect(callbacks.beginSelectionDrag).toHaveBeenCalledWith({ x: 30, y: 40 });
    expect(structureInteraction.setActiveTreeNode).toBeUndefined();
    expect(callbacks.syncLinearItemActiveVisual).not.toHaveBeenCalled();
  });

  it("moves array items through the board session action boundary", () => {
    const { callbacks, controller, getElements, getSelectedIds, structureInteraction } = createController({
      elements: [createLinearElement()],
      selectedIds: ["array_1"],
    });

    controller.moveArrayStructureItem({ elementId: "array_1", fromIndex: 0, toIndex: 2 });

    expect(getElements()[0].items.map((item) => item.value)).toEqual(["2", "3", "1"]);
    expect(structureInteraction.clearActiveLinearItem).toHaveBeenCalled();
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(getSelectedIds()).toEqual([]);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已移动数组元素");
  });
});
