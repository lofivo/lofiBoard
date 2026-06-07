import { describe, expect, it, vi } from "vitest";
import { createAlignmentSnapController } from "../../../src/app/selection/alignment-snap-controller.js";

function createNode({
  x = 0,
  y = 0,
  width = 10,
  height = 10,
} = {}) {
  const attrs = { x, y };
  return {
    attrs,
    getClientRect: vi.fn(() => ({
      x: attrs.x,
      y: attrs.y,
      width,
      height,
    })),
    position: vi.fn((nextPosition) => {
      attrs.x = nextPosition.x;
      attrs.y = nextPosition.y;
    }),
    x: vi.fn(() => attrs.x),
    y: vi.fn(() => attrs.y),
  };
}

function createHarness({ nodes, stageScale = 1 } = {}) {
  const contentLayer = {
    find: vi.fn(() => nodes),
  };
  const controller = createAlignmentSnapController({
    contentLayer,
    getStageScale: () => stageScale,
  });
  return { contentLayer, controller };
}

describe("alignment-snap-controller", () => {
  it("snaps a moving node to the closest horizontal and vertical guide", () => {
    const movingNode = createNode({ x: 10, y: 10, width: 20, height: 20 });
    const nearNode = createNode({ x: 32, y: 32, width: 20, height: 20 });
    const fartherNode = createNode({ x: 34, y: 34, width: 20, height: 20 });
    const { controller } = createHarness({
      nodes: [movingNode, fartherNode, nearNode],
    });

    controller.snapNodeToAlignment(movingNode);

    expect(movingNode.position).toHaveBeenCalledWith({ x: 12, y: 12 });
  });

  it("uses the current stage scale when checking the snap threshold", () => {
    const movingNode = createNode({ x: 10, y: 10, width: 20, height: 20 });
    const otherNode = createNode({ x: 35, y: 100, width: 20, height: 20 });
    const { controller } = createHarness({
      nodes: [movingNode, otherNode],
      stageScale: 2,
    });

    controller.snapNodeToAlignment(movingNode);

    expect(movingNode.position).not.toHaveBeenCalled();
  });

  it("does not snap against the moving node itself", () => {
    const movingNode = createNode({ x: 10, y: 10, width: 20, height: 20 });
    const { controller } = createHarness({
      nodes: [movingNode],
    });

    controller.snapNodeToAlignment(movingNode);

    expect(movingNode.position).not.toHaveBeenCalled();
  });
});
