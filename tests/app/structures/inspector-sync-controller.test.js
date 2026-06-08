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
  const treeStructureInput = { value: "stale-tree" };
  const structureInspectorController = {
    setGraphStructureDraft: vi.fn(),
  };
  const controller = createStructureInspectorSyncController({
    root,
    graphStructureInput,
    treeStructureInput,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getActiveElement: () => state.activeElement,
    structureInspectorController,
    exportGraph: (element, format) => `${format}:${element.id}`,
    exportTree: (element) => `tree:${element.id}`,
    isLinearStructureElement: (element) => element?.type === "array-structure" || element?.type === "stack-structure",
  });
  return {
    controller,
    graphStructureInput,
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
