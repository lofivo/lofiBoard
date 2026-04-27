import { describe, expect, it } from "vitest";
import {
  normalizePressure,
  shouldAppendStrokePoint,
  smoothStrokePoint,
} from "../src/stroke-engine.js";

describe("stroke engine", () => {
  it("skips points that are too close to improve pen stability", () => {
    const previous = { x: 10, y: 10 };

    expect(shouldAppendStrokePoint(previous, { x: 10.2, y: 10.2 }, 1)).toBe(false);
    expect(shouldAppendStrokePoint(previous, { x: 12, y: 10 }, 1)).toBe(true);
  });

  it("smooths incoming points without losing pressure", () => {
    const point = smoothStrokePoint(
      { x: 0, y: 0, pressure: 0.25 },
      { x: 10, y: 20, pressure: 0.75 },
      0.35,
    );

    expect(point).toEqual({ x: 6.5, y: 13, pressure: 0.75 });
  });

  it("normalizes missing or invalid pressure to a usable value", () => {
    expect(normalizePressure(0)).toBe(0.5);
    expect(normalizePressure(Number.NaN)).toBe(0.5);
    expect(normalizePressure(1.7)).toBe(1);
    expect(normalizePressure(0.2)).toBe(0.2);
  });
});
