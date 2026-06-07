import { describe, expect, it, vi } from "vitest";
import { createDraftInteractionController } from "../../../src/app/tools/draft-interaction-controller.js";
import { TOOLS } from "../../../src/ui/ui-config.js";

class FakeRect {
  constructor(attrs = {}) {
    this.attrs = { ...attrs };
    this.moveToTop = vi.fn();
  }

  setAttrs(attrs) {
    this.attrs = { ...this.attrs, ...attrs };
  }

  visible(value) {
    if (arguments.length === 0) return this.attrs.visible;
    this.attrs.visible = value;
  }

  getClientRect() {
    return this.attrs;
  }
}

function createNode(id, rect = {}) {
  return {
    elementId: id,
    destroyed: false,
    element: null,
    getClientRect: vi.fn(() => rect),
    listening: vi.fn(),
    destroy: vi.fn(function destroy() {
      this.destroyed = true;
    }),
  };
}

function createHarness(overrides = {}) {
  const state = {
    shapeNode: null,
    selectableNodes: overrides.selectableNodes ?? [],
  };
  const callbacks = {
    addElement: vi.fn(),
    applyElementToNode: vi.fn((element, node) => {
      node.element = element;
    }),
    selectIds: vi.fn(),
    setTool: vi.fn(),
    ...overrides.callbacks,
  };
  const contentLayer = {
    addedNodes: [],
    add: vi.fn(function add(node) {
      this.addedNodes.push(node);
    }),
    batchDraw: vi.fn(),
    find: vi.fn(() => state.selectableNodes),
  };
  const controller = createDraftInteractionController({
    Konva: { Rect: FakeRect },
    contentLayer,
    createNode: (element) => {
      const node = createNode(element.id);
      node.element = element;
      state.shapeNode = node;
      return node;
    },
    applyElementToNode: callbacks.applyElementToNode,
    getElementIdFromNode: (node) => node.elementId,
    expandGroupedIds: (ids) => ids.flatMap((id) => (id === "shape_1" ? ["shape_1", "child_1"] : [id])),
    getCurrentTool: () => overrides.currentTool ?? TOOLS.RECT,
    getActiveShapeTool: () => overrides.activeShapeTool ?? TOOLS.RECT,
    getBoardElementCount: () => 3,
    getBrushColor: () => "#111111",
    getStrokeWidth: () => 8,
    getFillColor: () => "#ffffff",
    isFillTransparent: () => false,
    getBrushOpacityValue: () => 0.8,
    getBrushCap: () => "round",
    getBrushStyle: () => "solid",
    isDoubleArrow: () => true,
    addElement: callbacks.addElement,
    selectIds: callbacks.selectIds,
    setTool: callbacks.setTool,
  });

  return { callbacks, contentLayer, controller, state };
}

describe("draft-interaction-controller", () => {
  it("previews, updates, and commits shape drafts", () => {
    const { callbacks, contentLayer, controller, state } = createHarness();

    controller.startShapeDraft({ x: 10, y: 20 });
    controller.updateShapeDraft({ x: 50, y: 70 });
    controller.finishShapeDraft();

    expect(state.shapeNode.listening).toHaveBeenCalledWith(false);
    expect(contentLayer.add).toHaveBeenCalledWith(state.shapeNode);
    expect(callbacks.applyElementToNode).toHaveBeenCalledWith(
      expect.objectContaining({
        id: state.shapeNode.element.id,
        type: "rect",
        x: 10,
        y: 20,
        width: 40,
        height: 50,
        stroke: "#111111",
        strokeWidth: 8,
        fill: "#ffffff",
        zIndex: 3,
      }),
      state.shapeNode,
    );
    expect(state.shapeNode.destroy).toHaveBeenCalled();
    expect(callbacks.addElement).toHaveBeenCalledWith(
      expect.objectContaining({ type: "rect", width: 40, height: 50 }),
      "已添加形状",
    );
    const committed = callbacks.addElement.mock.calls[0][0];
    expect(callbacks.selectIds).toHaveBeenCalledWith([committed.id]);
    expect(callbacks.setTool).toHaveBeenCalledWith(TOOLS.SELECT);
    expect(controller.hasShapeDraft()).toBe(false);
  });

  it("destroys tiny shape previews without committing them", () => {
    const { callbacks, controller, state } = createHarness();

    controller.startShapeDraft({ x: 10, y: 10 });
    controller.finishShapeDraft();

    expect(state.shapeNode.destroy).toHaveBeenCalled();
    expect(callbacks.addElement).not.toHaveBeenCalled();
    expect(callbacks.selectIds).not.toHaveBeenCalled();
  });

  it("renders selection drafts and selects intersecting element nodes", () => {
    const intersectingNode = createNode("shape_1", { x: 4, y: 4, width: 8, height: 8 });
    const outsideNode = createNode("shape_2", { x: 80, y: 80, width: 8, height: 8 });
    const { callbacks, contentLayer, controller } = createHarness({
      selectableNodes: [intersectingNode, outsideNode],
    });
    const selectionRect = controller.getSelectionRect();

    controller.startSelectionDraft({ x: 0, y: 0 });
    controller.updateSelectionDraft({ x: 20, y: 20 });
    controller.finishSelectionDraft();

    expect(selectionRect.attrs).toMatchObject({ x: 0, y: 0, width: 20, height: 20, visible: false });
    expect(contentLayer.batchDraw).toHaveBeenCalled();
    expect(callbacks.selectIds).toHaveBeenCalledWith(["shape_1", "child_1"]);
    expect(controller.hasSelectionDraft()).toBe(false);

    controller.moveSelectionRectToTop();
    expect(selectionRect.moveToTop).toHaveBeenCalled();
  });
});
