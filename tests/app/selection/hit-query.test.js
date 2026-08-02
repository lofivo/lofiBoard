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

function createContentLayer({ name = "canvas-content-band", hit = null, visible = true } = {}) {
  return {
    name: vi.fn(() => name),
    isVisible: vi.fn(() => visible),
    getIntersection: vi.fn(() => hit),
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
  const contentBand = overrides.contentBand ?? createContentLayer({
    hit: Object.prototype.hasOwnProperty.call(overrides, "contentHit")
      ? overrides.contentHit
      : nodes.get("a"),
  });
  const overlayLayer = overrides.overlayLayer ?? createContentLayer({
    name: "selection-overlay-layer",
    hit: overrides.overlayHit ?? null,
  });
  const interactionLayer = overrides.interactionLayer ?? createContentLayer({
    name: "canvas-interaction-layer",
    hit: overrides.interactionHit ?? null,
  });
  const stage = overrides.stage ?? {
    scaleX: vi.fn(() => 2),
    x: vi.fn(() => 0),
    y: vi.fn(() => 0),
    getPointerPosition: vi.fn(() => ({ x: 10, y: 10 })),
    getIntersection: vi.fn(() => overrides.overlayHit ?? nodes.get("a")),
    getLayers: vi.fn(() => [contentBand, interactionLayer, overlayLayer]),
    children: [contentBand, interactionLayer, overlayLayer],
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
    contentBand,
    contentLayer,
    elements,
    expandGroupedIds,
    interactionLayer,
    nodes,
    overlayLayer,
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

  it("uses the actual content-layer hit region for webpage occlusion", () => {
    const hit = createElementNode("b");
    const contentBand = createContentLayer({ hit });
    const stage = {
      scaleX: vi.fn(() => 2),
      x: vi.fn(() => 10),
      y: vi.fn(() => 20),
      getLayers: vi.fn(() => [contentBand]),
      children: [contentBand],
    };
    const { query } = createQuery({ stage, contentBand, contentHit: hit });

    expect(query.getCanvasInteractionAtWorldPoint({ x: 15, y: 25 })).toEqual({
      blocksWebpage: true,
      elementId: "b",
    });
    expect(contentBand.getIntersection).toHaveBeenCalledWith({ x: 40, y: 70 });
  });

  it("ignores the hidden webpage placeholder when checking canvas occlusion", () => {
    const webpageHit = createElementNode("webpage");
    const contentBand = createContentLayer({ hit: webpageHit });
    const stage = {
      scaleX: vi.fn(() => 1),
      x: vi.fn(() => 0),
      y: vi.fn(() => 0),
      getLayers: vi.fn(() => [contentBand]),
      children: [contentBand],
    };
    const { query } = createQuery({
      stage,
      contentBand,
      elements: [{ id: "webpage", type: "webpage", zIndex: 0 }],
      nodes: new Map([["webpage", webpageHit]]),
    });

    expect(query.getCanvasInteractionAtWorldPoint({ x: 10, y: 20 })).toBeNull();
  });

  it("lets a webpage receive input when the only canvas hit is below it", () => {
    const elements = [
      { id: "canvas-below", type: "stroke", zIndex: 0 },
      { id: "webpage", type: "webpage", zIndex: 1 },
    ];
    const webpageNode = createElementNode("webpage", { x: 0, y: 0, width: 80, height: 80 });
    const canvasNode = createElementNode("canvas-below");
    const contentBand = createContentLayer({ hit: canvasNode });
    const stage = {
      scaleX: vi.fn(() => 1),
      x: vi.fn(() => 0),
      y: vi.fn(() => 0),
      getLayers: vi.fn(() => [contentBand]),
      children: [contentBand],
    };
    const { query } = createQuery({
      stage,
      contentBand,
      elements,
      nodes: new Map([
        ["canvas-below", canvasNode],
        ["webpage", webpageNode],
      ]),
    });

    expect(query.getWebpageInteractionAtWorldPoint({ x: 20, y: 20 })).toEqual({
      blocksWebpage: false,
      canvasElementId: "canvas-below",
      elementId: "webpage",
    });
  });

  it("reports a higher real canvas hit as the webpage blocker", () => {
    const elements = [
      { id: "webpage", type: "webpage", zIndex: 0 },
      { id: "canvas-above", type: "stroke", zIndex: 1 },
    ];
    const webpageNode = createElementNode("webpage", { x: 0, y: 0, width: 80, height: 80 });
    const canvasNode = createElementNode("canvas-above");
    const contentBand = createContentLayer({ hit: canvasNode });
    const stage = {
      scaleX: vi.fn(() => 1),
      x: vi.fn(() => 0),
      y: vi.fn(() => 0),
      getLayers: vi.fn(() => [contentBand]),
      children: [contentBand],
    };
    const { query } = createQuery({
      stage,
      contentBand,
      elements,
      nodes: new Map([
        ["canvas-above", canvasNode],
        ["webpage", webpageNode],
      ]),
    });

    expect(query.getWebpageInteractionAtWorldPoint({ x: 20, y: 20 })).toEqual({
      blocksWebpage: true,
      canvasElementId: "canvas-above",
      elementId: "webpage",
    });
  });

  it("builds hit-test candidates from element client rects and selection padding", () => {
    const fallbackNode = createElementNode("fallback");
    const { pickElementIdAtPoint, query } = createQuery({
      contentHit: null,
    });

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

  it("prefers content-layer geometry over transformer/overlay hits when selecting", () => {
    const inner = createElementNode("inner-rect", { x: 40, y: 40, width: 80, height: 60 });
    const outer = createElementNode("outer-ellipse", { x: 0, y: 0, width: 200, height: 160 });
    const contentBand = createContentLayer({ hit: inner });
    const overlayLayer = createContentLayer({
      name: "selection-overlay-layer",
      hit: { hasName: vi.fn(() => false), findAncestor: vi.fn(() => null) },
    });
    const elements = [
      { id: "outer-ellipse", type: "ellipse", zIndex: 0 },
      { id: "inner-rect", type: "rect", zIndex: 1 },
    ];
    const nodes = new Map([
      ["outer-ellipse", outer],
      ["inner-rect", inner],
    ]);
    const pickElementIdAtPoint = vi.fn(({ fallbackId }) => fallbackId);
    const { query, stage } = createQuery({
      elements,
      nodes,
      contentBand,
      overlayLayer,
      selectedIds: ["outer-ellipse"],
      pickElementIdAtPoint,
      stage: {
        scaleX: vi.fn(() => 1),
        x: vi.fn(() => 0),
        y: vi.fn(() => 0),
        getLayers: vi.fn(() => [contentBand, overlayLayer]),
        children: [contentBand, overlayLayer],
      },
    });

    expect(query.getSelectableElementIdAtWorldPoint(
      { x: 70, y: 55 },
      { preferUnselected: true },
    )).toBe("inner-rect");
    expect(pickElementIdAtPoint).toHaveBeenCalledWith(expect.objectContaining({
      fallbackId: "inner-rect",
      preferUnselected: true,
      selectedIds: ["outer-ellipse"],
    }));
    expect(overlayLayer.getIntersection).not.toHaveBeenCalled();
    expect(contentBand.getIntersection).toHaveBeenCalledWith({ x: 70, y: 55 });
    expect(stage.getLayers).toHaveBeenCalled();
  });

  it("skips interaction shield layers while resolving content geometry", () => {
    const shape = createElementNode("shape");
    const contentBand = createContentLayer({ hit: shape });
    const interactionLayer = createContentLayer({
      name: "canvas-interaction-layer",
      hit: createElementNode("shield"),
    });
    const { query } = createQuery({
      contentBand,
      interactionLayer,
      elements: [{ id: "shape", type: "rect", zIndex: 0 }],
      nodes: new Map([["shape", shape]]),
      stage: {
        scaleX: vi.fn(() => 1),
        x: vi.fn(() => 0),
        y: vi.fn(() => 0),
        getLayers: vi.fn(() => [contentBand, interactionLayer]),
        children: [contentBand, interactionLayer],
      },
      pickElementIdAtPoint: vi.fn(({ fallbackId }) => fallbackId),
    });

    expect(query.getContentElementIdAtWorldPoint({ x: 12, y: 18 })).toBe("shape");
    expect(interactionLayer.getIntersection).not.toHaveBeenCalled();
  });

  it("can exclude webpage placeholders from canvas hit testing", () => {
    const elements = [
      { id: "stroke", type: "stroke", zIndex: 0 },
      { id: "webpage", type: "webpage", zIndex: 1 },
    ];
    const nodes = new Map([
      ["stroke", createElementNode("stroke")],
      ["webpage", createElementNode("webpage")],
    ]);
    const pickElementIdAtPoint = vi.fn(({ candidates }) => (
      [...candidates].sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null
    ));
    const { query } = createQuery({
      elements,
      nodes,
      pickElementIdAtPoint,
      contentHit: null,
    });

    expect(query.getSelectableElementIdAtWorldPoint(
      { x: 10, y: 10 },
      { excludeTypes: ["webpage"] },
    )).toBe("stroke");
  });

  it("does not return an excluded webpage fallback node", () => {
    const elements = [
      { id: "webpage", type: "webpage", zIndex: 0 },
      { id: "stroke", type: "stroke", zIndex: 1 },
    ];
    const webpageNode = createElementNode("webpage");
    const { query, pickElementIdAtPoint } = createQuery({
      elements,
      nodes: new Map([
        ["webpage", webpageNode],
        ["stroke", createElementNode("stroke")],
      ]),
      contentHit: null,
      pickElementIdAtPoint: vi.fn(({ fallbackId }) => fallbackId),
    });

    expect(query.getSelectableElementIdAtWorldPoint(
      { x: 10, y: 10 },
      { fallbackNode: webpageNode, excludeTypes: ["webpage"] },
    )).toBeNull();
    expect(pickElementIdAtPoint).toHaveBeenCalledWith(expect.objectContaining({
      fallbackId: null,
      candidates: [expect.objectContaining({ id: "stroke" })],
    }));
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
