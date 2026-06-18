import { describe, expect, it, vi } from "vitest";
import { createStructureInspectorSyncController } from "../../../src/app/structures/inspector-sync-controller.js";

function createController(overrides = {}) {
  const state = {
    activeElement: null,
    elements: overrides.elements ?? [],
    selectedIds: overrides.selectedIds ?? [],
  };
  const root = { dataset: {} };
  const graphStructureInput = { value: "stale-graph" };
  const graphNodeScale = { value: "100" };
  const treeStructureInput = { value: "stale-tree" };
  const structureInspectorController = {
    setGraphStructureDraft: vi.fn(),
  };
  const controller = createStructureInspectorSyncController({
    root,
    graphStructureInput,
    graphNodeScale,
    treeStructureInput,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getActiveElement: () => state.activeElement,
    structureInspectorController,
    exportGraph: (element, format) => `${format}:${element.id}`,
    exportTree: (element) => `tree:${element.id}`,
    graphStructureStyle: { nodeRadius: 26 },
    isLinearStructureElement: (element) => element?.type === "array-structure" || element?.type === "stack-structure",
  });
  return {
    controller,
    graphStructureInput,
    graphNodeScale,
    root,
    state,
    structureInspectorController,
    treeStructureInput,
  };
}

describe("inspector-sync-controller", () => {
  it("derives the inspector context from homogeneous selections", () => {
    expect(createController({
      elements: [{ id: "array_1", type: "array-structure" }],
      selectedIds: ["array_1"],
    }).controller.getInspectorContext()).toBe("linear");
    expect(createController({
      elements: [{ id: "graph_1", type: "graph-structure" }],
      selectedIds: ["graph_1"],
    }).controller.getInspectorContext()).toBe("graph");
    expect(createController({
      elements: [{ id: "tree_1", type: "tree-structure" }],
      selectedIds: ["tree_1"],
    }).controller.getInspectorContext()).toBe("tree");
    expect(createController({
      elements: [{ id: "rect_1", type: "rect" }],
      selectedIds: ["rect_1"],
    }).controller.getInspectorContext()).toBe("appearance");
  });

  it("syncs graph input and draft unless the graph input is being edited", () => {
    const {
      controller,
      graphStructureInput,
      state,
      structureInspectorController,
    } = createController({
      elements: [{ id: "graph_1", type: "graph-structure" }],
      selectedIds: ["graph_1"],
    });

    controller.syncGraphStructurePanelState();

    expect(graphStructureInput.value).toBe("edge-list:graph_1");
    expect(structureInspectorController.setGraphStructureDraft).toHaveBeenCalledWith("edge-list:graph_1");

    state.activeElement = graphStructureInput;
    graphStructureInput.value = "user draft";
    controller.syncGraphStructurePanelState();

    expect(graphStructureInput.value).toBe("user draft");
    expect(structureInspectorController.setGraphStructureDraft).toHaveBeenCalledTimes(1);
  });

  it("writes the directed flag to the root dataset for the React switch", () => {
    const { controller, root } = createController({
      elements: [{ id: "graph_1", type: "graph-structure", settings: { directedDefault: true } }],
      selectedIds: ["graph_1"],
    });
    controller.syncGraphStructurePanelState();
    expect(root.dataset.graphDirected).toBe("true");

    const undirected = createController({
      elements: [{ id: "graph_2", type: "graph-structure", settings: { directedDefault: false } }],
      selectedIds: ["graph_2"],
    });
    undirected.controller.syncGraphStructurePanelState();
    expect(undirected.root.dataset.graphDirected).toBe("false");
  });

  it("syncs the node-size slider to the element's nodeRadius percentage", () => {
    const { controller, graphNodeScale, state } = createController({
      elements: [{ id: "graph_1", type: "graph-structure", style: { nodeRadius: 52 } }],
      selectedIds: ["graph_1"],
    });

    controller.syncGraphStructurePanelState();
    expect(graphNodeScale.value).toBe("200"); // 52 / 26 = 200%

    // 用户正在拖滑块时不覆盖其值
    state.activeElement = graphNodeScale;
    graphNodeScale.value = "130";
    controller.syncGraphStructurePanelState();
    expect(graphNodeScale.value).toBe("130");
  });

  it("syncs tree input and tree kind unless the tree input is being edited", () => {
    const {
      controller,
      root,
      state,
      treeStructureInput,
    } = createController({
      elements: [{ id: "tree_1", type: "tree-structure", settings: { treeKind: "binary" } }],
      selectedIds: ["tree_1"],
    });

    controller.syncTreeStructurePanelState();

    expect(treeStructureInput.value).toBe("tree:tree_1");
    expect(root.dataset.treeKind).toBe("binary");

    state.activeElement = treeStructureInput;
    treeStructureInput.value = "user tree";
    controller.syncTreeStructurePanelState();

    expect(treeStructureInput.value).toBe("user tree");
    expect(root.dataset.treeKind).toBe("binary");
  });
});
