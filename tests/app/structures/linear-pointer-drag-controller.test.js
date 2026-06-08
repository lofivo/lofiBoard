import { describe, expect, it, vi } from "vitest";
import { createStructureInteraction } from "../../../src/structures/interaction.js";
import { createLinearStructurePointerDragController } from "../../../src/app/structures/linear-pointer-drag-controller.js";

function linearElement(overrides = {}) {
  return {
    id: "array_1",
    type: "array-structure",
    x: 0,
    y: 0,
    items: [
      { value: "A", index: 0 },
      { value: "B", index: 1 },
      { value: "C", index: 2 },
    ],
    settings: { showIndexes: true },
    ...overrides,
  };
}

function createController({ element = linearElement(), createTween } = {}) {
  let elements = [element];
  const structureInteraction = createStructureInteraction();
  const pointerNode = {
    setAttr: vi.fn(),
  };
  const group = {
    findOne: vi.fn((selector) => (selector === ".array-pointer-group" ? pointerNode : null)),
    scaleX: vi.fn(() => 1),
    scaleY: vi.fn(() => 1),
    stopDrag: vi.fn(),
    x: vi.fn(() => element.x ?? 0),
    y: vi.fn(() => element.y ?? 0),
  };
  const contentLayer = {
    findOne: vi.fn((selector) => (selector === `#${element.id}` ? group : null)),
  };
  const callbacks = {
    applyLinearPanelState: vi.fn(),
    clearRootDragState: vi.fn(),
    isElementDraggable: vi.fn(() => true),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    selectIds: vi.fn(),
    setElementDraggableState: vi.fn(),
    setLinearPanelState: vi.fn((patch) => patch),
  };
  const tweenFactory = createTween ?? vi.fn((config) => ({
    destroy: vi.fn(),
    play: vi.fn(() => config.onFinish?.()),
    config,
  }));
  const controller = createLinearStructurePointerDragController({
    contentLayer,
    createTween: tweenFactory,
    getElements: () => elements,
    setElements: (nextElements) => { elements = nextElements; },
    structureInteraction,
    ...callbacks,
  });

  return {
    callbacks,
    contentLayer,
    controller,
    getElements: () => elements,
    group,
    pointerNode,
    structureInteraction,
    tweenFactory,
  };
}

describe("linear-pointer-drag-controller", () => {
  it("starts a pointer drag and syncs the pointer field when the pointer moves immediately", () => {
    const { callbacks, controller, getElements, pointerNode, structureInteraction } = createController();

    controller.beginLinearPointerDrag({
      elementId: "array_1",
      index: 1,
      worldPoint: { x: 150, y: 0 },
    });

    expect(structureInteraction.getLinearPointerDragState()).toEqual({
      elementId: "array_1",
      fromIndex: 1,
      nextIndex: 2,
      didMove: true,
    });
    expect(callbacks.clearRootDragState).toHaveBeenCalledWith("array_1");
    expect(callbacks.setElementDraggableState).toHaveBeenCalledWith("array_1", false);
    expect(callbacks.selectIds).toHaveBeenCalledWith(["array_1"]);
    expect(getElements()[0].markers.pointer).toBe(2);
    expect(callbacks.setLinearPanelState).toHaveBeenCalledWith({ highlightPointer: "2" });
    expect(callbacks.applyLinearPanelState).toHaveBeenCalledWith({ highlightPointer: "2" });
    expect(pointerNode.setAttr).toHaveBeenCalledWith("linearIndex", 2);
  });

  it("updates pointer drag without rerendering the full structure", () => {
    const { callbacks, controller, getElements, structureInteraction } = createController({
      element: linearElement({ markers: { pointer: 1 } }),
    });

    controller.beginLinearPointerDrag({
      elementId: "array_1",
      index: 1,
      worldPoint: { x: 80, y: 0 },
    });
    expect(callbacks.renderBoard).not.toHaveBeenCalled();

    expect(controller.updateLinearPointerDrag({ x: 150, y: 0 })).toBe(true);

    expect(structureInteraction.getLinearPointerDragState()).toMatchObject({
      nextIndex: 2,
      didMove: true,
    });
    expect(getElements()[0].markers.pointer).toBe(2);
    expect(callbacks.renderBoard).not.toHaveBeenCalled();
    expect(callbacks.setLinearPanelState).toHaveBeenCalledWith({ highlightPointer: "2" });
  });

  it("commits pointer drag after the drop animation and records history only when moved", () => {
    const { callbacks, controller, structureInteraction } = createController({
      element: linearElement({ markers: { pointer: 1 } }),
    });
    structureInteraction.beginLinearPointerDrag({
      elementId: "array_1",
      fromIndex: 1,
      nextIndex: 2,
      hadPointer: true,
    });

    expect(controller.commitLinearPointerDrag()).toBe(true);

    expect(callbacks.clearRootDragState).toHaveBeenCalledWith("array_1");
    expect(callbacks.setElementDraggableState).toHaveBeenCalledWith("array_1", true);
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.selectIds).toHaveBeenCalledWith(["array_1"]);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已移动数组指针");
    expect(structureInteraction.hasLinearPointerDragState()).toBe(false);
  });

  it("cancels pointer drag and restores element dragging", () => {
    const { callbacks, controller, structureInteraction } = createController();
    structureInteraction.beginLinearPointerDrag({
      elementId: "array_1",
      fromIndex: 0,
      nextIndex: 1,
      hadPointer: true,
    });

    controller.cancelLinearPointerDrag("array_1");

    expect(structureInteraction.hasLinearPointerDragState()).toBe(false);
    expect(callbacks.setElementDraggableState).toHaveBeenCalledWith("array_1", true);
  });
});
