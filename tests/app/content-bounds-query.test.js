import { describe, expect, it, vi } from "vitest";
import { createContentBoundsQuery } from "../../src/app/content-bounds-query.js";

function createNode(box) {
  return {
    getClientRect: vi.fn(() => box),
  };
}

function createLayer(nodesById) {
  return {
    find: vi.fn((selector) => (selector === ".element" ? [...nodesById.values()] : [])),
    findOne: vi.fn((selector) => nodesById.get(selector.replace("#", "")) ?? null),
  };
}

describe("content-bounds-query", () => {
  it("merges valid element client rects into content bounds", () => {
    const contentLayer = createLayer(new Map([
      ["a", createNode({ x: 10, y: 20, width: 30, height: 10 })],
      ["b", createNode({ x: -5, y: 40, width: 15, height: 15 })],
      ["empty", createNode({ x: 0, y: 0, width: 0, height: 10 })],
      ["invalid", createNode({ x: Number.NaN, y: 0, width: 10, height: 10 })],
    ]));
    const query = createContentBoundsQuery({
      getContentLayer: () => contentLayer,
      getSelectedIds: () => [],
    });

    expect(query.getContentBounds()).toEqual({
      x: -5,
      y: 20,
      width: 45,
      height: 35,
    });
  });

  it("returns null when no valid content bounds exist", () => {
    const contentLayer = createLayer(new Map([
      ["empty", createNode({ x: 0, y: 0, width: 0, height: 10 })],
    ]));
    const query = createContentBoundsQuery({
      getContentLayer: () => contentLayer,
      getSelectedIds: () => [],
    });

    expect(query.getContentBounds()).toBeNull();
  });

  it("merges selected nodes only for selected content bounds", () => {
    const contentLayer = createLayer(new Map([
      ["a", createNode({ x: 10, y: 20, width: 30, height: 10 })],
      ["b", createNode({ x: -5, y: 40, width: 15, height: 15 })],
      ["c", createNode({ x: -100, y: -100, width: 5, height: 5 })],
    ]));
    const query = createContentBoundsQuery({
      getContentLayer: () => contentLayer,
      getSelectedIds: () => ["missing", "a", "b"],
    });

    expect(query.getSelectedContentBounds()).toEqual({
      x: -5,
      y: 20,
      width: 45,
      height: 35,
    });
    expect(contentLayer.findOne).toHaveBeenCalledWith("#missing");
    expect(contentLayer.findOne).toHaveBeenCalledWith("#a");
    expect(contentLayer.findOne).toHaveBeenCalledWith("#b");
  });

  it("returns null when selected ids have no valid nodes", () => {
    const contentLayer = createLayer(new Map([
      ["a", createNode({ x: 10, y: 20, width: -1, height: 10 })],
    ]));
    const query = createContentBoundsQuery({
      getContentLayer: () => contentLayer,
      getSelectedIds: () => ["a", "missing"],
    });

    expect(query.getSelectedContentBounds()).toBeNull();
  });
});
