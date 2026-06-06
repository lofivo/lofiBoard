import { describe, expect, it, vi } from "vitest";
import { createShapeRenderController } from "../../src/app/shape-render-controller.js";

function createFakeNode(id) {
  return {
    id,
    destroyed: false,
    draggableValue: null,
    moveTo: vi.fn(),
    moveToTop: vi.fn(),
    destroy: vi.fn(function destroy() {
      this.destroyed = true;
    }),
    draggable: vi.fn(function draggable(value) {
      this.draggableValue = value;
    }),
  };
}

function createController(overrides = {}) {
  const createdNodes = [];
  const contentLayer = {};
  const controller = createShapeRenderController({
    contentLayer,
    createNode: vi.fn((element) => {
      const node = createFakeNode(element.id);
      createdNodes.push(node);
      return node;
    }),
    syncNode: vi.fn((node, element) => {
      node.syncedElement = element;
      return true;
    }),
    getHandlers: vi.fn(() => ({})),
    getHandlerSnapshot: vi.fn(() => ""),
    projectRuntimeElement: vi.fn((element) => element),
    isNodeDraggable: vi.fn(() => true),
    ...overrides,
  });
  return { controller, contentLayer, createdNodes };
}

describe("shape-render-controller", () => {
  it("creates nodes, moves them to the content layer, and reuses unchanged snapshots", () => {
    const { controller, contentLayer, createdNodes } = createController();
    const element = { id: "a", type: "rect", x: 1 };

    controller.syncElementNodes([element]);
    controller.syncElementNodes([element]);

    expect(createdNodes).toHaveLength(1);
    expect(createdNodes[0].moveTo).toHaveBeenCalledWith(contentLayer);
    expect(createdNodes[0].moveToTop).toHaveBeenCalledTimes(2);
    expect(createdNodes[0].draggable).toHaveBeenCalledWith(true);
  });

  it("uses handler snapshots to refresh an otherwise unchanged element", () => {
    const handlerSnapshots = ["canEdit:false", "canEdit:true"];
    const { controller, createdNodes } = createController({
      getHandlerSnapshot: vi.fn(() => handlerSnapshots.shift() ?? "canEdit:true"),
    });
    const element = { id: "a", type: "array-structure", x: 1 };

    controller.syncElementNodes([element]);
    controller.syncElementNodes([element]);

    expect(createdNodes).toHaveLength(1);
    expect(createdNodes[0].syncedElement).toEqual(element);
  });

  it("destroys nodes that are no longer present", () => {
    const { controller, createdNodes } = createController();

    controller.syncElementNodes([{ id: "a", type: "rect" }, { id: "b", type: "rect" }]);
    controller.syncElementNodes([{ id: "b", type: "rect" }]);

    expect(createdNodes[0].destroy).toHaveBeenCalled();
    expect(controller.getNode("a")).toBeNull();
    expect(controller.getNode("b")).toBe(createdNodes[1]);
  });

  it("clears every tracked node and render snapshot", () => {
    const { controller, createdNodes } = createController();

    controller.syncElementNodes([{ id: "a", type: "rect" }]);
    controller.clear();

    expect(createdNodes[0].destroy).toHaveBeenCalled();
    expect(controller.getNode("a")).toBeNull();
  });
});
