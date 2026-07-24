import { describe, expect, it, vi } from "vitest";
import {
  applyMeasuredTextHeights,
  createTextElementMeasurer,
} from "../../../src/app/editing/text-element-measure.js";

function createMeasurer() {
  const context = {
    font: "",
    measureText: vi.fn((value) => ({ width: String(value).length * 10 })),
  };
  const canvas = {
    getContext: vi.fn(() => context),
  };
  return {
    context,
    canvas,
    measurer: createTextElementMeasurer({ createCanvas: () => canvas }),
  };
}

describe("text-element-measure", () => {
  it("applies measured render heights without changing editing dimensions", () => {
    const elements = [{
      id: "text_1",
      type: "text",
      width: 180,
      height: 40,
      editWidth: 320,
      editHeight: 96,
    }];

    const result = applyMeasuredTextHeights(elements, [{ id: "text_1", height: 84 }]);

    expect(result.changed).toBe(true);
    expect(result.elements[0]).toEqual({
      ...elements[0],
      height: 84,
    });
  });

  it("sets the canvas font from text style tokens before measuring", () => {
    const { context, measurer } = createMeasurer();
    const element = {
      text: "hello",
      fontSize: 18,
      fontFamily: "Inter",
      fontStyle: "bold italic",
      padding: 4,
    };

    expect(measurer.measureTextElementValue(element, "abc")).toBe(30);
    expect(context.font).toBe("italic 700 18px Inter");
  });

  it("computes preferred and minimum text widths through the shared measurer", () => {
    const { measurer } = createMeasurer();
    const element = {
      type: "text",
      text: "$$x^2 + y^2 = z^2$$",
      width: 20,
      fontSize: 16,
      fontFamily: "Inter",
      fontStyle: "normal",
      padding: 4,
    };

    expect(measurer.getMinimumTextElementWidth(element)).toBeGreaterThan(20);
    expect(measurer.getPreferredTextElementWidth(element, 20)).toBeGreaterThan(20);
  });

  it("normalizes text element dimensions while preserving non-text elements", () => {
    const { measurer } = createMeasurer();
    const textElement = {
      type: "text",
      text: "hello world",
      width: 48,
      height: 10,
      fontSize: 16,
      fontFamily: "Inter",
      fontStyle: "normal",
      padding: 4,
      scaleX: 2,
      scaleY: 2,
    };
    const normalized = measurer.normalizeTextElementBox(textElement);

    expect(normalized.type).toBe("text");
    expect(normalized.scaleX).toBe(1);
    expect(normalized.scaleY).toBe(1);
    expect(normalized.height).toBeGreaterThan(10);

    expect(measurer.normalizeTextElementBox({ type: "rect" })).toEqual({ type: "rect" });
  });

  it("can preserve the current height when committing transformer scale", () => {
    const { measurer } = createMeasurer();
    const element = {
      type: "text",
      text: "hello world",
      width: 48,
      height: 123,
      fontSize: 16,
      fontFamily: "Inter",
      fontStyle: "normal",
      padding: 4,
    };

    expect(measurer.normalizeTextElementBox(element, { preserveHeight: true }).height).toBe(123);
  });
});
