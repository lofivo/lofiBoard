import { describe, expect, it } from "vitest";
import {
  computeEraserRadius,
  getBaseEraserRadiusForWidth,
  getBrushPreviewAttrs,
  getFillValue,
  getScaledEraserRadius,
  getObjectEraserIconAttrs,
  getSquareEraserPreviewAttrs,
  isShapeTool,
  resolveActiveDrawingTool,
} from "../../src/tools/behavior.js";
import { TOOLS } from "../../src/ui/config.js";

describe("tool behavior", () => {
  it("expands eraser radius with pointer speed and shrinks back at rest", () => {
    const base = 24;

    expect(computeEraserRadius({ baseRadius: base, speed: 0 })).toBe(base);
    expect(computeEraserRadius({ baseRadius: base, speed: 0.5 })).toBe(base);
    expect(computeEraserRadius({ baseRadius: base, speed: 2 })).toBeGreaterThan(base);
    expect(computeEraserRadius({ baseRadius: base, speed: 99 })).toBe(base * 3);
  });

  it("reduces the base eraser radius by 30 percent", () => {
    expect(getBaseEraserRadiusForWidth(10)).toBeCloseTo(12.6);
    expect(getBaseEraserRadiusForWidth(20)).toBeCloseTo(23.8);
  });

  it("keeps eraser size unchanged on screen at 100% and below, then grows after zooming in", () => {
    expect(getScaledEraserRadius(20, 0.25)).toBe(80);
    expect(getScaledEraserRadius(20, 0.5)).toBe(40);
    expect(getScaledEraserRadius(20, 1)).toBe(20);
    expect(getScaledEraserRadius(20, 1.5)).toBe(20);
  });

  it("does not bake zoom minimums into square eraser preview geometry", () => {
    expect(getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 10)).toMatchObject({
      x: 90,
      y: 70,
      width: 20,
      height: 20,
    });
  });

  it("positions the square eraser preview around the pointer", () => {
    expect(getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 18, 1)).toEqual({
      x: 82,
      y: 62,
      width: 36,
      height: 36,
      dash: [2.5, 1.8],
    });
  });

  it("keeps square eraser dash density within a controlled range", () => {
    expect(getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 18, 1).dash).toEqual([2.5, 1.8]);
    expect(getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 72, 1).dash).toEqual([4.38, 3.15]);
    expect(getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 120, 1).dash).toEqual([5, 3.6]);
  });

  it("keeps square eraser border spacing stable on screen when zoomed out", () => {
    const normalDash = getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 20, 1).dash;
    const halfScaleDash = getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 40, 0.5).dash;
    const quarterScaleDash = getSquareEraserPreviewAttrs({ x: 100, y: 80 }, 80, 0.25).dash;

    expect(halfScaleDash).toEqual(normalDash);
    expect(quarterScaleDash).toEqual(normalDash);
  });

  it("keeps the object eraser cursor as a small icon instead of the erase footprint", () => {
    const attrs = getObjectEraserIconAttrs({ x: 100, y: 80 }, 2, 24);

    expect(attrs.group).toEqual({ x: 100, y: 80, rotation: 24 });
    expect(attrs.body.width).toBeCloseTo(12.96);
    expect(attrs.body.height).toBeCloseTo(7.44);
    expect(attrs.body.fill).toBe("#f8fafc");
    expect(attrs.body.strokeWidth).toBe(0.75);
    expect(attrs.sleeve.x).toBeCloseTo(-6.48);
    expect(attrs.sleeve.width).toBeCloseTo(4.4064);
    expect(attrs.sleeve.fill).toBe("#cbd5e1");
    expect(attrs.divider.points[0]).toBeCloseTo(-2.0736);
    expect(attrs.divider.points[1]).toBeCloseTo(-3.72);
    expect(attrs.divider.points[2]).toBeCloseTo(-2.0736);
    expect(attrs.divider.points[3]).toBeCloseTo(3.72);
  });

  it("sizes the brush preview dot from the current stroke width", () => {
    expect(getBrushPreviewAttrs({ x: 48, y: 32 }, 12, "#2563eb", 2)).toEqual({
      dot: {
        x: 48,
        y: 32,
        radius: 6,
        fill: "#2563eb",
      },
      ring: {
        x: 48,
        y: 32,
        radius: 7.5,
      },
      gap: {
        x: 48,
        y: 32,
        radius: 7.5,
        fill: "#ffffff",
      },
    });
  });

  it("uses the selected shape type when the grouped shape tool is active", () => {
    expect(resolveActiveDrawingTool(TOOLS.SHAPE, TOOLS.ELLIPSE)).toBe(TOOLS.ELLIPSE);
    expect(resolveActiveDrawingTool(TOOLS.PEN, TOOLS.ELLIPSE)).toBe(TOOLS.PEN);
    expect(isShapeTool(TOOLS.ARROW)).toBe(true);
    expect(isShapeTool(TOOLS.COORDINATE_PLANE)).toBe(true);
  });

  it("maps transparent fill selection to document fill values", () => {
    expect(getFillValue({ transparent: true, color: "#ffffff" })).toBe("transparent");
    expect(getFillValue({ transparent: false, color: "#f8fafc" })).toBe("#f8fafc");
  });
});
