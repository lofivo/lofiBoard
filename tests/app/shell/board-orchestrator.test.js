import { describe, expect, it, vi } from "vitest";
import { createBoardOrchestrator } from "../../../src/app/shell/board-orchestrator.js";

/**
 * 画板编排模块测试：用 mock controller 验证编排逻辑的调用序列，
 * 不依赖完整 DOM + Konva 环境。
 */

function createMockController(methods = {}) {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in methods) return methods[prop];
        const stub = vi.fn();
        methods[prop] = stub;
        return stub;
      },
    },
  );
}

function createOrchestrator(overrides = {}) {
  const calls = [];
  const track = (name) => (...args) => calls.push({ name, args });

  let elements = overrides.elements ?? [];
  let selectedIds = overrides.selectedIds ?? [];
  let suppressNextSelectionClick = false;
  let currentTool = overrides.currentTool ?? "pen";

  const deps = {
    contentLayer: { batchDraw: track("contentLayer.batchDraw"), find: () => [] },
    overlayLayer: { batchDraw: track("overlayLayer.batchDraw") },
    transformer: { nodes: () => [], forceUpdate: track("transformer.forceUpdate") },
    syncContentLayers: track("syncContentLayers"),
    syncCanvasInteractionShield: track("syncCanvasInteractionShield"),

    shapeRenderController: { syncElementNodes: track("shapeRenderController.syncElementNodes") },
    selectionTransformerController: { syncSelectionNodes: track("selectionTransformerController.syncSelectionNodes") },
    selectionTransformCommitController: { syncSelectedNodes: track("selectionTransformCommitController.syncSelectedNodes") },
    structureControlsController: {
      renderLinearItemControls: track("structureControlsController.renderLinearItemControls"),
      renderTreeControls: track("structureControlsController.renderTreeControls"),
      renderGraphNodeControls: track("structureControlsController.renderGraphNodeControls"),
      hideLinearItemControls: track("structureControlsController.hideLinearItemControls"),
      hideTreeControls: track("structureControlsController.hideTreeControls"),
      hideBinaryTreeControls: track("structureControlsController.hideBinaryTreeControls"),
    },
    structureActiveVisualController: {
      syncLinearItemActiveVisual: track("structureActiveVisualController.syncLinearItemActiveVisual"),
      syncBinaryTreeActiveVisual: track("structureActiveVisualController.syncBinaryTreeActiveVisual"),
      syncGeneralTreeActiveVisual: track("structureActiveVisualController.syncGeneralTreeActiveVisual"),
      syncGraphActiveVisual: track("structureActiveVisualController.syncGraphActiveVisual"),
    },
    textOverlayController: {
      setHiddenIds: track("textOverlayController.setHiddenIds"),
      sync: () => Promise.resolve([]),
    },
    draftInteractionController: { moveSelectionRectToTop: track("draftInteractionController.moveSelectionRectToTop") },
    editController: { isEditing: false, editElement: track("editController.editElement") },
    selectionController: {
      setSelectedIds: (ids) => ids,
      selectElementById: (id) => [id],
      toggleSelection: (id) => [id],
    },
    selectionDragController: {
      beginNodeDragSelection: track("selectionDragController.beginNodeDragSelection"),
      updateNodeDragSelection: track("selectionDragController.updateNodeDragSelection"),
      finishNodeDragSelection: track("selectionDragController.finishNodeDragSelection"),
    },
    linearGestureController: {
      cancelLinearPointerGesture: track("linearGestureController.cancelLinearPointerGesture"),
      resetLinearItemPressState: track("linearGestureController.resetLinearItemPressState"),
      clearLinearItemSelectSuppression: track("linearGestureController.clearLinearItemSelectSuppression"),
      handleArrayPointerPress: track("linearGestureController.handleArrayPointerPress"),
    },
    structureInteraction: {
      syncSelection: () => ({ previousActiveLinearItem: null, activeLinearItem: null }),
      clearActiveTreeNode: track("structureInteraction.clearActiveTreeNode"),
      getStructureConnectState: track("structureInteraction.getStructureConnectState"),
    },
    linearStructureEventAdapter: {
      onArrayItemSelect: track("linearStructureEventAdapter.onArrayItemSelect"),
      onArrayItemPress: track("linearStructureEventAdapter.onArrayItemPress"),
      onArrayItemRelease: track("linearStructureEventAdapter.onArrayItemRelease"),
    },

    getElements: () => elements,
    setElements: (next) => { elements = next; },
    getSelectedIds: () => selectedIds,
    setSelectedIds: (next) => { selectedIds = next; },
    getCurrentTool: () => currentTool,
    getSuppressNextSelectionClick: () => suppressNextSelectionClick,
    setSuppressNextSelectionClick: (value) => { suppressNextSelectionClick = value; },

    shouldElementBeDraggable: (element) => currentTool === "select"
      && !element?.locked
      && !["text", "sticky"].includes(element?.type),
    isTemporaryPanActive: () => false,
    isLinearPointerGestureElement: () => false,
    isSelectionDragElement: () => false,
    isArrayAlgorithmLocked: () => false,
    getElementIdFromNode: () => "el-1",
    isElementLocked: () => false,

    pauseUnselectedArrayAlgorithmSessions: track("pauseUnselectedArrayAlgorithmSessions"),
    updateChrome: track("updateChrome"),
    pushHistory: track("pushHistory"),
    cancelLinearItemDragPreview: track("cancelLinearItemDragPreview"),

    moveArrayStructureItem: track("moveArrayStructureItem"),
    editArrayStructureItem: track("editArrayStructureItem"),
    editMatrixStructureItem: track("editMatrixStructureItem"),
    moveGraphStructureNode: track("moveGraphStructureNode"),
    handleGraphNodeClick: track("handleGraphNodeClick"),
    handleGraphNodeDragStart: track("handleGraphNodeDragStart"),
    editGraphStructureNode: track("editGraphStructureNode"),
    editGraphStructureEdge: track("editGraphStructureEdge"),
    editTreeStructureNode: track("editTreeStructureNode"),
    handleTreeNodeClick: track("handleTreeNodeClick"),
    handleTreeStructureNodePress: track("handleTreeStructureNodePress"),
    moveTreeStructureNode: track("moveTreeStructureNode"),
    connectTreeStructureNodes: track("connectTreeStructureNodes"),
  };

  const orchestrator = createBoardOrchestrator(deps);
  return { orchestrator, getCalls: () => calls, deps };
}

describe("board orchestrator", () => {
  describe("renderBoard", () => {
    it("syncs shapes, selection, controls and overlays in order", () => {
      const { orchestrator, getCalls } = createOrchestrator();
      orchestrator.renderBoard();
      const names = getCalls().map((c) => c.name);
      expect(names).toEqual([
        "syncContentLayers",
        "shapeRenderController.syncElementNodes",
        "draftInteractionController.moveSelectionRectToTop",
        "selectionTransformerController.syncSelectionNodes",
        "structureControlsController.renderLinearItemControls",
        "structureControlsController.renderTreeControls",
        "structureControlsController.renderGraphNodeControls",
        "contentLayer.batchDraw",
        "overlayLayer.batchDraw",
        "syncCanvasInteractionShield",
        "textOverlayController.setHiddenIds",
      ]);
    });
  });

  describe("selectIds", () => {
    it("sets selection, syncs structure, renders controls and updates chrome", () => {
      const { orchestrator, getCalls } = createOrchestrator();
      orchestrator.selectIds(["a", "b"]);
      const names = getCalls().map((c) => c.name);
      expect(names).toContain("pauseUnselectedArrayAlgorithmSessions");
      expect(names).toContain("selectionTransformerController.syncSelectionNodes");
      expect(names).toContain("structureControlsController.renderLinearItemControls");
      expect(names).toContain("structureControlsController.renderTreeControls");
      expect(names).toContain("contentLayer.batchDraw");
      expect(names).toContain("updateChrome");
    });
  });

  describe("clearSelection", () => {
    it("cancels linear drag state, hides controls, then clears selection", () => {
      const { orchestrator, getCalls } = createOrchestrator();
      orchestrator.clearSelection();
      const names = getCalls().map((c) => c.name);
      expect(names.indexOf("cancelLinearItemDragPreview")).toBeLessThan(names.indexOf("linearGestureController.cancelLinearPointerGesture"));
      expect(names).toContain("structureControlsController.hideLinearItemControls");
      expect(names).toContain("structureInteraction.clearActiveTreeNode");
      expect(names).toContain("structureControlsController.hideTreeControls");
      expect(names).toContain("structureControlsController.hideBinaryTreeControls");
      expect(names).toContain("updateChrome");
    });
  });

  describe("addElement", () => {
    it("reorders elements, renders board, and pushes history", () => {
      const { orchestrator, getCalls, deps } = createOrchestrator({ elements: [{ id: "x", type: "rect" }] });
      const newElement = { id: "y", type: "rect" };
      orchestrator.addElement(newElement, "added rect");
      expect(deps.getElements().length).toBe(2);
 expect(deps.getElements().map((e) => e.id)).toEqual(expect.arrayContaining(["x", "y"]));
      const names = getCalls().map((c) => c.name);
      expect(names).toContain("shapeRenderController.syncElementNodes");
      expect(names).toContain("pushHistory");
    });
  });

  describe("getElementNodeHandlers", () => {
    it("assembles handler map with draggable, drag, edit and structure callbacks", () => {
      const { orchestrator } = createOrchestrator({ currentTool: "select" });
      const handlers = orchestrator.getElementNodeHandlers({ id: "el-1", type: "rect" });
      expect(handlers).toHaveProperty("draggable");
      expect(handlers).toHaveProperty("onDragStart");
      expect(handlers).toHaveProperty("onDragMove");
      expect(handlers).toHaveProperty("onMove");
      expect(handlers).toHaveProperty("onSelect");
      expect(handlers).toHaveProperty("onEdit");
      expect(handlers).toHaveProperty("onArrayItemMove");
      expect(handlers).toHaveProperty("onGraphNodeMove");
      expect(handlers).toHaveProperty("onTreeNodeConnect");
      expect(handlers).toHaveProperty("getTreeConnectState");
    });

    it("suppresses selection click when flag is set", () => {
      const { orchestrator, deps } = createOrchestrator({ currentTool: "select" });
      deps.setSuppressNextSelectionClick(true);
      const handlers = orchestrator.getElementNodeHandlers({ id: "el-1", type: "rect" });
      let suppressed = false;
      handlers.onSelect({ cancelBubble: false, evt: { shiftKey: false } }, {});
      expect(deps.getSuppressNextSelectionClick()).toBe(false);
    });

    it("does not make webpage placeholders natively draggable", () => {
      const { orchestrator } = createOrchestrator({ currentTool: "select" });
      const handlers = orchestrator.getElementNodeHandlers({ id: "webpage-1", type: "webpage" });

      expect(handlers.draggable).toBe(false);
    });
  });

  describe("syncSelectedNodes", () => {
    it("delegates to commit controller then renders board", () => {
      const { orchestrator, getCalls } = createOrchestrator();
      orchestrator.syncSelectedNodes(["node-1"]);
      const names = getCalls().map((c) => c.name);
      expect(names.indexOf("selectionTransformCommitController.syncSelectedNodes")).toBeLessThan(names.indexOf("shapeRenderController.syncElementNodes"));
    });
  });

  describe("createNode", () => {
    it("calls createElementNode with handlers", () => {
      const { orchestrator } = createOrchestrator();
      const node = orchestrator.createNode({ id: "el-1", type: "rect" });
      expect(node).toBeDefined();
    });
  });
});
