import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/latex-service.js", () => ({
  getTextDisplayValue: (value) => String(value ?? "").replace(/\\\$/g, "$"),
}));

import {
  createElementNode,
  getStickyBorderColor,
  syncElementNode,
  syncTextNodeContent,
  syncTextNodeScalePreview,
  syncTextNodeSize,
} from "../../src/canvas/konva-elements.js";

const baseHandlers = {
  draggable: false,
  onMove: vi.fn(),
  onSelect: vi.fn(),
  onEditText: vi.fn(),
};

function createMockCanvasContext() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    setAttr: vi.fn(),
    setLineDash: vi.fn(),
  };
}

describe("konva elements", () => {
  afterEach(() => {
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

  it("previews plain text scaling with the committed font layout without resetting group scale", () => {
    const node = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "Hello world",
      width: 120,
      height: 40,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);
    node.scaleX(2);
    node.scaleY(2);

    syncTextNodeScalePreview(node, {
      id: "text_1",
      type: "text",
      text: "Hello world",
      width: 240,
      height: 80,
      fontSize: 56,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, {
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });

    const textNode = node.findOne("Text");
    expect(node.scaleX()).toBe(2);
    expect(node.scaleY()).toBe(2);
    expect(textNode.x()).toBe(3);
    expect(textNode.width()).toBe(114);
    expect(textNode.height()).toBe(40);
    expect(textNode.fontSize()).toBe(28);
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

  it("syncs ordinary element nodes in place without recreating them", () => {
    const rect = createElementNode({
      id: "rect_1",
      type: "rect",
      x: 10,
      y: 20,
      width: 80,
      height: 40,
      stroke: "#111827",
      strokeWidth: 2,
      fill: "#ffffff",
    }, baseHandlers);

    expect(syncElementNode(rect, {
      id: "rect_1",
      type: "rect",
      x: 12,
      y: 24,
      width: 100,
      height: 50,
      stroke: "#2563eb",
      strokeWidth: 4,
      fill: "#dbeafe",
    })).toBe(true);

    expect(rect.x()).toBe(12);
    expect(rect.y()).toBe(24);
    expect(rect.width()).toBe(100);
    expect(rect.stroke()).toBe("#2563eb");
    expect(rect.fill()).toBe("#dbeafe");
  });

  it("syncs text and sticky nodes in place including child content", () => {
    const text = createElementNode({
      id: "text_1",
      type: "text",
      x: 10,
      y: 20,
      text: "Old",
      width: 120,
      height: 40,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
    }, baseHandlers);
    const sticky = createElementNode({
      id: "sticky_1",
      type: "sticky",
      x: 0,
      y: 0,
      text: "Old",
      width: 160,
      height: 120,
      fontSize: 24,
      fontFamily: "Inter, sans-serif",
      fill: "#fef08a",
      textFill: "#1f2937",
    }, baseHandlers);
    const originalTextNode = text;
    const originalStickyNode = sticky;

    expect(syncElementNode(text, {
      id: "text_1",
      type: "text",
      x: 30,
      y: 40,
      text: "New",
      width: 180,
      height: 60,
      fontSize: 36,
      fontFamily: "Georgia, serif",
      fontStyle: "bold",
      textDecoration: "underline",
      padding: 8,
      fill: "#2563eb",
    })).toBe(true);
    expect(syncElementNode(sticky, {
      id: "sticky_1",
      type: "sticky",
      x: 10,
      y: 20,
      text: "Note",
      width: 180,
      height: 140,
      fontSize: 30,
      fontFamily: "Georgia, serif",
      fill: "#bbf7d0",
      textFill: "#2563eb",
    })).toBe(true);

    expect(text).toBe(originalTextNode);
    expect(sticky).toBe(originalStickyNode);
    expect(text.findOne("Text").text()).toBe("New");
    expect(text.findOne("Text").fontSize()).toBe(36);
    expect(sticky.findOne("Text").text()).toBe("Note");
    expect(sticky.findOne("Text").fontSize()).toBe(30);
    expect(sticky.findOne("Rect").fill()).toBe("#bbf7d0");
  });

  it("declines in-place sync for type changes and complex structures", () => {
    const rect = createElementNode({
      id: "rect_1",
      type: "rect",
      x: 10,
      y: 20,
      width: 80,
      height: 40,
      stroke: "#111827",
      strokeWidth: 2,
      fill: "#ffffff",
    }, baseHandlers);

    expect(syncElementNode(rect, {
      id: "rect_1",
      type: "ellipse",
      x: 10,
      y: 20,
      radiusX: 40,
      radiusY: 20,
      stroke: "#111827",
      strokeWidth: 2,
      fill: "#ffffff",
    })).toBe(false);
  });

  it("syncs image, coordinate plane, and structure group nodes in place", () => {
    const image = createElementNode({
      id: "image_1",
      type: "image",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      src: "",
    }, baseHandlers);
    const plane = createElementNode({
      id: "plane_1",
      type: "coordinate-plane",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      unitSize: 40,
      origin: { x: 80, y: 60 },
      settings: { showGrid: true, showTicks: true, showLabels: true },
      style: {},
    }, baseHandlers);
    const array = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 144,
      height: 88,
      items: [{ value: "A" }, { value: "B" }],
      settings: { showIndexes: true, indexBase: 0 },
      style: {},
    }, baseHandlers);

    const originalImage = image;
    const originalPlane = plane;
    const originalArray = array;

    expect(syncElementNode(image, {
      id: "image_1",
      type: "image",
      x: 10,
      y: 20,
      width: 120,
      height: 90,
      src: "",
    })).toBe(true);
    expect(syncElementNode(plane, {
      id: "plane_1",
      type: "coordinate-plane",
      x: 5,
      y: 6,
      width: 200,
      height: 160,
      unitSize: 20,
      origin: { x: 100, y: 80 },
      settings: { showGrid: false, showTicks: true, showLabels: true },
      style: {},
    })).toBe(true);
    expect(syncElementNode(array, {
      id: "array_1",
      type: "array-structure",
      x: 8,
      y: 9,
      width: 216,
      height: 88,
      items: [{ value: "X" }, { value: "Y" }, { value: "Z" }],
      settings: { showIndexes: true, indexBase: 1 },
      style: {},
    }, baseHandlers)).toBe(true);

    expect(image).toBe(originalImage);
    expect(image.width()).toBe(120);
    expect(plane).toBe(originalPlane);
    expect(plane.width()).toBe(200);
    expect(plane.find(".coordinate-plane-axis")).toHaveLength(2);
    expect(array).toBe(originalArray);
    expect(array.find(".array-item")).toHaveLength(3);
    expect(array.find("Text").map((node) => node.text())).toContain("Z");
  });

  it("reuses linear structure item nodes when values change in place", () => {
    const array = createElementNode({
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 144,
      height: 88,
      items: [{ value: "A" }, { value: "B" }],
      settings: { showIndexes: true, indexBase: 0 },
      style: {},
    }, baseHandlers);
    const firstItem = array.find(".array-item")[0];
    const secondItem = array.find(".array-item")[1];

    expect(syncElementNode(array, {
      id: "array_1",
      type: "array-structure",
      x: 0,
      y: 0,
      width: 144,
      height: 88,
      items: [{ value: "A" }, { value: "C" }],
      settings: { showIndexes: true, indexBase: 0 },
      style: {},
    }, baseHandlers)).toBe(true);

    const itemNodes = array.find(".array-item");
    expect(itemNodes).toHaveLength(2);
    expect(itemNodes[0]).toBe(firstItem);
    expect(itemNodes[1]).toBe(secondItem);
    expect(itemNodes[1].find("Text").at(-1).text()).toBe("C");
  });

  it("syncs graph and tree structure groups in place while preserving event routes", () => {
    const onGraphEdgeEdit = vi.fn();
    const onTreeNodeClick = vi.fn();
    const graph = createElementNode({
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
    }, { ...baseHandlers, onGraphEdgeEdit });
    const tree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 24 }],
      edges: [],
      settings: { rootId: "node_a" },
      style: {},
    }, { ...baseHandlers, onTreeNodeClick });

    const originalGraph = graph;
    const originalTree = tree;

    expect(syncElementNode(graph, {
      id: "graph_1",
      type: "graph-structure",
      x: 0,
      y: 0,
      width: 180,
      height: 140,
      nodes: [
        { id: "A", label: "A", x: 30, y: 70 },
        { id: "B", label: "B", x: 150, y: 70 },
      ],
      edges: [{ id: "edge_1", from: "A", to: "B", directed: false, weight: "5" }],
      style: {},
    }, { ...baseHandlers, onGraphEdgeEdit })).toBe(true);
    expect(syncElementNode(tree, {
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 180,
      height: 140,
      nodes: [
        { id: "node_a", label: "A", x: 90, y: 24 },
        { id: "node_b", label: "B", x: 60, y: 96 },
      ],
      edges: [{ id: "tree_edge_1", from: "node_a", to: "node_b" }],
      settings: { rootId: "node_a" },
      style: {},
    }, { ...baseHandlers, onTreeNodeClick })).toBe(true);

    expect(graph).toBe(originalGraph);
    expect(graph.findOne("Text").text()).toBe("5");
    graph.findOne("Line").fire("dblclick", { cancelBubble: false });
    expect(onGraphEdgeEdit).toHaveBeenCalledWith({
      elementId: "graph_1",
      edgeId: "edge_1",
      directed: false,
      weight: "5",
    });
    expect(tree).toBe(originalTree);
    expect(tree.find(".tree-node")).toHaveLength(2);
    tree.find(".tree-node")[1].fire("click", { cancelBubble: false });
    expect(onTreeNodeClick).toHaveBeenCalledWith({ elementId: "tree_1", nodeId: "node_b" });
  });

  it("routes ordinary tree node pointer down for selection without clearing active state", () => {
    const onTreeNodeClick = vi.fn();
    const onTreeNodeEdit = vi.fn();
    const onTreeNodePress = vi.fn();
    const tree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 24 }],
      edges: [],
      settings: { rootId: "node_a" },
      style: {},
    }, { ...baseHandlers, draggable: true, onTreeNodeClick, onTreeNodeEdit, onTreeNodePress });
    const treeNode = tree.findOne(".tree-node");
    const pointerDown = { cancelBubble: false, evt: { button: 0 } };

    expect(tree.draggable()).toBe(true);
    expect(treeNode.draggable()).toBe(false);
    treeNode.fire("mousedown", pointerDown);
    treeNode.fire("click", { cancelBubble: false, evt: { button: 0 } });
    treeNode.fire("dblclick", { cancelBubble: false, evt: { button: 0 } });

    expect(onTreeNodePress).not.toHaveBeenCalled();
    expect(pointerDown.cancelBubble).toBe(false);
    expect(onTreeNodeClick).toHaveBeenCalledWith({ elementId: "tree_1", nodeId: "node_a" });
    expect(onTreeNodeEdit).toHaveBeenCalledWith({
      elementId: "tree_1",
      nodeId: "node_a",
      label: "A",
    });
  });

  it("does not edit tree nodes from repeated pointer down without a double click", () => {
    const onTreeNodeClick = vi.fn();
    const onTreeNodeEdit = vi.fn();
    const tree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 24 }],
      edges: [],
      settings: { rootId: "node_a" },
      style: {},
    }, { ...baseHandlers, draggable: true, onTreeNodeClick, onTreeNodeEdit });
    const treeNode = tree.findOne(".tree-node");
    const pointerDown = { cancelBubble: false, evt: { button: 0 } };

    treeNode.fire("mousedown", pointerDown);
    treeNode.fire("mousedown", pointerDown);

    expect(onTreeNodeClick).toHaveBeenCalledTimes(2);
    expect(onTreeNodeEdit).not.toHaveBeenCalled();
    treeNode.fire("dblclick", { cancelBubble: false, evt: { button: 0 } });
    expect(onTreeNodeEdit).toHaveBeenCalledWith({ elementId: "tree_1", nodeId: "node_a", label: "A" });
  });

  it("keeps latex source text in Konva as an editable fallback for the vector overlay", () => {
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
    expect(node.findOne("Text").text()).toBe("$$x^2$$");
    expect(node.findOne(".latex-image")).toBeUndefined();

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

  it("keeps latex text editable through a stable hit area", () => {
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

    node.findOne(".text-hit-area").fire("dblclick", { cancelBubble: false }, true);

    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ cancelBubble: false }), node);
  });

  it("keeps text fallback visible after latex text changes back to plain text", () => {
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

  it("keeps fixed-width strokes as Konva lines when pressure is uniform", () => {
    const node = createElementNode({
      id: "stroke_1",
      type: "stroke",
      x: 30,
      y: 40,
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 20, y: 20, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 8,
      opacity: 1,
      lineCap: "round",
      brushStyle: "solid",
      smoothing: 0.45,
    }, baseHandlers);

    expect(node.getClassName()).toBe("Line");
    expect(node.x()).toBe(30);
    expect(node.y()).toBe(40);
    expect(node.points()).toEqual([0, 0, 20, 20]);
    expect(node.strokeWidth()).toBe(8);
  });

  it("renders pressure-sensitive strokes with a custom shape", () => {
    const node = createElementNode({
      id: "stroke_1",
      type: "stroke",
      points: [
        { x: 0, y: 0, pressure: 0.1 },
        { x: 20, y: 0, pressure: 0.9 },
        { x: 40, y: 0, pressure: 0.4 },
      ],
      stroke: "#111827",
      strokeWidth: 10,
      opacity: 0.7,
      lineCap: "round",
      brushStyle: "solid",
      smoothing: 0.45,
    }, baseHandlers);

    expect(node.getClassName()).toBe("Shape");
    expect(node.getAttr("pressurePoints")).toEqual([
      { x: 0, y: 0, pressure: 0.1 },
      { x: 20, y: 0, pressure: 0.9 },
      { x: 40, y: 0, pressure: 0.4 },
    ]);
    expect(node.stroke()).toBe("#111827");
    expect(node.strokeWidth()).toBe(10);
    expect(node.opacity()).toBe(0.7);
    expect(node.getClientRect({ skipTransform: true, skipStroke: true })).toMatchObject({
      x: 0,
      y: 0,
      width: 40,
      height: 0,
    });
  });

  it("uses rounded dotted brush dashes for dot strokes", () => {
    const node = createElementNode({
      id: "stroke_1",
      type: "stroke",
      points: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
      stroke: "#111827",
      strokeWidth: 10,
      opacity: 1,
      lineCap: "square",
      brushStyle: "dot",
      smoothing: 0.45,
    }, baseHandlers);

    expect(node.dash()).toEqual([0.01, 18]);
    expect(node.lineCap()).toBe("round");
  });

  it("applies linear shape style controls to straight lines and arrows", () => {
    const line = createElementNode({
      id: "line_1",
      type: "line",
      x: 0,
      y: 0,
      points: [0, 0, 100, 20],
      stroke: "#2563eb",
      strokeWidth: 8,
      opacity: 0.5,
      lineCap: "square",
      brushStyle: "dash",
    }, baseHandlers);
    const arrow = createElementNode({
      id: "arrow_1",
      type: "arrow",
      x: 0,
      y: 0,
      points: [0, 0, 100, 20],
      stroke: "#dc2626",
      fill: "#dc2626",
      strokeWidth: 10,
      opacity: 0.7,
      lineCap: "round",
      brushStyle: "dot",
      pointerAtBeginning: true,
      pointerAtEnding: true,
    }, baseHandlers);

    expect(line.opacity()).toBe(0.5);
    expect(line.lineCap()).toBe("square");
    expect(line.dash()).toEqual([24, 16]);
    expect(arrow.opacity()).toBe(0.7);
    expect(arrow.lineCap()).toBe("round");
    expect(arrow.dash()).toEqual([0.01, 18]);
    expect(arrow.pointerAtBeginning()).toBe(true);
    expect(arrow.pointerAtEnding()).toBe(true);
  });

  it("draws dashed pressure stroke previews as separated path segments", () => {
    const node = createElementNode({
      id: "stroke_1",
      type: "stroke",
      forcePressureStroke: true,
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 20, y: 0, pressure: 0.5 },
        { x: 40, y: 0, pressure: 0.5 },
        { x: 60, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 6,
      opacity: 1,
      lineCap: "round",
      brushStyle: "dash",
      smoothing: 0.45,
    }, baseHandlers);
    const context = createMockCanvasContext();

    node.sceneFunc()(context, node);

    expect(node.getClassName()).toBe("Shape");
    expect(context.lineTo.mock.calls.length).toBeGreaterThan(1);
    expect(context.lineTo).not.toHaveBeenCalledWith(60, 0);
  });

  it("draws dotted pressure stroke previews as round dots", () => {
    const node = createElementNode({
      id: "stroke_1",
      type: "stroke",
      forcePressureStroke: true,
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 20, y: 0, pressure: 0.5 },
        { x: 40, y: 0, pressure: 0.5 },
      ],
      stroke: "#111827",
      strokeWidth: 8,
      opacity: 1,
      lineCap: "round",
      brushStyle: "dot",
      smoothing: 0.45,
    }, baseHandlers);
    const context = createMockCanvasContext();

    node.sceneFunc()(context, node);

    expect(context.arc.mock.calls.length).toBeGreaterThan(2);
    expect(context.stroke).not.toHaveBeenCalled();
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

  it("applies coordinate plane style and visibility settings", () => {
    const node = createElementNode({
      id: "plane_1",
      type: "coordinate-plane",
      x: 10,
      y: 20,
      width: 240,
      height: 160,
      unitSize: 24,
      origin: { x: 120, y: 80 },
      settings: { showGrid: false, showTicks: true, showLabels: false },
      style: {
        gridStroke: "#bae6fd",
        axisStroke: "#dc2626",
        labelFill: "#16a34a",
      },
      rotation: 0,
    }, baseHandlers);

    expect(node.find(".coordinate-plane-grid")).toHaveLength(0);
    expect(node.find(".coordinate-plane-tick").length).toBeGreaterThan(0);
    expect(node.find(".coordinate-plane-label")).toHaveLength(0);
    expect(node.find(".coordinate-plane-axis").every((axis) => axis.stroke() === "#dc2626")).toBe(true);
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

    const item = node.find(".array-item").find((itemNode) => itemNode.getAttr("linearIndex") === 0);
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

    const item = node.find(".array-item").find((itemNode) => itemNode.getAttr("linearIndex") === 0);
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

  it("keeps selected linear item cells clickable and pressable for active selection and long press drag", () => {
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
      runtime: { activeIndex: 0 },
      style: {},
    }, {
      ...baseHandlers,
      onArrayItemSelect,
      onArrayItemPress,
      onArrayItemRelease,
    });

    const item = node.find(".array-item").find((itemNode) => itemNode.getAttr("linearIndex") === 0);
    item.findOne(".array-item-index-hit").fire("click", { cancelBubble: false });
    item.findOne(".array-item-index-hit").fire("mousedown", { cancelBubble: false });
    item.findOne(".array-item-index-hit").fire("mouseup", { cancelBubble: false });

    expect(onArrayItemSelect).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
    });
    expect(onArrayItemPress).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
      value: "A",
    });
    expect(onArrayItemRelease).toHaveBeenCalledWith({
      elementId: "array_1",
      index: 0,
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
    const onGraphNodeEdit = vi.fn();
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
      onGraphNodeEdit,
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
    graphNode.fire("dblclick", { cancelBubble: false });
    expect(onGraphNodeEdit).toHaveBeenCalledWith({
      elementId: "graph_1",
      nodeId: "A",
      label: "A",
    });
  });

  it("connects graph nodes by dragging one node onto another in connect mode", () => {
    const onGraphNodeConnect = vi.fn();
    const node = createElementNode({
      id: "graph_1",
      type: "graph-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 30, y: 60 },
        { id: "node_b", label: "B", x: 130, y: 60 },
      ],
      edges: [],
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
      getGraphEdgeState: () => ({ kind: "graph", elementId: "graph_1", sourceNodeId: null }),
      onGraphNodeConnect,
    });

    const graphNode = node.find(".graph-node")[0];
    graphNode.position({ x: 130, y: 60 });
    graphNode.fire("dragend", { cancelBubble: false });

    expect(onGraphNodeConnect).toHaveBeenCalledWith({
      elementId: "graph_1",
      sourceNodeId: "node_a",
      targetNodeId: "node_b",
    });
    expect(graphNode.position()).toMatchObject({ x: 30, y: 60 });
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

  it("renders tree structure elements from parent-child edges", () => {
    const node = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [{ id: "tree_edge_1", from: "node_a", to: "node_b" }],
      settings: { rootId: "node_a" },
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
        { id: "node_a", label: "A", x: 120, y: 24 },
        { id: "node_b", label: "B", x: 80, y: 92 },
        { id: "node_d", label: "D", x: 40, y: 160 },
      ],
      edges: [
        { id: "tree_edge_1", from: "node_a", to: "node_b" },
        { id: "tree_edge_2", from: "node_b", to: "node_d" },
      ],
      settings: { rootId: "node_a" },
      markers: { collapsed: ["node_b"] },
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
        { id: "node_a", label: "A", x: 80, y: 24 },
      ],
      edges: [],
      settings: { rootId: "node_a" },
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
      nodeId: "node_a",
      label: "A",
    });
    expect(onTreeNodeClick).toHaveBeenCalledWith({
      elementId: "tree_1",
      nodeId: "node_a",
    });
  });

  it("does not treat ordinary tree node dragend as node move or connect", () => {
    const onTreeNodeMove = vi.fn();
    const onTreeNodeConnect = vi.fn();
    const node = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [],
      settings: { rootId: "node_a" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
      onTreeNodeMove,
      onTreeNodeConnect,
      getTreeConnectState: () => null,
    });

    const treeNode = node.find(".tree-node")[0];
    treeNode.position({ x: 96, y: 36 });
    treeNode.fire("dragend", { cancelBubble: false });
    expect(onTreeNodeMove).not.toHaveBeenCalled();

    const connectNode = createElementNode({
      id: "tree_2",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [],
      settings: { rootId: "node_a" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
      onTreeNodeConnect,
      getTreeConnectState: () => ({ kind: "tree", elementId: "tree_2", sourceNodeId: null }),
    });
    const source = connectNode.find(".tree-node")[0];
    source.position({ x: 40, y: 92 });
    source.fire("dragend", { cancelBubble: false });
    expect(onTreeNodeConnect).not.toHaveBeenCalled();
  });

  it("keeps tree node hit areas non-draggable so node selection and editing stay stable", () => {
    const generalTree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 24 }],
      edges: [],
      settings: { rootId: "node_a", treeKind: "general" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });
    const binaryTree = createElementNode({
      id: "tree_2",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 24 }],
      edges: [],
      settings: { rootId: "node_a", treeKind: "binary" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });

    expect(generalTree.draggable()).toBe(true);
    expect(generalTree.findOne(".tree-node").draggable()).toBe(false);
    expect(binaryTree.draggable()).toBe(true);
    expect(binaryTree.findOne(".tree-node").draggable()).toBe(false);
  });

  it("keeps binary tree node hit areas selectable so dragging can move the whole tree", () => {
    const onTreeNodePress = vi.fn();
    const binaryTree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 24 }],
      edges: [],
      settings: { rootId: "node_a", treeKind: "binary" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
      onTreeNodePress,
    });

    const treeNode = binaryTree.findOne(".tree-node");
    const pointerDown = { cancelBubble: false };
    expect(binaryTree.draggable()).toBe(true);
    expect(treeNode.draggable()).toBe(false);
    expect(treeNode.listening()).toBe(true);
    treeNode.fire("mousedown", pointerDown);
    expect(onTreeNodePress).toHaveBeenCalledWith(pointerDown, binaryTree);
    expect(pointerDown.cancelBubble).toBe(false);
  });

  it("routes binary tree node click and double click for selection and inline editing", () => {
    const onTreeNodeClick = vi.fn();
    const onTreeNodeEdit = vi.fn();
    const binaryTree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 24 }],
      edges: [],
      settings: { rootId: "node_a", treeKind: "binary" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
      onTreeNodeClick,
      onTreeNodeEdit,
    });

    const treeNode = binaryTree.findOne(".tree-node");
    treeNode.fire("click", { cancelBubble: false });
    treeNode.fire("dblclick", { cancelBubble: false });

    expect(onTreeNodeClick).toHaveBeenCalledWith({
      elementId: "tree_1",
      nodeId: "node_a",
    });
    expect(onTreeNodeEdit).toHaveBeenCalledWith({
      elementId: "tree_1",
      nodeId: "node_a",
      label: "A",
    });
  });

  it("draws the selected binary tree node with a blue border", () => {
    const binaryTree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [{ id: "edge_1", from: "node_a", to: "node_b", side: "left" }],
      settings: { rootId: "node_a", treeKind: "binary" },
      runtime: { activeNodeId: "node_b" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });

    const activeNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_b");
    const inactiveNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_a");

    expect(activeNode.findOne("Ellipse").stroke()).toBe("#2563eb");
    expect(activeNode.findOne("Ellipse").strokeWidth()).toBe(3);
    expect(inactiveNode.findOne("Ellipse").stroke()).not.toBe("#2563eb");
  });

  it("adds a transparent hit area to tree structures so blank tree drags move the tree", () => {
    const binaryTree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
      ],
      edges: [],
      settings: { rootId: "node_a", treeKind: "binary" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });
    const generalTree = createElementNode({
      id: "tree_2",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
      ],
      edges: [],
      settings: { rootId: "node_a" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });

    const binaryHitArea = binaryTree.findOne(".tree-blank-hit");
    const generalHitArea = generalTree.findOne(".tree-blank-hit");

    expect(binaryHitArea).toBeTruthy();
    expect(binaryHitArea.width()).toBe(160);
    expect(binaryHitArea.height()).toBe(120);
    expect(generalHitArea).toBeTruthy();
    expect(generalHitArea.width()).toBe(160);
    expect(generalHitArea.height()).toBe(120);
    expect(binaryTree.findOne(".binary-tree-blank-hit")).toBeUndefined();
  });

  it("syncs binary tree active node borders without recreating the group", () => {
    const binaryTree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [{ id: "edge_1", from: "node_a", to: "node_b", side: "left" }],
      settings: { rootId: "node_a", treeKind: "binary" },
      runtime: { activeNodeId: "node_a" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });
    const firstNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_a");

    const didSync = syncElementNode(binaryTree, {
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [{ id: "edge_1", from: "node_a", to: "node_b", side: "left" }],
      settings: { rootId: "node_a", treeKind: "binary" },
      runtime: { activeNodeId: "node_b" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });
    const activeNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_b");
    const inactiveNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_a");

    expect(didSync).toBe(true);
    expect(inactiveNode).toBe(firstNode);
    expect(activeNode.findOne("Ellipse").stroke()).toBe("#2563eb");
    expect(activeNode.findOne("Ellipse").strokeWidth()).toBe(3);
    expect(inactiveNode.findOne("Ellipse").stroke()).not.toBe("#2563eb");
    expect(inactiveNode.findOne("Ellipse").strokeWidth()).toBe(2);
  });

  it("renders ordinary tree active node borders from runtime state", () => {
    const tree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [{ id: "edge_1", from: "node_a", to: "node_b" }],
      settings: { rootId: "node_a" },
      runtime: { activeNodeId: "node_b" },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });
    const activeNode = tree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_b");
    const inactiveNode = tree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_a");

    expect(activeNode.findOne("Ellipse").stroke()).toBe("#2563eb");
    expect(activeNode.findOne("Ellipse").strokeWidth()).toBe(3);
    expect(inactiveNode.findOne("Ellipse").stroke()).not.toBe("#2563eb");
    expect(inactiveNode.findOne("Ellipse").strokeWidth()).toBe(2);
  });

  it("syncs binary tree traversal highlight fills without recreating the group", () => {
    const binaryTree = createElementNode({
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [{ id: "edge_1", from: "node_a", to: "node_b", side: "left" }],
      settings: { rootId: "node_a", treeKind: "binary" },
      markers: { highlighted: ["node_a"] },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });
    const firstNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_a");

    const didSync = syncElementNode(binaryTree, {
      id: "tree_1",
      type: "tree-structure",
      x: 0,
      y: 0,
      width: 160,
      height: 120,
      nodes: [
        { id: "node_a", label: "A", x: 80, y: 24 },
        { id: "node_b", label: "B", x: 40, y: 92 },
      ],
      edges: [{ id: "edge_1", from: "node_a", to: "node_b", side: "left" }],
      settings: { rootId: "node_a", treeKind: "binary" },
      markers: { highlighted: ["node_b"] },
      style: {},
    }, {
      ...baseHandlers,
      draggable: true,
    });
    const highlightedNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_b");
    const normalNode = binaryTree.find(".tree-node").find((node) => node.getAttr("treeNodeId") === "node_a");

    expect(didSync).toBe(true);
    expect(normalNode).toBe(firstNode);
    expect(highlightedNode.findOne("Ellipse").fill()).toBe("#fef3c7");
    expect(normalNode.findOne("Ellipse").fill()).toBe("#f8fafc");
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
