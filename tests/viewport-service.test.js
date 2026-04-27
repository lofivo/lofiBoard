import { describe, expect, it } from "vitest";
import { computeFitViewport } from "../src/viewport-service.js";

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
});
