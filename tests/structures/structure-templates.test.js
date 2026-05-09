import { describe, expect, it } from "vitest";
import {
  STRUCTURE_ELEMENT_TYPES,
  STRUCTURE_TYPES,
  createStructureElements,
  getStructureItem,
  insertArrayItem,
  deleteArrayItem,
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

  it("parses graph edges and preserves standalone nodes", () => {
    const graph = parseGraphInput("A-B, A->C, D");
    expect(graph.nodes).toEqual(["A", "B", "C", "D"]);
    expect(graph.edges).toMatchObject([
      { from: "A", to: "B", directed: false, weight: "" },
      { from: "A", to: "C", directed: true, weight: "" },
    ]);
  });

  it("creates graph structure data with nodes and edges", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B, B->C",
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
      { from: "A", to: "B", directed: false },
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
});
