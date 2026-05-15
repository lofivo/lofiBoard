import { afterEach, describe, expect, it, vi } from "vitest";

const latexRenderer = vi.hoisted(() => vi.fn(async () => ({
  src: "data:image/png;base64,AAAA",
  width: 72,
  height: 36,
  html: '<span class="katex">x</span>',
})));

vi.mock("../../src/services/latex-service.js", () => ({
  getTextDisplayValue: (value) => String(value ?? "").replace(/\\\$/g, "$"),
  isLatexText: (value) => /^\$\$[\s\S]+\$\$$/.test(String(value ?? "").trim()),
  renderLatexToImageSource: latexRenderer,
}));

import { createElementNode, getStickyBorderColor, syncTextNodeContent, syncTextNodeSize } from "../../src/canvas/konva-elements.js";

const baseHandlers = {
  draggable: false,
  onMove: vi.fn(),
  onSelect: vi.fn(),
  onEditText: vi.fn(),
};

describe("konva elements", () => {
  afterEach(() => {
    latexRenderer.mockClear();
    latexRenderer.mockResolvedValue({
      src: "data:image/png;base64,AAAA",
      width: 72,
      height: 36,
      html: '<span class="katex">x</span>',
    });
    delete globalThis.window;
    delete globalThis.document;
  });

  it("applies text font styling to Konva text nodes", () => {
    const context = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: () => ({ data: [0, 0, 0, 0] }),
      measureText: () => ({ width: 60 }),
      font: "",
    };
    globalThis.document = {
      createElement: () => ({
        getContext: () => context,
      }),
    };

    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "Hello",
      width: 120,
      height: 40,
      fontSize: 28,
      fontFamily: "Georgia, serif",
      fontStyle: "bold italic",
      textDecoration: "underline line-through",
      padding: 6,
      fill: "#111827",
      align: "center",
    }, baseHandlers);

    const textNode = node.findOne("Text");
    expect(node.width()).toBe(120);
    expect(node.height()).toBe(40);
    expect(textNode.x()).toBe(6);
    expect(textNode.width()).toBe(108);
    expect(textNode.fontFamily()).toBe("Georgia, serif");
    expect(textNode.fontStyle()).toBe("bold italic");
    expect(textNode.textDecoration()).toBe("underline line-through");
    expect(textNode.align()).toBe("center");
    expect(textNode.padding()).toBe(0);
  });

  it("keeps grouped text child size in sync with the text box", () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "Hello",
      width: 120,
      height: 40,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    syncTextNodeSize(node, {
      width: 160,
      height: 105,
      padding: 6,
    });

    const textNode = node.findOne("Text");
    expect(node.width()).toBe(160);
    expect(node.height()).toBe(105);
    expect(textNode.x()).toBe(6);
    expect(textNode.width()).toBe(148);
    expect(textNode.height()).toBe(105);
    expect(node.findOne(".text-hit-area").width()).toBe(160);
    expect(node.findOne(".text-hit-area").height()).toBe(105);
  });

  it("syncs grouped text content and font changes before drawing", () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "123456",
      width: 120,
      height: 35,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    syncTextNodeContent(node, {
      id: "text_1",
      type: "text",
      text: "123456",
      width: 120,
      height: 122,
      fontSize: 96,
      fontFamily: "Inter, sans-serif",
      fontStyle: "bold",
      textDecoration: "underline",
      padding: 6,
      fill: "#2563eb",
    });

    const textNode = node.findOne("Text");
    expect(node.height()).toBe(122);
    expect(textNode.height()).toBe(122);
    expect(textNode.fontSize()).toBe(96);
    expect(textNode.fontStyle()).toBe("bold");
    expect(textNode.textDecoration()).toBe("underline");
    expect(textNode.fill()).toBe("#2563eb");
  });

  it("renders latex text as an image layer while keeping source text editable", () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    expect(node.findOne("Text").visible()).toBe(true);
    expect(node.findOne(".latex-image")).toBeTruthy();
    expect(node.findOne(".latex-image").visible()).toBe(false);

    syncTextNodeContent(node, {
      id: "text_1",
      type: "text",
      text: "plain text",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    });

    expect(node.findOne("Text").visible()).toBe(true);
    expect(node.findOne("Text").text()).toBe("plain text");
    expect(node.findOne(".latex-image")).toBeUndefined();
  });

  it("shows escaped dollar delimiters as literal text instead of latex", () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "\\$x^2\\$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    expect(node.findOne("Text").visible()).toBe(true);
    expect(node.findOne("Text").text()).toBe("$x^2$");
    expect(node.findOne(".latex-image")).toBeUndefined();
    expect(latexRenderer).not.toHaveBeenCalled();
  });

  it("can disable latex rendering while editing text", () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    syncTextNodeContent(node, {
      id: "text_1",
      type: "text",
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, { renderLatex: false });

    expect(node.findOne("Text").visible()).toBe(true);
    expect(node.findOne("Text").text()).toBe("$$x^2$$");
    expect(node.findOne(".latex-image")).toBeUndefined();
  });

  it("does not restart latex rendering when text render inputs are unchanged", async () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);
    await Promise.resolve();
    latexRenderer.mockClear();

    syncTextNodeContent(node, {
      id: "text_1",
      type: "text",
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    });

    expect(latexRenderer).not.toHaveBeenCalled();
  });

  it("keeps source text visible until the latex image has loaded", async () => {
    const imageInstances = [];
    class MockImage {
      constructor() {
        imageInstances.push(this);
      }

      set src(value) {
        this.source = value;
      }
    }
    globalThis.window = { Image: MockImage };

    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    const textNode = node.findOne("Text");
    const latexNode = node.findOne(".latex-image");
    expect(textNode.visible()).toBe(true);
    expect(latexNode.visible()).toBe(false);

    await Promise.resolve();
    expect(imageInstances).toHaveLength(1);
    imageInstances[0].onload();

    expect(latexNode.visible()).toBe(true);
    expect(textNode.visible()).toBe(false);
  });

  it("keeps latex text editable through a stable hit area after rendering", async () => {
    latexRenderer.mockResolvedValueOnce({
      src: "data:image/png;base64,EDITABLE",
      width: 72,
      height: 36,
      html: '<span class="katex">x</span>',
    });
    const imageInstances = [];
    class MockImage {
      constructor() {
        imageInstances.push(this);
      }

      set src(value) {
        this.source = value;
      }
    }
    globalThis.window = { Image: MockImage };
    const handlers = {
      draggable: false,
      onMove: vi.fn(),
      onSelect: vi.fn(),
      onEdit: vi.fn(),
    };

    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, handlers);

    await Promise.resolve();
    imageInstances[0].onload();
    expect(node.findOne("Text").visible()).toBe(false);

    node.findOne(".text-hit-area").fire("dblclick", { cancelBubble: false }, true);

    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ cancelBubble: false }), node);
  });

  it("keeps plain text visible when latex image loading fails", async () => {
    latexRenderer.mockResolvedValueOnce({
      src: "data:image/png;base64,BBBB",
      width: 72,
      height: 36,
      html: '<span class="katex">x</span>',
    });
    const imageInstances = [];
    class MockImage {
      constructor() {
        imageInstances.push(this);
      }

      set src(value) {
        this.source = value;
      }
    }
    globalThis.window = { Image: MockImage };

    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    await Promise.resolve();
    expect(imageInstances).toHaveLength(1);
    imageInstances[0].onerror();

    expect(node.findOne("Text").visible()).toBe(true);
    expect(node.findOne(".latex-image")).toBeUndefined();
  });

  it("ignores stale latex renders after text changes back to plain text", async () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "$$x^2$$",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);

    syncTextNodeContent(node, {
      id: "text_1",
      type: "text",
      text: "plain text",
      width: 180,
      height: 48,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    });

    await Promise.resolve();

    expect(node.findOne("Text").visible()).toBe(true);
    expect(node.findOne("Text").text()).toBe("plain text");
    expect(node.findOne(".latex-image")).toBeUndefined();
  });

  it("renders sticky notes with a related border and a stronger paper shadow", () => {
    const node = createElementNode({
      id: "sticky_1",
      type: "sticky",
      x: 10,
      y: 20,
      width: 220,
      height: 160,
      text: "note",
      fontSize: 22,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      fill: "#fef08a",
      textFill: "#1f2937",
    }, baseHandlers);

    const rect = node.findOne("Rect");
    expect(rect.fill()).toBe("#fef08a");
    expect(rect.stroke()).toBe("#eab308");
    expect(rect.shadowColor()).toBe("rgba(120, 113, 108, 0.24)");
    expect(rect.shadowBlur()).toBe(36);
    expect(rect.shadowOffset()).toEqual({ x: 0, y: 18 });
    expect(rect.shadowOpacity()).toBe(1);
    expect(rect.cornerRadius()).toBe(6);
    expect(rect.strokeWidth()).toBe(1);

    const blueNode = createElementNode({
      id: "sticky_2",
      type: "sticky",
      x: 10,
      y: 20,
      width: 220,
      height: 160,
      text: "note",
      fontSize: 22,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      fill: "#bfdbfe",
      textFill: "#1f2937",
    }, baseHandlers);

    expect(blueNode.findOne("Rect").stroke()).toBe(getStickyBorderColor("#bfdbfe"));
    expect(blueNode.findOne("Rect").stroke()).not.toBe("#eab308");
  });

  it("syncs sticky note text before resizing starts from the editor", () => {
    const node = createElementNode({
      id: "sticky_1",
      type: "sticky",
      x: 10,
      y: 20,
      width: 220,
      height: 160,
      text: "",
      fontSize: 22,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      fill: "#fef08a",
      textFill: "#1f2937",
    }, baseHandlers);

    syncTextNodeContent(node, {
      id: "sticky_1",
      type: "sticky",
      text: "输入后的便签",
      width: 260,
      height: 190,
      fontSize: 24,
      fontFamily: "Georgia, serif",
      fontStyle: "bold",
      textDecoration: "underline",
      fill: "#bfdbfe",
      textFill: "#111827",
    });

    const rect = node.findOne("Rect");
    const textNode = node.findOne("Text");
    expect(node.width()).toBe(260);
    expect(node.height()).toBe(190);
    expect(rect.width()).toBe(260);
    expect(rect.height()).toBe(190);
    expect(rect.fill()).toBe("#bfdbfe");
    expect(rect.stroke()).toBe(getStickyBorderColor("#bfdbfe"));
    expect(rect.shadowColor()).toBe("rgba(120, 113, 108, 0.24)");
    expect(rect.shadowBlur()).toBeCloseTo(39.2727, 4);
    expect(rect.shadowOffset().x).toBe(0);
    expect(rect.shadowOffset().y).toBeCloseTo(19.6364, 4);
    expect(rect.shadowOpacity()).toBe(1);
    expect(textNode.text()).toBe("输入后的便签");
    expect(textNode.x()).toBeCloseTo(15.2727, 4);
    expect(textNode.y()).toBeCloseTo(13.0909, 4);
    expect(textNode.width()).toBeCloseTo(229.4545, 4);
    expect(textNode.height()).toBeCloseTo(163.8182, 4);
    expect(textNode.fontSize()).toBe(24);
    expect(textNode.fontFamily()).toBe("Georgia, serif");
    expect(textNode.fontStyle()).toBe("bold");
    expect(textNode.textDecoration()).toBe("underline");
    expect(textNode.fill()).toBe("#111827");
  });

  it("keeps sticky text insets visually stable after scale is committed to font size", () => {
    const node = createElementNode({
      id: "sticky_1",
      type: "sticky",
      x: 10,
      y: 20,
      width: 220,
      height: 160,
      text: "note",
      fontSize: 22,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      fill: "#fef08a",
      textFill: "#1f2937",
    }, baseHandlers);

    syncTextNodeContent(node, {
      id: "sticky_1",
      type: "sticky",
      text: "note",
      width: 440,
      height: 320,
      fontSize: 44,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      fill: "#fef08a",
      textFill: "#1f2937",
    });

    const textNode = node.findOne("Text");
    const rect = node.findOne("Rect");
    expect(rect.cornerRadius()).toBe(12);
    expect(rect.strokeWidth()).toBe(2);
    expect(rect.shadowBlur()).toBe(72);
    expect(rect.shadowOffset()).toEqual({ x: 0, y: 36 });
    expect(rect.shadowOpacity()).toBe(1);
    expect(textNode.x()).toBe(28);
    expect(textNode.y()).toBe(24);
    expect(textNode.width()).toBe(384);
    expect(textNode.height()).toBe(272);
  });

  it("derives sticky note border colors from the fill color", () => {
    expect(getStickyBorderColor("#fef08a")).toBe("#eab308");
    expect(getStickyBorderColor("#bfdbfe")).not.toBe("#eab308");
    expect(getStickyBorderColor("#bfdbfe")).not.toBe(getStickyBorderColor("#fecdd3"));
    expect(getStickyBorderColor("#bfdbfe")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("applies brush stroke rendering options to Konva lines", () => {
    const node = createElementNode({
      id: "stroke_1",
      type: "stroke",
      points: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
      stroke: "#2563eb",
      strokeWidth: 8,
      opacity: 0.45,
      lineCap: "square",
      brushStyle: "dash",
      smoothing: 0.2,
    }, baseHandlers);

    expect(node.stroke()).toBe("#2563eb");
    expect(node.strokeWidth()).toBe(8);
    expect(node.opacity()).toBe(0.45);
    expect(node.lineCap()).toBe("square");
    expect(node.tension()).toBe(0.2);
    expect(node.dash()).toEqual([24, 16]);
  });

  it("uses rounded dotted brush dashes for dot strokes", () => {
    const node = createElementNode({
      id: "stroke_1",
      type: "stroke",
      points: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
      stroke: "#111827",
      strokeWidth: 10,
      opacity: 1,
      lineCap: "round",
      brushStyle: "dot",
      smoothing: 0.45,
    }, baseHandlers);

    expect(node.dash()).toEqual([0.01, 18]);
    expect(node.lineCap()).toBe("round");
  });

  it("renders coordinate plane axes, grid, ticks, and labels", () => {
    const node = createElementNode({
      id: "plane_1",
      type: "coordinate-plane",
      x: 10,
      y: 20,
      width: 240,
      height: 160,
      unitSize: 40,
      origin: { x: 120, y: 80 },
      settings: { showGrid: true, showTicks: true, showLabels: true },
      style: {},
      rotation: 0,
    }, baseHandlers);

    expect(node.getClassName()).toBe("Group");
    expect(node.find(".coordinate-plane-grid").length).toBeGreaterThan(0);
    expect(node.find(".coordinate-plane-axis")).toHaveLength(2);
    expect(node.find(".coordinate-plane-tick").length).toBeGreaterThan(0);
    expect(node.find(".coordinate-plane-label").some((label) => label.text() === "O")).toBe(true);
    expect(node.find(".coordinate-plane-label").some((label) => label.text() === "x")).toBe(true);
    expect(node.find(".coordinate-plane-label").some((label) => label.text() === "y")).toBe(true);
    expect(node.find(".coordinate-plane-label").some((label) => label.text() === "1")).toBe(true);
    expect(node.find(".coordinate-plane-label").some((label) => label.text() === "-1")).toBe(true);
  });

  it("reuses loaded image instances so rerendering does not flash blank", () => {
    const createdImages = [];

    globalThis.window = {
      Image: class FakeImage {
        constructor() {
          createdImages.push(this);
        }

        set src(value) {
          this.currentSrc = value;
          this.onload?.();
        }
      },
    };

    const element = {
      id: "image_1",
      type: "image",
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      src: "data:image/png;base64,abc",
    };

    const firstNode = createElementNode(element, baseHandlers);
    const secondNode = createElementNode(element, baseHandlers);

    expect(createdImages).toHaveLength(1);
    expect(firstNode.image()).toBe(createdImages[0]);
    expect(secondNode.image()).toBe(createdImages[0]);
  });

  it("wires drag lifecycle callbacks for app-level multi-selection moves", () => {
    const handlers = {
      draggable: true,
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onMove: vi.fn(),
      onSelect: vi.fn(),
    };
    const node = createElementNode({
      id: "rect_1",
      type: "rect",
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      stroke: "#111827",
      strokeWidth: 2,
      fill: "transparent",
    }, handlers);

    node.fire("dragstart");
    node.fire("dragmove");
    node.fire("dragend");

    expect(handlers.onDragStart).toHaveBeenCalledWith(node);
    expect(handlers.onDragMove).toHaveBeenCalledWith(node);
    expect(handlers.onMove).toHaveBeenCalledWith(node);
  });

  it("renders array structure elements as a single draggable group", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 10,
      y: 20,
      width: 144,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      style: {},
    }, baseHandlers);

    expect(node.x()).toBe(10);
    expect(node.y()).toBe(20);
    expect(node.width()).toBe(144);
    expect(node.height()).toBe(88);
    expect(node.find(".array-item")).toHaveLength(2);
    expect(node.find("Rect")).toHaveLength(5);
    expect(node.findOne(".array-drop-indicator").visible()).toBe(false);
    expect(node.find("Text").map((text) => text.text())).toEqual(["0", "A", "1", "B"]);
  });

  it("renders independent stack structures with hidden indexes and endpoint labels", () => {
    const node = createElementNode({
      id: "stack_1",
      type: "stack-structure",
      x: 10,
      y: 20,
      width: 144,
      height: 44,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      settings: { indexBase: 0, showIndexes: false },
      style: {},
    }, baseHandlers);

    expect(node.find(".array-item")).toHaveLength(2);
    expect(node.find("Rect")).toHaveLength(3);
    expect(node.findOne(".array-drop-indicator").visible()).toBe(false);
    expect(node.find("Text").map((text) => text.text())).toEqual(["A", "B", "top"]);
  });

  it("renders active linear item highlight state", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 10,
      y: 20,
      width: 144,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      runtime: { activeIndex: 1 },
      style: {},
    }, baseHandlers);

    const itemRects = node.find(".array-item")[1].find("Rect");
    expect(itemRects.at(-1).stroke()).toBe("#2563eb");
    expect(itemRects.at(-1).strokeWidth()).toBe(3);
  });

  it("hides the drag gap indicator on linear structure edges", () => {
    const leftEdgeNode = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 10,
      y: 20,
      width: 144,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      runtime: { dragIndex: 0, dragGap: 0, dragX: 0, dragY: -12, dragLift: true },
      style: {},
    }, baseHandlers);

    const rightEdgeNode = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 10,
      y: 20,
      width: 144,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      runtime: { dragIndex: 0, dragGap: 2, dragX: 120, dragY: -12, dragLift: true },
      style: {},
    }, baseHandlers);

    expect(leftEdgeNode.findOne(".array-drop-indicator").visible()).toBe(false);
    expect(rightEdgeNode.findOne(".array-drop-indicator").visible()).toBe(false);
  });

  it("renders the dragged array item above the other item cells", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 10,
      y: 20,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
        { id: "item_3", index: 2, value: "C" },
      ],
      runtime: { dragIndex: 0, dragGap: 2, dragX: 88, dragY: -12, dragLift: true },
      style: {},
    }, baseHandlers);

    const itemNodes = node.find(".array-item");
    expect(itemNodes.map((item) => item.getAttr("linearIndex"))).toEqual([1, 2, 0]);
    expect(itemNodes.at(-1).getAttr("linearIndex")).toBe(0);
    expect(itemNodes.at(-1).getAttr("shadowBlur")).toBe(18);
  });

  it("keeps the initial long-press drag item unlifted until the lift tween runs", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 10,
      y: 20,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      runtime: { dragIndex: 0, dragGap: 0, dragX: 0, dragY: 0, dragLift: false },
      style: {},
    }, baseHandlers);

    const draggedItem = node.find(".array-item").at(-1);
    expect(draggedItem.getAttr("linearIndex")).toBe(0);
    expect(draggedItem.scaleX()).toBe(1);
    expect(draggedItem.getAttr("shadowBlur")).toBe(0);
    expect(draggedItem.opacity()).toBe(1);
  });

  it("keeps value-cell double click editing separate from index-cell selection", () => {
    const onArrayItemEdit = vi.fn();
    const onArrayItemSelect = vi.fn();
    const onArrayItemPress = vi.fn();
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
        { id: "item_3", index: 2, value: "C" },
      ],
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
      onArrayItemEdit,
      onArrayItemSelect,
      onArrayItemPress,
    });

    const item = node.find(".array-item")[0];
    item.findOne(".array-item-value-hit").fire("dblclick", { cancelBubble: false });
    item.findOne(".array-item-index-hit").fire("click", { cancelBubble: false });
    item.findOne(".array-item-index-hit").fire("mousedown", { cancelBubble: false });

    expect(onArrayItemSelect).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
    });
    expect(onArrayItemSelect).toHaveBeenCalledTimes(1);
    expect(onArrayItemEdit).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
      trigger: "double",
    });
    expect(onArrayItemPress).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
    });
  });

  it("routes value-cell click through array-item selection handlers", () => {
    const onArrayItemSelect = vi.fn();
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      style: {},
    }, {
      ...baseHandlers,
      onArrayItemSelect,
    });

    const item = node.find(".array-item")[0];
    item.findOne(".array-item-value-hit").fire("click", { cancelBubble: false });

    expect(onArrayItemSelect).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
    });
  });

  it("releases value-cell press gestures so long-press drag timers can be cleared", () => {
    const onArrayItemPress = vi.fn();
    const onArrayItemRelease = vi.fn();
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      style: {},
    }, {
      ...baseHandlers,
      onArrayItemPress,
      onArrayItemRelease,
    });

    const valueCell = node.find(".array-item")[0].findOne(".array-item-value-hit");
    const pointerUp = { cancelBubble: false };

    valueCell.fire("mousedown", { cancelBubble: false });
    valueCell.fire("mouseup", pointerUp);

    expect(onArrayItemPress).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
    });
    expect(onArrayItemRelease).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
    });
    expect(pointerUp.cancelBubble).toBe(true);
  });

  it("does not handle array item editing events when item editing is disabled", () => {
    const onArrayItemSelect = vi.fn();
    const onArrayItemEdit = vi.fn();
    const onArrayItemPress = vi.fn();
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      style: {},
    }, {
      ...baseHandlers,
      canEditArrayItems: false,
      onArrayItemSelect,
      onArrayItemEdit,
      onArrayItemPress,
    });

    const item = node.find(".array-item")[0];
    item.findOne(".array-item-value-hit").fire("click", { cancelBubble: false });
    item.findOne(".array-item-value-hit").fire("dblclick", { cancelBubble: false });
    item.findOne(".array-item-index-hit").fire("mousedown", { cancelBubble: false });

    expect(onArrayItemSelect).not.toHaveBeenCalled();
    expect(onArrayItemEdit).not.toHaveBeenCalled();
    expect(onArrayItemPress).not.toHaveBeenCalled();
  });

  it("renders the active array item above adjacent cells so its full border remains visible", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
        { id: "item_3", index: 2, value: "C" },
      ],
      runtime: { activeIndex: 1 },
      style: {},
    }, baseHandlers);

    const itemNodes = node.find(".array-item");
    expect(itemNodes.map((item) => item.getAttr("linearIndex"))).toEqual([0, 2, 1]);
    expect(itemNodes.at(-1).getAttr("linearIndex")).toBe(1);
  });

  it("keeps value-cell pointer down available for selected-array drag while index press remains reserved for item drag", () => {
    const onArrayItemPress = vi.fn();
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      style: {},
    }, {
      ...baseHandlers,
      onArrayItemPress,
    });

    const item = node.find(".array-item")[0];
    const valuePointerDown = { cancelBubble: false };
    const indexPointerDown = { cancelBubble: false };

    item.findOne(".array-item-value-hit").fire("mousedown", valuePointerDown);
    item.findOne(".array-item-index-hit").fire("mousedown", indexPointerDown);

    expect(valuePointerDown.cancelBubble).toBe(false);
    expect(indexPointerDown.cancelBubble).toBe(false);
    expect(onArrayItemPress).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
    });
  });

  it("still routes index click separately after a drag gesture so app code can suppress reselection", () => {
    const onArrayItemSelect = vi.fn();
    const onArrayItemPress = vi.fn();
    const onArrayItemRelease = vi.fn();
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      style: {},
    }, {
      ...baseHandlers,
      onArrayItemSelect,
      onArrayItemPress,
      onArrayItemRelease,
    });

    const item = node.find(".array-item")[0];
    item.findOne(".array-item-index-hit").fire("mousedown", { cancelBubble: false });
    item.findOne(".array-item-index-hit").fire("mouseup", { cancelBubble: false });
    item.findOne(".array-item-index-hit").fire("click", { cancelBubble: false });

    expect(onArrayItemPress).toHaveBeenCalledTimes(1);
    expect(onArrayItemRelease).toHaveBeenCalledTimes(1);
    expect(onArrayItemSelect).toHaveBeenCalledTimes(1);
  });

  it("routes visible array pointer press events for dragging", () => {
    const onArrayPointerPress = vi.fn();
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      markers: { pointer: 1 },
      style: {},
    }, {
      ...baseHandlers,
      onArrayPointerPress,
    });

    node.findOne(".array-pointer-hit").fire("mousedown", { cancelBubble: false });

    expect(onArrayPointerPress).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 1,
    });
  });

  it("tags the visible array pointer group for animated pointer movement", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      markers: { pointer: 1 },
      style: {},
    }, baseHandlers);

    const pointerNode = node.findOne(".array-pointer-hit");

    expect(pointerNode.hasName("array-pointer-group")).toBe(true);
    expect(pointerNode.getAttr("linearIndex")).toBe(1);
  });

  it("keeps the array pointer hit area above the array cells", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 216,
      height: 88,
      items: [
        { id: "item_1", index: 0, value: "A" },
        { id: "item_2", index: 1, value: "B" },
      ],
      markers: { pointer: 1 },
      style: {},
    }, baseHandlers);

    const pointerHitRect = node.findOne(".array-pointer-group").findOne("Rect");

    expect(pointerHitRect.y()).toBe(0);
    expect(pointerHitRect.height()).toBe(30);
  });

  it("renders graph structure elements with directed edges", () => {
    const node = createElementNode({
      id: "graph_1",
      type: "graph-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "A", label: "A", x: 30, y: 60 },
        { id: "B", label: "B", x: 130, y: 60 },
      ],
      edges: [{ id: "edge_1", from: "A", to: "B", directed: true, weight: "5" }],
      style: {},
    }, baseHandlers);

    expect(node.find("Arrow")).toHaveLength(1);
    expect(node.find("Ellipse")).toHaveLength(2);
    expect(node.find("Rect")).toHaveLength(1);
    expect(node.find("Text").map((text) => text.text())).toContain("5");
  });

  it("allows graph nodes to move inside the graph structure", () => {
    const onGraphNodeMove = vi.fn();
    const onGraphNodeClick = vi.fn();
    const node = createElementNode({
      id: "graph_1",
      type: "graph-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "A", label: "A", x: 30, y: 60 },
        { id: "B", label: "B", x: 130, y: 60 },
      ],
      edges: [{ id: "edge_1", from: "A", to: "B", directed: false, weight: "" }],
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
      onGraphNodeMove,
      onGraphNodeClick,
    });

    const graphNode = node.findOne(".graph-node");
    graphNode.position({ x: 50, y: 70 });
    graphNode.fire("dragmove", { cancelBubble: false });
    graphNode.fire("dragend", { cancelBubble: false });

    expect(onGraphNodeMove).toHaveBeenCalledWith({
      elementId: "graph_1",
      nodeId: "A",
      x: 50,
      y: 70,
    });
    graphNode.fire("click", { cancelBubble: false });
    expect(onGraphNodeClick).toHaveBeenCalledWith({
      elementId: "graph_1",
      nodeId: "A",
    });
  });

  it("renders graph highlights and allows edges to be edited", () => {
    const onGraphEdgeEdit = vi.fn();
    const node = createElementNode({
      id: "graph_1",
      type: "graph-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "A", label: "A", x: 30, y: 60 },
        { id: "B", label: "B", x: 130, y: 60 },
      ],
      edges: [{ id: "edge_1", from: "A", to: "B", directed: false, weight: "3" }],
      markers: {
        highlightedNodes: ["A"],
        highlightedEdges: ["edge_1"],
      },
      style: {},
    }, {
      ...baseHandlers,
      onGraphEdgeEdit,
    });

    const line = node.findOne("Line");
    line.fire("dblclick", { cancelBubble: false });

    expect(node.find("Ellipse")[0].fill()).toBe("#fef3c7");
    expect(line.stroke()).toBe("#2563eb");
    expect(onGraphEdgeEdit).toHaveBeenCalledWith({
      elementId: "graph_1",
      edgeId: "edge_1",
      directed: false,
      weight: "3",
    });
  });

  it("renders self loops and parallel graph edges with curved paths", () => {
    const node = createElementNode({
      id: "graph_1",
      type: "graph-structure",
      x: 0,
      y: 0,
      width: 180,
      height: 140,
      nodes: [
        { id: "A", label: "A", x: 50, y: 70 },
        { id: "B", label: "B", x: 130, y: 70 },
      ],
      edges: [
        { id: "edge_1", from: "A", to: "A", directed: true, weight: "" },
        { id: "edge_2", from: "A", to: "B", directed: false, weight: "" },
        { id: "edge_3", from: "A", to: "B", directed: false, weight: "" },
      ],
      style: {},
    }, baseHandlers);

    const arrows = node.find("Arrow");
    const lines = node.find("Line");
    expect(arrows[0].points()).toHaveLength(8);
    expect(lines[1].points()).toHaveLength(6);
  });

  it("renders tree structure elements from parent indexes", () => {
    const node = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "0", index: 0, value: "A", x: 80, y: 24, parentIndex: null },
        { id: "1", index: 1, value: "B", x: 40, y: 92, parentIndex: 0 },
      ],
      style: {},
    }, baseHandlers);

    expect(node.find("Line")).toHaveLength(1);
    expect(node.find("Ellipse")).toHaveLength(2);
    expect(node.find(".tree-node")).toHaveLength(2);
    expect(node.find("Text").map((text) => text.text())).toEqual(["A", "B"]);
  });

  it("hides collapsed tree descendants", () => {
    const node = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 240,
      height: 180,
      nodes: [
        { id: "0", index: 0, value: "A", x: 120, y: 24, parentIndex: null },
        { id: "1", index: 1, value: "B", x: 80, y: 92, parentIndex: 0 },
        { id: "3", index: 3, value: "D", x: 40, y: 160, parentIndex: 1 },
      ],
      markers: { collapsed: [1] },
      style: {},
    }, baseHandlers);

    expect(node.find(".tree-node")).toHaveLength(2);
    expect(node.find("Text").map((text) => text.text())).toEqual(["A", "B"]);
  });

  it("allows tree nodes to be edited inside the tree structure", () => {
    const onTreeNodeEdit = vi.fn();
    const onTreeNodeClick = vi.fn();
    const node = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "0", index: 0, value: "A", x: 80, y: 24, parentIndex: null },
      ],
      style: {},
    }, {
      ...baseHandlers,
      onTreeNodeEdit,
      onTreeNodeClick,
    });

    node.findOne(".tree-node").fire("dblclick", { cancelBubble: false });
    node.findOne(".tree-node").fire("click", { cancelBubble: false });

    expect(onTreeNodeEdit).toHaveBeenCalledWith({
      elementId: "tree_1",
      index: 0,
      value: "A",
    });
    expect(onTreeNodeClick).toHaveBeenCalledWith({
      elementId: "tree_1",
      index: 0,
    });
  });

  it("returns structure node attrs for rerender sync", () => {
    const node = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 10,
      y: 20,
      width: 144,
      height: 88,
      items: [],
      style: {},
    }, baseHandlers);

    node.setAttrs({ x: 30, y: 40 });
    expect(node.x()).toBe(30);
    expect(node.y()).toBe(40);
  });

  it("does not run selection click handlers after a drag", () => {
    const handlers = {
      draggable: true,
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onMove: vi.fn(),
      onSelect: vi.fn(),
    };
    const node = createElementNode({
      id: "rect_1",
      type: "rect",
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      stroke: "#111827",
      strokeWidth: 2,
      fill: "transparent",
    }, handlers);

    node.fire("dragstart");
    node.fire("dragmove");
    node.fire("dragend");
    node.fire("click", { cancelBubble: false });
    node.fire("click", { cancelBubble: false });

    expect(handlers.onSelect).toHaveBeenCalledTimes(1);
  });

  it("wires double click callbacks for text editing", () => {
    const handlers = {
      draggable: false,
      onMove: vi.fn(),
      onSelect: vi.fn(),
      onEdit: vi.fn(),
    };
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "Hello",
      width: 120,
      height: 40,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, handlers);

    node.fire("dblclick", { cancelBubble: false });

    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ cancelBubble: false }), node);
  });
});
