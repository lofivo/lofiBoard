import { describe, expect, it } from "vitest";
import { splitStrokeByEraser } from "../../src/canvas/geometry.js";

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
});
