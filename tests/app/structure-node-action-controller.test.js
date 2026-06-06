import { describe, expect, it, vi } from "vitest";
import { createStructureNodeActionController } from "../../src/app/structure-node-action-controller.js";

function createLinearElement() {
  return {
    id: "array_1",
    type: "array-structure",
    items: [
      { id: "item_1", value: "1" },
      { id: "item_2", value: "2" },
    ],
  };
}

function createTreeElement({ binary = false } = {}) {
  return {
    id: binary ? "binary_1" : "tree_1",
    type: "tree-structure",
    settings: { rootId: "root", treeKind: binary ? "binary" : "general" },
    style: { levelGap: 80, leafGap: 60, nodeRadius: 24 },
    nodes: [
      { id: "root", label: "1", x: 0, y: 0 },
      { id: "child", label: "2", x: 0, y: 80 },
    ],
    edges: [{ id: "edge_1", from: "root", to: "child" }],
  };
}

function createController(initialElements, {
  activeLinearItem = null,
  activeTreeNode = null,
  selectedIds = [],
} = {}) {
  let elements = initialElements;
  let currentSelectedIds = selectedIds;
  const structureInteraction = {
    clearActiveTreeNode: vi.fn(),
    getActiveLinearItem: vi.fn(() => activeLinearItem),
    getActiveTreeNode: vi.fn(() => activeTreeNode),
    setActiveTreeNode: vi.fn(),
  };
  const callbacks = {
    editSelectedStructure: vi.fn(),
    editTreeStructureNode: vi.fn(),
    hideBinaryTreeControls: vi.fn(),
    hideTreeControls: vi.fn(),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    selectIds: vi.fn((ids) => { currentSelectedIds = ids; }),
    setActiveLinearItem: vi.fn(),
    syncTreeStructurePanelState: vi.fn(),
    updateChrome: vi.fn(),
  };
  const controller = createStructureNodeActionController({
    getElements: () => elements,
    setElements: (nextElements) => { elements = nextElements; },
    getSelectedIds: () => currentSelectedIds,
    setSelectedIds: (ids) => { currentSelectedIds = ids; },
    structureInteraction,
    isLinearStructureElement: (element) => ["array-structure", "stack-structure", "queue-structure", "deque-structure"].includes(element?.type),
    isArrayAlgorithmLocked: vi.fn(() => false),
    isSelectedGeneralTreeElement: (element) => element?.type === "tree-structure" && element.settings?.treeKind !== "binary" && currentSelectedIds.includes(element.id),
    isSelectedBinaryTreeElement: (element) => element?.type === "tree-structure" && element.settings?.treeKind === "binary" && currentSelectedIds.includes(element.id),
    isTreeElementWithTraversal: (element) => element?.type === "tree-structure",
    isTreeRootNode: (element, nodeId) => nodeId === element?.settings?.rootId,
    getTreeParentNodeId: (element, nodeId) => (element?.edges ?? []).find((edge) => edge.to === nodeId)?.from ?? null,
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    getElements: () => elements,
    getSelectedIds: () => currentSelectedIds,
    structureInteraction,
  };
}

describe("structure-node-action-controller", () => {
  it("keeps the current array item selected after inserting before it", () => {
    const { callbacks, controller, getElements } = createController([createLinearElement()], {
      activeLinearItem: { elementId: "array_1", index: 1 },
      selectedIds: ["array_1"],
    });

    controller.runLinearItemAction("insert-before");

    expect(getElements()[0].items).toHaveLength(3);
    expect(callbacks.setActiveLinearItem).toHaveBeenCalledWith("array_1", 2);
    expect(callbacks.selectIds).toHaveBeenCalledWith(["array_1"]);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已插入数组项");
  });

  it("deletes an ordinary tree root as the whole tree", () => {
    const { callbacks, controller, getElements, getSelectedIds, structureInteraction } = createController([createTreeElement()], {
      activeTreeNode: { elementId: "tree_1", nodeId: "root" },
      selectedIds: ["tree_1"],
    });

    controller.runTreeNodeAction("delete");

    expect(getElements()).toEqual([]);
    expect(getSelectedIds()).toEqual([]);
    expect(structureInteraction.clearActiveTreeNode).toHaveBeenCalled();
    expect(callbacks.hideTreeControls).toHaveBeenCalled();
    expect(callbacks.updateChrome).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已删除树");
  });

  it("adds binary tree children through the selected node action", () => {
    const { callbacks, controller, getElements } = createController([createTreeElement({ binary: true })], {
      activeTreeNode: { elementId: "binary_1", nodeId: "root" },
      selectedIds: ["binary_1"],
    });

    controller.runBinaryTreeNodeAction("add-right");

    expect(getElements()[0].nodes).toHaveLength(3);
    expect(getElements()[0].edges.some((edge) => edge.from === "root")).toBe(true);
    expect(callbacks.syncTreeStructurePanelState).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已添加右子节点");
  });

  it("maps traversal actions through the selected structure edit boundary", () => {
    const { callbacks, controller } = createController([]);

    controller.runTreeTraversalAction("prev");

    expect(callbacks.editSelectedStructure).toHaveBeenCalledWith(
      "tree-structure",
      expect.any(Function),
      "已回退遍历",
    );
    const edit = callbacks.editSelectedStructure.mock.calls[0][1];
    expect(edit({ type: "rect" })).toEqual({ type: "rect" });
  });
});
