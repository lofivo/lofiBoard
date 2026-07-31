import { describe, expect, it } from "vitest";
import {
  compileCoordinateFunction,
  normalizeCoordinateFunctions,
  sampleCoordinateFunction,
} from "../../src/canvas/coordinate-functions.js";

describe("coordinate function sampling", () => {
  it("compiles common expressions and evaluates them with x", () => {
    const evaluate = compileCoordinateFunction("sin(x) + x^2");

    expect(evaluate).toBeTypeOf("function");
    expect(evaluate(0)).toBeCloseTo(0);
    expect(evaluate(2)).toBeCloseTo(4 + Math.sin(2));
  });

  it("accepts y= prefixes and samples a visible graph in canvas coordinates", () => {
    const segments = sampleCoordinateFunction("y = x", {
      width: 120,
      height: 120,
      unitSize: 40,
      origin: { x: 60, y: 60 },
      step: 10,
    });

    expect(segments).toHaveLength(1);
    expect(segments[0][0]).toBe(0);
    expect(segments[0][1]).toBeCloseTo(120);
    expect(segments[0].at(-2)).toBe(120);
    expect(segments[0].at(-1)).toBeCloseTo(0);
  });

  it("rejects assignments and risky parser expressions", () => {
    expect(compileCoordinateFunction("x = 2")).toBeNull();
    expect(compileCoordinateFunction('import("x")')).toBeNull();
    expect(compileCoordinateFunction("unknown(x)")).toBeNull();
  });

  it("normalizes multiline input into a bounded function list", () => {
    expect(normalizeCoordinateFunctions(" sin(x)\n\ny=x; x^2 ")).toEqual(["sin(x)", "x", "x^2"]);
  });

  it("keeps every sampled point inside the coordinate plane bounds", () => {
    const segments = sampleCoordinateFunction("x^2", {
      width: 240,
      height: 160,
      unitSize: 40,
      origin: { x: 120, y: 80 },
      step: 2,
    });
    const points = segments.flat();

    expect(points.length).toBeGreaterThan(0);
    expect(points.every((point, index) => index % 2 === 0
      ? point >= 0 && point <= 240
      : point >= 0 && point <= 160)).toBe(true);
  });
});
