import { afterEach, describe, expect, it, vi } from "vitest";
import { createElementNode, syncTextNodeContent, syncTextNodeSize } from "../../src/canvas/konva-elements.js";

const baseHandlers = {
  draggable: false,
  onMove: vi.fn(),
  onSelect: vi.fn(),
  onEditText: vi.fn(),
};

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

  it("does not route value-cell click through array-item selection handlers", () => {
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

    expect(onArrayItemSelect).not.toHaveBeenCalled();
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
