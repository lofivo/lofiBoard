import { describe, expect, it, vi } from "vitest";
import { createCanvasInteractionShieldController } from "../../../src/app/selection/canvas-interaction-shield.js";

class FakeShape {
  constructor(attrs = {}) {
    this.attrs = { ...attrs };
    this.destroy = vi.fn();
    this.moveToTop = vi.fn();
  }

  setAttrs(attrs) {
    Object.assign(this.attrs, attrs);
  }

  visible(value) {
    if (value !== undefined) this.attrs.visible = value;
    return this.attrs.visible;
  }

  hasName(name) {
    return this.attrs.name === name;
  }
}

function createHarness(overrides = {}) {
  const elements = overrides.elements ?? [
    { id: "stroke", type: "stroke", x: 0, y: 0 },
    { id: "locked", type: "rectangle", locked: true, x: 100, y: 100 },
    { id: "webpage", type: "webpage", x: 200, y: 200 },
  ];
  const selectedIds = overrides.selectedIds ?? ["stroke", "locked", "webpage"];
  const nodes = overrides.nodes ?? new Map([
    ["stroke", { getClientRect: vi.fn(() => ({ x: 10, y: 20, width: 40, height: 50 })) }],
    ["locked", { getClientRect: vi.fn(() => ({ x: 100, y: 100, width: 40, height: 40 })) }],
    ["webpage", { getClientRect: vi.fn(() => ({ x: 200, y: 200, width: 80, height: 60 })) }],
  ]);
  const layer = {
    add: vi.fn(),
    batchDraw: vi.fn(),
  };
  const contentLayer = {
    findOne: vi.fn((selector) => nodes.get(selector.slice(1)) ?? null),
  };
  const stage = {
    scaleX: vi.fn(() => overrides.scale ?? 2),
    x: vi.fn(() => overrides.stageX ?? -20),
    y: vi.fn(() => overrides.stageY ?? -30),
    width: vi.fn(() => 800),
    height: vi.fn(() => 600),
  };
  const controller = createCanvasInteractionShieldController({
    Konva: { Shape: FakeShape },
    layer,
    getStage: () => stage,
    getContentLayer: () => contentLayer,
    getElements: () => elements,
    getSelectedIds: () => selectedIds,
    isElementLocked: (id) => Boolean(elements.find((element) => element.id === id)?.locked),
    getCurrentTool: () => overrides.currentTool ?? "select",
    isCanvasInteractionActive: () => overrides.active ?? false,
  });
  return { controller, contentLayer, layer, stage };
}

describe("canvas interaction shield", () => {
  it("covers the union of selected unlocked canvas elements, excluding webpages and locked items", () => {
    const { controller, layer } = createHarness();

    controller.sync();

    const shield = layer.add.mock.calls[0][0];
    expect(shield.attrs).toMatchObject({ x: 10, y: 20, width: 40, height: 50, visible: true });
    expect(controller.isSelectionShieldTarget(shield)).toBe(true);
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it("covers the viewport during an active selection drag", () => {
    const { controller, layer } = createHarness({ active: true });

    controller.sync();

    const shield = layer.add.mock.calls[0][0];
    expect(shield.attrs).toMatchObject({ x: 10, y: 15, width: 400, height: 300, visible: true });
  });

  it("hides the shield when no unlocked canvas selection can be dragged", () => {
    const { controller, layer } = createHarness({
      selectedIds: ["locked", "webpage"],
    });

    controller.sync();

    expect(layer.add).not.toHaveBeenCalled();
  });

  it("hides the shield outside the select tool", () => {
    const { controller, layer } = createHarness({ currentTool: "pen" });

    controller.sync();

    expect(layer.add).not.toHaveBeenCalled();
  });
});
