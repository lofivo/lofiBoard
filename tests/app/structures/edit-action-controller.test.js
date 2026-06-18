import { describe, expect, it, vi } from "vitest";
import { createStructureEditActionController } from "../../../src/app/structures/edit-action-controller.js";

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
    setActiveGraphNode: vi.fn(() => ({ previousActiveGraphNode: { elementId: "previous_graph" } })),
    clearActiveGraphNode: vi.fn(() => ({ previousActiveGraphNode: { elementId: "previous_graph" } })),
    setStructureConnectSource: vi.fn(),
  };
  const callbacks = {
    consumeSuppressedBinaryTreeNodeClick: vi.fn(() => false),
    promptBoolean: vi.fn((_, fallback) => fallback),
    promptValue: vi.fn((_, fallback) => fallback),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    renderTreeNodeControls: vi.fn(),
    renderGraphNodeControls: vi.fn(),
    hideGraphNodeControls: vi.fn(),
    selectIds: vi.fn(),
    setStatus: vi.fn(),
    syncBinaryTreeActiveVisual: vi.fn(),
    syncGeneralTreeActiveVisual: vi.fn(),
    syncGraphActiveVisual: vi.fn(),
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

describe("edit-action-controller", () => {
  it("starts tree connect mode for the selected editable tree", () => {
    const { callbacks, controller, structureInteraction } = createController([createTreeElement()]);

    controller.beginTreeConnectMode();

    expect(structureInteraction.beginStructureConnect).toHaveBeenCalledWith({ kind: "tree", elementId: "tree_1" });
    expect(callbacks.selectIds).toHaveBeenCalledWith(["tree_1"]);
    expect(callbacks.setStatus).toHaveBeenCalledWith("连接父子：点击父节点，再点击子节点");
  });

  it("selects a graph node and sets active state", () => {
    const { callbacks, controller, structureInteraction } = createController([createGraphElement()]);

    controller.handleGraphNodeClick({ elementId: "graph_1", nodeId: "A" });

    expect(structureInteraction.clearStructureConnectState).toHaveBeenCalled();
    expect(structureInteraction.setActiveGraphNode).toHaveBeenCalledWith({ elementId: "graph_1", nodeId: "A" });
    expect(callbacks.selectIds).toHaveBeenCalledWith(["graph_1"]);
    expect(callbacks.syncGraphActiveVisual).toHaveBeenCalled();
    expect(callbacks.renderGraphNodeControls).toHaveBeenCalled();
    expect(callbacks.setStatus).toHaveBeenCalledWith("已选择图节点");
  });

  it("clears graph node selection when a node drag starts", () => {
    const { callbacks, controller, structureInteraction } = createController([createGraphElement()]);

    controller.handleGraphNodeDragStart({ elementId: "graph_1", nodeId: "A" });

    expect(structureInteraction.clearActiveGraphNode).toHaveBeenCalled();
    expect(callbacks.hideGraphNodeControls).toHaveBeenCalled();
    expect(callbacks.syncGraphActiveVisual).toHaveBeenCalledWith("previous_graph");
  });

  it("moveGraphStructureNode 移动节点不改变边框尺寸/原点(整图不跟随)", () => {
    const graph = {
      id: "graph_1",
      type: "graph-structure",
      x: 200,
      y: 200,
      width: 234,
      height: 234,
      style: { nodeRadius: 26 },
      settings: { directedDefault: false },
      nodes: [
        { id: "A", label: "A", x: 40, y: 40 },
        { id: "B", label: "B", x: 180, y: 180 },
      ],
      edges: [],
    };
    const { controller, getElements } = createController([graph]);

    // 把节点拖到贴近左上角(旧实现会触发负 shift 平移整图)
    controller.moveGraphStructureNode({ elementId: "graph_1", nodeId: "A", x: 0, y: 0 });

    const moved = getElements().find((element) => element.id === "graph_1");
    expect(moved.x).toBe(200);
    expect(moved.y).toBe(200);
    expect(moved.width).toBe(234);
    expect(moved.height).toBe(234);
    expect(moved.nodes.find((node) => node.id === "A")).toMatchObject({ x: 0, y: 0 });
    expect(moved.nodes.find((node) => node.id === "B")).toMatchObject({ x: 180, y: 180 });
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

  it("provides editGraphEdgeData as a noop for backward compat", () => {
    const graph = {
      ...createGraphElement(),
      edges: [{ id: "edge_1", from: "A", to: "B", directed: true, weight: "5" }],
    };
    const { controller } = createController([graph]);

    const result = controller.editGraphEdgeData(graph);

    expect(result).toBe(graph);
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
