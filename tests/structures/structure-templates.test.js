import { describe, expect, it } from "vitest";
import {
  STRUCTURE_TYPES,
  createStructureElements,
  getStructureItem,
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

    expect(elements).toHaveLength(8);
    expect(elements.map((element) => element.zIndex)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    expect(elements.filter((element) => element.type === "text").map((element) => element.text)).toEqual([
      "0",
      "A",
      "1",
      "B",
    ]);
    expect(elements.filter((element) => element.type === "rect").map((element) => element.y)).toEqual([
      20,
      64,
      20,
      64,
    ]);
  });

  it("does not group array value cells by default so values can be edited directly", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "A, B",
      point: { x: 10, y: 20 },
      zIndexStart: 0,
    });

    const valueTexts = elements
      .filter((element) => element.type === "text")
      .filter((element) => ["A", "B"].includes(element.text));
    const valueRects = elements
      .filter((element) => element.type === "rect")
      .filter((element) => element.y === 64);

    expect(valueTexts).toHaveLength(2);
    expect(valueTexts.every((element) => element.groupId === undefined)).toBe(true);
    expect(valueTexts.every((element) => element.locked === undefined)).toBe(true);
    expect(valueRects).toHaveLength(2);
    expect(valueRects.every((element) => element.groupId === undefined)).toBe(true);
  });

  it("parses graph edges and preserves standalone nodes", () => {
    expect(parseGraphInput("A-B, A-C, D")).toEqual({
      nodes: ["A", "B", "C", "D"],
      edges: [
        { source: "A", target: "B" },
        { source: "A", target: "C" },
      ],
    });
  });

  it("creates graph lines before node shapes", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.GRAPH,
      input: "A-B, B-C",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(elements.filter((element) => element.type === "line")).toHaveLength(2);
    expect(elements.filter((element) => element.type === "ellipse")).toHaveLength(3);
    expect(elements.filter((element) => element.type === "text").map((element) => element.text)).toEqual(["A", "B", "C"]);
  });

  it("parses tree null placeholders", () => {
    expect(parseTreeInput("A, B, null, #, E")).toEqual(["A", "B", null, null, "E"]);
  });

  it("creates tree nodes and skips edges through null parents", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.TREE,
      input: "A, B, null, D",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    expect(elements.filter((element) => element.type === "ellipse")).toHaveLength(3);
    expect(elements.filter((element) => element.type === "line")).toHaveLength(2);
    expect(elements.filter((element) => element.type === "text").map((element) => element.text)).toEqual(["A", "B", "D"]);
  });

  it("uses default input when initial structure text is blank", () => {
    const elements = createStructureElements({
      type: STRUCTURE_TYPES.ARRAY,
      input: "   ",
      point: { x: 0, y: 0 },
      zIndexStart: 0,
    });

    const firstDefaultValue = getStructureItem(STRUCTURE_TYPES.ARRAY).defaultInput.split(",")[0].trim();
    expect(elements.filter((element) => element.type === "text" && !element.groupId).map((element) => element.text)).toContain(firstDefaultValue);
  });
});
