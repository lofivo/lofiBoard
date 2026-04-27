import { describe, expect, it } from "vitest";
import {
  getSelectionHitRadius,
  isTransformerTarget,
  nextToolAfterTextPlacement,
  shouldIgnoreCanvasPointerDown,
  shouldSelectAll,
} from "../src/interaction-rules.js";
import { TOOLS } from "../src/ui-config.js";

function makeNode(className, parent = null) {
  return {
    getClassName: () => className,
    getParent: () => parent,
  };
}

describe("interaction rules", () => {
  it("keeps transformer handles from starting a new canvas selection", () => {
    const transformer = makeNode("Transformer");
    const anchor = makeNode("Rect", transformer);

    expect(isTransformerTarget(anchor)).toBe(true);
    expect(shouldIgnoreCanvasPointerDown({ target: anchor, isEditingText: false })).toBe(true);
  });

  it("returns to select after placing text", () => {
    expect(nextToolAfterTextPlacement(TOOLS.TEXT)).toBe(TOOLS.SELECT);
    expect(nextToolAfterTextPlacement(TOOLS.PEN)).toBe(TOOLS.PEN);
  });

  it("ignores the canvas click that closes an active text editor", () => {
    expect(shouldIgnoreCanvasPointerDown({ target: makeNode("Stage"), isEditingText: true })).toBe(true);
  });

  it("uses a forgiving hit radius for selecting nearby elements", () => {
    expect(getSelectionHitRadius(1)).toBe(12);
    expect(getSelectionHitRadius(0.5)).toBe(24);
    expect(getSelectionHitRadius(3)).toBe(6);
  });

  it("treats Alt+A and Ctrl+A as whiteboard select all", () => {
    expect(shouldSelectAll({ key: "a", altKey: true, ctrlKey: false, metaKey: false })).toBe(true);
    expect(shouldSelectAll({ key: "a", altKey: false, ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldSelectAll({ key: "b", altKey: true, ctrlKey: false, metaKey: false })).toBe(false);
  });
});
