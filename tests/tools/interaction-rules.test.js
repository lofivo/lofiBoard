import { describe, expect, it } from "vitest";
import {
  clampResizeAnchorPosition,
  getTextTransformMinimumSize,
  getTextScaleCommitBox,
  getTextEditorStyle,
  getStickyEditorCommitBox,
  getStickyScaleCommitBox,
  getStickyTextInsets,
  getStickyVisualMetrics,
  getUniformScaledBoxForResize,
  getUniformScaledBoxForVerticalResize,
  getMinimumTextResizeWidth,
  getNormalizedTextBox,
  getSelectionHitRadius,
  getSingleLineTextEditorHeight,
  getTransformerAnchorsForSelection,
  isTransformerVerticalScaleAnchor,
  isNativeTextEditingTarget,
  isTransformerAnchorTarget,
  isTransformerScaleAnchor,
  isTransformerTarget,
  isTextWidthResizeAnchor,
  measureTextareaContentHeight,
  measureWrappedTextHeight,
  nextToolAfterTextPlacement,
  pickElementIdAtPoint,
  pointHitsSelectionBounds,
  shouldPreventBrowserZoom,
  shouldEditTextOnTransformerDoubleClick,
  shouldIgnoreCanvasPointerDown,
  shouldSelectAll,
  shouldUseBrowserSelectAll,
  shouldUseUniformTransformerResize,
  truncateWithEllipsis,
} from "../../src/tools/interaction-rules.js";
import { TOOLS } from "../../src/ui/ui-config.js";

function makeNode(className, parent = null) {
  return {
    getClassName: () => className,
    hasName: (name) => name === className,
    getParent: () => parent,
  };
}

describe("interaction rules", () => {
  it("keeps transformer handles from starting a new canvas selection", () => {
    const transformer = makeNode("Transformer");
    const anchor = makeNode("Rect", transformer);

    expect(isTransformerTarget(anchor)).toBe(true);
    expect(isTransformerAnchorTarget(anchor)).toBe(false);
    expect(shouldIgnoreCanvasPointerDown({ target: anchor, isEditingText: false })).toBe(false);
  });

  it("keeps transformer anchors from starting a canvas drag or selection", () => {
    const transformer = makeNode("Transformer");
    const anchor = makeNode("_anchor", transformer);

    expect(isTransformerTarget(anchor)).toBe(true);
    expect(isTransformerAnchorTarget(anchor)).toBe(true);
    expect(shouldIgnoreCanvasPointerDown({ target: anchor, isEditingText: false })).toBe(true);
  });

  it("only edits selected text or sticky elements from transformer double click", () => {
    const transformer = makeNode("Transformer");
    const back = makeNode("Rect", transformer);
    const anchor = makeNode("_anchor", transformer);
    const selectedText = { id: "text_1", type: "text" };
    const selectedSticky = { id: "sticky_1", type: "sticky" };

    expect(shouldEditTextOnTransformerDoubleClick({
      target: back,
      currentTool: TOOLS.SELECT,
      element: selectedText,
      selectedIds: ["text_1"],
    })).toBe(true);
    expect(shouldEditTextOnTransformerDoubleClick({
      target: back,
      currentTool: TOOLS.SELECT,
      element: selectedSticky,
      selectedIds: ["sticky_1"],
    })).toBe(true);
    expect(shouldEditTextOnTransformerDoubleClick({
      target: anchor,
      currentTool: TOOLS.SELECT,
      element: selectedText,
      selectedIds: ["text_1"],
    })).toBe(false);
    expect(shouldEditTextOnTransformerDoubleClick({
      target: back,
      currentTool: TOOLS.PEN,
      element: selectedText,
      selectedIds: ["text_1"],
    })).toBe(false);
    expect(shouldEditTextOnTransformerDoubleClick({
      target: back,
      currentTool: TOOLS.SELECT,
      element: { id: "text_1", type: "text", locked: true },
      selectedIds: ["text_1"],
    })).toBe(false);
    expect(shouldEditTextOnTransformerDoubleClick({
      target: back,
      currentTool: TOOLS.SELECT,
      element: selectedText,
      selectedIds: [],
    })).toBe(false);
    expect(shouldEditTextOnTransformerDoubleClick({
      target: back,
      currentTool: TOOLS.SELECT,
      element: { id: "rect_1", type: "rect" },
      selectedIds: ["rect_1"],
    })).toBe(false);
    expect(shouldEditTextOnTransformerDoubleClick({
      target: back,
      currentTool: TOOLS.SELECT,
      isTemporaryPanActive: true,
      element: selectedText,
      selectedIds: ["text_1"],
    })).toBe(false);
  });

  it("returns to select after placing text", () => {
    expect(nextToolAfterTextPlacement(TOOLS.TEXT)).toBe(TOOLS.SELECT);
    expect(nextToolAfterTextPlacement(TOOLS.PEN)).toBe(TOOLS.PEN);
  });

  it("keeps text selection resizing available on corners and invisible side edges", () => {
    expect(getTransformerAnchorsForSelection([{ type: "text" }], true)).toEqual([
      "top-left",
      "top-center",
      "top-right",
      "middle-left",
      "middle-right",
      "bottom-left",
      "bottom-center",
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

  it("identifies vertical edge anchors that scale instead of stretch", () => {
    expect(isTransformerVerticalScaleAnchor("top-center")).toBe(true);
    expect(isTransformerVerticalScaleAnchor("bottom-center")).toBe(true);
    expect(isTransformerVerticalScaleAnchor("middle-left")).toBe(false);
    expect(isTransformerVerticalScaleAnchor("top-left")).toBe(false);
  });

  it("identifies corner and vertical edge anchors that scale proportionally", () => {
    expect(isTransformerScaleAnchor("top-left")).toBe(true);
    expect(isTransformerScaleAnchor("bottom-right")).toBe(true);
    expect(isTransformerScaleAnchor("top-center")).toBe(true);
    expect(isTransformerScaleAnchor("middle-right")).toBe(false);
  });

  it("converts corner and vertical edge resizing into proportional scaling", () => {
    const oldBox = { x: 100, y: 80, width: 200, height: 100, rotation: 0 };

    expect(getUniformScaledBoxForVerticalResize({
      anchor: "bottom-center",
      oldBox,
      newBox: { x: 100, y: 80, width: 200, height: 150, rotation: 0 },
      minWidth: 12,
      minHeight: 12,
    })).toEqual({ x: 50, y: 80, width: 300, height: 150, rotation: 0 });

    expect(getUniformScaledBoxForVerticalResize({
      anchor: "top-center",
      oldBox,
      newBox: { x: 100, y: 30, width: 200, height: 150, rotation: 0 },
      minWidth: 12,
      minHeight: 12,
    })).toEqual({ x: 50, y: 30, width: 300, height: 150, rotation: 0 });

    expect(getUniformScaledBoxForVerticalResize({
      anchor: "bottom-right",
      oldBox,
      newBox: { x: 100, y: 80, width: 120, height: 40, rotation: 0 },
      minWidth: 12,
      minHeight: 12,
    })).toEqual({ x: 100, y: 80, width: 120, height: 60, rotation: 0 });
  });

  it("stretches rectangle and ellipse edge handles without proportional scaling", () => {
    const oldBox = { x: 100, y: 80, width: 200, height: 100, rotation: 0 };

    expect(shouldUseUniformTransformerResize([{ type: "rect" }], "top-center")).toBe(false);
    expect(shouldUseUniformTransformerResize([{ type: "ellipse" }], "middle-right")).toBe(false);
    expect(getUniformScaledBoxForResize({
      elements: [{ type: "rect" }],
      anchor: "bottom-center",
      oldBox,
      newBox: { x: 100, y: 80, width: 200, height: 150, rotation: 0 },
      minWidth: 12,
      minHeight: 12,
    })).toEqual({ x: 100, y: 80, width: 200, height: 150, rotation: 0 });
  });

  it("uses proportional scaling for sticky and structure horizontal edge handles", () => {
    const oldBox = { x: 100, y: 80, width: 200, height: 100, rotation: 0 };

    expect(shouldUseUniformTransformerResize([{ type: "sticky" }], "middle-right")).toBe(true);
    expect(shouldUseUniformTransformerResize([{ type: "array-structure" }], "middle-right")).toBe(true);
    expect(getUniformScaledBoxForResize({
      elements: [{ type: "sticky" }],
      anchor: "middle-right",
      oldBox,
      newBox: { x: 100, y: 80, width: 300, height: 100, rotation: 0 },
      minWidth: 12,
      minHeight: 12,
    })).toEqual({ x: 100, y: 55, width: 300, height: 150, rotation: 0 });
    expect(getUniformScaledBoxForResize({
      elements: [{ type: "graph-structure" }],
      anchor: "middle-left",
      oldBox,
      newBox: { x: 0, y: 80, width: 300, height: 100, rotation: 0 },
      minWidth: 12,
      minHeight: 12,
    })).toEqual({ x: 0, y: 55, width: 300, height: 150, rotation: 0 });
  });

  it("honors minimum dimensions while keeping vertical edge scaling proportional", () => {
    const oldBox = { x: 100, y: 80, width: 200, height: 100, rotation: 0 };

    expect(getUniformScaledBoxForVerticalResize({
      anchor: "bottom-center",
      oldBox,
      newBox: { x: 100, y: 80, width: 200, height: 4, rotation: 0 },
      minWidth: 40,
      minHeight: 30,
    })).toEqual({ x: 170, y: 80, width: 60, height: 30, rotation: 0 });
  });

  it("commits text proportional scaling without changing the text wrapping ratio", () => {
    expect(getTextScaleCommitBox({
      element: { width: 200, height: 80, fontSize: 24 },
      nodeScaleX: 0.5,
      nodeScaleY: 0.5,
      anchor: "bottom-right",
    })).toEqual({ width: 100, fontSize: 12, height: 40 });

    expect(getTextScaleCommitBox({
      element: { width: 200, height: 80, fontSize: 24 },
      nodeScaleX: 2,
      nodeScaleY: 2,
      anchor: "bottom-right",
    })).toEqual({ width: 400, fontSize: 48, height: 160 });

    expect(getTextScaleCommitBox({
      element: { width: 200, fontSize: 24 },
      nodeScaleX: 0.5,
      nodeScaleY: 1,
      anchor: "middle-right",
    })).toEqual({ width: 100, fontSize: 24, height: undefined });

    expect(getTextScaleCommitBox({
      element: { width: 200, fontSize: 24 },
      nodeWidth: 320,
      nodeScaleX: 1,
      nodeScaleY: 1,
      anchor: "middle-right",
    })).toEqual({ width: 320, fontSize: 24, height: undefined });

    expect(getTextScaleCommitBox({
      element: { width: 200, height: 80, fontSize: 24 },
      nodeScaleX: 0.1,
      nodeScaleY: 0.1,
      anchor: "bottom-right",
    })).toEqual({ width: 200 * (8 / 24), fontSize: 8, height: 80 * (8 / 24) });
  });

  it("commits text width resize with the previewed wrapped height", () => {
    expect(getTextScaleCommitBox({
      element: { width: 200, height: 60, fontSize: 24 },
      nodeWidth: 320,
      nodeHeight: 96,
      nodeScaleX: 1,
      nodeScaleY: 1,
      anchor: "middle-right",
    })).toEqual({ width: 320, height: 96, fontSize: 24 });
  });

  it("uses minimum font size for text corner scaling constraints", () => {
    expect(getTextTransformMinimumSize({
      element: { fontSize: 24, padding: 0 },
      anchor: "bottom-right",
      stageScale: 1,
    })).toEqual({ minWidth: 8, minHeight: 10 });

    expect(getTextTransformMinimumSize({
      element: { fontSize: 24, padding: 0 },
      anchor: "middle-right",
      stageScale: 1,
    })).toEqual({ minWidth: 24, minHeight: 30 });
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

  it("keeps text visually rendered by Konva while the textarea edits input", () => {
    expect(getTextEditorStyle({
      element: {
        type: "text",
        fill: "#111827",
        fontSize: 28,
        fontFamily: "Inter, system-ui, sans-serif",
        fontStyle: "bold italic",
        textDecoration: "underline",
      },
      scale: 1.5,
      horizontalPadding: 9,
    })).toEqual({
      fontSize: "42px",
      padding: "0 9px",
      color: "transparent",
      fontFamily: "Inter, system-ui, sans-serif",
      fontStyle: "italic",
      fontWeight: "700",
      textDecoration: "underline",
      lineHeight: "1.25",
      letterSpacing: "0px",
    });

    expect(getTextEditorStyle({
      element: {
        type: "sticky",
        textFill: "#1f2937",
        fontSize: 22,
        fontFamily: "Inter, system-ui, sans-serif",
        fontStyle: "normal",
        textDecoration: "",
      },
      scale: 2,
      horizontalPadding: 12,
    }).color).toBe("transparent");
  });

  it("commits sticky note scaling into size before editing", () => {
    expect(getStickyScaleCommitBox({
      element: { width: 220, height: 160, fontSize: 22 },
      nodeScaleX: 2,
      nodeScaleY: 1.5,
    })).toEqual({ width: 440, height: 240, fontSize: 44 });

    expect(getStickyScaleCommitBox({
      element: { width: 220, height: 160, fontSize: 22 },
      nodeScaleX: 0.2,
      nodeScaleY: 0.2,
    })).toEqual({ width: 44, height: 32, fontSize: 8 });

    expect(getStickyScaleCommitBox({
      element: { width: 220, height: 160, fontSize: 22 },
      nodeScaleX: 0,
      nodeScaleY: undefined,
    })).toEqual({ width: 220, height: 160, fontSize: 22 });
  });

  it("commits sticky note editor pixels with only the stage scale", () => {
    expect(getStickyEditorCommitBox({
      committedWidth: 440,
      committedHeight: 240,
      stageScale: 1,
    })).toEqual({ width: 440, height: 240 });

    expect(getStickyEditorCommitBox({
      committedWidth: 440,
      committedHeight: 240,
      stageScale: 2,
    })).toEqual({ width: 220, height: 120 });
  });

  it("scales sticky note text insets with the committed font size", () => {
    expect(getStickyTextInsets(22)).toEqual({ x: 14, y: 12 });
    expect(getStickyTextInsets(44)).toEqual({ x: 28, y: 24 });
    expect(getStickyTextInsets(11)).toEqual({ x: 7, y: 6 });
  });

  it("scales sticky note visual metrics with the committed font size", () => {
    expect(getStickyVisualMetrics(44)).toEqual({
      insets: { x: 28, y: 24 },
      cornerRadius: 12,
      strokeWidth: 2,
      shadowColor: "rgba(120, 113, 108, 0.24)",
      shadowBlur: 72,
      shadowOffset: { x: 0, y: 36 },
      shadowOpacity: 1,
    });
  });

  it("adds an ellipsis when truncating layer labels", () => {
    expect(truncateWithEllipsis("1234567890", 10)).toBe("1234567890");
    expect(truncateWithEllipsis("12345678901", 10)).toBe("123456789…");
    expect(truncateWithEllipsis("你好世界白板文本", 5)).toBe("你好世界…");
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
      verticalGap: 0,
      measureText,
    })).toEqual({ width: 200, height: 25 });
    expect(getNormalizedTextBox({
      text: "one two three",
      width: 47,
      fontSize: 20,
      padding: 6,
      verticalGap: 0,
      measureText,
    }).height).toBeGreaterThan(25);
  });

  it("adds a small vertical gap when normalizing text boxes", () => {
    const measureText = (value) => String(value).length * 10;

    expect(getNormalizedTextBox({
      text: "123456",
      width: 400,
      fontSize: 20,
      padding: 6,
      verticalGap: 2,
      measureText,
    }).height).toBe(27);
  });

  it("counts every character line for narrow unspaced text", () => {
    const measureText = (value) => String(value).length * 96;

    expect(getNormalizedTextBox({
      text: "123456",
      width: 108,
      fontSize: 96,
      padding: 6,
      verticalGap: 2,
      measureText,
    })).toEqual({ width: 108, height: 722 });
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

  it("allows browser select-all only inside editable controls", () => {
    expect(shouldUseBrowserSelectAll({
      key: "a",
      ctrlKey: true,
      target: { tagName: "DIV", isContentEditable: false },
    })).toBe(false);
    expect(shouldUseBrowserSelectAll({
      key: "a",
      metaKey: true,
      target: { tagName: "INPUT", type: "text", isContentEditable: false },
    })).toBe(true);
    expect(shouldUseBrowserSelectAll({
      key: "a",
      metaKey: true,
      target: { tagName: "TEXTAREA", isContentEditable: false },
    })).toBe(true);
    expect(shouldUseBrowserSelectAll({
      key: "a",
      ctrlKey: true,
      target: { tagName: "INPUT", type: "color", isContentEditable: false },
    })).toBe(false);
    expect(shouldUseBrowserSelectAll({
      key: "a",
      ctrlKey: true,
      target: { tagName: "INPUT", type: "range", isContentEditable: false },
    })).toBe(false);
    expect(shouldUseBrowserSelectAll({
      key: "a",
      ctrlKey: true,
      target: { tagName: "SELECT", isContentEditable: false },
    })).toBe(false);
    expect(shouldUseBrowserSelectAll({
      key: "a",
      ctrlKey: true,
      target: { tagName: "DIV", isContentEditable: true },
    })).toBe(true);
  });

  it("recognizes only real text-editing controls as native text targets", () => {
    expect(isNativeTextEditingTarget({ tagName: "INPUT", type: "text" })).toBe(true);
    expect(isNativeTextEditingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isNativeTextEditingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isNativeTextEditingTarget({ tagName: "INPUT", type: "color" })).toBe(false);
    expect(isNativeTextEditingTarget({ tagName: "INPUT", type: "range" })).toBe(false);
    expect(isNativeTextEditingTarget({ tagName: "SELECT" })).toBe(false);
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

  it("prefers the topmost nearby nested element over a larger containing element", () => {
    expect(pickElementIdAtPoint({
      point: { x: 145, y: 145 },
      padding: 12,
      fallbackId: "outer",
      candidates: [
        { id: "outer", zIndex: 0, box: { x: 100, y: 100, width: 200, height: 160 } },
        { id: "inner", zIndex: 1, box: { x: 150, y: 150, width: 40, height: 30 } },
      ],
    })).toBe("inner");
  });

  it("lets transformer hit areas pass selection to unselected nested elements first", () => {
    expect(pickElementIdAtPoint({
      point: { x: 160, y: 160 },
      padding: 12,
      selectedIds: ["outer"],
      preferUnselected: true,
      candidates: [
        { id: "outer", zIndex: 0, box: { x: 100, y: 100, width: 200, height: 160 } },
        { id: "inner", zIndex: 1, box: { x: 150, y: 150, width: 40, height: 30 } },
      ],
    })).toBe("inner");

    expect(pickElementIdAtPoint({
      point: { x: 120, y: 120 },
      padding: 12,
      selectedIds: ["outer"],
      preferUnselected: true,
      candidates: [
        { id: "outer", zIndex: 0, box: { x: 100, y: 100, width: 200, height: 160 } },
      ],
    })).toBeNull();
  });

  it("keeps dragging the selected nested element instead of passing through to its container", () => {
    expect(pickElementIdAtPoint({
      point: { x: 160, y: 160 },
      padding: 12,
      selectedIds: ["inner"],
      preferUnselected: true,
      candidates: [
        { id: "outer", zIndex: 0, box: { x: 100, y: 100, width: 200, height: 160 } },
        { id: "inner", zIndex: 1, box: { x: 150, y: 150, width: 40, height: 30 } },
      ],
    })).toBeNull();
  });

  it("prevents browser page zoom gestures globally", () => {
    expect(shouldPreventBrowserZoom({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldPreventBrowserZoom({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(shouldPreventBrowserZoom({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});
