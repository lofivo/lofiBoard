import { describe, expect, it } from "vitest";
import { getEraserPathSamples, splitStrokeByEraser } from "../../src/canvas/geometry.js";

describe("geometry", () => {
  it("splits a stroke into editable fragments when the eraser crosses it", () => {
    const stroke = {
      id: "stroke_1",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 10, y: 0, pressure: 0.5 },
        { x: 20, y: 0, pressure: 0.5 },
        { x: 30, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 6,
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 15, y: 0 }, 6);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].points.map((point) => point.x)).toEqual([0, 10]);
    expect(fragments[1].points.map((point) => point.x)).toEqual([20, 30]);
    expect(fragments.every((fragment) => fragment.stroke === "#111827")).toBe(true);
  });

  it("removes a stroke when too few points remain", () => {
    const fragments = splitStrokeByEraser(
      {
        id: "stroke_2",
        type: "stroke",
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
        ],
      },
      { x: 0, y: 0 },
      20,
    );

    expect(fragments).toEqual([]);
  });

  it("erases a dragged stroke using the stroke transform", () => {
    const stroke = {
      id: "stroke_3",
      type: "stroke",
      x: 100,
      y: 50,
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 10, y: 0, pressure: 0.5 },
        { x: 20, y: 0, pressure: 0.5 },
        { x: 30, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 6,
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 115, y: 50 }, 6);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].points.map((point) => point.x)).toEqual([0, 10]);
    expect(fragments[1].points.map((point) => point.x)).toEqual([20, 30]);
    expect(fragments.every((fragment) => fragment.x === 100 && fragment.y === 50)).toBe(true);
  });

  it("uses a square eraser footprint instead of a circular one", () => {
    const stroke = {
      id: "stroke_4",
      type: "stroke",
      points: [
        { x: 20, y: 5, pressure: 0.5 },
        { x: 21, y: 5, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 6,
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 15, y: 0 }, 6);

    expect(fragments).toEqual([]);
  });

  it("samples a fast eraser move so it does not skip gaps between pointer events", () => {
    const samples = getEraserPathSamples(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      10,
    );

    expect(samples[0]).toEqual({ x: 0, y: 0 });
    expect(samples.at(-1)).toEqual({ x: 100, y: 0 });
    expect(samples.length).toBeGreaterThan(6);
    expect(samples.every((point, index) => {
      if (index === 0) return true;
      return Math.hypot(point.x - samples[index - 1].x, point.y - samples[index - 1].y) <= 8;
    })).toBe(true);
  });
});
