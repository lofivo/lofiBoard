import { describe, expect, it, vi } from "vitest";
import { createSelectionHitQuery } from "../../../src/app/selection/hit-query.js";

function createElementNode(id, rect = { x: 0, y: 0, width: 10, height: 10 }) {
  return {
    hasName: vi.fn((name) => name === "element"),
    id: vi.fn(() => id),
    findAncestor: vi.fn(),
    getClientRect: vi.fn(() => rect),
  };
}

function createChildNode(parent) {
  return {
    hasName: vi.fn(() => false),
    findAncestor: vi.fn((selector) => (selector === ".element" ? parent : null)),
  };
}

function createQuery(overrides = {}) {
  const elements = overrides.elements ?? [
    { id: "a", zIndex: 1 },
    { id: "b", zIndex: 2, locked: true },
  ];
  const nodes = overrides.nodes ?? new Map([
    ["a", createElementNode("a", { x: 0, y: 0, width: 40, height: 40 })],
    ["b", createElementNode("b", { x: 30, y: 0, width: 40, height: 40 })],
  ]);
  const stage = overrides.stage ?? {
    scaleX: vi.fn(() => 2),
    getPointerPosition: vi.fn(() => ({ x: 10, y: 10 })),
    getIntersection: vi.fn(() => nodes.get("a")),
  };
  const contentLayer = overrides.contentLayer ?? {
    findOne: vi.fn((selector) => nodes.get(selector.replace("#", "")) ?? null),
  };
  const pickElementIdAtPoint = overrides.pickElementIdAtPoint ?? vi.fn(({ fallbackId }) => fallbackId ?? "picked");
  const pointHitsSelectionBounds = overrides.pointHitsSelectionBounds ?? vi.fn(() => true);
  const expandGroupedIds = overrides.expandGroupedIds ?? vi.fn((ids) => ids);
  const query = createSelectionHitQuery({
    getStage: () => stage,
    getContentLayer: () => contentLayer,
    getElements: () => elements,
    getSelectedIds: () => overrides.selectedIds ?? ["a"],
    getSelectionHitRadius: overrides.getSelectionHitRadius ?? vi.fn((scale) => 12 / scale),
    pickElementIdAtPoint,
    pointHitsSelectionBounds,
    expandGroupedIds,
  });

  return {
    contentLayer,
    elements,
    expandGroupedIds,
    nodes,
    pickElementIdAtPoint,
    pointHitsSelectionBounds,
    query,
    stage,
  };
}

describe("hit-query", () => {
  it("resolves an element id from an element node or its ancestor", () => {
    const { nodes, query, stage } = createQuery();
    const elementNode = nodes.get("a");
    const childNode = createChildNode(elementNode);

    expect(query.getElementIdFromNode(elementNode)).toBe("a");
    expect(query.getElementIdFromNode(childNode)).toBe("a");
    expect(query.getElementIdFromNode(stage)).toBeNull();
    expect(query.getElementIdFromNode(null)).toBeNull();
  });

  it("uses a fallback node before probing the stage pointer intersection", () => {
    const { nodes, query, stage } = createQuery();

    expect(query.getElementIdAtPointer(nodes.get("b"))).toBe("b");
    expect(stage.getIntersection).not.toHaveBeenCalled();

    expect(query.getElementIdAtPointer(null)).toBe("a");
    expect(stage.getIntersection).toHaveBeenCalledWith({ x: 10, y: 10 });
  });

  it("builds hit-test candidates from element client rects and selection padding", () => {
    const fallbackNode = createElementNode("fallback");
    const { pickElementIdAtPoint, query } = createQuery();

    expect(query.getSelectableElementIdAtWorldPoint(
      { x: 32, y: 4 },
      { fallbackNode, preferUnselected: true },
    )).toBe("fallback");
    expect(pickElementIdAtPoint).toHaveBeenCalledWith({
      point: { x: 32, y: 4 },
      candidates: [
        { id: "a", zIndex: 1, box: { x: 0, y: 0, width: 40, height: 40 } },
        { id: "b", zIndex: 2, box: { x: 30, y: 0, width: 40, height: 40 } },
      ],
      padding: 6,
      fallbackId: "fallback",
      selectedIds: ["a"],
      preferUnselected: true,
    });
  });

  it("returns the first selected id when the point hits selected element bounds", () => {
    const { pointHitsSelectionBounds, query } = createQuery({ selectedIds: ["a", "b"] });

    expect(query.getNearbySelectedElementId({ x: -3, y: 5 })).toBe("a");
    expect(pointHitsSelectionBounds).toHaveBeenCalledWith(
      { x: -3, y: 5 },
      [
        { x: 0, y: 0, width: 40, height: 40 },
        { x: 30, y: 0, width: 40, height: 40 },
      ],
      6,
    );
  });

  it("wraps grouped selection expansion and locked element lookup", () => {
    const { expandGroupedIds, query } = createQuery({
      expandGroupedIds: vi.fn((ids, elements) => elements.map((element) => element.id).filter((id) => ids.includes(id))),
    });

    expect(query.expandGroupedIds(["b"])).toEqual(["b"]);
    expect(expandGroupedIds).toHaveBeenCalled();
    expect(query.isElementLocked("b")).toBe(true);
    expect(query.isElementLocked("missing")).toBe(false);
  });
});
