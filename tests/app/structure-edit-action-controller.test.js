import { describe, expect, it, vi } from "vitest";
import { createStructureEditActionController } from "../../src/app/structure-edit-action-controller.js";

function createGraphElement() {
  return {
    id: "graph_1",
    type: "graph-structure",
    settings: { directedDefault: true },
    nodes: [
      { id: "A", label: "A", x: 0, y: 0 },
      { id: "B", label: "B", x: 100, y: 0 },
    ],
    edges: [],
  };
}

function createTreeElement({ binary = false } = {}) {
  return {
    id: "tree_1",
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
  selectedIds = initialElements.map((element) => element.id),
  connectState = null,
  finishedConnection = null,
} = {}) {
  let elements = initialElements;
  const structureInteraction = {
    beginStructureConnect: vi.fn(),
    clearStructureConnectState: vi.fn(),
    finishStructureConnect: vi.fn(() => ({ connection: finishedConnection })),
    getStructureConnectState: vi.fn(() => connectState),
    setActiveTreeNode: vi.fn(() => ({ previousActiveTreeNode: { elementId: "previous_tree" } })),
    setStructureConnectSource: vi.fn(),
  };
  const callbacks = {
    consumeSuppressedBinaryTreeNodeClick: vi.fn(() => false),
    promptBoolean: vi.fn((_, fallback) => fallback),
    promptValue: vi.fn((_, fallback) => fallback),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    renderTreeNodeControls: vi.fn(),
    selectIds: vi.fn(),
    setStatus: vi.fn(),
    syncBinaryTreeActiveVisual: vi.fn(),
    syncGeneralTreeActiveVisual: vi.fn(),
    syncTreeStructurePanelState: vi.fn(),
  };
  const controller = createStructureEditActionController({
    getElements: () => elements,
    setElements: (nextElements) => { elements = nextElements; },
    getSelectedIds: () => selectedIds,
    structureInteraction,
    isTemporaryPanActive: vi.fn(() => false),
    isBinaryTreeElement: (element) => element?.type === "tree-structure" && element.settings?.treeKind === "binary",
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    getElements: () => elements,
    structureInteraction,
  };
}

describe("structure-edit-action-controller", () => {
  it("starts tree connect mode for the selected editable tree", () => {
    const { callbacks, controller, structureInteraction } = createController([createTreeElement()]);

    controller.beginTreeConnectMode();

    expect(structureInteraction.beginStructureConnect).toHaveBeenCalledWith({ kind: "tree", elementId: "tree_1" });
    expect(callbacks.selectIds).toHaveBeenCalledWith(["tree_1"]);
    expect(callbacks.setStatus).toHaveBeenCalledWith("连接父子：点击父节点，再点击子节点");
  });

  it("uses graph connect state to add a graph edge", () => {
    const { callbacks, controller, getElements, structureInteraction } = createController([createGraphElement()], {
      connectState: { sourceNodeId: "A" },
      finishedConnection: { sourceNodeId: "A", targetNodeId: "B" },
    });

    controller.handleGraphNodeClick({ elementId: "graph_1", nodeId: "B" });

    expect(structureInteraction.finishStructureConnect).toHaveBeenCalledWith({
      kind: "graph",
      elementId: "graph_1",
      targetNodeId: "B",
    });
    expect(getElements()[0].edges).toHaveLength(1);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已添加图边");
  });

  it("selects binary tree nodes through shared active tree state", () => {
    const { callbacks, controller, structureInteraction } = createController([createTreeElement({ binary: true })]);

    controller.handleTreeNodeClick({ elementId: "tree_1", nodeId: "child" });

    expect(structureInteraction.clearStructureConnectState).toHaveBeenCalled();
    expect(structureInteraction.setActiveTreeNode).toHaveBeenCalledWith({ elementId: "tree_1", nodeId: "child" });
    expect(callbacks.syncBinaryTreeActiveVisual).toHaveBeenCalledWith("previous_tree");
    expect(callbacks.syncBinaryTreeActiveVisual).toHaveBeenCalledWith("tree_1");
    expect(callbacks.setStatus).toHaveBeenCalledWith("已选择二叉树节点");
  });

  it("edits graph edge data through prompt values", () => {
    const graph = {
      ...createGraphElement(),
      edges: [{ id: "edge_1", from: "A", to: "B", directed: false, weight: "1" }],
    };
    const { callbacks, controller } = createController([graph]);
    callbacks.promptValue.mockReturnValue("9");
    callbacks.promptBoolean.mockReturnValue(true);

    const nextGraph = controller.editGraphEdgeData(graph);

    expect(nextGraph.edges[0]).toMatchObject({ weight: "9", directed: true });
  });

  it("moves ordinary tree nodes but ignores binary tree moves", () => {
    const { callbacks, controller, getElements } = createController([createTreeElement()]);
    const beforeNode = getElements()[0].nodes.find((node) => node.id === "child");

    controller.moveTreeStructureNode({ elementId: "tree_1", nodeId: "child", x: 20, y: 30 });

    const afterNode = getElements()[0].nodes.find((node) => node.id === "child");
    expect(afterNode).not.toMatchObject({ x: beforeNode.x, y: beforeNode.y });
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已移动树节点");

    const binary = createController([createTreeElement({ binary: true })]);
    binary.controller.moveTreeStructureNode({ elementId: "tree_1", nodeId: "child", x: 20, y: 30 });

    expect(binary.callbacks.pushHistory).not.toHaveBeenCalled();
  });
});
