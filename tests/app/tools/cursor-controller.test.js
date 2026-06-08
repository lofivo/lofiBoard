import { describe, expect, it, vi } from "vitest";
import { createToolCursorController } from "../../../src/app/tools/cursor-controller.js";
import {
  getBrushPreviewAttrs,
  getObjectEraserIconAttrs,
  getSquareEraserPreviewAttrs,
} from "../../../src/tools/behavior.js";
import { TOOLS } from "../../../src/ui/config.js";

class FakeNode {
  constructor(attrs = {}) {
    this.attrs = { ...attrs };
    this.children = [];
    this.visibleValue = attrs.visible ?? true;
  }

  add(child) {
    this.children.push(child);
  }

  setAttrs(attrs) {
    this.attrs = { ...this.attrs, ...attrs };
  }

  visible(nextVisible) {
    if (nextVisible === undefined) return this.visibleValue;
    this.visibleValue = nextVisible;
  }

  position() {
    return {
      x: this.attrs.x ?? 0,
      y: this.attrs.y ?? 0,
    };
  }
}

function createController(overrides = {}) {
  const overlayLayer = {
    children: [],
    add: vi.fn((node) => overlayLayer.children.push(node)),
    batchDraw: vi.fn(),
  };
  const controller = createToolCursorController({
    Konva: {
      Circle: FakeNode,
      Group: FakeNode,
      Line: FakeNode,
      Rect: FakeNode,
    },
    overlayLayer,
    getBrushColor: overrides.getBrushColor ?? (() => "#2563eb"),
    getCurrentTool: overrides.getCurrentTool ?? (() => TOOLS.ERASER_STROKE),
    getScale: overrides.getScale ?? (() => 2),
    getStrokeWidth: overrides.getStrokeWidth ?? (() => 12),
    isTemporaryPanActive: overrides.isTemporaryPanActive ?? (() => false),
  });

  return { controller, overlayLayer };
}

describe("tool-cursor-controller", () => {
  it("creates brush and eraser cursor nodes on the overlay layer", () => {
    const { controller, overlayLayer } = createController();

    expect(overlayLayer.add).toHaveBeenCalledTimes(5);
    expect(controller.nodes.objectEraserCursor.children).toHaveLength(3);
    expect(controller.nodes.eraserCursor.visible()).toBe(false);
    expect(controller.nodes.brushCursorDot.attrs.fill).toBe("#2563eb");
  });

  it("shows scale-aware stroke eraser preview and hides the object icon", () => {
    const { controller, overlayLayer } = createController();
    const point = { x: 100, y: 80 };
    const visibleRadius = controller.getVisibleEraserRadius(20);

    controller.showStrokeEraser(point, 20);

    expect(controller.nodes.eraserCursor.attrs).toMatchObject(
      getSquareEraserPreviewAttrs(point, visibleRadius, 2),
    );
    expect(controller.nodes.eraserCursor.visible()).toBe(true);
    expect(controller.nodes.objectEraserCursor.visible()).toBe(false);
    expect(overlayLayer.batchDraw).toHaveBeenCalled();
  });

  it("shows object eraser icon without changing the square footprint cursor", () => {
    const { controller } = createController();
    const point = { x: 50, y: 30 };

    controller.showObjectEraser(point);

    const attrs = getObjectEraserIconAttrs(point, 2);
    expect(controller.nodes.objectEraserCursor.attrs).toMatchObject(attrs.group);
    expect(controller.nodes.objectEraserBody.attrs).toMatchObject(attrs.body);
    expect(controller.nodes.objectEraserSleeve.attrs).toMatchObject(attrs.sleeve);
    expect(controller.nodes.objectEraserDivider.attrs).toMatchObject(attrs.divider);
    expect(controller.nodes.eraserCursor.visible()).toBe(false);
    expect(controller.nodes.objectEraserCursor.visible()).toBe(true);
  });

  it("shows and refreshes the brush cursor from current controls", () => {
    let color = "#111827";
    let width = 10;
    const { controller } = createController({
      getBrushColor: () => color,
      getStrokeWidth: () => width,
    });
    const point = { x: 48, y: 32 };

    controller.showBrushCursor(point);
    expect(controller.nodes.brushCursorDot.attrs).toMatchObject(
      getBrushPreviewAttrs(point, width, color, 2).dot,
    );

    color = "#ef4444";
    width = 16;
    controller.updateBrushCursorStyle();
    expect(controller.nodes.brushCursorDot.attrs.fill).toBe("#ef4444");
    expect(controller.nodes.brushCursorDot.attrs.radius).toBe(8);
  });

  it("hides cursors and skips style updates during temporary pan", () => {
    const { controller, overlayLayer } = createController({ isTemporaryPanActive: () => true });
    controller.showObjectEraser({ x: 10, y: 20 });
    overlayLayer.batchDraw.mockClear();

    controller.updateEraserCursorStyle();
    controller.hideToolCursors();

    expect(overlayLayer.batchDraw).toHaveBeenCalledTimes(1);
    expect(controller.nodes.eraserCursor.visible()).toBe(false);
    expect(controller.nodes.objectEraserCursor.visible()).toBe(false);
    expect(controller.nodes.brushCursorDot.visible()).toBe(false);
  });
});
