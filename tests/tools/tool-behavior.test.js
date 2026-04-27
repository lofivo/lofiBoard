import { describe, expect, it } from "vitest";
import {
  computeEraserRadius,
  getFillValue,
  isShapeTool,
  resolveActiveDrawingTool,
} from "../../src/tools/tool-behavior.js";
import { TOOLS } from "../../src/ui/ui-config.js";

describe("tool behavior", () => {
  it("expands eraser radius with pointer speed and shrinks back at rest", () => {
    const base = 24;

    expect(computeEraserRadius({ baseRadius: base, speed: 0 })).toBe(base);
    expect(computeEraserRadius({ baseRadius: base, speed: 2 })).toBeGreaterThan(base);
    expect(computeEraserRadius({ baseRadius: base, speed: 99 })).toBe(base * 3);
  });

  it("uses the selected shape type when the grouped shape tool is active", () => {
    expect(resolveActiveDrawingTool(TOOLS.SHAPE, TOOLS.ELLIPSE)).toBe(TOOLS.ELLIPSE);
    expect(resolveActiveDrawingTool(TOOLS.PEN, TOOLS.ELLIPSE)).toBe(TOOLS.PEN);
    expect(isShapeTool(TOOLS.ARROW)).toBe(true);
  });

  it("maps transparent fill selection to document fill values", () => {
    expect(getFillValue({ transparent: true, color: "#ffffff" })).toBe("transparent");
    expect(getFillValue({ transparent: false, color: "#f8fafc" })).toBe("#f8fafc");
  });
});
