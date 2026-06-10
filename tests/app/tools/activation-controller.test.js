import { describe, expect, it, vi } from "vitest";
import { createToolActivationController } from "../../../src/app/tools/activation-controller.js";
import { createToolController, getToolStatus } from "../../../src/app/tools/controller.js";
import { DEFAULT_SHAPE_TOOL, TOOLS } from "../../../src/ui/config.js";

function createRoot() {
  const buttons = [
    { dataset: { tool: TOOLS.SELECT }, classList: { toggle: vi.fn() } },
    { dataset: { tool: TOOLS.PEN }, classList: { toggle: vi.fn() } },
    { dataset: { tool: TOOLS.STRUCTURE }, classList: { toggle: vi.fn() } },
  ];
  return {
    buttons,
    querySelectorAll: vi.fn(() => buttons),
  };
}

function createStageContainer() {
  return {
    classList: { remove: vi.fn() },
    dataset: {},
  };
}

function createController({
  initialTool = TOOLS.SELECT,
  initialShapeTool = DEFAULT_SHAPE_TOOL,
} = {}) {
  let currentTool = initialTool;
  let activeShapeTool = initialShapeTool;
  const root = createRoot();
  const stageContainer = createStageContainer();
  const callbacks = {
    cancelSelectionDrag: vi.fn(),
    clearSelection: vi.fn(),
    hideToolCursors: vi.fn(),
    renderBoard: vi.fn(),
    resetLinearItemPressState: vi.fn(),
    resetLinearPointerPressState: vi.fn(),
    restorePropertyControlsForTool: vi.fn(),
    saveToolPropertyControlsForCurrentTool: vi.fn(),
    setShapePopoverOpen: vi.fn(),
    setStatus: vi.fn(),
    setStructurePanelOpen: vi.fn(),
    syncInspectorPanelState: vi.fn(),
    syncSelectionNodes: vi.fn(),
    updateChrome: vi.fn(),
    updateDraggableState: vi.fn(),
  };
  const controller = createToolActivationController({
    root,
    toolController: createToolController({ initialTool, initialShapeTool }),
    getStageContainer: () => stageContainer,
    getToolStatus,
    setActiveShapeToolState: (shapeTool) => { activeShapeTool = shapeTool; },
    setCurrentTool: (tool) => { currentTool = tool; },
    tools: TOOLS,
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    getActiveShapeTool: () => activeShapeTool,
    getCurrentTool: () => currentTool,
    root,
    stageContainer,
  };
}

describe("app tools activation-controller", () => {
  it("cancels selection gestures and refreshes app chrome when leaving select", () => {
    const { callbacks, controller, getCurrentTool, root, stageContainer } = createController({
      initialTool: TOOLS.SELECT,
    });

    controller.setTool(TOOLS.PEN);

    expect(callbacks.saveToolPropertyControlsForCurrentTool).toHaveBeenCalled();
    expect(callbacks.resetLinearItemPressState).toHaveBeenCalled();
    expect(callbacks.resetLinearPointerPressState).toHaveBeenCalled();
    expect(callbacks.cancelSelectionDrag).toHaveBeenCalled();
    expect(callbacks.setShapePopoverOpen).toHaveBeenCalledWith(false);
    expect(callbacks.setStructurePanelOpen).toHaveBeenCalledWith(false);
    expect(callbacks.clearSelection).toHaveBeenCalled();
    expect(callbacks.restorePropertyControlsForTool).toHaveBeenCalledWith(TOOLS.PEN);
    expect(callbacks.syncInspectorPanelState).toHaveBeenCalledWith({ forceReset: true });
    expect(callbacks.setStatus).toHaveBeenCalledWith("画笔：拖动画出可编辑笔触");
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(stageContainer.classList.remove).toHaveBeenCalledWith("is-erasing");
    expect(stageContainer.dataset.tool).toBe(TOOLS.PEN);
    expect(root.buttons[0].classList.toggle).toHaveBeenCalledWith("active", false);
    expect(root.buttons[1].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(getCurrentTool()).toBe(TOOLS.PEN);
  });

  it("opens the structure panel when activating the structure tool", () => {
    const { callbacks, controller, stageContainer } = createController({
      initialTool: TOOLS.PEN,
    });

    controller.setTool(TOOLS.STRUCTURE);

    expect(callbacks.setStructurePanelOpen).toHaveBeenCalledWith(true);
    expect(callbacks.setStructurePanelOpen).not.toHaveBeenCalledWith(false);
    expect(callbacks.clearSelection).toHaveBeenCalled();
    expect(callbacks.renderBoard).not.toHaveBeenCalled();
    expect(stageContainer.dataset.tool).toBe(TOOLS.STRUCTURE);
  });

  it("does not persist tool control snapshots again when reselecting the same tool", () => {
    const { callbacks, controller } = createController({
      initialTool: TOOLS.PEN,
    });

    controller.setTool(TOOLS.PEN);

    expect(callbacks.saveToolPropertyControlsForCurrentTool).not.toHaveBeenCalled();
    expect(callbacks.restorePropertyControlsForTool).not.toHaveBeenCalled();
    expect(callbacks.syncInspectorPanelState).not.toHaveBeenCalled();
    expect(callbacks.renderBoard).not.toHaveBeenCalled();
  });

  it("tracks the active shape tool through the shared tool state", () => {
    const { controller, getActiveShapeTool } = createController();

    controller.setActiveShapeTool(TOOLS.ARROW);

    expect(getActiveShapeTool()).toBe(TOOLS.ARROW);
  });

  it("does not close the shape popover when switching to the shape tool", () => {
    const { callbacks, controller } = createController({
      initialTool: TOOLS.PEN,
    });

    controller.setTool(TOOLS.SHAPE);

    // Should NOT close the shape popover when activating shape tool
    // (the controls-binding handler calls setShapePopoverOpen(true) right after)
    expect(callbacks.setShapePopoverOpen).not.toHaveBeenCalledWith(false);
  });

  it("does not close the shape popover when re-activating the same shape tool", () => {
    const { callbacks, controller } = createController({
      initialTool: TOOLS.SHAPE,
    });

    // Simulate: user already has shape tool active, clicks shape button again
    controller.setTool(TOOLS.SHAPE);

    // Should NOT close the popover (so the controls-binding handler can re-open it)
    expect(callbacks.setShapePopoverOpen).not.toHaveBeenCalledWith(false);
  });

  it("does not close the shape popover after shape sub-tool selection re-activates shape", () => {
    const { callbacks, controller } = createController({
      initialTool: TOOLS.SHAPE,
    });

    // Simulate: user selects a shape sub-tool, which calls setTool(SHAPE) again
    // This happens in the [data-shape-tool] click handler after setActiveShapeTool
    controller.setTool(TOOLS.SHAPE);

    // The sub-tool handler explicitly closes the popover AFTER setTool,
    // but setTool itself should not close it
    expect(callbacks.setShapePopoverOpen).not.toHaveBeenCalledWith(false);
  });
});
