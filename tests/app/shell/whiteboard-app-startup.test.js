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

  getLayer() {
    return null;
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

class FakeStage extends FakeKonvaNode {
  constructor({ container, width, height } = {}) {
    super({ width, height, x: 0, y: 0, scaleX: 1, scaleY: 1 });
    this.containerElement = container;
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
class FakeLine extends FakeKonvaNode {}
class FakeArrow extends FakeKonvaNode {}
class FakeText extends FakeKonvaNode {}
class FakeGroup extends FakeKonvaNode {}
class FakeImage extends FakeKonvaNode {}
class FakePath extends FakeKonvaNode {}

vi.mock("konva", () => ({
  default: {
    Arrow: FakeArrow,
    Circle: FakeCircle,
    Easings: { EaseOut: (value) => value },
    Group: FakeGroup,
    Image: FakeImage,
    Layer: FakeLayer,
    Line: FakeLine,
    Path: FakePath,
    Rect: FakeRect,
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
    return { app, root };
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

  it("keeps text and sticky tool presets after switching tools", async () => {
    const { app, root } = await mountApp();
    const textTool = root.querySelector(`[data-tool="text"]`);
    const stickyTool = root.querySelector(`[data-tool="sticky"]`);
    const penTool = root.querySelector(`[data-tool="pen"]`);
    const colorInput = root.querySelector(`[data-control="color"]`);
    const fillInput = root.querySelector(`[data-control="fill"]`);
    const fontFamilyInput = root.querySelector(`[data-control="font-family"]`);
    const fontSizeInput = root.querySelector(`[data-control="font-size"]`);
    const boldButton = root.querySelector(`[data-text-style="bold"]`);

    textTool.click();
    colorInput.value = "#2563eb";
    colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    fontFamilyInput.value = "Georgia, serif";
    fontFamilyInput.dispatchEvent(new Event("change", { bubbles: true }));
    fontSizeInput.value = "42";
    fontSizeInput.dispatchEvent(new Event("input", { bubbles: true }));
    boldButton.click();

    penTool.click();
    textTool.click();

    expect(colorInput.value).toBe("#2563eb");
    expect(fontFamilyInput.value).toBe("Georgia, serif");
    expect(fontSizeInput.value).toBe("42");
    expect(boldButton.classList.contains("active")).toBe(true);

    stickyTool.click();
    fillInput.value = "#bbf7d0";
    fillInput.dispatchEvent(new Event("input", { bubbles: true }));
    colorInput.value = "#7c3aed";
    colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    fontFamilyInput.value = "Arial, sans-serif";
    fontFamilyInput.dispatchEvent(new Event("change", { bubbles: true }));
    fontSizeInput.value = "30";
    fontSizeInput.dispatchEvent(new Event("input", { bubbles: true }));

    penTool.click();
    stickyTool.click();

    expect(fillInput.value).toBe("#bbf7d0");
    expect(colorInput.value).toBe("#7c3aed");
    expect(fontFamilyInput.value).toBe("Arial, sans-serif");
    expect(fontSizeInput.value).toBe("30");

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

    it("setProperty 与直接写主控件再派发事件等效", async () => {
      seedDraft([
        { id: "rect_a", type: "rect", x: 0, y: 0, width: 100, height: 60, zIndex: 0, stroke: "#111827", strokeWidth: 6 },
      ]);
      const { app, root } = await mountApp();
      const colorInput = root.querySelector('[data-control="color"]');
      const widthInput = root.querySelector('[data-control="width"]');

      // 旧路径:写 value 再合成事件
      root._selectLayerItemById("rect_a", "none");
      colorInput.value = "#ef4444";
      colorInput.dispatchEvent(new Event("input", { bubbles: true }));
      const findRect = () => app.getBoard().elements.find((element) => element.id === "rect_a");
      expect(findRect().stroke).toBe("#ef4444");

      // 新路径:同样落到元素上
      app.commands.setProperty("color", "#2563eb");
      expect(colorInput.value).toBe("#2563eb");
      expect(findRect().stroke).toBe("#2563eb");

      app.commands.setProperty("width", 14);
      expect(widthInput.value).toBe("14");
      expect(findRect().strokeWidth).toBe(14);

      app.destroy();
    }, 15_000);

    it("setProperty 写 checkbox 控件并同步可见镜像控件", async () => {
      const { app, root } = await mountApp();
      const fillTransparentInput = root.querySelector('[data-control="fill-transparent"]');

      app.commands.setProperty("fill-transparent", null, { checked: false });

      expect(fillTransparentInput.checked).toBe(false);
      root.querySelectorAll("[data-ui-control='fill-transparent']").forEach((input) => {
        expect(input.checked).toBe(false);
      });

      app.destroy();
    }, 15_000);

    // React 不该每 100ms 扫一遍遗留 DOM 取状态,一次调用拿全量。
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
      expect(state.properties.color).toBe(root.querySelector('[data-control="color"]').value);

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

    it("toggleTextStyle 与点击文字样式按钮等效", async () => {
      const { app, root } = await mountApp();
      const boldButton = root.querySelector('[data-text-style="bold"]');

      boldButton.click();
      expect(boldButton.getAttribute("aria-pressed")).toBe("true");

      app.commands.toggleTextStyle("bold");
      expect(boldButton.getAttribute("aria-pressed")).toBe("false");

      app.destroy();
    }, 15_000);
  });
});
