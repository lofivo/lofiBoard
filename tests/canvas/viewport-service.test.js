import { describe, expect, it } from "vitest";
import { computeFitViewport, computeViewportForBoundsVisibility } from "../../src/canvas/viewport-service.js";

describe("viewport service", () => {
  it("fits content bounds into the viewport with padding", () => {
    const viewport = computeFitViewport({
      bounds: { x: 100, y: 50, width: 400, height: 200 },
      stageSize: { width: 1000, height: 600 },
      padding: 100,
    });

    expect(viewport.scale).toBe(2);
    expect(viewport.x).toBe(-100);
    expect(viewport.y).toBe(0);
  });

  it("returns the default viewport when no content is available", () => {
    expect(computeFitViewport({ bounds: null, stageSize: { width: 800, height: 600 } })).toEqual({
      x: 0,
      y: 0,
      scale: 1,
    });
  });

  it("keeps the viewport unchanged when target bounds are already visible", () => {
    const viewport = { x: 10, y: 20, scale: 1.5 };

    expect(computeViewportForBoundsVisibility({
      bounds: { x: 100, y: 80, width: 120, height: 80 },
      viewport,
      stageSize: { width: 800, height: 600 },
      padding: 40,
    })).toBe(viewport);
  });

  it("centers offscreen target bounds without changing zoom", () => {
    expect(computeViewportForBoundsVisibility({
      bounds: { x: 1000, y: 600, width: 100, height: 80 },
      viewport: { x: 0, y: 0, scale: 2 },
      stageSize: { width: 800, height: 600 },
      padding: 40,
    })).toEqual({
      x: -1700,
      y: -980,
      scale: 2,
    });
  });
});
