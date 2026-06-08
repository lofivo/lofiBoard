import { describe, expect, it } from "vitest";
import { createStructureInteraction } from "../../src/structures/interaction.js";

function linearElement(overrides = {}) {
  return {
    id: "array_1",
    type: "array-structure",
    items: [
      { value: "A", index: 0 },
      { value: "B", index: 1 },
      { value: "C", index: 2 },
    ],
    settings: { indexBase: 0, showIndexes: true },
    ...overrides,
  };
}

function treeElement(overrides = {}) {
  return {
    id: "tree_1",
    type: "tree-structure",
    settings: { rootId: "node_1", treeKind: "general" },
    nodes: [
      { id: "node_1", label: "Root" },
      { id: "node_2", label: "Child" },
    ],
    edges: [{ source: "node_1", target: "node_2" }],
    ...overrides,
  };
}

describe("structure interaction", () => {
  it("handles linear item selection as a structure event", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();

    const result = interaction.handleEvent({
      type: "linear.item.select",
      elementId: element.id,
      index: 9,
    }, {
      elements: [element],
      currentTool: "select",
      isTemporaryPanActive: false,
    });

    expect(result).toMatchObject({
      handled: true,
      selectedIds: [element.id],
      render: false,
      clearSuppression: false,
      previousActiveLinearItem: null,
      activeLinearItem: { elementId: element.id, index: 2 },
    });
    expect(interaction.getActiveLinearItem()).toEqual({ elementId: element.id, index: 2 });
  });

  it("ignores linear item selection when the structure cannot be selected", () => {
    const cases = [
      { currentTool: "pen", isTemporaryPanActive: false, element: linearElement() },
      { currentTool: "select", isTemporaryPanActive: true, element: linearElement() },
      { currentTool: "select", isTemporaryPanActive: false, element: linearElement({ locked: true }) },
      { currentTool: "select", isTemporaryPanActive: false, element: { id: "text_1", type: "text" } },
    ];

    for (const testCase of cases) {
      const interaction = createStructureInteraction();
      const result = interaction.handleEvent({
        type: "linear.item.select",
        elementId: testCase.element.id,
        index: 0,
      }, {
        elements: [testCase.element],
        currentTool: testCase.currentTool,
        isTemporaryPanActive: testCase.isTemporaryPanActive,
      });

      expect(result).toEqual({ handled: false });
      expect(interaction.getActiveLinearItem()).toBeNull();
    }
  });

  it("handles linear item press as a structure event result", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();

    const result = interaction.handleEvent({
      type: "linear.item.press",
      elementId: element.id,
      index: 1,
    }, {
      elements: [element],
      currentTool: "select",
      isTemporaryPanActive: false,
    });

    expect(result).toEqual({
      handled: true,
      clearSuppression: true,
      suppressSelectionDragOnce: false,
      stopElementDrag: true,
      pressState: {
        elementId: element.id,
        index: 1,
        phase: "start",
      },
    });
  });

  it("ignores linear item press when the structure cannot be pressed", () => {
    const cases = [
      { currentTool: "pen", isTemporaryPanActive: false, element: linearElement() },
      { currentTool: "select", isTemporaryPanActive: true, element: linearElement() },
      { currentTool: "select", isTemporaryPanActive: false, element: linearElement({ locked: true }) },
      { currentTool: "select", isTemporaryPanActive: false, element: { id: "text_1", type: "text" } },
    ];

    for (const testCase of cases) {
      const interaction = createStructureInteraction();
      const result = interaction.handleEvent({
        type: "linear.item.press",
        elementId: testCase.element.id,
        index: 0,
      }, {
        elements: [testCase.element],
        currentTool: testCase.currentTool,
        isTemporaryPanActive: testCase.isTemporaryPanActive,
      });

      expect(result).toEqual({ handled: false });
    }
  });

  it("handles linear item release according to active drag state", () => {
    const interaction = createStructureInteraction();

    expect(interaction.handleEvent({ type: "linear.item.release" })).toEqual({
      handled: true,
      resetLinearItemPressState: true,
    });

    interaction.beginLinearItemDrag({ elementId: "array_1", fromIndex: 0 });

    expect(interaction.handleEvent({ type: "linear.item.release" })).toEqual({
      handled: true,
      resetLinearItemPressState: false,
    });
  });

  it("consumes a suppressed linear item selection without changing active state", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();
    interaction.setActiveLinearItem({ elements: [element], elementId: element.id, index: 1 });

    const result = interaction.handleEvent({
      type: "linear.item.select",
      elementId: element.id,
      index: 2,
    }, {
      elements: [element],
      currentTool: "select",
      isTemporaryPanActive: false,
      isLinearItemSelectSuppressed: true,
    });

    expect(result).toEqual({ handled: true, clearSuppression: true });
    expect(interaction.getActiveLinearItem()).toEqual({ elementId: element.id, index: 1 });
  });

  it("projects active linear item runtime without mutating the board element", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();
    interaction.setActiveLinearItem({ elements: [element], elementId: element.id, index: 1 });

    const projected = interaction.projectRuntime(element);

    expect(projected).toEqual({
      ...element,
      runtime: { activeIndex: 1 },
    });
    expect(projected).not.toBe(element);
    expect(element.runtime).toBeUndefined();
    expect(JSON.stringify(element)).not.toContain("runtime");
  });

  it("projects linear item drag runtime and clears the drag preview state", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();

    const started = interaction.beginLinearItemDrag({
      elementId: element.id,
      fromIndex: 1,
      pointerOffsetX: 7,
      pointerOffsetY: 8,
      dragX: 72,
      dragY: 0,
      previewGap: 1,
    });

    expect(started.linearItemDragState).toMatchObject({
      elementId: element.id,
      fromIndex: 1,
      pointerOffsetX: 7,
      pointerOffsetY: 8,
      dragX: 72,
      dragY: 0,
      previewGap: 1,
      lastAnimatedGap: 1,
      longPressTriggered: false,
      cancelled: false,
    });
    expect(interaction.hasLinearItemDragState()).toBe(true);

    interaction.markLinearItemDragLifted();
    interaction.updateLinearItemDrag({
      dragX: 108,
      dragY: -12,
      previewGap: 2,
      cancelled: false,
      dragYRaw: -6,
      lastAnimatedGap: 2,
    });

    expect(interaction.projectRuntime(element).runtime).toMatchObject({
      dragIndex: 1,
      dragGap: 2,
      dragX: 108,
      dragY: -12,
      dragLift: true,
    });
    expect(element.runtime).toBeUndefined();

    const finished = interaction.finishLinearItemDrag();
    expect(finished.linearItemDragState).toMatchObject({
      elementId: element.id,
      fromIndex: 1,
      previewGap: 2,
      longPressTriggered: true,
    });
    expect(interaction.hasLinearItemDragState()).toBe(false);
    expect(interaction.projectRuntime(element)).toBe(element);
  });

  it("tracks linear pointer drag state and reports whether the pointer moved", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();

    const started = interaction.beginLinearPointerDrag({
      elementId: element.id,
      fromIndex: 1,
      nextIndex: 1,
      hadPointer: false,
    });

    expect(started.linearPointerDragState).toEqual({
      elementId: element.id,
      fromIndex: 1,
      nextIndex: 1,
      didMove: true,
    });
    expect(interaction.hasLinearPointerDragState()).toBe(true);

    const unchanged = interaction.updateLinearPointerDrag({ nextIndex: 1 });
    expect(unchanged.linearPointerDragState).toEqual({
      elementId: element.id,
      fromIndex: 1,
      nextIndex: 1,
      didMove: true,
    });

    const updated = interaction.updateLinearPointerDrag({ nextIndex: 2 });
    expect(updated.linearPointerDragState).toEqual({
      elementId: element.id,
      fromIndex: 1,
      nextIndex: 2,
      didMove: true,
    });

    const finished = interaction.finishLinearPointerDrag();
    expect(finished.linearPointerDragState).toEqual({
      elementId: element.id,
      fromIndex: 1,
      nextIndex: 2,
      didMove: true,
    });
    expect(interaction.hasLinearPointerDragState()).toBe(false);
  });

  it("projects active tree node runtime without mutating the board element", () => {
    const interaction = createStructureInteraction();
    const element = treeElement();

    const activated = interaction.setActiveTreeNode({ elementId: element.id, nodeId: "node_2" });

    expect(activated).toEqual({
      previousActiveTreeNode: null,
      activeTreeNode: { elementId: element.id, nodeId: "node_2" },
    });
    expect(interaction.getActiveTreeNode()).toEqual({ elementId: element.id, nodeId: "node_2" });

    const projected = interaction.projectRuntime(element);
    expect(projected).toEqual({
      ...element,
      runtime: { activeNodeId: "node_2" },
    });
    expect(projected).not.toBe(element);
    expect(element.runtime).toBeUndefined();

    const cleared = interaction.clearActiveTreeNode();
    expect(cleared).toEqual({
      previousActiveTreeNode: { elementId: element.id, nodeId: "node_2" },
      activeTreeNode: null,
    });
    expect(interaction.projectRuntime(element)).toBe(element);
  });

  it("tracks structure connect state and returns a completed connection", () => {
    const interaction = createStructureInteraction();

    const started = interaction.beginStructureConnect({ kind: "graph", elementId: "graph_1" });
    expect(started.structureConnectState).toEqual({
      kind: "graph",
      elementId: "graph_1",
      sourceNodeId: null,
    });
    expect(interaction.getStructureConnectState({ kind: "graph", elementId: "graph_1" })).toEqual({
      kind: "graph",
      elementId: "graph_1",
      sourceNodeId: null,
    });
    expect(interaction.getStructureConnectState({ kind: "tree", elementId: "graph_1" })).toBeNull();

    const sourced = interaction.setStructureConnectSource({
      kind: "graph",
      elementId: "graph_1",
      sourceNodeId: "node_a",
    });
    expect(sourced.structureConnectState).toEqual({
      kind: "graph",
      elementId: "graph_1",
      sourceNodeId: "node_a",
    });

    const completed = interaction.finishStructureConnect({
      kind: "graph",
      elementId: "graph_1",
      targetNodeId: "node_b",
    });
    expect(completed).toEqual({
      structureConnectState: null,
      connection: {
        kind: "graph",
        elementId: "graph_1",
        sourceNodeId: "node_a",
        targetNodeId: "node_b",
      },
    });
    expect(interaction.getStructureConnectState({ kind: "graph", elementId: "graph_1" })).toBeNull();
  });

  it("clears or normalizes the active linear item when selection changes", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();
    interaction.setActiveLinearItem({ elements: [element], elementId: element.id, index: 2 });

    const cleared = interaction.syncSelection({ elements: [element], selectedIds: [] });
    expect(cleared.previousActiveLinearItem).toEqual({ elementId: element.id, index: 2 });
    expect(cleared.activeLinearItem).toBeNull();
    expect(interaction.getActiveLinearItem()).toBeNull();

    interaction.setActiveLinearItem({ elements: [element], elementId: element.id, index: 2 });
    const shortened = linearElement({ items: [{ value: "A", index: 0 }] });
    const normalized = interaction.syncSelection({ elements: [shortened], selectedIds: [element.id] });
    expect(normalized.activeLinearItem).toEqual({ elementId: element.id, index: 0 });
  });

  it("keeps array algorithm panel state independent per element", () => {
    const interaction = createStructureInteraction();
    const defaults = { algorithm: "bubble-sort", speed: 1 };

    expect(interaction.getArrayAlgorithmPanelState("array_a", defaults)).toEqual(defaults);

    interaction.setArrayAlgorithmPanelState("array_a", { speed: 2 }, defaults);
    interaction.setArrayAlgorithmPanelState("array_b", { algorithm: "selection-sort" }, defaults);

    expect(interaction.getArrayAlgorithmPanelState("array_a", defaults)).toEqual({
      algorithm: "bubble-sort",
      speed: 2,
    });
    expect(interaction.getArrayAlgorithmPanelState("array_b", defaults)).toEqual({
      algorithm: "selection-sort",
      speed: 1,
    });
  });

  it("tracks array algorithm sessions independently and clears related state", () => {
    const interaction = createStructureInteraction();
    const defaults = { algorithm: "bubble-sort", speed: 1 };

    interaction.setArrayAlgorithmPanelState("array_a", { speed: 2 }, defaults);
    interaction.setArrayAlgorithmSession({ elementId: "array_a", stepIndex: 1, isPlaying: true });
    interaction.setArrayAlgorithmSession({ elementId: "array_b", stepIndex: 0, isPlaying: false });

    expect(interaction.getArrayAlgorithmSession("array_a")).toEqual({
      elementId: "array_a",
      stepIndex: 1,
      isPlaying: true,
    });
    expect(interaction.isArrayAlgorithmLocked("array_a")).toBe(true);

    interaction.deleteArrayAlgorithmState("array_a");
    expect(interaction.getArrayAlgorithmSession("array_a")).toBeNull();
    expect(interaction.getArrayAlgorithmPanelState("array_a", defaults)).toEqual(defaults);
    expect(interaction.getArrayAlgorithmSession("array_b")).toEqual({
      elementId: "array_b",
      stepIndex: 0,
      isPlaying: false,
    });

    interaction.clearArrayAlgorithmSessions();
    expect(interaction.getArrayAlgorithmSession("array_b")).toBeNull();
  });

  it("pauses playing array algorithm sessions that are no longer selected", () => {
    const interaction = createStructureInteraction();
    interaction.setArrayAlgorithmSession({ elementId: "array_a", isPlaying: true });
    interaction.setArrayAlgorithmSession({ elementId: "array_b", isPlaying: true });
    interaction.setArrayAlgorithmSession({ elementId: "array_c", isPlaying: false });

    const paused = interaction.pauseUnselectedArrayAlgorithmSessions(["array_b"]);

    expect(paused).toEqual(["array_a"]);
    expect(interaction.getArrayAlgorithmSession("array_a")).toEqual({
      elementId: "array_a",
      isPlaying: false,
    });
    expect(interaction.getArrayAlgorithmSession("array_b")).toEqual({
      elementId: "array_b",
      isPlaying: true,
    });
    expect(interaction.getArrayAlgorithmSession("array_c")).toEqual({
      elementId: "array_c",
      isPlaying: false,
    });
  });

  it("consumes suppressed linear item selection inside structure events", () => {
    const interaction = createStructureInteraction();
    const element = linearElement();
    interaction.suppressNextLinearItemSelect(element.id);

    const result = interaction.handleEvent({
      type: "linear.item.select",
      elementId: element.id,
      index: 1,
    }, {
      elements: [element],
      currentTool: "select",
      isTemporaryPanActive: false,
    });

    expect(result).toEqual({ handled: true, clearSuppression: true });
    expect(interaction.isLinearItemSelectSuppressed(element.id)).toBe(false);

    const selected = interaction.handleEvent({
      type: "linear.item.select",
      elementId: element.id,
      index: 1,
    }, {
      elements: [element],
      currentTool: "select",
      isTemporaryPanActive: false,
    });
    expect(selected.activeLinearItem).toEqual({ elementId: element.id, index: 1 });
  });

  it("consumes suppressed binary tree node clicks once per element", () => {
    const interaction = createStructureInteraction();

    interaction.suppressBinaryTreeNodeClicks(["tree_a", "graph_1", "tree_b"]);

    expect(interaction.consumeSuppressedBinaryTreeNodeClick("tree_a")).toBe(true);
    expect(interaction.consumeSuppressedBinaryTreeNodeClick("tree_a")).toBe(false);
    expect(interaction.consumeSuppressedBinaryTreeNodeClick("tree_b")).toBe(true);
    expect(interaction.consumeSuppressedBinaryTreeNodeClick("unknown")).toBe(false);
  });
});
