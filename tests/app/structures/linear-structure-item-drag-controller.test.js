import { describe, expect, it, vi } from "vitest";
import { createStructureInteraction } from "../../../src/structures/structure-interaction.js";
import { createLinearStructureItemDragController } from "../../../src/app/structures/linear-structure-item-drag-controller.js";

function linearElement(overrides = {}) {
  return {
    id: "array_1",
    type: "array-structure",
    x: 10,
    y: 20,
    items: [
      { value: "A", index: 0 },
      { value: "B", index: 1 },
      { value: "C", index: 2 },
    ],
    settings: { showIndexes: true },
    ...overrides,
  };
}

function createItemNode(index) {
  return {
    getAttr: vi.fn((name) => (name === "linearIndex" ? index : undefined)),
    setAttrs: vi.fn(),
    to: vi.fn((config) => config?.onFinish?.()),
    x: vi.fn(),
    y: vi.fn(),
  };
}

function createController({ element = linearElement(), createTween } = {}) {
  const elements = [element];
  const structureInteraction = createStructureInteraction();
  const itemNodes = [0, 1, 2].map((index) => createItemNode(index));
  const dropIndicator = {
    visible: vi.fn(),
    to: vi.fn(),
  };
  const group = {
    find: vi.fn((selector) => (selector === ".array-item" ? itemNodes : [])),
    findOne: vi.fn((selector) => (selector === ".array-drop-indicator" ? dropIndicator : null)),
  };
  const contentLayer = {
    findOne: vi.fn((selector) => (selector === `#${element.id}` ? group : null)),
    batchDraw: vi.fn(),
  };
  const callbacks = {
    setElementDraggableState: vi.fn(),
    setActiveLinearItem: vi.fn(),
    renderBoard: vi.fn(),
    moveLinearItem: vi.fn(),
    suppressNextLinearItemSelect: vi.fn(),
    clearRootDragState: vi.fn(),
    setSuppressSelectionDragOnce: vi.fn(),
  };
  const tweenFactory = createTween ?? vi.fn((config) => ({
    destroy: vi.fn(),
    play: vi.fn(),
    config,
  }));
  const controller = createLinearStructureItemDragController({
    contentLayer,
    getElements: () => elements,
    structureInteraction,
    createTween: tweenFactory,
    ...callbacks,
  });

  return {
    callbacks,
    contentLayer,
    controller,
    dropIndicator,
    element,
    group,
    itemNodes,
    structureInteraction,
    tweenFactory,
  };
}

describe("linear-structure-item-drag-controller", () => {
  it("starts a linear item drag and keeps app-level side effects explicit", () => {
    const { callbacks, controller, itemNodes, structureInteraction, tweenFactory } = createController();

    controller.beginLinearItemDrag({
      elementId: "array_1",
      index: 1,
      worldPoint: { x: 100, y: 30 },
    });

    expect(structureInteraction.getLinearItemDragState()).toMatchObject({
      elementId: "array_1",
      fromIndex: 1,
      pointerOffsetX: 18,
      pointerOffsetY: 10,
      dragX: 72,
      dragY: 0,
      previewGap: 1,
    });
    expect(callbacks.setElementDraggableState).toHaveBeenCalledWith("array_1", false);
    expect(callbacks.setActiveLinearItem).toHaveBeenCalledWith("array_1", 1, { syncPanel: false, rerender: false });
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(tweenFactory).toHaveBeenCalledWith(expect.objectContaining({ node: itemNodes[1], y: -12 }));
  });

  it("updates the drag projection through structure interaction and node attrs", () => {
    const { controller, itemNodes, structureInteraction } = createController();
    controller.beginLinearItemDrag({
      elementId: "array_1",
      index: 1,
      worldPoint: { x: 100, y: 30 },
    });

    expect(controller.updateLinearItemDrag({ x: 100, y: 30 })).toBe(true);

    expect(structureInteraction.getLinearItemDragState()).toMatchObject({
      dragX: 72,
      dragY: -12,
      previewGap: 1,
      longPressTriggered: true,
      cancelled: false,
    });
    expect(itemNodes[1].x).toHaveBeenCalledWith(72);
    expect(itemNodes[1].y).toHaveBeenCalledWith(-12);
    expect(itemNodes[1].setAttrs).toHaveBeenCalledWith(expect.objectContaining({
      scaleX: 1.04,
      opacity: 0.96,
    }));
  });

  it("finishes a committed drag by clearing root drag state and moving the item", () => {
    const { callbacks, controller, structureInteraction } = createController();
    controller.beginLinearItemDrag({
      elementId: "array_1",
      index: 1,
      worldPoint: { x: 100, y: 30 },
    });
    structureInteraction.updateLinearItemDrag({ previewGap: 3, cancelled: false });

    expect(controller.commitLinearItemDrag()).toBe(true);

    expect(callbacks.setSuppressSelectionDragOnce).toHaveBeenCalledWith(false);
    expect(callbacks.clearRootDragState).toHaveBeenCalledWith("array_1");
    expect(callbacks.suppressNextLinearItemSelect).toHaveBeenCalledWith("array_1");
    expect(callbacks.moveLinearItem).toHaveBeenCalledWith({
      elementId: "array_1",
      fromIndex: 1,
      toIndex: 2,
    });
    expect(structureInteraction.hasLinearItemDragState()).toBe(false);
  });

  it("rerenders instead of moving when a drag is cancelled", () => {
    const { callbacks, controller, structureInteraction } = createController();
    controller.beginLinearItemDrag({
      elementId: "array_1",
      index: 1,
      worldPoint: { x: 100, y: 30 },
    });
    structureInteraction.updateLinearItemDrag({ previewGap: 3, cancelled: true });

    expect(controller.commitLinearItemDrag()).toBe(true);

    expect(callbacks.moveLinearItem).not.toHaveBeenCalled();
    expect(callbacks.renderBoard).toHaveBeenCalledTimes(2);
  });
});
