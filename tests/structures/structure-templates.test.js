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
  setArrayPointer,
  setArrayPointerVisibility,
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
  updateGraphNodeLabel,
  setGraphHighlight,
  clearGraphHighlight,
  layoutGraph,
  exportGraph,
  exportTree,
  importGraphFromText,
  updateGraphFromInput,
  addTreeNode,
  addTreeChild,
  addTreeEdge,
  moveTreeNode,
  updateTreeNodeValue,
  layoutTreeStructure,
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
  normalizeRandomArrayCount,
  createRandomArrayValues,
  parseGraphInput,
  parseTreeInput,
} from "../../src/structures/structure-templates.js";

describe("structure templates", () => {
  it("parses comma separated array values", () => {
    expect(parseArrayInput("10, 20, 30")).toEqual(["10", "20", "30"]);
  });

  it("parses a quoted array input string into character items", () => {
    expect(parseArrayInput('"hello"')).toEqual(["h", "e", "l", "l", "o"]);
  });

  it("normalizes random array counts to a bounded element count", () => {
    expect(normalizeRandomArrayCount("3")).toBe(3);
    expect(normalizeRandomArrayCount("0")).toBe(1);
    expect(normalizeRandomArrayCount("999")).toBe(64);
    expect(normalizeRandomArrayCount("abc")).toBe(5);
  });

  it("creates random array values from a requested element count", () => {
    const randomValues = [0, 0.125, 0.5, 0.999].values();
    const values = createRandomArrayValues("4", {
      random: () => randomValues.next().value,
    });

    expect(values).toEqual(["0", "12", "50", "99"]);
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

  it("creates an array from a random element count instead of manual input", () => {
    const randomValues = [0.01, 0.2, 0.9];
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B",
      initMode: "random",
      randomCount: "3",
      random: () => randomValues.shift(),
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(elements[0].items.map((item) => item.value)).toEqual(["1", "20", "90"]);
    expect(elements[0].items.map((item) => item.index)).toEqual([0, 1, 2]);
    expect(elements[0].width).toBe(216);
  });

  it("creates all linear structures from a random element count", () => {
    for (const [type, elementType] of [
      [STRUCTURE_TYPES.ARRAY, STRUCTURE_ELEMENT_TYPES.ARRAY],
      [STRUCTURE_TYPES.STACK, STRUCTURE_ELEMENT_TYPES.STACK],
      [STRUCTURE_TYPES.QUEUE, STRUCTURE_ELEMENT_TYPES.QUEUE],
      [STRUCTURE_TYPES.DEQUE, STRUCTURE_ELEMENT_TYPES.DEQUE],
    ]) {
      const randomValues = [0.1, 0.4].values();
      const [element] = createStructureElements({
        type,
        input: "A, B, C",
        initMode: "random",
        randomCount: "2",
        random: () => randomValues.next().value,
        point: { x: 0, y: 0 },
        zIndexStart: 0,
      });

      expect(element.type).toBe(elementType);
      expect(element.items.map((item) => item.value)).toEqual(["10", "40"]);
      expect(element.items.map((item) => item.index)).toEqual([0, 1]);
    }
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

  it("creates graph structure data with stable node ids and display labels", () => {
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
    expect(elements[0].nodes.map((node) => node.id)).not.toEqual(["A", "B", "C"]);
    const nodeIdByLabel = new Map(elements[0].nodes.map((node) => [node.label, node.id]));
    expect(elements[0].edges).toMatchObject([
      { from: nodeIdByLabel.get("A"), to: nodeIdByLabel.get("B"), directed: false, weight: "7" },
      { from: nodeIdByLabel.get("B"), to: nodeIdByLabel.get("C"), directed: true },
    ]);
  });

  it("parses tree edge lists and standalone nodes", () => {
    const tree = parseTreeInput("A->B, A->C, B->D, F");
    expect(tree.nodes).toEqual(["A", "B", "C", "D", "F"]);
    expect(tree.edges).toMatchObject([
      { from: "A", to: "B" },
      { from: "A", to: "C" },
      { from: "B", to: "D" },
    ]);
  });

  it("parses tree edge lists split by newlines", () => {
    const tree = parseTreeInput("A->B\nA->C\nF");

    expect(tree.nodes).toEqual(["A", "B", "C", "F"]);
    expect(tree.edges).toMatchObject([
      { from: "A", to: "B" },
      { from: "A", to: "C" },
    ]);
  });

  it("creates tree structure data with stable node ids and parent-child edges", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C, B->D, F",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe(STRUCTURE_ELEMENT_TYPES.TREE);
    expect(elements[0].nodes.map((node) => node.label)).toEqual(["A", "B", "C", "D", "F"]);
    expect(elements[0].nodes.map((node) => node.id)).not.toEqual(["A", "B", "C", "D", "F"]);
    const nodeIdByLabel = new Map(elements[0].nodes.map((node) => [node.label, node.id]));
    expect(elements[0].settings.rootId).toBe(nodeIdByLabel.get("A"));
    expect(elements[0].edges).toMatchObject([
      { from: nodeIdByLabel.get("A"), to: nodeIdByLabel.get("B") },
      { from: nodeIdByLabel.get("A"), to: nodeIdByLabel.get("C") },
      { from: nodeIdByLabel.get("B"), to: nodeIdByLabel.get("D") },
    ]);
  });

  it("creates binary tree structures and random complete binary trees", () => {
    expect(getStructureItem(STRUCTURE_TYPES.BINARY_TREE)).toMatchObject({
      id: STRUCTURE_TYPES.BINARY_TREE,
      label: "二叉树",
    });

    const [manual] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B, A->C, B->D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    expect(manual.type).toBe(STRUCTURE_ELEMENT_TYPES.TREE);
    expect(manual.settings.treeKind).toBe("binary");

    const [randomTree] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      initMode: "random",
      randomCount: "7",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (label) => randomTree.nodes.find((node) => node.label === label)?.id;

    expect(randomTree.settings.treeKind).toBe("binary");
    expect(randomTree.nodes.map((node) => node.label)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(randomTree.edges).toMatchObject([
      { from: id("1"), to: id("2") },
      { from: id("1"), to: id("3") },
      { from: id("2"), to: id("4") },
      { from: id("2"), to: id("5") },
      { from: id("3"), to: id("6") },
      { from: id("3"), to: id("7") },
    ]);
  });

  it("computes general tree traversal orders without binary inorder", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C, B->D, B->E",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (label) => tree.nodes.find((node) => node.label === label)?.id;

    expect(getTreeTraversalOrder(tree, "level")).toEqual([id("A"), id("B"), id("C"), id("D"), id("E")]);
    expect(getTreeTraversalOrder(tree, "preorder")).toEqual([id("A"), id("B"), id("D"), id("E"), id("C")]);
    expect(getTreeTraversalOrder(tree, "postorder")).toEqual([id("D"), id("E"), id("B"), id("C"), id("A")]);
    expect(getTreeTraversalOrder(tree, "inorder")).toEqual([]);
  });

  it("computes binary tree inorder traversal from child order", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B, A->C, B->D, B->E, C->F",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (label) => tree.nodes.find((node) => node.label === label)?.id;

    expect(getTreeTraversalOrder(tree, "inorder")).toEqual([id("D"), id("B"), id("E"), id("A"), id("F"), id("C")]);
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

    const highlighted = setArrayHighlight(array, { start: 2, end: 1, pointer: 2, showPointer: true });
    expect(highlighted.markers).toEqual({ highlight: [1, 2], pointer: 2, showPointer: true });
    expect(setArrayPointer(highlighted, 0).markers).toEqual({ highlight: [1, 2], pointer: 0, showPointer: true });
    expect(setArrayPointerVisibility(highlighted, false).markers).toEqual({ highlight: [1, 2], pointer: 2, showPointer: false });
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
    expect(withNode.nodes.map((node) => node.label)).toEqual(["A", "B", "C"]);
    const nodeIdByLabel = new Map(withNode.nodes.map((node) => [node.label, node.id]));

    const withEdge = addGraphEdge(withNode, nodeIdByLabel.get("B"), nodeIdByLabel.get("C"), { directed: true, weight: "9" });
    expect(withEdge.edges.at(-1)).toMatchObject({ from: nodeIdByLabel.get("B"), to: nodeIdByLabel.get("C"), directed: true, weight: "9" });

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
    expect(withTextEdge.nodes.map((node) => node.label)).toEqual(["A", "B", "C"]);
    const nodeIdByLabel = new Map(withTextEdge.nodes.map((node) => [node.label, node.id]));
    expect(withTextEdge.edges.at(-1)).toMatchObject({ from: nodeIdByLabel.get("B"), to: nodeIdByLabel.get("C"), directed: true, weight: "9" });
    expect(withTextEdge.settings.directedDefault).toBe(true);

    const moved = moveGraphNode(withTextEdge, nodeIdByLabel.get("C"), 40, 55);
    expect(moved.nodes.find((node) => node.id === nodeIdByLabel.get("C"))).toMatchObject({ x: 40, y: 55 });

    const undirectedDefault = setGraphDirectedDefault(moved, false);
    expect(undirectedDefault.settings.directedDefault).toBe(false);

    const withoutB = deleteGraphNode(undirectedDefault, nodeIdByLabel.get("B"));
    expect(withoutB.nodes.map((node) => node.label)).toEqual(["A", "C"]);
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

    const highlighted = setGraphHighlight(updated, { nodes: [graph.nodes[0].id], edges: [edgeId] });
    expect(highlighted.markers.highlightedNodes).toEqual([graph.nodes[0].id]);
    expect(highlighted.markers.highlightedEdges).toEqual([edgeId]);
    expect(clearGraphHighlight(highlighted).markers).toMatchObject({ highlightedNodes: [], highlightedEdges: [] });
  });

  it("updates graph node labels without changing edge endpoints", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A->B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const nodeId = graph.nodes[0].id;
    const edge = graph.edges[0];

    const renamed = updateGraphNodeLabel(graph, nodeId, "Start");

    expect(renamed.nodes[0]).toMatchObject({ id: nodeId, label: "Start" });
    expect(renamed.edges[0]).toMatchObject({ from: edge.from, to: edge.to });
    expect(exportGraph(renamed, "edge-list")).toBe("Start->B");
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

  it("exports general tree data as a parent-child edge list", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C, B->D, F",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(exportTree(tree)).toBe("A->B\nA->C\nB->D\nF");
  });

  it("imports graph data from adjacency list and matrix formats", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const fromList = importGraphFromText(graph, "A: B(5), C\nB: C", "adjacency-list");
    expect(fromList.nodes.map((node) => node.label)).toEqual(["A", "B", "C"]);
    const listIdByLabel = new Map(fromList.nodes.map((node) => [node.label, node.id]));
    expect(fromList.edges).toMatchObject([
      { from: listIdByLabel.get("A"), to: listIdByLabel.get("B"), directed: true, weight: "5" },
      { from: listIdByLabel.get("A"), to: listIdByLabel.get("C"), directed: true, weight: "" },
      { from: listIdByLabel.get("B"), to: listIdByLabel.get("C"), directed: true, weight: "" },
    ]);

    const fromMatrix = importGraphFromText(graph, ",A,B\nA,0,2\nB,0,0", "adjacency-matrix");
    const matrixIdByLabel = new Map(fromMatrix.nodes.map((node) => [node.label, node.id]));
    expect(fromMatrix.edges).toMatchObject([{ from: matrixIdByLabel.get("A"), to: matrixIdByLabel.get("B"), directed: true, weight: "2" }]);
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
    expect(layoutGraph(graph, "layered").nodes.find((node) => node.label === "A").y)
      .toBeLessThan(layoutGraph(graph, "layered").nodes.find((node) => node.label === "C").y);
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
      nodes: graph.nodes.map((node) => (node.label === "A" ? { ...node, x: 42, y: 77 } : node)),
    };

    const updated = updateGraphFromInput(moved, "A->B:5, B-C");
    const nodeIdByLabel = new Map(updated.nodes.map((node) => [node.label, node.id]));
    expect(updated.nodes.find((node) => node.label === "A")).toMatchObject({ x: 42, y: 77 });
    expect(updated.edges).toMatchObject([
      { from: nodeIdByLabel.get("A"), to: nodeIdByLabel.get("B"), directed: true, weight: "5" },
      { from: nodeIdByLabel.get("B"), to: nodeIdByLabel.get("C"), directed: false },
    ]);
  });

  it("adds, deletes, moves, and reloads general tree nodes from edge list input", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const added = addTreeNode(tree, "C");
    expect(added.nodes.map((node) => node.label)).toEqual(["A", "B", "C"]);

    const deleted = deleteLastTreeNode(added);
    expect(deleted.nodes.map((node) => node.label)).toEqual(["A", "B"]);

    const reloaded = updateTreeFromInput(deleted, "X->Y, X->Z");
    expect(reloaded.nodes.map((node) => node.label)).toEqual(["X", "Y", "Z"]);
    expect(reloaded.edges).toHaveLength(2);

    const moved = moveTreeNode(reloaded, reloaded.nodes[1].id, 44, 55);
    expect(moved.nodes[1]).toMatchObject({ x: 44, y: 55 });
  });

  it("adds tree child edges with single-parent and acyclic constraints", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (label) => tree.nodes.find((node) => node.label === label)?.id;

    const withNode = addTreeNode(tree, "D");
    const d = withNode.nodes.find((node) => node.label === "D").id;
    const attached = addTreeEdge(withNode, id("B"), d);
    expect(attached.edges).toEqual(expect.arrayContaining([expect.objectContaining({ from: id("B"), to: d })]));

    const reparented = addTreeEdge(attached, id("C"), d);
    expect(reparented.edges.filter((edge) => edge.to === d)).toEqual([expect.objectContaining({ from: id("C"), to: d })]);

    const cycleAttempt = addTreeEdge(reparented, d, id("A"));
    expect(cycleAttempt).toBe(reparented);

    const renamed = updateTreeNodeValue(reparented, d, "Leaf");
    expect(renamed.nodes.find((node) => node.id === d)).toMatchObject({ label: "Leaf" });
  });

  it("keeps binary tree parents limited to two ordered children", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B, A->C, D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (label) => tree.nodes.find((node) => node.label === label)?.id;

    const rejectedThirdChild = addTreeEdge(tree, id("A"), id("D"));
    expect(rejectedThirdChild).toBe(tree);
    expect(rejectedThirdChild.edges.filter((edge) => edge.from === id("A"))).toHaveLength(2);

    const [targetFull] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B, A->C, B->D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const targetId = (label) => targetFull.nodes.find((node) => node.label === label)?.id;
    const rejectedReparent = addTreeEdge(targetFull, targetId("A"), targetId("D"));

    expect(rejectedReparent).toBe(targetFull);
    expect(rejectedReparent.edges.find((edge) => edge.to === targetId("D"))).toMatchObject({ from: targetId("B") });
  });

  it("lays out general trees from the selected root", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C, B->D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const laidOut = layoutTreeStructure({
      ...tree,
      nodes: tree.nodes.map((node) => ({ ...node, x: 1, y: 1 })),
    });
    const root = laidOut.nodes.find((node) => node.id === laidOut.settings.rootId);
    const child = laidOut.nodes.find((node) => node.label === "B");

    expect(root.y).toBeLessThan(child.y);
    expect(laidOut.width).toBeGreaterThan(0);
    expect(laidOut.height).toBeGreaterThan(0);
  });

  it("sets and clears tree traversal highlights", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const order = getTreeTraversalOrder(tree, "preorder");

    const highlighted = setTreeTraversalHighlight(tree, "preorder");
    expect(highlighted.markers).toMatchObject({
      traversalMode: "preorder",
      highlighted: order,
    });
    expect(clearTreeHighlight(highlighted).markers).toMatchObject({
      traversalMode: null,
      highlighted: [],
    });
  });

  it("steps tree traversal highlights", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const order = getTreeTraversalOrder(tree, "level");

    const first = stepTreeTraversalHighlight(setTreeTraversalHighlight(tree, "level"), 1);
    expect(first.markers).toMatchObject({ traversalCursor: 0, highlighted: [order[0]], traversalOrder: order });
    const second = stepTreeTraversalHighlight(first, 1);
    expect(second.markers.highlighted).toEqual([order[1]]);
  });

  it("collapses, copies, and moves tree subtrees", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C, B->D, B->E",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (label) => tree.nodes.find((node) => node.label === label)?.id;

    const collapsed = setTreeSubtreeCollapsed(tree, id("B"), true);
    expect(collapsed.markers.collapsed).toEqual([id("B")]);
    expect(setTreeSubtreeCollapsed(collapsed, id("B"), false).markers.collapsed).toEqual([]);
    expect(copyTreeSubtreeValues(tree, id("B"))).toEqual(["B", "D", "E"]);

    const moved = moveTreeSubtree(tree, id("B"), id("C"));
    expect(moved.edges.find((edge) => edge.to === id("B"))).toMatchObject({ from: id("C") });
  });

  it("allows deleting the entire tree without restoring the default tree input", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const deleted = deleteTreeSubtree(tree, tree.settings.rootId);
    expect(deleted.nodes).toEqual([]);
    expect(deleted.edges).toEqual([]);
  });
});
