import { describe, expect, it } from "vitest";
import {
  STRUCTURE_ELEMENT_TYPES,
  STRUCTURE_TYPES,
  createStructureElements,
  getStructureItem,
  insertArrayItem,
  deleteArrayItem,
  updateArrayItemValue,
  swapArrayItems,
  moveArrayItem,
  updateArrayValues,
  setArrayHighlight,
  clearArrayHighlight,
  setLinearIndexOptions,
  addGraphNode,
  addGraphEdge,
  addGraphEdgeFromText,
  deleteGraphNode,
  deleteLastGraphEdge,
  moveGraphNode,
  setGraphDirectedDefault,
  updateGraphEdge,
  setGraphHighlight,
  clearGraphHighlight,
  layoutGraph,
  exportGraph,
  importGraphFromText,
  updateGraphFromInput,
  addTreeNode,
  addTreeChild,
  updateTreeNodeValue,
  setTreeTraversalHighlight,
  stepTreeTraversalHighlight,
  clearTreeHighlight,
  setTreeSubtreeCollapsed,
  copyTreeSubtreeValues,
  moveTreeSubtree,
  deleteTreeSubtree,
  deleteLastTreeNode,
  updateTreeFromInput,
  getTreeTraversalOrder,
  parseArrayInput,
  parseGraphInput,
  parseTreeInput,
} from "../../src/structures/structure-templates.js";

describe("structure templates", () => {
  it("parses comma separated array values", () => {
    expect(parseArrayInput("10, 20, 30")).toEqual(["10", "20", "30"]);
  });

  it("creates a two-row array with indexes and values", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B",
      point: { x: 10, y: 20 },
      zIndexStart: 5,
    });

    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({
      type: STRUCTURE_ELEMENT_TYPES.ARRAY,
      zIndex: 5,
      x: -62,
      y: -24,
      width: 144,
      height: 88,
    });
    expect(elements[0].items.map((item) => item.value)).toEqual(["A", "B"]);
    expect(elements[0].items.map((item) => item.index)).toEqual([0, 1]);
  });

  it("stores array values as structure data instead of loose grouped shapes", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B",
      point: { x: 10, y: 20 },
      zIndexStart: 0,
    });

    expect(elements).toHaveLength(1);
    expect(elements[0].groupId).toBeUndefined();
    expect(elements[0].items).toHaveLength(2);
  });

  it("parses graph edges, directions, weights, and standalone nodes", () => {
    const graph = parseGraphInput("A-B:7, A->C=5, D");
    expect(graph.nodes).toEqual(["A", "B", "C", "D"]);
    expect(graph.edges).toMatchObject([
      { from: "A", to: "B", directed: false, weight: "7" },
      { from: "A", to: "C", directed: true, weight: "5" },
    ]);
  });

  it("creates graph structure data with nodes and edges", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B:7, B->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({
      type: STRUCTURE_ELEMENT_TYPES.GRAPH,
      x: -118,
      y: -118,
      width: 236,
      height: 236,
    });
    expect(elements[0].nodes.map((node) => node.label)).toEqual(["A", "B", "C"]);
    expect(elements[0].edges).toMatchObject([
      { from: "A", to: "B", directed: false, weight: "7" },
      { from: "B", to: "C", directed: true },
    ]);
  });

  it("parses tree null placeholders", () => {
    expect(parseTreeInput("A, B, null, #, E")).toEqual(["A", "B", null, null, "E"]);
  });

  it("creates tree structure data and skips null nodes", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A, B, null, D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe(STRUCTURE_ELEMENT_TYPES.TREE);
    expect(elements[0].nodes.map((node) => node.value)).toEqual(["A", "B", "D"]);
    expect(elements[0].nodes.map((node) => node.parentIndex)).toEqual([null, 0, 1]);
  });

  it("computes tree traversal orders for teaching highlights", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A, B, C, D, E",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(getTreeTraversalOrder(tree, "level")).toEqual([0, 1, 2, 3, 4]);
    expect(getTreeTraversalOrder(tree, "preorder")).toEqual([0, 1, 3, 4, 2]);
    expect(getTreeTraversalOrder(tree, "inorder")).toEqual([3, 1, 4, 0, 2]);
    expect(getTreeTraversalOrder(tree, "postorder")).toEqual([3, 4, 1, 2, 0]);
  });

  it("uses default input when initial structure text is blank", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "   ",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const firstDefaultValue = getStructureItem(STRUCTURE_TYPES.ARRAY).defaultInput.split(",")[0].trim();
    expect(elements[0].items.map((item) => item.value)).toContain(firstDefaultValue);
  });

  it("inserts and deletes array structure items while keeping indexes normalized", () => {
    const [array] = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const inserted = insertArrayItem(array, 1, "X");
    expect(inserted.items.map((item) => item.value)).toEqual(["A", "X", "B"]);
    expect(inserted.items.map((item) => item.index)).toEqual([0, 1, 2]);
    expect(inserted.width).toBe(216);
    expect(inserted.x).toBe(-108);

    const deleted = deleteArrayItem(inserted, 1);
    expect(deleted.items.map((item) => item.value)).toEqual(["A", "B"]);
    expect(deleted.items.map((item) => item.index)).toEqual([0, 1]);
    expect(deleted.width).toBe(144);
    expect(deleted.x).toBe(-72);
  });

  it("reloads array values from text input", () => {
    const [array] = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const updated = updateArrayValues(array, "3, 1, 4");
    expect(updated.items.map((item) => item.value)).toEqual(["3", "1", "4"]);
    expect(updated.items.map((item) => item.index)).toEqual([0, 1, 2]);
  });

  it("updates, swaps, and moves array items while preserving normalized indexes", () => {
    const [array] = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B, C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const updated = updateArrayItemValue(array, 1, "X");
    expect(updated.items.map((item) => item.value)).toEqual(["A", "X", "C"]);

    const swapped = swapArrayItems(updated, 0, 2);
    expect(swapped.items.map((item) => item.value)).toEqual(["C", "X", "A"]);
    expect(swapped.items.map((item) => item.index)).toEqual([0, 1, 2]);

    const moved = moveArrayItem(swapped, 2, 0);
    expect(moved.items.map((item) => item.value)).toEqual(["A", "C", "X"]);
    expect(moved.items.map((item) => item.index)).toEqual([0, 1, 2]);
  });

  it("sets and clears array teaching markers", () => {
    const [array] = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B, C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const highlighted = setArrayHighlight(array, { start: 2, end: 1, pointer: 2 });
    expect(highlighted.markers).toEqual({ highlight: [1, 2], pointer: 2 });
    expect(clearArrayHighlight(highlighted).markers).toEqual({ highlight: [], pointer: null });
  });

  it("creates array-derived structures as independent element types", () => {
    const [stack] = createStructureElements({
      type: STRUCTURE_TYPES.STACK,
      input: "A, B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const [queue] = createStructureElements({
      type: STRUCTURE_TYPES.QUEUE,
      input: "A, B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(stack.type).toBe(STRUCTURE_ELEMENT_TYPES.STACK);
    expect(stack.settings).toEqual({ indexBase: 0, showIndexes: false });
    expect(queue.type).toBe(STRUCTURE_ELEMENT_TYPES.QUEUE);
    expect(setLinearIndexOptions(queue, { indexBase: 1, showIndexes: true }).settings)
      .toEqual({ indexBase: 1, showIndexes: true });
  });

  it("adds graph nodes and edges then deletes the last edge", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const withNode = addGraphNode(graph, "C");
    expect(withNode.nodes.map((node) => node.id)).toEqual(["A", "B", "C"]);

    const withEdge = addGraphEdge(withNode, "B", "C", { directed: true, weight: "9" });
    expect(withEdge.edges.at(-1)).toMatchObject({ from: "B", to: "C", directed: true, weight: "9" });

    expect(deleteLastGraphEdge(withEdge).edges).toHaveLength(1);
  });

  it("adds graph edges from text, moves nodes, toggles directed default, and deletes nodes with attached edges", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const withTextEdge = addGraphEdgeFromText(graph, "B->C:9");
    expect(withTextEdge.nodes.map((node) => node.id)).toEqual(["A", "B", "C"]);
    expect(withTextEdge.edges.at(-1)).toMatchObject({ from: "B", to: "C", directed: true, weight: "9" });
    expect(withTextEdge.settings.directedDefault).toBe(true);

    const moved = moveGraphNode(withTextEdge, "C", 40, 55);
    expect(moved.nodes.find((node) => node.id === "C")).toMatchObject({ x: 40, y: 55 });

    const undirectedDefault = setGraphDirectedDefault(moved, false);
    expect(undirectedDefault.settings.directedDefault).toBe(false);

    const withoutB = deleteGraphNode(undirectedDefault, "B");
    expect(withoutB.nodes.map((node) => node.id)).toEqual(["A", "C"]);
    expect(withoutB.edges).toHaveLength(0);
  });

  it("updates graph edges and teaching highlights", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const edgeId = graph.edges[0].id;
    const updated = updateGraphEdge(graph, edgeId, { directed: true, weight: "4" });
    expect(updated.edges[0]).toMatchObject({ directed: true, weight: "4" });

    const highlighted = setGraphHighlight(updated, { nodes: ["A"], edges: [edgeId] });
    expect(highlighted.markers.highlightedNodes).toEqual(["A"]);
    expect(highlighted.markers.highlightedEdges).toEqual([edgeId]);
    expect(clearGraphHighlight(highlighted).markers).toMatchObject({ highlightedNodes: [], highlightedEdges: [] });
  });

  it("exports graph data in edge list, adjacency list, and matrix formats", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B:7, B->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(exportGraph(graph, "edge-list")).toBe("A-B:7, B->C");
    expect(exportGraph(graph, "adjacency-list")).toContain("A: B(7)");
    expect(exportGraph(graph, "adjacency-list")).toContain("B: A(7), C");
    expect(exportGraph(graph, "adjacency-matrix")).toContain(",A,B,C");
    expect(exportGraph(graph, "adjacency-matrix")).toContain("A,0,7,0");
  });

  it("imports graph data from adjacency list and matrix formats", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const fromList = importGraphFromText(graph, "A: B(5), C\nB: C", "adjacency-list");
    expect(fromList.nodes.map((node) => node.id)).toEqual(["A", "B", "C"]);
    expect(fromList.edges).toMatchObject([
      { from: "A", to: "B", directed: true, weight: "5" },
      { from: "A", to: "C", directed: true, weight: "" },
      { from: "B", to: "C", directed: true, weight: "" },
    ]);

    const fromMatrix = importGraphFromText(graph, ",A,B\nA,0,2\nB,0,0", "adjacency-matrix");
    expect(fromMatrix.edges).toMatchObject([{ from: "A", to: "B", directed: true, weight: "2" }]);
  });

  it("lays out graph nodes with circle, grid, and layered helpers", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A->B, B->C, D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(layoutGraph(graph, "circle").nodes).toHaveLength(4);
    expect(layoutGraph(graph, "grid").nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    expect(layoutGraph(graph, "layered").nodes.find((node) => node.id === "A").y)
      .toBeLessThan(layoutGraph(graph, "layered").nodes.find((node) => node.id === "C").y);
    expect(layoutGraph(graph, "force").nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  });

  it("reloads graph input while preserving existing node positions", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const moved = {
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === "A" ? { ...node, x: 42, y: 77 } : node)),
    };

    const updated = updateGraphFromInput(moved, "A->B:5, B-C");
    expect(updated.nodes.find((node) => node.id === "A")).toMatchObject({ x: 42, y: 77 });
    expect(updated.edges).toMatchObject([
      { from: "A", to: "B", directed: true, weight: "5" },
      { from: "B", to: "C", directed: false },
    ]);
  });

  it("adds, deletes, and reloads tree nodes from level order input", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A, B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const added = addTreeNode(tree, "C");
    expect(added.values).toEqual(["A", "B", "C"]);
    expect(added.nodes.map((node) => node.value)).toEqual(["A", "B", "C"]);

    const deleted = deleteLastTreeNode(added);
    expect(deleted.values).toEqual(["A", "B"]);

    const reloaded = updateTreeFromInput(deleted, "X, null, Y");
    expect(reloaded.values).toEqual(["X", null, "Y"]);
    expect(reloaded.nodes.map((node) => node.value)).toEqual(["X", "Y"]);
  });

  it("adds binary tree children, updates values, and deletes subtrees", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const withLeft = addTreeChild(tree, 0, "left", "B");
    expect(withLeft.values).toEqual(["A", "B"]);

    const withRight = addTreeChild(withLeft, 0, "right", "C");
    expect(withRight.values).toEqual(["A", "B", "C"]);

    const renamed = updateTreeNodeValue(withRight, 1, "L");
    expect(renamed.nodes.find((node) => node.index === 1)).toMatchObject({ value: "L" });

    const pruned = deleteTreeSubtree(renamed, 1);
    expect(pruned.values).toEqual(["A", null, "C"]);
    expect(pruned.nodes.map((node) => node.value)).toEqual(["A", "C"]);
  });

  it("sets and clears tree traversal highlights", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A, B, C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const highlighted = setTreeTraversalHighlight(tree, "preorder");
    expect(highlighted.markers).toMatchObject({
      traversalMode: "preorder",
      highlighted: [0, 1, 2],
    });
    expect(clearTreeHighlight(highlighted).markers).toMatchObject({
      traversalMode: null,
      highlighted: [],
    });
  });

  it("steps tree traversal highlights", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A, B, C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const first = stepTreeTraversalHighlight(setTreeTraversalHighlight(tree, "level"), 1);
    expect(first.markers).toMatchObject({ traversalCursor: 0, highlighted: [0], traversalOrder: [0, 1, 2] });
    const second = stepTreeTraversalHighlight(first, 1);
    expect(second.markers.highlighted).toEqual([1]);
  });

  it("collapses, copies, and moves tree subtrees", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A, B, C, D, E",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const collapsed = setTreeSubtreeCollapsed(tree, 1, true);
    expect(collapsed.markers.collapsed).toEqual([1]);
    expect(setTreeSubtreeCollapsed(collapsed, 1, false).markers.collapsed).toEqual([]);
    expect(copyTreeSubtreeValues(tree, 1)).toEqual(["B", "D", "E"]);

    const moved = moveTreeSubtree(tree, 1, 2);
    expect(moved.values[1]).toBeNull();
    expect(moved.values[2]).toBe("B");
    expect(moved.values[5]).toBe("D");
    expect(moved.values[6]).toBe("E");
  });

  it("allows deleting the entire tree without restoring the default tree input", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const deleted = deleteTreeSubtree(tree, 0);
    expect(deleted.values).toEqual([]);
    expect(deleted.nodes).toEqual([]);
  });
});
