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
});
