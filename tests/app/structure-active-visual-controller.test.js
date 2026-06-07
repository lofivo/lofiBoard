import { describe, expect, it, vi } from "vitest";
import { createStructureActiveVisualController } from "../../src/app/structures/structure-active-visual-controller.js";

function createTreeNode({ id, hasEllipse = true } = {}) {
  const ellipse = hasEllipse
    ? {
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
    }
    : null;
  return {
    getAttr: vi.fn(() => id),
    findOne: vi.fn((selector) => (selector === "Ellipse" ? ellipse : null)),
    moveToTop: vi.fn(),
    ellipse,
  };
}

function createContentLayer(groupBySelector = {}) {
  return {
    findOne: vi.fn((selector) => groupBySelector[selector] ?? null),
    batchDraw: vi.fn(),
  };
}

function createController(overrides = {}) {
  return createStructureActiveVisualController({
    contentLayer: createContentLayer(),
    getElements: () => [],
    structureInteraction: { getActiveTreeNode: vi.fn(() => null) },
    projectRuntimeElement: vi.fn((element) => element),
    getElementNodeHandlers: vi.fn(() => ({})),
    syncLinearStructureNodeContent: vi.fn(),
    isLinearStructureElement: vi.fn(() => false),
    isBinaryTreeElement: vi.fn(() => false),
    isGeneralTreeElement: vi.fn(() => false),
    treeStructureStyle: { nodeStroke: "#111827" },
    renderBinaryTreeControls: vi.fn(),
    renderTreeNodeControls: vi.fn(),
    ...overrides,
  });
}

describe("structure-active-visual-controller", () => {
  it("syncs the active linear item by projecting runtime state onto the existing group", () => {
    const dropIndicator = { moveToTop: vi.fn() };
    const group = { findOne: vi.fn(() => dropIndicator) };
    const element = { id: "array-1", type: "array-structure" };
    const runtimeElement = { ...element, runtime: { activeIndex: 1 } };
    const syncLinearStructureNodeContent = vi.fn();
    const getElementNodeHandlers = vi.fn(() => ({ draggable: true }));
    const controller = createController({
      contentLayer: createContentLayer({ "#array-1": group }),
      getElements: () => [element],
      projectRuntimeElement: vi.fn(() => runtimeElement),
      getElementNodeHandlers,
      syncLinearStructureNodeContent,
      isLinearStructureElement: vi.fn(() => true),
    });

    controller.syncLinearItemActiveVisual("array-1");

    expect(syncLinearStructureNodeContent).toHaveBeenCalledWith(group, runtimeElement, { draggable: true });
    expect(getElementNodeHandlers).toHaveBeenCalledWith(runtimeElement);
    expect(dropIndicator.moveToTop).toHaveBeenCalled();
  });

  it("updates binary tree node active styling without rebuilding the tree node group", () => {
    const inactiveNode = createTreeNode({ id: "node-1" });
    const activeNode = createTreeNode({ id: "node-2" });
    const group = { find: vi.fn(() => [inactiveNode, activeNode]) };
    const contentLayer = createContentLayer({ "#tree-1": group });
    const renderBinaryTreeControls = vi.fn();
    const controller = createController({
      contentLayer,
      getElements: () => [{
        id: "tree-1",
        type: "tree-structure",
        settings: { treeKind: "binary" },
        style: { nodeStroke: "#475569" },
      }],
      structureInteraction: {
        getActiveTreeNode: vi.fn(() => ({ elementId: "tree-1", nodeId: "node-2" })),
      },
      isBinaryTreeElement: vi.fn(() => true),
      renderBinaryTreeControls,
    });

    controller.syncBinaryTreeActiveVisual("tree-1");

    expect(inactiveNode.ellipse.stroke).toHaveBeenCalledWith("#475569");
    expect(inactiveNode.ellipse.strokeWidth).toHaveBeenCalledWith(2);
    expect(activeNode.ellipse.stroke).toHaveBeenCalledWith("#2563eb");
    expect(activeNode.ellipse.strokeWidth).toHaveBeenCalledWith(3);
    expect(activeNode.moveToTop).toHaveBeenCalled();
    expect(renderBinaryTreeControls).toHaveBeenCalled();
    expect(contentLayer.batchDraw).toHaveBeenCalled();
  });

  it("updates general tree controls after active node styling changes", () => {
    const activeNode = createTreeNode({ id: "node-1" });
    const group = { find: vi.fn(() => [activeNode]) };
    const contentLayer = createContentLayer({ "#tree-1": group });
    const renderTreeNodeControls = vi.fn();
    const controller = createController({
      contentLayer,
      getElements: () => [{ id: "tree-1", type: "tree-structure" }],
      structureInteraction: {
        getActiveTreeNode: vi.fn(() => ({ elementId: "tree-1", nodeId: "node-1" })),
      },
      isGeneralTreeElement: vi.fn(() => true),
      renderTreeNodeControls,
    });

    controller.syncGeneralTreeActiveVisual("tree-1");

    expect(activeNode.ellipse.stroke).toHaveBeenCalledWith("#2563eb");
    expect(activeNode.ellipse.strokeWidth).toHaveBeenCalledWith(3);
    expect(renderTreeNodeControls).toHaveBeenCalled();
    expect(contentLayer.batchDraw).toHaveBeenCalled();
  });
});
