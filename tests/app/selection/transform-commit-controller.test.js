import { describe, expect, it, vi } from "vitest";
import { createSelectionTransformCommitController } from "../../../src/app/selection/transform-commit-controller.js";

function createNode({
  id,
  x = 10,
  y = 20,
  width = 100,
  height = 40,
  rotation = 15,
  scaleX = 2,
  scaleY = 1.5,
} = {}) {
  return {
    height: vi.fn(() => height),
    id,
    rotation: vi.fn(() => rotation),
    scaleX: vi.fn(() => scaleX),
    scaleY: vi.fn(() => scaleY),
    width: vi.fn(() => width),
    x: vi.fn(() => x),
    y: vi.fn(() => y),
  };
}

function createHarness(overrides = {}) {
  const state = {
    elements: overrides.elements ?? [],
  };
  const callbacks = {
    getStickyScaleCommitBox: vi.fn(() => ({ width: 240, height: 180, fontSize: 28 })),
    getTextScaleCommitBox: vi.fn(() => ({ width: 180, height: 64, fontSize: 32 })),
    normalizeTextElementBox: vi.fn((element) => ({ ...element, normalized: true })),
    ...overrides.callbacks,
  };
  const controller = createSelectionTransformCommitController({
    getElements: () => state.elements,
    setElements: (elements) => {
      state.elements = elements;
    },
    getElementIdFromNode: (node) => node?.id ?? null,
    getLastTransformAnchor: () => overrides.lastTransformAnchor ?? "bottom-right",
    getStickyScaleCommitBox: callbacks.getStickyScaleCommitBox,
    getTextScaleCommitBox: callbacks.getTextScaleCommitBox,
    normalizeTextElementBox: callbacks.normalizeTextElementBox,
  });

  return { callbacks, controller, state };
}

describe("transform-commit-controller", () => {
  it("commits text transforms through text scale boxes without changing wrapping ratio", () => {
    const textElement = {
      id: "text_1",
      type: "text",
      text: "hello",
      x: 1,
      y: 2,
      width: 100,
      height: 40,
      editWidth: 280,
      editHeight: 96,
      fontSize: 20,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };
    const { callbacks, controller, state } = createHarness({
      elements: [textElement],
      lastTransformAnchor: "bottom-right",
    });
    const node = createNode({ id: "text_1", x: 11, y: 22, width: 130, height: 50, rotation: 8, scaleX: 1.4, scaleY: 1.3 });

    controller.syncNodeToElement(node);

    expect(callbacks.getTextScaleCommitBox).toHaveBeenCalledWith({
      element: textElement,
      nodeWidth: 130,
      nodeHeight: 50,
      nodeScaleX: 1.4,
      nodeScaleY: 1.3,
      anchor: "bottom-right",
    });
    expect(callbacks.normalizeTextElementBox).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "text_1",
        x: 11,
        y: 22,
        rotation: 8,
        scaleX: 1.4,
        scaleY: 1.3,
        fontSize: 32,
        width: 180,
        height: 64,
      }),
      { preserveHeight: true },
    );
    expect(state.elements[0]).toMatchObject({
      id: "text_1",
      normalized: true,
      fontSize: 32,
      width: 180,
      height: 64,
      editWidth: 280,
      editHeight: 96,
    });
  });

  it("normalizes sticky transforms by committing size and clearing transient scale", () => {
    const stickyElement = {
      id: "sticky_1",
      type: "sticky",
      width: 160,
      height: 120,
      fontSize: 20,
      scaleX: 1,
      scaleY: 1,
    };
    const { callbacks, controller, state } = createHarness({
      elements: [stickyElement],
    });
    const node = createNode({ id: "sticky_1", x: 30, y: 40, rotation: 4, scaleX: 1.5, scaleY: 1.25 });

    controller.syncNodeToElement(node);

    expect(callbacks.getStickyScaleCommitBox).toHaveBeenCalledWith({
      element: stickyElement,
      nodeScaleX: 1.5,
      nodeScaleY: 1.25,
    });
    expect(state.elements[0]).toMatchObject({
      id: "sticky_1",
      x: 30,
      y: 40,
      rotation: 4,
      width: 240,
      height: 180,
      fontSize: 28,
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("commits coordinate plane resize previews into width, height, and centered origin", () => {
    const { controller, state } = createHarness({
      elements: [
        { id: "plane_1", type: "coordinate-plane", width: 80, height: 60, origin: { x: 40, y: 30 } },
      ],
    });
    const node = createNode({ id: "plane_1", x: 5, y: 6, width: 100, height: 80, rotation: 0, scaleX: 1.5, scaleY: 2 });

    controller.syncNodeToElement(node);

    expect(state.elements[0]).toMatchObject({
      id: "plane_1",
      x: 5,
      y: 6,
      width: 150,
      height: 160,
      origin: { x: 75, y: 80 },
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("commits graph structure resize into width/height, keeps node positions fixed, clears scale", () => {
    const { controller, state } = createHarness({
      elements: [
        {
          id: "graph_1",
          type: "graph-structure",
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          style: { nodeRadius: 26 },
          nodes: [
            { id: "A", label: "A", x: 50, y: 50 },
            { id: "B", label: "B", x: 150, y: 150 },
          ],
          edges: [],
        },
      ],
    });
    const node = createNode({ id: "graph_1", x: 7, y: 8, width: 200, height: 200, rotation: 0, scaleX: 1.5, scaleY: 1.5 });

    controller.syncNodeToElement(node);

    const committed = state.elements[0];
    expect(committed).toMatchObject({
      id: "graph_1",
      x: 7,
      y: 8,
      width: 300,
      height: 300,
      scaleX: 1,
      scaleY: 1,
    });
    // 节点位置固定不动(不随边框等比缩放)
    expect(committed.nodes.find((n) => n.id === "A")).toMatchObject({ x: 50, y: 50 });
    expect(committed.nodes.find((n) => n.id === "B")).toMatchObject({ x: 150, y: 150 });
  });

  it("commits graph resize from preview-baked node size when scale already reset to 1", () => {
    // 复现 BUG:拖边框时 preview(syncGraphTransformPreview)每次都把真实尺寸烘焙进 node、
    // 复位 scale=1。transformend 时 node.width()=真实尺寸、scaleX=1,但 element.width 仍是
    // transformstart 旧值。commit 必须读 node 的真实尺寸而非旧 element.width;否则 scale=1
    // 时 nextWidth 退回旧尺寸 → 边框不放大,而 x/y 又取自被 Konva 移动过的 node → 整图移动。
    const { controller, state } = createHarness({
      elements: [
        {
          id: "graph_1",
          type: "graph-structure",
          x: 0,
          y: 0,
          width: 200, // 模型仍是 transformstart 旧值(preview 不更新模型)
          height: 200,
          style: { nodeRadius: 26 },
          nodes: [
            { id: "A", label: "A", x: 50, y: 50 },
            { id: "B", label: "B", x: 150, y: 150 },
          ],
          edges: [],
        },
      ],
    });
    // preview 后状态:真实尺寸 320 已写进 node、scale 复位为 1、x/y 为拖动后的左上角
    const node = createNode({ id: "graph_1", x: 30, y: 40, width: 320, height: 320, rotation: 0, scaleX: 1, scaleY: 1 });

    controller.syncNodeToElement(node);

    const committed = state.elements[0];
    // 边框采用 preview 烘焙后的真实尺寸 320,而不是旧 element.width(200)
    expect(committed.width).toBe(320);
    expect(committed.height).toBe(320);
    // 位置与 node 一致(不发生额外偏移)
    expect(committed.x).toBe(30);
    expect(committed.y).toBe(40);
    expect(committed.scaleX).toBe(1);
    expect(committed.scaleY).toBe(1);
  });

  it("floors graph resize at count-derived min size and clamps nodes inside", () => {
    const { controller, state } = createHarness({
      elements: [
        {
          id: "graph_1",
          type: "graph-structure",
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          style: { nodeRadius: 26 },
          nodes: [{ id: "A", label: "A", x: 380, y: 380 }],
          edges: [],
        },
      ],
    });
    // 缩小到远低于下限(400*0.5=200 < min 234),应被钳到 234
    const node = createNode({ id: "graph_1", x: 0, y: 0, width: 400, height: 400, rotation: 0, scaleX: 0.5, scaleY: 0.5 });

    controller.syncNodeToElement(node);

    const committed = state.elements[0];
    expect(committed.width).toBe(234);
    expect(committed.height).toBe(234);
    expect(committed.scaleX).toBe(1);
    // 节点圆完整保留在框内:中心钳到 [r, 边长-r] = [26, 208]
    const a = committed.nodes.find((n) => n.id === "A");
    expect(a.x).toBeLessThanOrEqual(208);
    expect(a.x).toBeGreaterThanOrEqual(26);
    expect(a.y).toBeLessThanOrEqual(208);
  });

  it("commits every active transformer node when syncing selected nodes", () => {
    const { controller, state } = createHarness({
      elements: [
        { id: "shape_1", type: "rect", x: 0, y: 0, scaleX: 1, scaleY: 1 },
        { id: "shape_2", type: "rect", x: 0, y: 0, scaleX: 1, scaleY: 1 },
      ],
    });

    controller.syncSelectedNodes([
      createNode({ id: "shape_1", x: 10, y: 20 }),
      createNode({ id: "shape_2", x: 30, y: 40 }),
    ]);

    expect(state.elements).toMatchObject([
      { id: "shape_1", x: 10, y: 20 },
      { id: "shape_2", x: 30, y: 40 },
    ]);
  });
});
