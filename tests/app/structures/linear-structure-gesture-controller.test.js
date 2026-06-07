import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createLinearStructureGestureController } from "../../../src/app/structures/linear-structure-gesture-controller.js";
import { createStructureInteraction } from "../../../src/structures/structure-interaction.js";
import { LINEAR_STRUCTURE_EVENT_TYPES } from "../../../src/structures/structure-event-adapter.js";

function createHarness(overrides = {}) {
  const state = {
    currentTool: "select",
    elements: [
      {
        id: "array_1",
        type: "array-structure",
        items: [{ value: "A" }, { value: "B" }],
      },
    ],
    selectedIds: [],
    temporaryPanActive: false,
    worldPoint: { x: 0, y: 0 },
    ...overrides.state,
  };
  const structureInteraction = overrides.structureInteraction ?? createStructureInteraction();
  const callbacks = {
    batchDraw: vi.fn(),
    beginLinearItemDrag: vi.fn(),
    beginLinearPointerDrag: vi.fn(),
    beginSelectionDrag: vi.fn(),
    cancelLinearPointerDrag: vi.fn(),
    clearRootDragState: vi.fn(),
    renderBinaryTreeControls: vi.fn(),
    renderLinearItemControls: vi.fn(),
    selectIds: vi.fn((ids) => { state.selectedIds = ids; }),
    setElementDraggableState: vi.fn(),
    setSuppressSelectionDragOnce: vi.fn(),
    syncLinearItemActiveVisual: vi.fn(),
    updateLinearItemDrag: vi.fn(),
    updateLinearPointerDrag: vi.fn(),
    updateSelectionDrag: vi.fn(),
    ...overrides.callbacks,
  };
  const controller = createLinearStructureGestureController({
    getCurrentTool: () => state.currentTool,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getWorldPoint: () => state.worldPoint,
    isElementDraggable: (element) => Boolean(element && !element.locked),
    isLinearStructureElement: (element) => element?.type === "array-structure",
    isTemporaryPanActive: () => state.temporaryPanActive,
    structureInteraction,
    ...callbacks,
  });
  return { callbacks, controller, state, structureInteraction };
}

describe("linear-structure-gesture-controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("consumes suppressed item selection without selecting the array again", () => {
    const { callbacks, controller, structureInteraction } = createHarness();

    controller.suppressNextLinearItemSelect("array_1");
    expect(structureInteraction.isLinearItemSelectSuppressed("array_1")).toBe(true);

    controller.dispatchLinearStructureEvent({
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT,
      elementId: "array_1",
      index: 1,
    });

    expect(callbacks.selectIds).not.toHaveBeenCalled();
    expect(structureInteraction.isLinearItemSelectSuppressed("array_1")).toBe(false);
  });

  it("turns pre-long-press item movement into whole-array selection drag", () => {
    const { callbacks, controller, state } = createHarness();
    state.worldPoint = { x: 10, y: 10 };

    controller.dispatchLinearStructureEvent({
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS,
      elementId: "array_1",
      index: 1,
    });
    const movedPoint = { x: 18, y: 10 };

    expect(controller.handlePointerMove(movedPoint)).toBe(true);
    vi.runAllTimers();

    expect(callbacks.beginLinearItemDrag).not.toHaveBeenCalled();
    expect(callbacks.selectIds).toHaveBeenCalledWith(["array_1"]);
    expect(callbacks.beginSelectionDrag).toHaveBeenCalledWith({ x: 10, y: 10 });
    expect(callbacks.updateSelectionDrag).toHaveBeenCalledWith(movedPoint);
  });

  it("starts linear pointer drag from a held pointer press", () => {
    const { callbacks, controller, state } = createHarness();
    state.worldPoint = { x: 4, y: 5 };

    controller.handleArrayPointerPress({ elementId: "array_1", index: 0 });
    vi.advanceTimersByTime(250);

    expect(callbacks.clearRootDragState).toHaveBeenCalledWith("array_1");
    expect(callbacks.setElementDraggableState).toHaveBeenCalledWith("array_1", false);
    expect(callbacks.selectIds).toHaveBeenCalledWith(["array_1"]);
    expect(callbacks.beginLinearPointerDrag).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      worldPoint: { x: 4, y: 5 },
    });
  });
});
