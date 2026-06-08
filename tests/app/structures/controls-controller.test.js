/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStructureControlsController } from "../../../src/app/structures/controls-controller.js";

function createContentLayer(groups = {}) {
  return {
    findOne: vi.fn((selector) => groups[selector] ?? null),
  };
}

function createController(overrides = {}) {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const controller = createStructureControlsController({
    root,
    contentLayer: createContentLayer(),
    getElements: () => [],
    getSelectedIds: () => [],
    structureInteraction: {
      getActiveLinearItem: vi.fn(() => null),
      getActiveTreeNode: vi.fn(() => null),
      hasLinearItemDragState: vi.fn(() => false),
    },
    isLinearStructureElement: vi.fn(() => false),
    isSelectedGeneralTreeElement: vi.fn(() => false),
    isSelectedBinaryTreeElement: vi.fn(() => false),
    isSelectedTreeElementWithTraversal: vi.fn(() => false),
    findTreeNodeGroup: vi.fn(() => null),
    isTreeRootNode: vi.fn(() => false),
    getBinaryTreeChildSides: vi.fn(() => ({ left: null, right: null })),
    updateLinearItemControlsPosition: vi.fn(),
    updateTreeNodeControlsPosition: vi.fn(),
    updateBinaryTreeNodeControlsPosition: vi.fn(),
    updateTreeTraversalControlsPosition: vi.fn(),
    ...overrides,
  });
  return { root, controller };
}

describe("controls-controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("creates and positions linear item controls for the selected active item", () => {
    const updateLinearItemControlsPosition = vi.fn();
    const { root, controller } = createController({
      getElements: () => [{ id: "array-1", type: "array-structure" }],
      getSelectedIds: () => ["array-1"],
      structureInteraction: {
        getActiveLinearItem: vi.fn(() => ({ elementId: "array-1", index: 1 })),
        getActiveTreeNode: vi.fn(() => null),
        hasLinearItemDragState: vi.fn(() => false),
      },
      isLinearStructureElement: vi.fn(() => true),
      updateLinearItemControlsPosition,
    });

    controller.renderLinearItemControls();
    const controls = controller.getLinearItemControls();

    expect(root.querySelector("[data-linear-item-action='insert-before']")).not.toBeNull();
    expect(controls.hidden).toBe(false);
    expect(updateLinearItemControlsPosition).toHaveBeenCalled();

    controller.hideLinearItemControls();

    expect(controls.hidden).toBe(true);
  });

  it("hides linear item controls while a linear drag state is active", () => {
    const { controller } = createController({
      getElements: () => [{ id: "array-1", type: "array-structure" }],
      getSelectedIds: () => ["array-1"],
      structureInteraction: {
        getActiveLinearItem: vi.fn(() => ({ elementId: "array-1", index: 1 })),
        getActiveTreeNode: vi.fn(() => null),
        hasLinearItemDragState: vi.fn(() => true),
      },
      isLinearStructureElement: vi.fn(() => true),
    });

    controller.renderLinearItemControls();

    expect(controller.getLinearItemControls().hidden).toBe(true);
  });

  it("renders ordinary tree controls and hides sibling actions on the root node", () => {
    const group = {};
    const treeNode = {};
    const updateTreeNodeControlsPosition = vi.fn();
    const { controller } = createController({
      contentLayer: createContentLayer({ "#tree-1": group }),
      getElements: () => [{ id: "tree-1", type: "tree-structure", locked: false }],
      structureInteraction: {
        getActiveLinearItem: vi.fn(() => null),
        getActiveTreeNode: vi.fn(() => ({ elementId: "tree-1", nodeId: "node-1" })),
        hasLinearItemDragState: vi.fn(() => false),
      },
      findTreeNodeGroup: vi.fn(() => treeNode),
      isSelectedGeneralTreeElement: vi.fn(() => true),
      isTreeRootNode: vi.fn(() => true),
      updateTreeNodeControlsPosition,
    });

    controller.renderTreeNodeControls();
    const controls = controller.getTreeNodeControls();

    expect(controls.hidden).toBe(false);
    expect(controls.querySelector("[data-tree-node-action='add-left-sibling']").hidden).toBe(true);
    expect(controls.querySelector("[data-tree-node-action='add-right-sibling']").hidden).toBe(true);
    expect(updateTreeNodeControlsPosition).toHaveBeenCalled();
  });

  it("renders binary tree controls and hides unavailable child actions", () => {
    const group = {};
    const treeNode = {};
    const { controller } = createController({
      contentLayer: createContentLayer({ "#tree-1": group }),
      getElements: () => [{ id: "tree-1", type: "tree-structure", locked: false }],
      structureInteraction: {
        getActiveLinearItem: vi.fn(() => null),
        getActiveTreeNode: vi.fn(() => ({ elementId: "tree-1", nodeId: "node-1" })),
        hasLinearItemDragState: vi.fn(() => false),
      },
      findTreeNodeGroup: vi.fn(() => treeNode),
      isSelectedBinaryTreeElement: vi.fn(() => true),
      getBinaryTreeChildSides: vi.fn(() => ({ left: "left-child", right: null })),
    });

    controller.renderBinaryTreeNodeControls();
    const controls = controller.getBinaryTreeNodeControls();

    expect(controls.hidden).toBe(false);
    expect(controls.querySelector("[data-binary-tree-node-action='add-left']").hidden).toBe(true);
    expect(controls.querySelector("[data-binary-tree-node-action='add-right']").hidden).toBe(false);
  });

  it("renders traversal controls only for a selected tree with traversal mode", () => {
    const group = {};
    const { controller } = createController({
      contentLayer: createContentLayer({ "#tree-1": group }),
      getElements: () => [{ id: "tree-1", type: "tree-structure", markers: { traversalMode: "level" } }],
      isSelectedTreeElementWithTraversal: vi.fn(() => true),
    });

    controller.renderTreeTraversalControls();

    expect(controller.getTreeTraversalControls().hidden).toBe(false);

    const { controller: hiddenController } = createController({
      getElements: () => [{ id: "tree-2", type: "tree-structure", markers: {} }],
      isSelectedTreeElementWithTraversal: vi.fn(() => true),
    });

    hiddenController.renderTreeTraversalControls();

    expect(hiddenController.getTreeTraversalControls().hidden).toBe(true);
  });
});
