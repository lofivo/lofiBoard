import { describe, expect, it } from "vitest";
import { areStrokeFragmentsEquivalent, getEraserPathSamples, splitStrokeByEraser } from "../../src/canvas/geometry.js";

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
    expect(fragments[0].points.map((point) => point.x)).toEqual([0, 7]);
    expect(fragments[1].points.map((point) => point.x)).toEqual([23, 30]);
    expect(fragments.every((fragment) => fragment.stroke === "#111827")).toBe(true);
  });

  it("clips stroke fragments to the square eraser boundary on a single click", () => {
    const stroke = {
      id: "stroke_sparse",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 100, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 6,
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 50, y: 0 }, 10);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].points.map((point) => point.x)).toEqual([0, 38]);
    expect(fragments[1].points.map((point) => point.x)).toEqual([62, 100]);
    expect(fragments.flatMap((fragment) => fragment.points).every((point) => point.x <= 38 || point.x >= 62)).toBe(true);
  });

  it("interpolates pressure at erased fragment boundaries", () => {
    const stroke = {
      id: "stroke_pressure",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.2 },
        { x: 100, y: 0, pressure: 0.8 },
      ],
      stroke: "#111827",
      strokeWidth: 2,
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 50, y: 0 }, 10);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].points[0]).toEqual({ x: 0, y: 0, pressure: 0.2 });
    expect(fragments[0].points[1].x).toBeCloseTo(39.73, 2);
    expect(fragments[0].points[1].pressure).toBeCloseTo(0.43838, 5);
    expect(fragments[1].points[0].x).toBeCloseTo(60.27, 2);
    expect(fragments[1].points[0].pressure).toBeCloseTo(0.56162, 5);
    expect(fragments[1].points[1]).toEqual({ x: 100, y: 0, pressure: 0.8 });
  });

  it("keeps the actual erased footprint close to the eraser preview border", () => {
    const stroke = {
      id: "stroke_inset",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 100, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 2,
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 50, y: 0 }, 20);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].points.at(-1).x).toBe(31);
    expect(fragments[1].points[0].x).toBe(69);
  });

  it("removes the stroke cap from the square eraser footprint", () => {
    const stroke = {
      id: "stroke_cap",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 100, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 20,
      lineCap: "round",
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 50, y: 0 }, 10);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].points.map((point) => point.x)).toEqual([0, 31]);
    expect(fragments[1].points.map((point) => point.x)).toEqual([69, 100]);
  });

  it("drops tiny round-cap remnants after erasing a stroke", () => {
    const stroke = {
      id: "stroke_tiny_remnant",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 25, y: 0, pressure: 0.5 },
        { x: 130, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 20,
      lineCap: "round",
      zIndex: 0,
    };

    const fragments = splitStrokeByEraser(stroke, { x: 50, y: 0 }, 30);

    expect(fragments).toHaveLength(1);
    expect(fragments[0].points.map((point) => point.x)).toEqual([87, 130]);
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
    expect(fragments[0].points.map((point) => point.x)).toEqual([0, 7]);
    expect(fragments[1].points.map((point) => point.x)).toEqual([23, 30]);
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

  it("detects endpoint-only eraser clipping as a stroke change", () => {
    const stroke = {
      id: "stroke_trimmed",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 100, y: 0, pressure: 0.5 },
      ],
      strokeWidth: 10,
    };

    expect(areStrokeFragmentsEquivalent(stroke, [{ ...stroke, points: stroke.points.map((point) => ({ ...point })) }])).toBe(true);
    expect(areStrokeFragmentsEquivalent(stroke, [{
      ...stroke,
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 90, y: 0, pressure: 0.5 },
      ],
    }])).toBe(false);
  });
});
