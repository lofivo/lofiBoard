import { describe, expect, it } from "vitest";
import { createImageElement, createShapeElement, createTextElement } from "../../src/board/element-factory.js";
import { TOOLS } from "../../src/ui/config.js";

describe("element factory", () => {
  it("sizes pasted text elements to the wrapped content height", () => {
    const text = "one two three four five six seven";
    const element = createTextElement({
      point: { x: 120, y: 80 },
      zIndex: 1,
      text,
      measureText: (value) => String(value).length * 10,
    });

    expect(element).toMatchObject({
      type: "text",
      x: 120,
      y: 80,
      text,
      width: 220,
    });
    expect(element.height).toBeGreaterThan(28 * 1.25);
  });

  it("keeps new editable text elements at one line before input", () => {
    const element = createTextElement({
      point: { x: 120, y: 80 },
      zIndex: 1,
    });

    expect(element.text).toBe("");
    expect(element.height).toBe(28 * 1.25);
  });

  it("initializes an independent editing box from the render box", () => {
    const element = createTextElement({
      point: { x: 120, y: 80 },
      zIndex: 1,
      text: "hello world",
      measureText: (value) => String(value).length * 10,
    });

    expect(element.editWidth).toBe(element.width);
    expect(element.editHeight).toBe(element.height);
  });

  it("creates pasted latex text with enough default width to avoid immediate formula wrapping", () => {
    const text = "$$\\frac{a+b+c+d+e+f+g+h+i+j+k+l}{m+n+o+p+q+r+s+t+u+v+w+x}$$";
    const element = createTextElement({
      point: { x: 120, y: 80 },
      zIndex: 1,
      text,
      measureText: (value) => String(value).length * 10,
    });

    expect(element.text).toBe(text);
    expect(element.width).toBeGreaterThan(520);
    expect(element.height).toBeGreaterThan(28 * 1.25 + 2);
    expect(element.editWidth).toBe(220);
    expect(element.editHeight).toBe(28 * 1.25);
  });

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

  it("creates linear shapes with stroke styling and arrow endpoint settings", () => {
    const line = createShapeElement({
      type: TOOLS.LINE,
      start: { x: 10, y: 20 },
      end: { x: 90, y: 70 },
      stroke: "#2563eb",
      strokeWidth: 8,
      fillColor: "#ffffff",
      transparentFill: true,
      opacity: 0.6,
      lineCap: "square",
      brushStyle: "dash",
      zIndex: 3,
    });
    const arrow = createShapeElement({
      type: TOOLS.ARROW,
      start: { x: 10, y: 20 },
      end: { x: 90, y: 70 },
      stroke: "#dc2626",
      strokeWidth: 6,
      fillColor: "#ffffff",
      transparentFill: true,
      opacity: 0.8,
      lineCap: "round",
      brushStyle: "dot",
      doubleArrow: true,
      zIndex: 4,
    });

    expect(line).toMatchObject({
      type: "line",
      points: [10, 20, 90, 70],
      stroke: "#2563eb",
      strokeWidth: 8,
      opacity: 0.6,
      lineCap: "square",
      brushStyle: "dash",
    });
    expect(arrow).toMatchObject({
      type: "arrow",
      points: [10, 20, 90, 70],
      fill: "#dc2626",
      opacity: 0.8,
      lineCap: "round",
      brushStyle: "dot",
      pointerAtBeginning: true,
      pointerAtEnding: true,
    });
  });
});
