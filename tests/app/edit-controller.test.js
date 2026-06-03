/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEditController } from "../../src/app/edit-controller.js";

function makeNode(overrides = {}) {
  return {
    width: vi.fn(() => 200),
    height: vi.fn(() => 60),
    scaleX: vi.fn(() => 1),
    scaleY: vi.fn(() => 1),
    getAbsolutePosition: vi.fn(() => ({ x: 100, y: 80 })),
    getAbsoluteRotation: vi.fn(() => 0),
    findOne: vi.fn(() => null),
    show: vi.fn(),
    hide: vi.fn(),
    setAttrs: vi.fn(),
    ...overrides,
  };
}

function kEvent(key) {
  return new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
}

function makeStage() {
  return {
    scaleX: vi.fn(() => 1),
    scaleY: vi.fn(() => 1),
    container: vi.fn(() => ({
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
    })),
  };
}

function makeTransformer() {
  return {
    nodes: vi.fn(() => []),
    show: vi.fn(),
    hide: vi.fn(),
    visible: vi.fn(),
    forceUpdate: vi.fn(),
    resizeEnabled: vi.fn(),
    rotateEnabled: vi.fn(),
    enabledAnchors: vi.fn(),
    boundBoxFunc: vi.fn(() => vi.fn()),
    anchorDragBoundFunc: vi.fn(() => vi.fn()),
    getActiveAnchor: vi.fn(() => null),
    isTransforming: vi.fn(() => false),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function makeTextOverlayController() {
  return {
    setHiddenIds: vi.fn(),
    sync: vi.fn(),
    clear: vi.fn(),
  };
}

function makeContentLayer() {
  return {
    findOne: vi.fn(() => null),
    draw: vi.fn(),
    batchDraw: vi.fn(),
  };
}

function createDeps(overrides = {}) {
  return {
    findElement: vi.fn(),
    getBoardElements: vi.fn(() => []),
    setBoardElements: vi.fn(),
    getSelectedIds: vi.fn(() => []),
    setSelectedIds: vi.fn(),
    contentLayer: makeContentLayer(),
    overlayLayer: { batchDraw: vi.fn() },
    transformer: makeTransformer(),
    stage: makeStage(),
    textOverlayController: makeTextOverlayController(),
    onStateChange: vi.fn(),
    onRender: vi.fn(),
    onHistory: vi.fn(),
    measureTextValue: vi.fn(() => 10),
    ...overrides,
  };
}

function textElement(overrides = {}) {
  return {
    id: "text_1",
    type: "text",
    x: 100,
    y: 80,
    width: 200,
    height: 60,
    text: "Hello world",
    fontSize: 24,
    fontFamily: "Inter, sans-serif",
    fontStyle: "bold italic",
    textDecoration: "underline",
    fill: "#111827",
    padding: 6,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    align: "left",
    ...overrides,
  };
}

function stickyElement(overrides = {}) {
  return {
    id: "sticky_1",
    type: "sticky",
    x: 100,
    y: 80,
    width: 220,
    height: 160,
    text: "Sticky note",
    fontSize: 22,
    fontFamily: "Inter, sans-serif",
    fontStyle: "normal",
    textDecoration: "",
    fill: "#fef3c7",
    textFill: "#1f2937",
    padding: 6,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    ...overrides,
  };
}

describe("edit-controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns the expected API", () => {
    const deps = createDeps();
    const controller = createEditController(deps);
    expect(controller).toHaveProperty("editElement");
    expect(controller).toHaveProperty("isEditing");
    expect(controller).toHaveProperty("commit");
    expect(typeof controller.editElement).toBe("function");
    expect(controller.isEditing).toBe(false);
    expect(controller.commit).toBeNull();
  });

  it("enters editing state when editElement is called", () => {
    const deps = createDeps();
    const element = textElement();
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    expect(controller.isEditing).toBe(true);
    expect(deps.onStateChange).toHaveBeenCalledWith(true);
    expect(deps.textOverlayController.setHiddenIds).toHaveBeenCalledWith([element.id]);
    expect(deps.transformer.hide).toHaveBeenCalled();
  });

  it("does nothing when element is not found", () => {
    const deps = createDeps();
    deps.findElement.mockReturnValue(null);
    deps.contentLayer.findOne.mockReturnValue(makeNode());

    const controller = createEditController(deps);
    controller.editElement("nonexistent");

    expect(controller.isEditing).toBe(false);
    expect(deps.onStateChange).not.toHaveBeenCalled();
  });

  it("does nothing when node is not found", () => {
    const deps = createDeps();
    const element = textElement();
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(null);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    expect(controller.isEditing).toBe(false);
    expect(deps.onStateChange).not.toHaveBeenCalled();
  });

  it("creates a text editor DOM frame", () => {
    const deps = createDeps();
    const element = textElement();
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const frame = document.querySelector(".text-editor-frame");
    expect(frame).toBeTruthy();
    const textarea = frame?.querySelector("textarea.text-editor");
    expect(textarea).toBeTruthy();
    expect(textarea?.value).toBe(element.text);
  });

  it("removes empty text element on commit with no text", () => {
    const deps = createDeps();
    const element = textElement({ text: "" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.dispatchEvent(kEvent("Enter"));

    expect(controller.isEditing).toBe(false);
    expect(deps.setBoardElements).toHaveBeenCalled();
    expect(deps.setSelectedIds).toHaveBeenCalled();
    expect(deps.onHistory).toHaveBeenCalledWith("已删除空文字");
    expect(deps.onRender).toHaveBeenCalled();
  });

  it("preserves sticky on commit even when empty", () => {
    const deps = createDeps();
    const element = stickyElement({ text: "" });
    const stickyRect = { fill: vi.fn(() => "#fef3c7"), setAttrs: vi.fn() };
    const node = makeNode({ findOne: vi.fn(() => stickyRect), setAttrs: vi.fn() });
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.value = "";
    textarea.dispatchEvent(kEvent("Enter"));

    expect(controller.isEditing).toBe(false);
    expect(deps.setBoardElements).toHaveBeenCalled();
    expect(deps.onHistory).toHaveBeenCalledWith("已编辑文字");
    expect(deps.onRender).toHaveBeenCalled();
  });

  it("cancels editing on Escape key and restores original text", () => {
    const deps = createDeps();
    const element = textElement({ text: "original" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.value = "modified text";
    textarea.dispatchEvent(kEvent("Escape"));

    expect(controller.isEditing).toBe(false);
    expect(node.show).toHaveBeenCalled();
    expect(deps.transformer.show).toHaveBeenCalled();
    expect(deps.onRender).toHaveBeenCalled();
    expect(deps.onStateChange).toHaveBeenCalledWith(false);
  });

  it("removes empty text on cancel if it was empty on creation", () => {
    const deps = createDeps();
    const element = textElement({ text: "" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.dispatchEvent(kEvent("Escape"));

    expect(deps.setBoardElements).toHaveBeenCalled();
    expect(deps.onHistory).toHaveBeenCalledWith("已取消空文字");
  });

  it("commits text element with correct size calculation", () => {
    const deps = createDeps();
    const element = textElement({ text: "Hello", width: 200, height: 60 });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);
    deps.measureTextValue = vi.fn(() => 50);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.value = "Hello updated";
    textarea.dispatchEvent(kEvent("Enter"));

    expect(deps.setBoardElements).toHaveBeenCalled();
    const updatedElements = deps.setBoardElements.mock.calls[0][0];
    const updated = updatedElements.find((el) => el.id === element.id);
    expect(updated.text).toBe("Hello updated");
    expect(updated.scaleX).toBe(1);
    expect(updated.scaleY).toBe(1);
    expect(deps.onHistory).toHaveBeenCalledWith("已编辑文字");
  });

  it("commits sticky element with correct size calculation", () => {
    const deps = createDeps();
    const element = stickyElement({ text: "Note", width: 220, height: 160 });
    const node = makeNode({
      findOne: vi.fn(() => ({ fill: vi.fn(() => "#fef3c7"), setAttrs: vi.fn() })),
      width: vi.fn(() => 220),
      height: vi.fn(() => 160),
    });
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.value = "Updated sticky";
    textarea.dispatchEvent(kEvent("Enter"));

    expect(deps.setBoardElements).toHaveBeenCalled();
    const updatedElements = deps.setBoardElements.mock.calls[0][0];
    const updated = updatedElements.find((el) => el.id === element.id);
    expect(updated.text).toBe("Updated sticky");
    expect(deps.onHistory).toHaveBeenCalledWith("已编辑文字");
  });

  it("sets commit function reference for external callers", () => {
    const deps = createDeps();
    const element = textElement();
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    expect(controller.commit).toBeTruthy();
    expect(typeof controller.commit).toBe("function");
  });

  it("commits via controller.commit() and clears reference", () => {
    const deps = createDeps();
    const element = textElement({ text: "test" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    controller.commit();

    expect(controller.isEditing).toBe(false);
    expect(controller.commit).toBeNull();
    expect(deps.onHistory).toHaveBeenCalledWith("已编辑文字");
  });

  it("sets isEditing to false after commit", () => {
    const deps = createDeps();
    const element = textElement();
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    expect(controller.isEditing).toBe(true);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.dispatchEvent(kEvent("Enter"));

    expect(controller.isEditing).toBe(false);
  });
});
