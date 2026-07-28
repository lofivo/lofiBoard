import { describe, expect, it, vi } from "vitest";
import { createAlignmentSnapController } from "../../../src/app/selection/alignment-snap-controller.js";

function createNode({
  id = null,
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
    id: vi.fn(() => id),
    position: vi.fn((nextPosition) => {
      attrs.x = nextPosition.x;
      attrs.y = nextPosition.y;
    }),
    x: vi.fn(() => attrs.x),
    y: vi.fn(() => attrs.y),
  };
}

class FakeGuideLine {
  constructor(config) {
    this.config = config;
    this.destroyed = false;
  }

  destroy() {
    this.destroyed = true;
  }
}

function createHarness({
  nodes,
  stageScale = 1,
  isSnapDisabled = () => false,
  viewportRect = { x: 0, y: 0, width: 800, height: 600 },
} = {}) {
  const contentLayer = {
    find: vi.fn(() => nodes),
  };
  const guideLayer = {
    lines: [],
    add(line) {
      this.lines.push(line);
    },
    batchDraw: vi.fn(),
  };
  const Konva = {
    Line: FakeGuideLine,
  };
  const controller = createAlignmentSnapController({
    Konva,
    contentLayer,
    guideLayer,
    getStageScale: () => stageScale,
    getViewportWorldRect: () => viewportRect,
    isSnapDisabled,
  });
  const getActiveGuideLines = () => guideLayer.lines.filter((line) => !line.destroyed);
  return { contentLayer, controller, getActiveGuideLines, guideLayer };
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

  it("ignores excluded elements when looking for snap targets", () => {
    const movingNode = createNode({ id: "moving_1", x: 10, y: 10, width: 20, height: 20 });
    const draggedSibling = createNode({ id: "sibling_1", x: 32, y: 32, width: 20, height: 20 });
    const { controller } = createHarness({
      nodes: [movingNode, draggedSibling],
    });

    controller.snapNodeToAlignment(movingNode, { excludeIds: ["sibling_1"] });

    expect(movingNode.position).not.toHaveBeenCalled();
  });

  it("still snaps against stationary elements that are not excluded", () => {
    const movingNode = createNode({ id: "moving_1", x: 10, y: 10, width: 20, height: 20 });
    const lockedNode = createNode({ id: "locked_1", x: 32, y: 32, width: 20, height: 20 });
    const { controller } = createHarness({
      nodes: [movingNode, lockedNode],
    });

    controller.snapNodeToAlignment(movingNode, { excludeIds: ["other_1"] });

    expect(movingNode.position).toHaveBeenCalledWith({ x: 12, y: 12 });
  });

  it("skips snapping and clears guides when snapping is disabled", () => {
    const movingNode = createNode({ x: 10, y: 10, width: 20, height: 20 });
    const otherNode = createNode({ x: 32, y: 32, width: 20, height: 20 });
    let disabled = false;
    const { controller, getActiveGuideLines } = createHarness({
      nodes: [movingNode, otherNode],
      isSnapDisabled: () => disabled,
    });

    controller.snapNodeToAlignment(movingNode, { showGuides: true });
    expect(getActiveGuideLines().length).toBeGreaterThan(0);

    disabled = true;
    movingNode.position.mockClear();
    controller.snapNodeToAlignment(movingNode, { showGuides: true });

    expect(movingNode.position).not.toHaveBeenCalled();
    expect(getActiveGuideLines()).toHaveLength(0);
  });

  it("draws guide lines matching the snapped alignment across the viewport", () => {
    const movingNode = createNode({ x: 10, y: 10, width: 20, height: 20 });
    const otherNode = createNode({ x: 32, y: 32, width: 20, height: 20 });
    const { controller, getActiveGuideLines } = createHarness({
      nodes: [movingNode, otherNode],
      viewportRect: { x: -100, y: -50, width: 800, height: 600 },
    });

    controller.snapNodeToAlignment(movingNode, { showGuides: true });

    const lines = getActiveGuideLines();
    expect(lines).toHaveLength(2);
    const vertical = lines.find((line) => line.config.points[0] === line.config.points[2]);
    const horizontal = lines.find((line) => line.config.points[1] === line.config.points[3]);
    // 吸附后 movingNode 左边缘与 otherNode 左边缘对齐在 x=32,顶边对齐在 y=32
    expect(vertical.config.points).toEqual([32, -50, 32, 550]);
    expect(horizontal.config.points).toEqual([-100, 32, 700, 32]);
    expect(vertical.config.listening).toBe(false);
  });

  it("replaces previous guide lines on each snap and clears them on demand", () => {
    const movingNode = createNode({ x: 10, y: 10, width: 20, height: 20 });
    const otherNode = createNode({ x: 32, y: 32, width: 20, height: 20 });
    const { controller, getActiveGuideLines, guideLayer } = createHarness({
      nodes: [movingNode, otherNode],
    });

    controller.snapNodeToAlignment(movingNode, { showGuides: true });
    controller.snapNodeToAlignment(movingNode, { showGuides: true });
    expect(getActiveGuideLines().length).toBeLessThanOrEqual(2);

    controller.clearAlignmentGuides();

    expect(getActiveGuideLines()).toHaveLength(0);
    expect(guideLayer.batchDraw).toHaveBeenCalled();
  });

  it("hides guides when the node is not close enough to snap", () => {
    const movingNode = createNode({ x: 10, y: 10, width: 20, height: 20 });
    const otherNode = createNode({ x: 200, y: 200, width: 20, height: 20 });
    const { controller, getActiveGuideLines } = createHarness({
      nodes: [movingNode, otherNode],
    });

    controller.snapNodeToAlignment(movingNode, { showGuides: true });

    expect(getActiveGuideLines()).toHaveLength(0);
  });

  it("snaps an arbitrary moving box without requiring a node mutation", () => {
    const otherNode = createNode({ id: "other_1", x: 32, y: 32, width: 20, height: 20 });
    const { controller } = createHarness({
      nodes: [otherNode],
    });

    const snap = controller.snapBoxToAlignment(
      { x: 10, y: 10, width: 20, height: 20 },
      { showGuides: true },
    );

    expect(snap).toMatchObject({ dx: 2, dy: 2, snapX: 32, snapY: 32 });
  });

  it("excludes ids when snapping a free box and still draws guides", () => {
    const excludedNode = createNode({ id: "excluded_1", x: 32, y: 32, width: 20, height: 20 });
    const keptNode = createNode({ id: "kept_1", x: 40, y: 12, width: 20, height: 20 });
    const { controller, getActiveGuideLines } = createHarness({
      nodes: [excludedNode, keptNode],
    });

    const snap = controller.snapBoxToAlignment(
      { x: 10, y: 10, width: 20, height: 20 },
      { excludeIds: ["excluded_1"], showGuides: true },
    );

    // x: left(10)->left(40)=30 too far; right(30)->left(40)=10 too far at threshold 8
    // y: top(10)->top(12)=2 snaps
    expect(snap.dy).toBe(2);
    expect(snap.dx).toBe(0);
    expect(getActiveGuideLines().length).toBe(1);
  });

});
