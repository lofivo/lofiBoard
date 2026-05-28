import { describe, expect, it } from "vitest";
import {
  captureDrawingPointer,
  normalizePressure,
  preventDrawingPointerDefault,
  releaseDrawingPointer,
  shouldAppendStrokePoint,
  shouldHandlePointerEvent,
  smoothStrokePoint,
} from "../../src/tools/stroke-engine.js";

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

  it("captures and releases the active drawing pointer", () => {
    const target = {
      capturedPointerId: null,
      setPointerCapture(pointerId) {
        this.capturedPointerId = pointerId;
      },
      hasPointerCapture(pointerId) {
        return this.capturedPointerId === pointerId;
      },
      releasePointerCapture(pointerId) {
        if (this.capturedPointerId === pointerId) {
          this.capturedPointerId = null;
        }
      },
    };

    const capture = captureDrawingPointer({ pointerId: 17, target });

    expect(capture).toEqual({ pointerId: 17, target, captured: true });
    expect(target.capturedPointerId).toBe(17);
    expect(releaseDrawingPointer(capture)).toBe(true);
    expect(target.capturedPointerId).toBe(null);
  });

  it("filters move and up events from non-active drawing pointers", () => {
    expect(shouldHandlePointerEvent({ pointerId: 9 }, 9)).toBe(true);
    expect(shouldHandlePointerEvent({ pointerId: 10 }, 9)).toBe(false);
    expect(shouldHandlePointerEvent({ pointerId: 10 }, null)).toBe(true);
  });

  it("prevents browser touch and pen gestures during drawing", () => {
    let touchPrevented = false;
    let penPrevented = false;
    let mousePrevented = false;

    expect(preventDrawingPointerDefault({
      pointerType: "touch",
      preventDefault: () => {
        touchPrevented = true;
      },
    })).toBe(true);
    expect(preventDrawingPointerDefault({
      pointerType: "pen",
      preventDefault: () => {
        penPrevented = true;
      },
    })).toBe(true);
    expect(preventDrawingPointerDefault({
      pointerType: "mouse",
      preventDefault: () => {
        mousePrevented = true;
      },
    })).toBe(false);

    expect(touchPrevented).toBe(true);
    expect(penPrevented).toBe(true);
    expect(mousePrevented).toBe(false);
  });
});
