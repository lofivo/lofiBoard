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
});
