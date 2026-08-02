import { describe, expect, it } from "vitest";
import {
  getCanvasBandCount,
  getCanvasBandIndex,
  getCanvasStackZIndex,
  getElementLayerValue,
  getOrderedElements,
  getWebpageStackIndex,
  getWebpageStackZIndex,
} from "../../../src/app/rendering/layer-order.js";

describe("layer order", () => {
  const elements = [
    { id: "canvas-a", type: "stroke", zIndex: 0 },
    { id: "webpage-a", type: "webpage", zIndex: 1 },
    { id: "canvas-b", type: "stroke", zIndex: 2 },
    { id: "webpage-b", type: "webpage", zIndex: 3 },
    { id: "canvas-c", type: "stroke", zIndex: 4 },
  ];

  it("orders webpages and canvas elements by the same zIndex", () => {
    const scrambled = [elements[4], elements[1], elements[0], elements[3], elements[2]];

    expect(getOrderedElements(scrambled).map((element) => element.id)).toEqual([
      "canvas-a",
      "webpage-a",
      "canvas-b",
      "webpage-b",
      "canvas-c",
    ]);
  });

  it("assigns canvas bands between interleaved webpages", () => {
    expect(getCanvasBandCount(elements)).toBe(3);
    expect(getCanvasBandIndex(elements, "canvas-a")).toBe(0);
    expect(getCanvasBandIndex(elements, "canvas-b")).toBe(1);
    expect(getCanvasBandIndex(elements, "canvas-c")).toBe(2);
    expect(getWebpageStackIndex(elements, "webpage-a")).toBe(0);
    expect(getWebpageStackIndex(elements, "webpage-b")).toBe(1);
  });

  it("maps canvas bands and webpages to alternating native z-indices", () => {
    expect(getCanvasStackZIndex(0)).toBe(0);
    expect(getWebpageStackZIndex(0)).toBe(1);
    expect(getCanvasStackZIndex(1)).toBe(2);
    expect(getWebpageStackZIndex(1)).toBe(3);
  });

  it("uses stable input order when zIndex is absent or tied", () => {
    const first = { id: "first" };
    const second = { id: "second", zIndex: 0 };

    expect(getElementLayerValue(first, 7)).toBe(7);
    expect(getOrderedElements([first, second]).map((element) => element.id)).toEqual([
      "first",
      "second",
    ]);
  });
});
