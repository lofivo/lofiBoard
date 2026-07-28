// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeKonvaNode {
  constructor(attrs = {}) {
    this.attrs = { ...attrs };
    this.children = [];
    this.eventHandlers = {};
    this.className = this.constructor.name.replace(/^Fake/, "");
  }

  add(...nodes) {
    nodes.forEach((node) => { node.parent = this; });
    this.children.push(...nodes);
    return this;
  }

  addName(name) {
    const names = new Set(String(this.attrs.name ?? "").split(/\s+/).filter(Boolean));
    names.add(name);
    this.attrs.name = [...names].join(" ");
    return this;
  }

  batchDraw() {}

  cache() {}

  clear() {}

  clone(attrs = {}) {
    return new this.constructor({ ...this.attrs, ...attrs });
  }

  cornerRadius(value) {
    if (value === undefined) return this.attrs.cornerRadius;
    this.attrs.cornerRadius = value;
    return this;
  }

  destroy() {}

  destroyChildren() {
    this.children.forEach((node) => { node.parent = null; });
    this.children = [];
  }

  dragBoundFunc(value) {
    if (value === undefined) return this.attrs.dragBoundFunc;
    this.attrs.dragBoundFunc = value;
    return this;
  }

  draggable(value) {
    if (value === undefined) return Boolean(this.attrs.draggable);
    this.attrs.draggable = Boolean(value);
    return this;
  }

  enabledAnchors(value) {
    if (value === undefined) return this.attrs.enabledAnchors ?? [];
    this.attrs.enabledAnchors = value;
    return this;
  }

  fill(value) {
    if (value === undefined) return this.attrs.fill;
    this.attrs.fill = value;
    return this;
  }

  find() {
    return [];
  }

  findAncestor() {
    return null;
  }

  findOne() {
    return null;
  }

  forceUpdate() {}

  getAbsoluteScale() {
    return { x: 1, y: 1 };
  }

  getAbsoluteTransform() {
    return { copy: () => ({ invert: () => ({ point: (point) => point }) }) };
  }

  getAttr(name) {
    return this.attrs[name];
  }

  getClientRect() {
    return {
      x: Number(this.attrs.x) || 0,
      y: Number(this.attrs.y) || 0,
      width: Number(this.attrs.width) || 0,
      height: Number(this.attrs.height) || 0,
    };
  }

  getChildren() {
    return this.children;
  }

  getLayer() {
    return null;
  }

  getParent() {
    return this.parent ?? null;
  }

  getStage() {
    return null;
  }

  hasName(name) {
    return String(this.attrs.name ?? "").split(/\s+/).includes(name);
  }

  height(value) {
    if (value === undefined) return Number(this.attrs.height) || 0;
    this.attrs.height = value;
    return this;
  }

  hide() {
    this.attrs.visible = false;
    return this;
  }

  id(value) {
    if (value === undefined) return this.attrs.id;
    this.attrs.id = value;
    return this;
  }

  listening(value) {
    if (value === undefined) return this.attrs.listening;
    this.attrs.listening = value;
    return this;
  }

  moveToTop() {}

  moveTo(parent) {
    parent?.add?.(this);
    return this;
  }

  name(value) {
    if (value === undefined) return this.attrs.name;
    this.attrs.name = value;
    return this;
  }

  nodes(value) {
    if (value === undefined) return this.attrs.nodes ?? [];
    this.attrs.nodes = value;
    return this;
  }

  offsetX(value) {
    if (value === undefined) return Number(this.attrs.offsetX) || 0;
    this.attrs.offsetX = value;
    return this;
  }

  offsetY(value) {
    if (value === undefined) return Number(this.attrs.offsetY) || 0;
    this.attrs.offsetY = value;
    return this;
  }

  on(eventName, handler) {
    this.eventHandlers[eventName] = handler;
    return this;
  }

  position(value) {
    if (value === undefined) return { x: this.x(), y: this.y() };
    this.attrs.x = value.x;
    this.attrs.y = value.y;
    return this;
  }

  remove() {}

  removeChildren() {
    this.children = [];
  }

  resizeEnabled(value) {
    if (value === undefined) return this.attrs.resizeEnabled !== false;
    this.attrs.resizeEnabled = Boolean(value);
    return this;
  }

  rotateEnabled(value) {
    if (value === undefined) return this.attrs.rotateEnabled !== false;
    this.attrs.rotateEnabled = Boolean(value);
    return this;
  }

  setAttrs(attrs) {
    this.attrs = { ...this.attrs, ...attrs };
    return this;
  }

  show() {
    this.attrs.visible = true;
    return this;
  }

  shouldOverdrawWholeArea(value) {
    if (value === undefined) return this.attrs.shouldOverdrawWholeArea;
    this.attrs.shouldOverdrawWholeArea = value;
    return this;
  }

  stroke(value) {
    if (value === undefined) return this.attrs.stroke;
    this.attrs.stroke = value;
    return this;
  }

  text(value) {
    if (value === undefined) return this.attrs.text;
    this.attrs.text = value;
    return this;
  }

  visible(value) {
    if (value === undefined) return this.attrs.visible !== false;
    this.attrs.visible = Boolean(value);
    return this;
  }

  width(value) {
    if (value === undefined) return Number(this.attrs.width) || 0;
    this.attrs.width = value;
    return this;
  }

  x(value) {
    if (value === undefined) return Number(this.attrs.x) || 0;
    this.attrs.x = value;
    return this;
  }

  y(value) {
    if (value === undefined) return Number(this.attrs.y) || 0;
    this.attrs.y = value;
    return this;
  }
}

let lastStage = null;

class FakeStage extends FakeKonvaNode {
  constructor({ container, width, height } = {}) {
    super({ width, height, x: 0, y: 0, scaleX: 1, scaleY: 1 });
    this.containerElement = container;
    lastStage = this;
  }

  container() {
    return this.containerElement;
  }

  getIntersection() {
    return null;
  }

  getPointerPosition() {
    return null;
  }

  scale(value) {
    if (value === undefined) return { x: this.scaleX(), y: this.scaleY() };
    this.attrs.scaleX = value.x;
    this.attrs.scaleY = value.y;
    return this;
  }

  scaleX(value) {
    if (value === undefined) return Number(this.attrs.scaleX) || 1;
    this.attrs.scaleX = value;
    return this;
  }

  scaleY(value) {
    if (value === undefined) return Number(this.attrs.scaleY) || 1;
    this.attrs.scaleY = value;
    return this;
  }
}

class FakeTransformer extends FakeKonvaNode {
  getActiveAnchor() {
    return null;
  }
}

class FakeLayer extends FakeKonvaNode {}
class FakeRect extends FakeKonvaNode {}
class FakeCircle extends FakeKonvaNode {}
class FakeEllipse extends FakeKonvaNode {}
class FakeLine extends FakeKonvaNode {}
class FakeArrow extends FakeKonvaNode {}
class FakeText extends FakeKonvaNode {}
class FakeGroup extends FakeKonvaNode {}
class FakeImage extends FakeKonvaNode {}
class FakePath extends FakeKonvaNode {}
class FakeShape extends FakeKonvaNode {}

vi.mock("konva", () => ({
  default: {
    Arrow: FakeArrow,
    Circle: FakeCircle,
    Ellipse: FakeEllipse,
    Easings: { EaseOut: (value) => value },
    Group: FakeGroup,
    Image: FakeImage,
    Layer: FakeLayer,
    Line: FakeLine,
    Path: FakePath,
    Rect: FakeRect,
    Shape: FakeShape,
    Stage: FakeStage,
    Text: FakeText,
    Transformer: FakeTransformer,
  },
}));

describe("whiteboard app startup", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  function seedDraft(elements) {
    localStorage.setItem("lofiBoard:auto-draft:v1", JSON.stringify({
      version: 1,
      elements,
      viewport: { x: 0, y: 0, scale: 1 },
    }));
  }

  async function mountApp() {
    const { createWhiteboardApp } = await import("../../../src/app/whiteboard-app.js");
    const root = document.createElement("div");
    root.id = "app";
    document.body.append(root);
    const app = createWhiteboardApp(root);
    return { app, root, stage: lastStage };
  }

  it("initializes the board session without boot-time reference errors", async () => {
    const { createWhiteboardApp } = await import("../../../src/app/whiteboard-app.js");
    const root = document.createElement("div");
    root.id = "app";
    document.body.append(root);

    const app = createWhiteboardApp(root);

    expect(app).toBeTruthy();
    expect(typeof app.getBoard).toBe("function");

    app.destroy();
  }, 15_000);

  it("corrects cached text height from the rendered DOM overlay after startup", async () => {
    seedDraft([{
      id: "text_1",
      type: "text",
      x: 20,
      y: 30,
      width: 180,
      height: 20,
      text: "Hello World",
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
      align: "left",
      zIndex: 0,
    }]);
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.dataset?.elementId === "text_1" ? 84 : 0;
      },
    });
    try {
      const { app } = await mountApp();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(app.getBoard().elements[0].height).toBe(84);

      app.destroy();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalDescriptor);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  }, 15_000);

  it("remeasures rendered text after browser fonts finish loading", async () => {
    seedDraft([{
      id: "text_1",
      type: "text",
      x: 20,
      y: 30,
      width: 180,
      height: 20,
      text: "Hello World",
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      fontStyle: "normal",
      textDecoration: "",
      padding: 6,
      fill: "#111827",
      align: "left",
      zIndex: 0,
    }]);
    let renderedHeight = 35;
    let resolveFontsReady;
    const listeners = new Map();
    const fonts = {
      ready: new Promise((resolve) => { resolveFontsReady = resolve; }),
      addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
      removeEventListener: vi.fn((type, listener) => {
        if (listeners.get(type) === listener) listeners.delete(type);
      }),
    };
    const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.dataset?.elementId === "text_1" ? renderedHeight : 0;
      },
    });
    try {
      const { app } = await mountApp();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(app.getBoard().elements[0].height).toBe(35);

      renderedHeight = 84;
      resolveFontsReady();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(app.getBoard().elements[0].height).toBe(84);

      renderedHeight = 112;
      listeners.get("loadingdone")?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(app.getBoard().elements[0].height).toBe(112);

      app.destroy();
      expect(fonts.removeEventListener).toHaveBeenCalledWith("loadingdone", expect.any(Function));
    } finally {
      if (originalFonts) {
        Object.defineProperty(document, "fonts", originalFonts);
      } else {
        delete document.fonts;
      }
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  }, 15_000);

  it("toggles placement tool locking from the toolbar action and Q shortcut", async () => {
    const { app, root } = await mountApp();
    const lockButton = root.querySelector('[data-tool-action="toggle-tool-lock"]');

    expect(lockButton).toBeTruthy();
    expect(root.dataset.keepToolActive).toBe("false");

    lockButton.click();
    expect(root.dataset.keepToolActive).toBe("true");
    expect(lockButton.classList.contains("active")).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
    expect(root.dataset.keepToolActive).toBe("false");
    expect(lockButton.classList.contains("active")).toBe(false);

    app.destroy();
  }, 15_000);

  it("adjusts the visible size property with plus and minus shortcuts", async () => {
    seedDraft([{
      id: "graph_1",
      type: "graph-structure",
      x: 20,
      y: 30,
      width: 240,
      height: 240,
      nodes: [{ id: "node_a", label: "A", x: 80, y: 120 }],
      edges: [],
      style: { nodeRadius: 26 },
      settings: {},
      zIndex: 0,
    }]);
    const { app, root } = await mountApp();
    const key = (value) => window.dispatchEvent(new KeyboardEvent("keydown", {
      key: value,
      code: value === "+" ? "Equal" : "Minus",
      shiftKey: value === "+",
      bubbles: true,
    }));

    app.commands.setTool("pen");
    app.commands.setProperty("width", "6");
    key("+");
    expect(app.getUiState().properties.width).toBe("7");

    app.commands.setTool("text");
    app.commands.setProperty("font-size", "28");
    key("-");
    expect(app.getUiState().properties.fontSize).toBe("27");

    app.commands.selectShapeTool("coordinate-plane");
    app.commands.setProperty("coordinate-unit-size", "40");
    key("+");
    expect(app.getUiState().properties.coordinateUnitSize).toBe("41");

    root._selectLayerItemById("graph_1", "none");
    key("+");
    expect(app.getBoard().elements[0].style.nodeRadius).toBeCloseTo(28.6, 5);

    app.destroy();
  }, 15_000);

  it("keeps text and sticky tool presets after switching tools", async () => {
    const { app } = await mountApp();
    const properties = () => app.getUiState().properties;

    app.commands.setTool("text");
    app.commands.setProperty("color", "#2563eb");
    app.commands.setProperty("font-family", "Georgia, serif");
    app.commands.setProperty("font-size", "42");
    app.commands.toggleTextStyle("bold");

    app.commands.setTool("pen");
    app.commands.setTool("text");

    expect(properties()).toMatchObject({
      color: "#2563eb",
      fontFamily: "Georgia, serif",
      fontSize: "42",
      textBold: true,
    });

    app.commands.setTool("sticky");
    app.commands.setProperty("fill", "#bbf7d0");
    app.commands.setProperty("color", "#7c3aed");
    app.commands.setProperty("font-family", "Arial, sans-serif");
    app.commands.setProperty("font-size", "30");

    app.commands.setTool("pen");
    app.commands.setTool("sticky");

    expect(properties()).toMatchObject({
      fill: "#bbf7d0",
      color: "#7c3aed",
      fontFamily: "Arial, sans-serif",
      fontSize: "30",
    });

    app.destroy();
  }, 15_000);

  it("removes app-level window and document listeners when destroyed", async () => {
    const { createWhiteboardApp } = await import("../../../src/app/whiteboard-app.js");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const root = document.createElement("div");
    root.id = "app";
    document.body.append(root);

    const app = createWhiteboardApp(root);
    app.destroy();

    expect(removeWindowListener).toHaveBeenCalledWith("keydown", expect.any(Function), { capture: true });
    expect(removeWindowListener).toHaveBeenCalledWith("beforeunload", expect.any(Function), undefined);
    expect(removeDocumentListener).toHaveBeenCalledWith("selectstart", expect.any(Function), { capture: true });
  }, 15_000);

  it("lists layers topmost-first with levels matching the element z order", async () => {
    seedDraft([
      { id: "rect_a", type: "rect", x: 0, y: 0, width: 100, height: 60, zIndex: 0 },
      { id: "rect_b", type: "rect", x: 40, y: 40, width: 100, height: 60, zIndex: 1, locked: true },
      { id: "rect_c", type: "rect", x: 80, y: 80, width: 100, height: 60, zIndex: 2 },
    ]);
    const { app, root } = await mountApp();

    const layers = root._getLayersData();

    expect(layers.map((layer) => layer.id)).toEqual(["rect_c", "rect_b", "rect_a"]);
    expect(layers.map((layer) => layer.level)).toEqual([2, 1, 0]);
    expect(layers.find((layer) => layer.id === "rect_b").locked).toBe(true);

    app.destroy();
  }, 15_000);

  it("keeps the layer order in sync after layer-order context actions", async () => {
    seedDraft([
      { id: "rect_a", type: "rect", x: 0, y: 0, width: 100, height: 60, zIndex: 0 },
      { id: "rect_b", type: "rect", x: 40, y: 40, width: 100, height: 60, zIndex: 1 },
      { id: "rect_c", type: "rect", x: 80, y: 80, width: 100, height: 60, zIndex: 2 },
    ]);
    const { app, root } = await mountApp();

    root._selectLayerItemById("rect_a", "none");
    expect(root._getSelectedIds()).toEqual(["rect_a"]);
    root._getContextMenuActionStates({ targetId: "rect_a" });
    root.querySelector('[data-context-action="bring-forward"]').click();

    expect(root._getLayersData().map((layer) => layer.id)).toEqual(["rect_c", "rect_a", "rect_b"]);

    app.destroy();
  }, 15_000);

  it("unlocks a locked element through the layer panel context entry", async () => {
    seedDraft([
      { id: "rect_a", type: "rect", x: 0, y: 0, width: 100, height: 60, zIndex: 0 },
      { id: "rect_b", type: "rect", x: 40, y: 40, width: 100, height: 60, zIndex: 1, locked: true },
    ]);
    const { app, root } = await mountApp();

    root._selectLayerItemById("rect_b", "none");
    expect(root._getSelectedIds()).toEqual(["rect_b"]);

    const actionStates = root._getContextMenuActionStates({ targetId: "rect_b" });
    expect(actionStates["toggle-lock"]).toBe(false);

    root.querySelector('[data-context-action="toggle-lock"]').click();

    expect(root._getLayersData().find((layer) => layer.id === "rect_b").locked).toBe(false);

    app.destroy();
  }, 15_000);

  // React 侧不应再靠 querySelector 隐藏按钮再 .click() 驱动引擎。
  // 每条命令都对照「点击对应遗留 DOM」的既有行为断言，确认是等价替换。
  describe("commands 门面", () => {
    it("暴露 React 需要的命令，不再依赖隐藏 DOM 点击", async () => {
      const { app } = await mountApp();

      expect(Object.keys(app.commands).sort()).toEqual([
        "runAction",
        "runContextAction",
        "runToolAction",
        "selectShapeTool",
        "setBackgroundMode",
        "setProperty",
        "setTool",
        "setZoomAtCenter",
        "toggleTextStyle",
        "zoomBy",
      ]);

      app.destroy();
    }, 15_000);

    it("setTool 与点击工具按钮等效", async () => {
      const { app, root } = await mountApp();
      const container = root.querySelector("#stage-container");

      root.querySelector('[data-tool="pen"]').click();
      const viaClick = container.dataset.tool;

      app.commands.setTool("sticky");
      expect(container.dataset.tool).toBe("sticky");
      expect(viaClick).toBe("pen");

      app.commands.setTool("pen");
      expect(container.dataset.tool).toBe(viaClick);

      app.destroy();
    }, 15_000);

    it("selectShapeTool 同时切到图形工具并记住形状", async () => {
      const { app, root } = await mountApp();
      const container = root.querySelector("#stage-container");

      app.commands.selectShapeTool("ellipse");

      expect(root.dataset.activeShape).toBe("ellipse");
      expect(container.dataset.tool).toBe("shape");
      expect(root.querySelector("[data-shape-popover]").hidden).toBe(true);

      app.destroy();
    }, 15_000);

    it("runToolAction 切换工具锁，与点击锁按钮等效", async () => {
      const { app, root } = await mountApp();

      expect(root.dataset.keepToolActive).toBe("false");
      app.commands.runToolAction("toggle-tool-lock");
      expect(root.dataset.keepToolActive).toBe("true");
      app.commands.runToolAction("toggle-tool-lock");
      expect(root.dataset.keepToolActive).toBe("false");

      app.destroy();
    }, 15_000);

    it("setBackgroundMode 与 zoom 命令直接改引擎状态", async () => {
      const { app, root } = await mountApp();
      const container = root.querySelector("#stage-container");
      const zoomLabel = root.querySelector("[data-zoom]");

      app.commands.setBackgroundMode("dots");
      expect(container.dataset.background).toBe("dots");

      app.commands.setZoomAtCenter(2);
      expect(zoomLabel.textContent).toBe("200%");

      app.commands.zoomBy(1 / 1.25);
      expect(zoomLabel.textContent).toBe("160%");

      app.destroy();
    }, 15_000);

    it("runAction 与 runContextAction 走引擎动作表", async () => {
      seedDraft([
        { id: "rect_a", type: "rect", x: 0, y: 0, width: 100, height: 60, zIndex: 0 },
        { id: "rect_b", type: "rect", x: 40, y: 40, width: 100, height: 60, zIndex: 1, locked: true },
      ]);
      const { app, root } = await mountApp();

      root._selectLayerItemById("rect_b", "none");
      app.commands.runContextAction("toggle-lock");
      expect(root._getLayersData().find((layer) => layer.id === "rect_b").locked).toBe(false);
      expect(root.querySelector("[data-context-menu]").hidden).toBe(true);

      app.commands.runAction("undo");
      expect(root._getLayersData().find((layer) => layer.id === "rect_b").locked).toBe(true);

      app.destroy();
    }, 15_000);

    it("setProperty 把样式落到选中元素上", async () => {
      seedDraft([
        { id: "rect_a", type: "rect", x: 0, y: 0, width: 100, height: 60, zIndex: 0, stroke: "#111827", strokeWidth: 6 },
      ]);
      const { app, root } = await mountApp();
      const findRect = () => app.getBoard().elements.find((element) => element.id === "rect_a");

      root._selectLayerItemById("rect_a", "none");

      app.commands.setProperty("color", "#2563eb");
      expect(app.getUiState().properties.color).toBe("#2563eb");
      expect(findRect().stroke).toBe("#2563eb");

      app.commands.setProperty("width", 14);
      expect(app.getUiState().properties.width).toBe("14");
      expect(findRect().strokeWidth).toBe(14);

      app.destroy();
    }, 15_000);

    it("setProperty 写 checkbox 控件时按 checked 取值", async () => {
      const { app } = await mountApp();

      app.commands.setProperty("fill-transparent", null, { checked: false });
      expect(app.getUiState().properties.fillTransparent).toBe(false);

      app.commands.setProperty("fill-transparent", null, { checked: true });
      expect(app.getUiState().properties.fillTransparent).toBe(true);

      app.destroy();
    }, 15_000);

    // React 不该每 100ms 扫一遍遗留 DOM 取状态,一次调用拿全量。
    // 画笔真正下笔时走的是 getBrushCap/getFillColor 这类 getter,它们曾经直接读隐藏
    // input。input 删掉后模型层单测照样全绿(Konva 是 fake,不走 startStroke),
    // 只有真画一笔才会暴露。见 AGENTS #31。
    it("新笔迹用的是命令写入的样式,不依赖任何隐藏 input", async () => {
      const { app, stage } = await mountApp();

      app.commands.setTool("pen");
      app.commands.setProperty("color", "#ef4444");
      app.commands.setProperty("width", "9");
      app.commands.setProperty("brush-cap", "square");
      app.commands.setProperty("brush-style", "dash");

      stage.attrs.pointerPosition = { x: 40, y: 40 };
      stage.getPointerPosition = () => stage.attrs.pointerPosition;
      stage.eventHandlers.pointerdown({ target: stage, evt: { pointerId: 1, button: 0 } });
      for (let i = 1; i <= 5; i++) {
        stage.attrs.pointerPosition = { x: 40 + i * 10, y: 60 };
        stage.eventHandlers.pointermove({ target: stage, evt: { pointerId: 1 } });
      }
      stage.eventHandlers["pointerup pointercancel"]({ target: stage, evt: { pointerId: 1 } });

      const stroke = app.getBoard().elements.find((element) => element.type === "stroke");
      expect(stroke).toBeDefined();
      expect(stroke).toMatchObject({
        stroke: "#ef4444",
        strokeWidth: 9,
        lineCap: "square",
        brushStyle: "dash",
      });

      app.destroy();
    }, 15_000);

    it("getUiState 一次给出 React 需要的全部状态", async () => {
      seedDraft([
        { id: "rect_a", type: "rect", x: 0, y: 0, width: 100, height: 60, zIndex: 0 },
      ]);
      const { app, root } = await mountApp();

      const state = app.getUiState();
      expect(Object.keys(state).sort()).toEqual([
        "activeShape",
        "backgroundMode",
        "fileName",
        "graphDirected",
        "keepToolActive",
        "layers",
        "panelMode",
        "properties",
        "selectedIds",
        "selectionCaps",
        "status",
        "structureSelection",
        "stylePanelTitle",
        "tool",
        "zoom",
      ]);

      // 每个字段都对照它替代的那次 DOM 读取
      expect(state.tool).toBe(root.querySelector("#stage-container").dataset.tool);
      expect(state.zoom).toBeCloseTo(parseFloat(root.querySelector("[data-zoom]").textContent) / 100);
      expect(state.fileName).toBe(root.querySelector("[data-file-name]").textContent);
      expect(state.stylePanelTitle).toBe(root.querySelector("[data-style-panel-title]").textContent);
      expect(state.panelMode).toBe(root.dataset.panelMode);
      expect(state.keepToolActive).toBe(root.dataset.keepToolActive === "true");
      expect(state.layers).toEqual(root._getLayersData());
      expect(state.selectedIds).toEqual(root._getSelectedIds());
      expect(state.properties.color).toBe("#111827");

      app.destroy();
    }, 15_000);

    it("getUiState 的属性随命令写入更新,文字样式展开成布尔", async () => {
      const { app } = await mountApp();

      app.commands.setProperty("color", "#ef4444");
      app.commands.setProperty("fill-transparent", null, { checked: false });
      expect(app.getUiState().properties).toMatchObject({
        color: "#ef4444",
        fillTransparent: false,
        textBold: false,
      });

      app.commands.toggleTextStyle("bold");
      expect(app.getUiState().properties.textBold).toBe(true);

      app.destroy();
    }, 15_000);

    it("toggleTextStyle 在无选中时翻转当前工具的默认文字样式", async () => {
      const { app } = await mountApp();

      app.commands.setTool("text");
      expect(app.getUiState().properties.textBold).toBe(false);

      app.commands.toggleTextStyle("bold");
      expect(app.getUiState().properties.textBold).toBe(true);

      app.commands.toggleTextStyle("bold");
      expect(app.getUiState().properties.textBold).toBe(false);

      app.destroy();
    }, 15_000);
  });
});
