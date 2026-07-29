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
  getLinearStructureLocalPoint,
  getLinearItemPreviewGap,
  getLinearItemDropIndex,
  addGraphNode,
  addGraphEdge,
  addGraphEdgeFromText,
  deleteGraphNode,
  deleteLastGraphEdge,
  moveGraphNode,
  getGraphMinSize,
  setGraphNodeRadius,
  setGraphDirected,
  setGraphDirectedDefault,
  updateGraphEdge,
  updateGraphNodeLabel,
  layoutGraph,
  exportGraph,
  exportTree,
  updateGraphFromInput,
  addTreeNode,
  addTreeChild,
  addTreeSibling,
  addBinaryTreeChild,
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
  getBinaryTreeChildSides,
  deleteLastTreeNode,
  updateTreeFromInput,
  getTreeTraversalOrder,
  parseArrayInput,
  parseMatrixInput,
  exportMatrix,
  setMatrixIndexOptions,
  resizeMatrix,
  updateMatrixFromInput,
  normalizeRandomArrayCount,
  createRandomArrayValues,
  parseGraphInput,
  parseTreeInput,
} from "../../src/structures/templates.js";

describe("structure templates", () => {
  it("exposes a two-dimensional array template", () => {
    expect(getStructureItem(STRUCTURE_TYPES.MATRIX)).toMatchObject({
      id: STRUCTURE_TYPES.MATRIX,
      label: "二维数组",
      defaultInput: "1,2,3\n4,5,6\n7,8,9",
    });
  });

  it("parses and creates a two-dimensional array grid", () => {
    expect(parseMatrixInput("A, B\nC, D")).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);

    const [matrix] = createStructureElements({
      type: STRUCTURE_TYPES.MATRIX,
      input: "A, B\nC, D",
      point: { x: 10, y: 20 },
      zIndexStart: 5,
    });

    expect(matrix).toMatchObject({
      type: STRUCTURE_ELEMENT_TYPES.MATRIX,
      zIndex: 5,
      x: -98,
      y: -46,
      width: 216,
      height: 132,
      rows: 2,
      columns: 2,
    });
    expect(matrix.items.map(({ row, column, value }) => ({ row, column, value }))).toEqual([
      { row: 0, column: 0, value: "A" },
      { row: 0, column: 1, value: "B" },
      { row: 1, column: 0, value: "C" },
      { row: 1, column: 1, value: "D" },
    ]);
  });

  it("creates a random matrix from separate row and column counts", () => {
    const randomValues = Array.from({ length: 6 }, (_, index) => index / 10);
    const [matrix] = createStructureElements({
      type: STRUCTURE_TYPES.MATRIX,
      initMode: "random",
      randomRows: "2",
      randomColumns: "3",
      random: () => randomValues.shift(),
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(matrix).toMatchObject({ rows: 2, columns: 3 });
    expect(matrix.items.map((item) => item.value)).toEqual(["0", "10", "20", "30", "40", "50"]);
  });

  it("clamps random matrix row and column counts to their upper bound", () => {
    const [matrix] = createStructureElements({
      type: STRUCTURE_TYPES.MATRIX,
      initMode: "random",
      randomRows: "64",
      randomColumns: "64",
      random: () => 0.5,
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(matrix).toMatchObject({ rows: 32, columns: 32 });
    expect(matrix.items).toHaveLength(32 * 32);
    expect(matrix.items.every((item) => item.value === "50")).toBe(true);
  });

  it("updates two-dimensional array values and index options", () => {
    const [matrix] = createStructureElements({
      type: STRUCTURE_TYPES.MATRIX,
      input: "A,B\nC,D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const firstId = matrix.items[0].id;
    const updated = updateMatrixFromInput(matrix, "A,B,C\nD,E,F");

    expect(exportMatrix(updated)).toBe("A,B,C\nD,E,F");
    expect(updated.items[0].id).toBe(firstId);
    expect(updated).toMatchObject({ rows: 2, columns: 3, width: 288, height: 132 });
    expect(updated.x + updated.width / 2).toBe(matrix.x + matrix.width / 2);
    expect(updated.y + updated.height / 2).toBe(matrix.y + matrix.height / 2);

    const withoutIndexes = setMatrixIndexOptions(updated, { indexBase: 1, showIndexes: false });
    expect(withoutIndexes).toMatchObject({
      width: 216,
      height: 88,
      settings: { indexBase: 1, showIndexes: false },
    });
    expect(withoutIndexes.x + withoutIndexes.width / 2).toBe(updated.x + updated.width / 2);
    expect(withoutIndexes.y + withoutIndexes.height / 2).toBe(updated.y + updated.height / 2);

    const resized = resizeMatrix(withoutIndexes, { rows: 3, columns: 4 });
    expect(resized).toMatchObject({ rows: 3, columns: 4, width: 288, height: 132 });
    expect(exportMatrix(resized)).toBe("A,B,C,\nD,E,F,\n,,,");
    expect(resized.items.find((item) => item.row === 0 && item.column === 0)?.id).toBe(firstId);
    expect(resized.x + resized.width / 2).toBe(withoutIndexes.x + withoutIndexes.width / 2);
    expect(resized.y + resized.height / 2).toBe(withoutIndexes.y + withoutIndexes.height / 2);
  });

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

  it("creates a connected random graph from the requested node count", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      initMode: "random",
      randomCount: "5",
      random: () => 0.999,
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const labelById = new Map(graph.nodes.map((node) => [node.id, node.label]));

    expect(graph.nodes.map((node) => node.label)).toEqual(["1", "2", "3", "4", "5"]);
    expect(graph.edges.map((edge) => [labelById.get(edge.from), labelById.get(edge.to)])).toEqual([
      ["1", "2"],
      ["2", "3"],
      ["3", "4"],
      ["4", "5"],
    ]);
    expect(graph.edges.every((edge) => edge.directed === false)).toBe(true);
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
      x: -117,
      y: -117,
      width: 234,
      height: 234,
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

  it("creates a general tree from a random node count instead of the default input", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C, B->D, B->E",
      initMode: "random",
      randomCount: "8",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(tree.type).toBe(STRUCTURE_ELEMENT_TYPES.TREE);
    expect(tree.settings.treeKind).toBe("general");
    expect(tree.nodes.map((node) => node.label)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(tree.edges).toHaveLength(7);
  });

  it("creates binary tree structures and random complete binary trees", () => {
    expect(getStructureItem(STRUCTURE_TYPES.BINARY_TREE)).toMatchObject({
      id: STRUCTURE_TYPES.BINARY_TREE,
      label: "二叉树",
      defaultInput: "1->2, 1->3, 2->4, 2->5, 3->6, 3->7",
    });

    const [manual] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B, A->C, B->D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    expect(manual.type).toBe(STRUCTURE_ELEMENT_TYPES.TREE);
    expect(manual.settings.treeKind).toBe("binary");
    const manualId = (label) => manual.nodes.find((node) => node.label === label)?.id;
    expect(manual.edges).toMatchObject([
      { from: manualId("A"), to: manualId("B"), side: "left" },
      { from: manualId("A"), to: manualId("C"), side: "right" },
      { from: manualId("B"), to: manualId("D"), side: "left" },
    ]);

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
      { from: id("1"), to: id("2"), side: "left" },
      { from: id("1"), to: id("3"), side: "right" },
      { from: id("2"), to: id("4"), side: "left" },
      { from: id("2"), to: id("5"), side: "right" },
      { from: id("3"), to: id("6"), side: "left" },
      { from: id("3"), to: id("7"), side: "right" },
    ]);
  });

  it("lays out binary tree parents centered over left and right children", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B\nA->C\nB->D\nB->E\nC->F\nC->G",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const node = (label) => tree.nodes.find((item) => item.label === label);

    expect(node("A").x).toBeCloseTo((node("B").x + node("C").x) / 2);
    expect(node("B").x).toBeCloseTo((node("D").x + node("E").x) / 2);
    expect(node("C").x).toBeCloseTo((node("F").x + node("G").x) / 2);
    expect(node("B").y).toBe(node("C").y);
    expect(node("D").y).toBe(node("E").y);
    expect(Math.abs(node("A").x - node("B").x)).toBeCloseTo(Math.abs(node("C").x - node("A").x));
    expect(Math.abs(node("B").x - node("D").x)).toBeCloseTo(Math.abs(node("E").x - node("B").x));
    expect(Math.abs(node("C").x - node("F").x)).toBeCloseTo(Math.abs(node("G").x - node("C").x));
  });

  it("computes general tree traversal orders including generalized inorder", () => {
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
    expect(getTreeTraversalOrder(tree, "inorder")).toEqual([id("D"), id("B"), id("E"), id("A"), id("C")]);
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

  it("uses explicit binary child sides for insertion, traversal, and deletion", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (target, label) => target.nodes.find((node) => node.label === label)?.id;

    expect(getBinaryTreeChildSides(tree, id(tree, "A"))).toEqual({ left: id(tree, "B"), right: null });

    const withRight = addBinaryTreeChild(tree, id(tree, "A"), "right", "0");
    expect(withRight.edges.find((edge) => edge.to === id(withRight, "0"))).toMatchObject({
      from: id(withRight, "A"),
      side: "right",
    });
    expect(addBinaryTreeChild(withRight, id(withRight, "A"), "right", "X")).toBe(withRight);
    expect(getTreeTraversalOrder(withRight, "inorder")).toEqual([id(withRight, "B"), id(withRight, "A"), id(withRight, "0")]);

    const deletedLeft = deleteTreeSubtree(withRight, id(withRight, "B"));
    expect(deletedLeft.nodes.map((node) => node.label)).toEqual(["A", "0"]);
    expect(getBinaryTreeChildSides(deletedLeft, id(deletedLeft, "A"))).toEqual({ left: null, right: id(deletedLeft, "0") });
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

  it("uses the rendered array position when computing a moved item's forward and backward drop target", () => {
    const [array] = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B, C, D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const renderedNode = {
      x: () => 140,
      y: () => 40,
    };
    const cellWidth = array.style.cellWidth;
    const length = array.items.length;

    const forwardLocalPoint = getLinearStructureLocalPoint(array, {
      x: renderedNode.x() + cellWidth * 3.15,
      y: renderedNode.y() + 12,
    }, renderedNode);
    const forwardGap = getLinearItemPreviewGap({ localX: forwardLocalPoint.x, length, cellWidth });
    expect(getLinearItemDropIndex(1, forwardGap, length)).toBe(2);

    const backwardLocalPoint = getLinearStructureLocalPoint(array, {
      x: renderedNode.x() + cellWidth * 0.65,
      y: renderedNode.y() + 12,
    }, renderedNode);
    const backwardGap = getLinearItemPreviewGap({ localX: backwardLocalPoint.x, length, cellWidth });
    expect(getLinearItemDropIndex(2, backwardGap, length)).toBe(1);
  });

  it("unscales pointer coordinates before computing a resized array item drop target", () => {
    const [array] = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B, C, D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const renderedNode = {
      x: () => 140,
      y: () => 40,
      scaleX: () => 2,
      scaleY: () => 2,
    };
    const cellWidth = array.style.cellWidth;
    const length = array.items.length;
    const localPoint = getLinearStructureLocalPoint(array, {
      x: renderedNode.x() + cellWidth * 0.65 * renderedNode.scaleX(),
      y: renderedNode.y() + 12 * renderedNode.scaleY(),
    }, renderedNode);

    expect(localPoint.x).toBeCloseTo(cellWidth * 0.65);
    const gap = getLinearItemPreviewGap({ localX: localPoint.x, length, cellWidth });
    expect(getLinearItemDropIndex(2, gap, length)).toBe(1);
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
    const withIndex = setLinearIndexOptions(queue, { indexBase: 1, showIndexes: true });
    expect(withIndex.settings).toEqual({ indexBase: 1, showIndexes: true });
    expect(withIndex.height).toBe(88);
    const hidden = setLinearIndexOptions(withIndex, { showIndexes: false });
    expect(hidden.height).toBe(44);
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

  it("derives graph min size from node count and node radius", () => {
    const small = getGraphMinSize(3, 26);
    expect(small.width).toBe(small.height);
    expect(small.width).toBe(small.layoutRadius * 2 + 26 * 2);

    // 节点更多 → 盒子更大
    expect(getGraphMinSize(8, 26).width).toBeGreaterThan(getGraphMinSize(3, 26).width);
    // 节点半径更大 → 盒子更大
    expect(getGraphMinSize(3, 52).width).toBeGreaterThan(getGraphMinSize(3, 26).width);
  });

  it("moveGraphNode 移动节点不改变边框尺寸", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B-C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const { width, height } = graph;
    const nodeId = graph.nodes[0].id;

    // 把节点拖到极端位置,边框宽高必须保持不变
    const moved = moveGraphNode(graph, nodeId, 999, -999);
    expect(moved.width).toBe(width);
    expect(moved.height).toBe(height);
    expect(moved.nodes.find((node) => node.id === nodeId)).toMatchObject({ x: 999, y: -999 });
  });

  // Bug1 复现:移动节点(尤其贴近左/上边缘)绝不能平移整个结构的原点 x/y。
  // 旧实现里 moveGraphNode 会经 normalizeStructureBounds 在 minX-radius<0 时
  // 把 element.x/y 一起平移,表现为"拖节点导致整个图跟着移动"。
  it("moveGraphNode 移动节点不平移结构原点(整图不跟随)", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B-C",
      point: { x: 200, y: 200 },
      zIndexStart: 0,
    });
    const originX = graph.x;
    const originY = graph.y;
    const nodeId = graph.nodes[0].id;

    // 把节点拖到贴近左上角(局部坐标接近 0,旧实现会触发负 shift)
    const moved = moveGraphNode(graph, nodeId, 0, 0);
    expect(moved.x).toBe(originX);
    expect(moved.y).toBe(originY);
    // 其他节点的局部坐标也不应被整体平移
    const otherId = graph.nodes[1].id;
    expect(moved.nodes.find((node) => node.id === otherId))
      .toMatchObject(graph.nodes.find((node) => node.id === otherId));
  });

  it("增删节点时边框不小于 count 下限且不向下收缩", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const radius = graph.style?.nodeRadius ?? 26;

    // 用户手动放大边框
    const enlarged = { ...graph, width: graph.width + 400, height: graph.height + 400 };

    // 加节点:不低于新 count 下限,且保留用户放大的尺寸
    const withNode = addGraphNode(enlarged, "C");
    expect(withNode.width).toBeGreaterThanOrEqual(getGraphMinSize(withNode.nodes.length, radius).width);
    expect(withNode.width).toBe(enlarged.width);

    // 删节点:不向下收缩
    const afterDelete = deleteGraphNode(withNode, withNode.nodes[0].id);
    expect(afterDelete.width).toBe(withNode.width);
    expect(afterDelete.height).toBe(withNode.height);
  });

  it("addGraphNode 把过小的边框顶大到 count 下限", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const radius = graph.style?.nodeRadius ?? 26;
    const tiny = { ...graph, width: 10, height: 10 };

    const withNode = addGraphNode(tiny, "C");
    const min = getGraphMinSize(withNode.nodes.length, radius);
    expect(withNode.width).toBe(min.width);
    expect(withNode.height).toBe(min.height);
  });

  it("setGraphNodeRadius 设置节点半径,顶大边框并把节点钳进框内", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B-C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const big = setGraphNodeRadius(graph, 52); // 200%
    expect(big.style.nodeRadius).toBe(52);
    const min = getGraphMinSize(big.nodes.length, 52);
    expect(big.width).toBeGreaterThanOrEqual(min.width);
    expect(big.height).toBeGreaterThanOrEqual(min.height);
    // 所有节点中心保持在 [r, 边长-r] 内,整圆不出界
    big.nodes.forEach((node) => {
      expect(node.x).toBeGreaterThanOrEqual(52);
      expect(node.x).toBeLessThanOrEqual(big.width - 52);
      expect(node.y).toBeGreaterThanOrEqual(52);
      expect(node.y).toBeLessThanOrEqual(big.height - 52);
    });
  });

  it("setGraphDirected 整图翻转所有边的方向并同步默认", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B, B-C, C-A",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    expect(graph.edges.every((edge) => edge.directed === false)).toBe(true);

    const directed = setGraphDirected(graph, true);
    expect(directed.settings.directedDefault).toBe(true);
    expect(directed.edges.every((edge) => edge.directed === true)).toBe(true);

    const undirected = setGraphDirected(directed, false);
    expect(undirected.settings.directedDefault).toBe(false);
    expect(undirected.edges.every((edge) => edge.directed === false)).toBe(true);
  });

  it("updates graph edges", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const edgeId = graph.edges[0].id;
    const updated = updateGraphEdge(graph, edgeId, { directed: true, weight: "4" });
    expect(updated.edges[0]).toMatchObject({ directed: true, weight: "4" });
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

  it("exports graph data in edge list format", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B:7, B->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(exportGraph(graph, "edge-list")).toBe("A-B:7, B->C");
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

  it("reloads graph data from text input", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const updated = updateGraphFromInput(graph, "A->C, B->D");
    expect(updated.nodes.map((node) => node.label)).toEqual(["A", "C", "B", "D"]);
    expect(updated.edges.length).toBe(2);
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

  it("reloads graph input using the current node radius and clamps preserved positions", () => {
    const [graph] = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const radius = 52;
    const enlarged = {
      ...graph,
      width: 468,
      height: 468,
      style: { ...graph.style, nodeRadius: radius },
      nodes: graph.nodes.map((node) => (
        node.label === "A" ? { ...node, x: 999, y: 999 } : node
      )),
    };

    const updated = updateGraphFromInput(enlarged, "A-B, B-C, C-D");
    const min = getGraphMinSize(updated.nodes.length, radius);
    const nodeA = updated.nodes.find((node) => node.label === "A");

    expect(updated.width).toBe(min.width);
    expect(updated.height).toBe(min.height);
    expect(nodeA).toMatchObject({ x: min.width - radius, y: min.height - radius });
    expect(updated.nodes.every((node) => (
      node.x >= radius
      && node.x <= updated.width - radius
      && node.y >= radius
      && node.y <= updated.height - radius
    ))).toBe(true);
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

  it("uses zero as the default label for newly added standalone tree nodes", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const added = addTreeNode(tree);
    const addedAgain = addTreeNode(added);

    expect(added.nodes.at(-1).label).toBe("0");
    expect(addedAgain.nodes.slice(-2).map((node) => node.label)).toEqual(["0", "0"]);
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

  it("adds general tree children and siblings in visual sibling order", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (source, label) => source.nodes.find((node) => node.label === label)?.id;

    const withChild = addTreeChild(tree, id(tree, "A"), "D");
    expect(withChild.edges.filter((edge) => edge.from === id(tree, "A")).map((edge) => (
      withChild.nodes.find((node) => node.id === edge.to)?.label
    ))).toEqual(["B", "C", "D"]);
    expect(withChild.nodes.find((node) => node.label === "D").x).toBeGreaterThan(withChild.nodes.find((node) => node.label === "C").x);

    const withLeftSibling = addTreeSibling(withChild, id(withChild, "C"), "left", "X");
    expect(withLeftSibling.edges.filter((edge) => edge.from === id(withLeftSibling, "A")).map((edge) => (
      withLeftSibling.nodes.find((node) => node.id === edge.to)?.label
    ))).toEqual(["B", "X", "C", "D"]);
    expect(withLeftSibling.nodes.find((node) => node.label === "X").x).toBeLessThan(withLeftSibling.nodes.find((node) => node.label === "C").x);

    const withRightSibling = addTreeSibling(withLeftSibling, id(withLeftSibling, "C"), "right", "Y");
    expect(withRightSibling.edges.filter((edge) => edge.from === id(withRightSibling, "A")).map((edge) => (
      withRightSibling.nodes.find((node) => node.id === edge.to)?.label
    ))).toEqual(["B", "X", "C", "Y", "D"]);

    expect(addTreeSibling(withRightSibling, id(withRightSibling, "A"), "left", "RootSibling")).toBe(withRightSibling);
  });

  it("uses zero as the default label for newly added tree children and siblings", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A->B, A->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const id = (source, label) => source.nodes.find((node) => node.label === label)?.id;

    const withChild = addTreeChild(tree, id(tree, "A"));
    const withSecondChild = addTreeChild(withChild, id(tree, "A"));
    expect(withChild.nodes.at(-1).label).toBe("0");
    expect(withSecondChild.nodes.slice(-2).map((node) => node.label)).toEqual(["0", "0"]);

    const withSibling = addTreeSibling(tree, id(tree, "C"), "right");
    expect(withSibling.nodes.at(-1).label).toBe("0");
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
      traversalCursor: 0,
      traversalOrder: order,
      highlighted: [order[0]],
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

    const selected = setTreeTraversalHighlight(tree, "level");
    expect(selected.markers).toMatchObject({ traversalCursor: 0, highlighted: [order[0]], traversalOrder: order });
    const first = stepTreeTraversalHighlight(selected, 1);
    expect(first.markers).toMatchObject({ traversalCursor: 1, highlighted: [order[1]], traversalOrder: order });
  });

  it("starts binary tree traversal playback at the first node", () => {
    const [tree] = createStructureElements({
      type: STRUCTURE_TYPES.BINARY_TREE,
      input: "A->B, A->C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });
    const order = getTreeTraversalOrder(tree, "preorder");

    const selected = setTreeTraversalHighlight(tree, "preorder");
    expect(selected.markers).toMatchObject({ traversalCursor: 0, highlighted: [order[0]], traversalOrder: order });
    const next = stepTreeTraversalHighlight(selected, 1);
    expect(next.markers).toMatchObject({ traversalCursor: 1, highlighted: [order[1]], traversalOrder: order });
    expect(clearTreeHighlight(next).markers).toMatchObject({
      traversalMode: null,
      highlighted: [],
      traversalCursor: -1,
      traversalOrder: [],
    });
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
