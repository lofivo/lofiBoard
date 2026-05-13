import { describe, expect, it } from "vitest";
import { createImageElement, createShapeElement } from "../../src/board/element-factory.js";
import { TOOLS } from "../../src/ui/ui-config.js";

describe("element factory", () => {
  it("can create an image centered on the requested point after display scaling", () => {
    const element = createImageElement({
      point: { x: 300, y: 200 },
      src: "data:image/png;base64,abc",
      width: 840,
      height: 420,
      zIndex: 0,
      anchor: "center",
    });

    expect(element).toMatchObject({
      type: "image",
      x: 90,
      y: 95,
      width: 420,
      height: 210,
    });
  });

  it("creates a coordinate plane shape with centered origin and stable unit size", () => {
    const element = createShapeElement({
      type: TOOLS.COORDINATE_PLANE,
      start: { x: 120, y: 80 },
      end: { x: 600, y: 440 },
      stroke: "#111827",
      strokeWidth: 3,
      fillColor: "#ffffff",
      transparentFill: true,
      zIndex: 2,
    });

    expect(element).toMatchObject({
      type: "coordinate-plane",
      x: 120,
      y: 80,
      width: 480,
      height: 360,
      unitSize: 40,
      origin: { x: 240, y: 180 },
      settings: {
        showGrid: true,
        showTicks: true,
        showLabels: true,
      },
      style: {
        gridStroke: "#e5e7eb",
        axisStroke: "#111827",
        labelFill: "#64748b",
      },
    });
  });
});
