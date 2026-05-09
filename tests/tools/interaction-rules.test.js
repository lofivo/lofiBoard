import { describe, expect, it } from "vitest";
import {
  clampResizeAnchorPosition,
  getMinimumTextResizeWidth,
  getNormalizedTextBox,
  getSelectionHitRadius,
  getSingleLineTextEditorHeight,
  getTextPointerIntent,
  getTransformerAnchorsForSelection,
  isTransformerTarget,
  isTextWidthResizeAnchor,
  measureTextareaContentHeight,
  measureWrappedTextHeight,
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

  it("keeps the default text editor height to one line", () => {
    expect(getSingleLineTextEditorHeight(28, 1)).toBe(35);
    expect(getSingleLineTextEditorHeight(28, 2)).toBe(70);
  });

  it("edits text on click and only enters selection drag after movement", () => {
    expect(getTextPointerIntent({ dx: 0, dy: 0 })).toBe("edit");
    expect(getTextPointerIntent({ dx: 3, dy: 2 })).toBe("edit");
    expect(getTextPointerIntent({ dx: 5, dy: 0 })).toBe("drag");
  });

  it("measures live text editor height from textarea scroll height", () => {
    const sourceTextarea = {
      value: "line one\nline two",
      style: {
        boxSizing: "border-box",
        fontSize: "28px",
        padding: "0 6px",
        fontFamily: "Inter, sans-serif",
        fontStyle: "italic",
        fontWeight: "700",
        textDecoration: "underline",
        lineHeight: "1.25",
        letterSpacing: "0px",
      },
    };
    const measureTextarea = {
      rows: 3,
      style: {},
      scrollHeight: 70.2,
      value: "",
    };

    expect(measureTextareaContentHeight({
      sourceTextarea,
      measureTextarea,
      width: 120,
      minHeight: 35,
    })).toBe(71);
    expect(measureTextarea.value).toBe(sourceTextarea.value);
    expect(measureTextarea.rows).toBe(1);
    expect(measureTextarea.style.width).toBe("120px");
    expect(measureTextarea.style.height).toBe("0px");
    expect(measureTextarea.style.minHeight).toBe("0px");
    expect(measureTextarea.style.fontSize).toBe("28px");
    expect(measureTextarea.style.padding).toBe("0 6px");
  });

  it("keeps textarea measurement fresh when content grows while editing", () => {
    const sourceTextarea = {
      value: "first line",
      style: {
        boxSizing: "border-box",
        fontSize: "28px",
        padding: "0 6px",
        fontFamily: "Inter, sans-serif",
        fontStyle: "normal",
        fontWeight: "400",
        textDecoration: "none",
        lineHeight: "1.25",
        letterSpacing: "0px",
      },
    };
    const measureTextarea = {
      rows: 1,
      style: { height: "35px", minHeight: "35px" },
      scrollHeight: 35,
      value: "",
    };

    expect(measureTextareaContentHeight({
      sourceTextarea,
      measureTextarea,
      width: 120,
      minHeight: 35,
    })).toBe(35);

    sourceTextarea.value = "first line\nsecond line\nthird line";
    measureTextarea.scrollHeight = 105;

    expect(measureTextareaContentHeight({
      sourceTextarea,
      measureTextarea,
      width: 120,
      minHeight: 35,
    })).toBe(105);
    expect(measureTextarea.style.height).toBe("0px");
    expect(measureTextarea.style.minHeight).toBe("0px");
  });

  it("grows text box height when width-only resize wraps selected text", () => {
    const measureText = (value) => String(value).length * 10;

    expect(measureWrappedTextHeight({
      text: "one two three",
      contentWidth: 200,
      fontSize: 20,
      lineHeight: 1.25,
      measureText,
      minHeight: 25,
    })).toBe(25);
    expect(measureWrappedTextHeight({
      text: "one two three",
      contentWidth: 35,
      fontSize: 20,
      lineHeight: 1.25,
      measureText,
      minHeight: 25,
    })).toBeGreaterThan(25);
  });

  it("normalizes text box dimensions after text operations", () => {
    const measureText = (value) => String(value).length * 10;

    expect(getNormalizedTextBox({
      text: "one two three",
      width: 10,
      fontSize: 20,
      padding: 6,
      measureText,
    }).width).toBe(32);
    expect(getNormalizedTextBox({
      text: "one two three",
      width: 200,
      fontSize: 20,
      padding: 6,
      measureText,
    })).toEqual({ width: 200, height: 25 });
    expect(getNormalizedTextBox({
      text: "one two three",
      width: 47,
      fontSize: 20,
      padding: 6,
      measureText,
    }).height).toBeGreaterThan(25);
  });

  it("clamps resize anchors before they cross the opposite edge", () => {
    const topLeft = { x: 100, y: 50 };
    const bottomRight = { x: 220, y: 130 };

    expect(clampResizeAnchorPosition({
      anchor: "middle-right",
      position: { x: 80, y: 90 },
      topLeft,
      bottomRight,
      minWidth: 40,
      minHeight: 20,
    })).toEqual({ x: 140, y: 90 });
    expect(clampResizeAnchorPosition({
      anchor: "bottom-left",
      position: { x: 250, y: 40 },
      topLeft,
      bottomRight,
      minWidth: 40,
      minHeight: 20,
    })).toEqual({ x: 180, y: 70 });
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
