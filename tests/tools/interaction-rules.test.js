import { describe, expect, it } from "vitest";
import {
  getMinimumTextResizeWidth,
  getSelectionHitRadius,
  getTransformerAnchorsForSelection,
  isTransformerTarget,
  isTextWidthResizeAnchor,
  nextToolAfterTextPlacement,
  pointHitsSelectionBounds,
  shouldPreventBrowserZoom,
  shouldIgnoreCanvasPointerDown,
  shouldSelectAll,
} from "../../src/tools/interaction-rules.js";
import { TOOLS } from "../../src/ui/ui-config.js";

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

  it("keeps text selection resizing on corners and side width handles", () => {
    expect(getTransformerAnchorsForSelection([{ type: "text" }], true)).toEqual([
      "top-left",
      "top-right",
      "middle-left",
      "middle-right",
      "bottom-left",
      "bottom-right",
    ]);
  });

  it("keeps full resize handles for non-text or mixed selections", () => {
    expect(getTransformerAnchorsForSelection([{ type: "rect" }], true)).toContain("middle-left");
    expect(getTransformerAnchorsForSelection([{ type: "text" }, { type: "rect" }], true)).toContain("top-center");
    expect(getTransformerAnchorsForSelection([{ type: "text" }], false)).toEqual([]);
  });

  it("identifies text width-only resize handles", () => {
    expect(isTextWidthResizeAnchor("middle-left")).toBe(true);
    expect(isTextWidthResizeAnchor("middle-right")).toBe(true);
    expect(isTextWidthResizeAnchor("top-left")).toBe(false);
    expect(isTextWidthResizeAnchor("top-center")).toBe(false);
  });

  it("uses current character size as the minimum text resize width", () => {
    expect(getMinimumTextResizeWidth(24)).toBe(24);
    expect(getMinimumTextResizeWidth(0)).toBe(8);
    expect(getMinimumTextResizeWidth(undefined)).toBe(8);
  });

  it("ignores the canvas click that closes an active text editor", () => {
    expect(shouldIgnoreCanvasPointerDown({ target: makeNode("Stage"), isEditingText: true })).toBe(true);
  });

  it("uses a forgiving hit radius for selecting nearby elements", () => {
    expect(getSelectionHitRadius(1)).toBe(12);
    expect(getSelectionHitRadius(0.5)).toBe(24);
    expect(getSelectionHitRadius(3)).toBe(6);
  });

  it("treats Ctrl+A and Cmd+A as whiteboard select all", () => {
    expect(shouldSelectAll({ key: "a", altKey: true, ctrlKey: false, metaKey: false })).toBe(false);
    expect(shouldSelectAll({ key: "å", code: "KeyA", altKey: true, ctrlKey: false, metaKey: false })).toBe(false);
    expect(shouldSelectAll({ key: "a", altKey: false, ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldSelectAll({ key: "a", altKey: false, ctrlKey: false, metaKey: true })).toBe(true);
    expect(shouldSelectAll({ key: "b", code: "KeyB", altKey: true, ctrlKey: false, metaKey: false })).toBe(false);
  });

  it("treats the whole selected bounds as a draggable hit area", () => {
    const boxes = [
      { x: 100, y: 100, width: 80, height: 50 },
      { x: 260, y: 160, width: 40, height: 40 },
    ];

    expect(pointHitsSelectionBounds({ x: 220, y: 140 }, boxes, 0)).toBe(true);
    expect(pointHitsSelectionBounds({ x: 95, y: 96 }, boxes, 8)).toBe(true);
    expect(pointHitsSelectionBounds({ x: 80, y: 80 }, boxes, 8)).toBe(false);
  });

  it("prevents browser page zoom gestures globally", () => {
    expect(shouldPreventBrowserZoom({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldPreventBrowserZoom({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(shouldPreventBrowserZoom({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});
