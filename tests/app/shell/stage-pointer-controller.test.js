import { describe, expect, it, vi } from "vitest";
import { createStagePointerController } from "../../../src/app/shell/stage-pointer-controller.js";
import { SM } from "../../../src/tools/interaction-state-machine.js";
import { TOOLS } from "../../../src/ui/config.js";

function createStage({ worldPoint = { x: 10, y: 20 } } = {}) {
  let position = { x: 0, y: 0 };
  const container = {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  };
  return {
    container: vi.fn(() => container),
    getIntersection: vi.fn(() => ({ id: "text_1" })),
    getPointerPosition: vi.fn(() => ({ x: 20, y: 30 })),
    position: vi.fn((nextPosition) => {
      if (nextPosition) position = nextPosition;
      return position;
    }),
    setPointersPositions: vi.fn(),
    worldPoint,
  };
}

function createKonvaEvent(overrides = {}) {
  const nativeEvent = {
    button: 0,
    pointerId: 1,
    pressure: 0.5,
    preventDefault: vi.fn(),
    shiftKey: false,
    ...overrides.evt,
  };
  return {
    target: overrides.target ?? { id: "target" },
    evt: nativeEvent,
    ...overrides,
  };
}

function createHarness(overrides = {}) {
  const stage = overrides.stage ?? createStage();
  let currentTool = overrides.currentTool ?? TOOLS.SELECT;
  let selectedIds = overrides.selectedIds ?? [];
  let elements = overrides.elements ?? [
    { id: "text_1", type: "text" },
    { id: "tree_1", type: "tree-structure", settings: { treeKind: "binary" } },
    { id: "graph_1", type: "graph-structure" },
  ];
  const activeTreeNode = overrides.activeTreeNode ?? null;
  const activeGraphNode = overrides.activeGraphNode ?? null;
  const callbacks = {
    addElement: vi.fn((element) => { elements = [...elements, element]; }),
    beginDrawingPointerSession: undefined,
    clearSelection: vi.fn(() => { selectedIds = []; }),
    editElement: vi.fn(),
    enterInteraction: vi.fn(),
    eraseObjectAt: vi.fn(),
    exitInteractionToIdle: vi.fn(),
    getElementIdFromNode: vi.fn((node) => node?.id ?? null),
    getElementIdFromStageIntersection: vi.fn(() => "text_1"),
    getNearbySelectedElementId: vi.fn(() => null),
    getSelectableElementIdAtWorldPoint: vi.fn(() => null),
    handleLinearPointerMove: vi.fn(() => false),
    handleLinearPointerUp: vi.fn(() => false),
    hideBinaryTreeControls: vi.fn(),
    hideGraphNodeControls: vi.fn(),
    commitTextEditing: vi.fn(),
    hideContextMenu: vi.fn(),
    hideEraser: vi.fn(),
    hideToolCursors: vi.fn(),
    isElementLocked: vi.fn(() => false),
    isEditingText: vi.fn(() => false),
    isTransformerAnchorTarget: vi.fn(() => false),
    isTransformerTarget: vi.fn(() => false),
    persistCurrentDraft: vi.fn(),
    pushHistory: vi.fn(),
    selectElementById: vi.fn((id) => { selectedIds = [id]; }),
    selectIds: vi.fn((ids) => { selectedIds = ids; }),
    setStructurePanelOpen: vi.fn(),
    setTool: vi.fn((tool) => { currentTool = tool; }),
    setZoomMenuOpen: vi.fn(),
    shouldShowContextMenu: vi.fn(() => true),
    showContextMenu: vi.fn(),
    showBrushCursor: vi.fn(),
    showObjectEraser: vi.fn(),
    showStrokeEraser: vi.fn(),
    startStroke: vi.fn(),
    syncBinaryTreeActiveVisual: vi.fn(),
    syncGraphActiveVisual: vi.fn(),
    updateGrid: vi.fn(),
    updateSelectionDrag: vi.fn(),
    updateViewportChrome: vi.fn(),
    ...overrides.callbacks,
  };
  const selectionDragController = {
    beginSelectionDrag: vi.fn(),
    finishSelectionDrag: vi.fn(),
    hasSelectionDrag: vi.fn(() => false),
    updateSelectionDrag: callbacks.updateSelectionDrag,
    ...overrides.selectionDragController,
  };
  const drawingInteractionController = {
    appendStroke: vi.fn(),
    beginEraser: vi.fn(() => 12),
    eraseObjectAt: callbacks.eraseObjectAt,
    eraseStrokeAt: vi.fn(),
    finishEraser: vi.fn(),
    finishStroke: vi.fn(),
    hasActiveEraserSnapshot: vi.fn(() => false),
    hasStrokeDraft: vi.fn(() => false),
    startStroke: callbacks.startStroke,
    updateObjectEraser: vi.fn(),
    updateStrokeEraser: vi.fn(() => 14),
    ...overrides.drawingInteractionController,
  };
  const draftInteractionController = {
    finishSelectionDraft: vi.fn(),
    finishShapeDraft: vi.fn(),
    hasSelectionDraft: vi.fn(() => false),
    hasShapeDraft: vi.fn(() => false),
    startSelectionDraft: vi.fn(),
    startShapeDraft: vi.fn(),
    updateSelectionDraft: vi.fn(),
    updateShapeDraft: vi.fn(),
    ...overrides.draftInteractionController,
  };
  const structureInteraction = {
    clearActiveTreeNode: vi.fn(),
    clearActiveGraphNode: vi.fn(),
    getActiveTreeNode: vi.fn(() => activeTreeNode),
    getActiveGraphNode: vi.fn(() => activeGraphNode),
  };
  const controller = createStagePointerController({
    stage,
    drawingInteractionController,
    draftInteractionController,
    selectionDragController,
    structureInteraction,
    addElement: callbacks.addElement,
    clearSelection: callbacks.clearSelection,
    consumeSuppressNextCanvasSelection: overrides.consumeSuppressNextCanvasSelection ?? (() => false),
    consumeSuppressSelectionDragOnce: overrides.consumeSuppressSelectionDragOnce ?? (() => false),
    createStickyElement: vi.fn(({ point, zIndex }) => ({ id: "sticky_new", type: "sticky", point, zIndex })),
    createTextElement: vi.fn(({ point, zIndex }) => ({ id: "text_new", type: "text", point, zIndex })),
    editElement: callbacks.editElement,
    enterInteraction: callbacks.enterInteraction,
    exitInteractionToIdle: callbacks.exitInteractionToIdle,
    expandGroupedIds: (ids) => ids,
    getBoardElementCount: () => elements.length,
    getCurrentTool: () => currentTool,
    getElementIdFromNode: callbacks.getElementIdFromNode,
    getElements: () => elements,
    getIsSpaceDown: overrides.getIsSpaceDown ?? (() => false),
    getNearbySelectedElementId: callbacks.getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint: callbacks.getSelectableElementIdAtWorldPoint,
    getSelectedIds: () => selectedIds,
    getWorldPoint: () => stage.worldPoint,
    handleLinearPointerMove: callbacks.handleLinearPointerMove,
    handleLinearPointerUp: callbacks.handleLinearPointerUp,
    hideBinaryTreeControls: callbacks.hideBinaryTreeControls,
    hideGraphNodeControls: callbacks.hideGraphNodeControls,
    commitTextEditing: callbacks.commitTextEditing,
    hideContextMenu: callbacks.hideContextMenu,
    hideEraser: callbacks.hideEraser,
    hideToolCursors: callbacks.hideToolCursors,
    isBinaryTreeElement: (element) => element?.type === "tree-structure" && element.settings?.treeKind === "binary",
    isElementLocked: callbacks.isElementLocked,
    isEditingText: callbacks.isEditingText,
    isGeneralTreeElement: (element) => element?.type === "tree-structure" && element.settings?.treeKind !== "binary",
    isGraphNodeHitTarget: callbacks.isGraphNodeHitTarget ?? (() => false),
    isGraphStructureElement: (element) => element?.type === "graph-structure",
    isTemporaryPanActive: overrides.isTemporaryPanActive ?? (() => false),
    isTransformerAnchorTarget: callbacks.isTransformerAnchorTarget,
    isTransformerTarget: callbacks.isTransformerTarget,
    isTreeNodeHitTarget: callbacks.isTreeNodeHitTarget ?? (() => false),
    persistCurrentDraft: callbacks.persistCurrentDraft,
    requestAnimationFrame: (callback) => callback(),
    selectElementById: callbacks.selectElementById,
    selectIds: callbacks.selectIds,
    setStructurePanelOpen: callbacks.setStructurePanelOpen,
    setTool: callbacks.setTool,
    setZoomMenuOpen: callbacks.setZoomMenuOpen,
    shouldIgnoreCanvasPointerDown: callbacks.shouldIgnoreCanvasPointerDown ?? (() => false),
    shouldShowContextMenu: callbacks.shouldShowContextMenu,
    showBrushCursor: callbacks.showBrushCursor,
    showContextMenu: callbacks.showContextMenu,
    showObjectEraser: callbacks.showObjectEraser,
    showStrokeEraser: callbacks.showStrokeEraser,
    syncBinaryTreeActiveVisual: callbacks.syncBinaryTreeActiveVisual,
    syncGraphActiveVisual: callbacks.syncGraphActiveVisual,
    updateGrid: callbacks.updateGrid,
    updateViewportChrome: callbacks.updateViewportChrome,
  });

  return {
    callbacks,
    controller,
    draftInteractionController,
    drawingInteractionController,
    getCurrentTool: () => currentTool,
    getSelectedIds: () => selectedIds,
    selectionDragController,
    stage,
    structureInteraction,
  };
}

describe("stage-pointer-controller", () => {
  it("starts, moves, and finishes a pan gesture from temporary pan mode", () => {
    const { callbacks, controller, stage } = createHarness({
      getIsSpaceDown: () => true,
      isTemporaryPanActive: () => true,
    });

    controller.handlePointerDown(createKonvaEvent());
    stage.getPointerPosition.mockReturnValue({ x: 40, y: 60 });
    controller.handlePointerMove(createKonvaEvent());
    controller.handlePointerUp(createKonvaEvent());

    expect(callbacks.enterInteraction).toHaveBeenCalledWith(SM.PANNING);
    expect(stage.container().classList.add).toHaveBeenCalledWith("is-panning");
    expect(stage.position).toHaveBeenCalledWith({ x: 20, y: 30 });
    expect(callbacks.updateGrid).toHaveBeenCalled();
    expect(callbacks.updateViewportChrome).toHaveBeenCalled();
    expect(stage.container().classList.remove).toHaveBeenCalledWith("is-panning");
    expect(callbacks.persistCurrentDraft).toHaveBeenCalled();
    expect(callbacks.exitInteractionToIdle).toHaveBeenCalled();
  });

  it("captures the drawing pointer and ignores moves from other pointers", () => {
    const { callbacks, controller, drawingInteractionController } = createHarness({
      currentTool: TOOLS.PEN,
      drawingInteractionController: {
        hasStrokeDraft: vi.fn(() => true),
      },
    });
    const downEvent = createKonvaEvent({
      evt: {
        pointerId: 7,
        pointerType: "pen",
        pressure: 0.4,
        preventDefault: vi.fn(),
      },
    });

    controller.handlePointerDown(downEvent);
    controller.handlePointerMove(createKonvaEvent({ evt: { pointerId: 8, pointerType: "pen", pressure: 0.9 } }));
    controller.handlePointerMove(createKonvaEvent({ evt: { pointerId: 7, pointerType: "pen", pressure: 0.8 } }));
    controller.handlePointerUp(createKonvaEvent({ evt: { pointerId: 7, pointerType: "pen", preventDefault: vi.fn() } }));

    expect(downEvent.evt.preventDefault).toHaveBeenCalled();
    expect(callbacks.clearSelection).toHaveBeenCalled();
    expect(callbacks.showBrushCursor).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(callbacks.startStroke).toHaveBeenCalledWith({ x: 10, y: 20 }, 0.4);
    expect(callbacks.enterInteraction).toHaveBeenCalledWith(SM.DRAWING);
    expect(drawingInteractionController.appendStroke).toHaveBeenCalledTimes(1);
    expect(drawingInteractionController.appendStroke).toHaveBeenCalledWith({ x: 10, y: 20 }, 0.8);
    expect(drawingInteractionController.finishStroke).toHaveBeenCalled();
    expect(callbacks.exitInteractionToIdle).toHaveBeenCalled();
  });

  it("marks an eraser pointer session active before setPointerCapture can synchronously dispatch pointerleave", () => {
    let controller;
    let activeDuringCapture = false;
    const captureTarget = {
      setPointerCapture: vi.fn(() => {
        activeDuringCapture = controller.hasActiveDrawingPointerCapture();
      }),
    };
    const harness = createHarness({ currentTool: TOOLS.ERASER_STROKE });
    controller = harness.controller;

    controller.handlePointerDown(createKonvaEvent({
      evt: {
        pointerId: 7,
        pointerType: "mouse",
        target: captureTarget,
      },
    }));

    expect(captureTarget.setPointerCapture).toHaveBeenCalledWith(7);
    expect(activeDuringCapture).toBe(true);
    expect(harness.callbacks.showStrokeEraser).toHaveBeenCalledWith({ x: 10, y: 20 }, 12);
    expect(harness.drawingInteractionController.eraseStrokeAt).toHaveBeenCalledWith({ x: 10, y: 20 }, 12);
  });

  it("keeps the stroke eraser preview visible after a click finishes erasing", () => {
    let hasActiveEraser = false;
    const { callbacks, controller, drawingInteractionController } = createHarness({
      currentTool: TOOLS.ERASER_STROKE,
      drawingInteractionController: {
        beginEraser: vi.fn(() => {
          hasActiveEraser = true;
          return 12;
        }),
        finishEraser: vi.fn(() => {
          hasActiveEraser = false;
          return false;
        }),
        hasActiveEraserSnapshot: vi.fn(() => hasActiveEraser),
      },
    });

    controller.handlePointerDown(createKonvaEvent({ evt: { pointerId: 7 } }));
    controller.handlePointerUp(createKonvaEvent({ evt: { pointerId: 7 } }));

    expect(callbacks.showStrokeEraser).toHaveBeenCalledWith({ x: 10, y: 20 }, 12);
    expect(callbacks.hideEraser).not.toHaveBeenCalled();
    expect(drawingInteractionController.finishEraser).toHaveBeenCalled();
    expect(callbacks.exitInteractionToIdle).toHaveBeenCalled();
  });

  it("keeps the object eraser preview visible after a click finishes erasing", () => {
    let hasActiveEraser = false;
    const target = { id: "target" };
    const { callbacks, controller, drawingInteractionController } = createHarness({
      currentTool: TOOLS.ERASER_OBJECT,
      drawingInteractionController: {
        beginEraser: vi.fn(() => {
          hasActiveEraser = true;
          return 12;
        }),
        finishEraser: vi.fn(() => {
          hasActiveEraser = false;
          return false;
        }),
        hasActiveEraserSnapshot: vi.fn(() => hasActiveEraser),
      },
    });

    controller.handlePointerDown(createKonvaEvent({ target, evt: { pointerId: 7 } }));
    controller.handlePointerUp(createKonvaEvent({ target, evt: { pointerId: 7 } }));

    expect(callbacks.showObjectEraser).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(callbacks.hideEraser).not.toHaveBeenCalled();
    expect(drawingInteractionController.eraseObjectAt).toHaveBeenCalledWith(target);
    expect(drawingInteractionController.finishEraser).toHaveBeenCalled();
  });

  it("starts a selected tree drag from the binary tree blank area without selecting a tree node", () => {
    const { callbacks, controller, selectionDragController, structureInteraction } = createHarness({
      selectedIds: ["tree_1"],
      activeTreeNode: { elementId: "tree_1", nodeId: "node_a" },
      callbacks: {
        getSelectableElementIdAtWorldPoint: vi.fn(() => "tree_1"),
      },
    });

    controller.handlePointerDown(createKonvaEvent());

    expect(structureInteraction.clearActiveTreeNode).toHaveBeenCalled();
    expect(callbacks.hideBinaryTreeControls).toHaveBeenCalled();
    expect(callbacks.syncBinaryTreeActiveVisual).toHaveBeenCalledWith("tree_1");
    expect(selectionDragController.beginSelectionDrag).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(callbacks.selectElementById).not.toHaveBeenCalled();
  });

  it("lets graph node pointerdown flow to the graph node drag handler", () => {
    const graphNodeTarget = { id: "inner_node" };
    const { callbacks, controller, selectionDragController, structureInteraction } = createHarness({
      selectedIds: ["graph_1"],
      activeGraphNode: { elementId: "graph_1", nodeId: "A" },
      callbacks: {
        getSelectableElementIdAtWorldPoint: vi.fn(() => "graph_1"),
        isGraphNodeHitTarget: vi.fn(() => true),
      },
    });

    controller.handlePointerDown(createKonvaEvent({ target: graphNodeTarget }));

    expect(callbacks.isGraphNodeHitTarget).toHaveBeenCalledWith(graphNodeTarget);
    expect(selectionDragController.beginSelectionDrag).not.toHaveBeenCalled();
    expect(structureInteraction.clearActiveGraphNode).not.toHaveBeenCalled();
    expect(callbacks.selectElementById).not.toHaveBeenCalled();
  });

  it("consumes one-shot selection suppression before probing canvas targets", () => {
    const { callbacks, controller } = createHarness({
      callbacks: {
        getSelectableElementIdAtWorldPoint: vi.fn(() => "text_1"),
      },
      selectedIds: [],
    });

    controller.handleSelectPointerDown(createKonvaEvent(), { x: 10, y: 20 });

    expect(callbacks.getSelectableElementIdAtWorldPoint).toHaveBeenCalled();
    expect(callbacks.selectElementById).toHaveBeenCalledWith("text_1", false);

    const suppressed = createHarness({
      callbacks: {
        getSelectableElementIdAtWorldPoint: vi.fn(() => "text_1"),
      },
      consumeSuppressNextCanvasSelection: vi.fn(() => true),
    });
    suppressed.controller.handleSelectPointerDown(createKonvaEvent(), { x: 10, y: 20 });

    expect(suppressed.callbacks.getSelectableElementIdAtWorldPoint).not.toHaveBeenCalled();
    expect(suppressed.callbacks.selectElementById).not.toHaveBeenCalled();
  });

  it("selects the context menu target before showing the menu", () => {
    const { callbacks, controller, stage } = createHarness({
      selectedIds: [],
    });
    const event = {
      clientX: 100,
      clientY: 120,
      preventDefault: vi.fn(),
    };

    controller.handleContextMenu(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(stage.setPointersPositions).toHaveBeenCalledWith(event);
    expect(callbacks.selectIds).toHaveBeenCalledWith(["text_1"]);
    expect(callbacks.shouldShowContextMenu).toHaveBeenCalledWith({
      targetId: "text_1",
      selectedIds: ["text_1"],
    });
    expect(callbacks.showContextMenu).toHaveBeenCalledWith(100, 120, { targetId: "text_1" });
  });

  it("passes blank canvas context to the context menu", () => {
    const { callbacks, controller, stage } = createHarness({
      callbacks: {
        getElementIdFromNode: vi.fn(() => null),
      },
    });
    stage.getIntersection = vi.fn(() => null);
    const event = {
      clientX: 20,
      clientY: 40,
      preventDefault: vi.fn(),
    };

    controller.handleContextMenu(event);

    expect(callbacks.selectIds).not.toHaveBeenCalled();
    expect(callbacks.shouldShowContextMenu).toHaveBeenCalledWith({
      targetId: null,
      selectedIds: [],
    });
    expect(callbacks.showContextMenu).toHaveBeenCalledWith(20, 40, { targetId: null });
  });

  it("keeps object context when the transformer overlay intercepts the right-click hit", () => {
    const { callbacks, controller, stage } = createHarness({
      selectedIds: ["text_1"],
      callbacks: {
        getSelectableElementIdAtWorldPoint: vi.fn(() => "text_1"),
      },
    });
    const transformerBack = { name: "back" };
    stage.getIntersection = vi.fn(() => transformerBack);
    const event = {
      clientX: 100,
      clientY: 120,
      preventDefault: vi.fn(),
    };

    controller.handleContextMenu(event);

    expect(callbacks.getSelectableElementIdAtWorldPoint).toHaveBeenCalledWith(
      { x: 10, y: 20 },
      { fallbackNode: transformerBack },
    );
    expect(callbacks.selectIds).not.toHaveBeenCalled();
    expect(callbacks.shouldShowContextMenu).toHaveBeenCalledWith({
      targetId: "text_1",
      selectedIds: ["text_1"],
    });
    expect(callbacks.showContextMenu).toHaveBeenCalledWith(100, 120, { targetId: "text_1" });
  });

  it("keeps multi-selection context when right-clicking the empty gap inside distant selection bounds", () => {
    const { callbacks, controller, stage } = createHarness({
      selectedIds: ["text_1", "graph_1"],
      callbacks: {
        getElementIdFromNode: vi.fn(() => null),
        getNearbySelectedElementId: vi.fn(() => "text_1"),
        getSelectableElementIdAtWorldPoint: vi.fn(() => null),
      },
    });
    stage.getIntersection = vi.fn(() => ({ name: "back" }));
    const event = {
      clientX: 100,
      clientY: 120,
      preventDefault: vi.fn(),
    };

    controller.handleContextMenu(event);

    expect(callbacks.getNearbySelectedElementId).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(callbacks.selectIds).not.toHaveBeenCalled();
    expect(callbacks.shouldShowContextMenu).toHaveBeenCalledWith({
      targetId: "text_1",
      selectedIds: ["text_1", "graph_1"],
    });
    expect(callbacks.showContextMenu).toHaveBeenCalledWith(100, 120, { targetId: "text_1" });
  });

  it("resolves the right-click target from selection bounds when the pixel hit misses", () => {
    const { callbacks, controller, stage } = createHarness({
      selectedIds: [],
      callbacks: {
        getSelectableElementIdAtWorldPoint: vi.fn(() => "text_1"),
      },
    });
    stage.getIntersection = vi.fn(() => null);
    const event = {
      clientX: 100,
      clientY: 120,
      preventDefault: vi.fn(),
    };

    controller.handleContextMenu(event);

    expect(callbacks.selectIds).toHaveBeenCalledWith(["text_1"]);
    expect(callbacks.showContextMenu).toHaveBeenCalledWith(100, 120, { targetId: "text_1" });
  });

  it("commits active text editing before opening an object context menu", () => {
    const { callbacks, controller } = createHarness({
      callbacks: {
        isEditingText: vi.fn(() => true),
      },
    });
    const event = {
      clientX: 100,
      clientY: 120,
      preventDefault: vi.fn(),
    };

    controller.handleContextMenu(event);

    expect(callbacks.commitTextEditing.mock.invocationCallOrder[0]).toBeLessThan(
      callbacks.showContextMenu.mock.invocationCallOrder[0],
    );
  });
});
