/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEditController } from "../../../src/app/editing/controller.js";

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

function makeStage(overrides = {}) {
  return {
    scaleX: vi.fn(() => 1),
    scaleY: vi.fn(() => 1),
    container: vi.fn(() => ({
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
    })),
    ...overrides,
  };
}

function makeTransformer() {
  const handlers = {};
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
    on: vi.fn((events, handler) => {
      String(events).split(/\s+/).filter(Boolean).forEach((eventName) => {
        handlers[eventName] = handler;
      });
    }),
    off: vi.fn(),
    trigger: (eventName) => handlers[eventName]?.(),
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

function installTextareaScrollHeight(getScrollHeight) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return getScrollHeight(this);
    },
  });
  return () => {
    if (originalDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalDescriptor);
    } else {
      delete HTMLElement.prototype.scrollHeight;
    }
  };
}

describe("app editing controller", () => {
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
    expect(deps.contentLayer.draw).toHaveBeenCalled();
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

  it("sets browser autocomplete/spellcheck/autocorrect attributes to off on editor textareas", () => {
    const deps = createDeps();
    const element = textElement();
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    expect(textarea).toBeTruthy();
    expect(textarea.spellcheck).toBe(false);
    expect(textarea.autocorrect).toBe("off");
    expect(textarea.autocomplete).toBe("off");
    expect(textarea.autocapitalize).toBe("off");

    const measureTextarea = document.querySelector("textarea.text-editor-measure");
    expect(measureTextarea).toBeTruthy();
    expect(measureTextarea.spellcheck).toBe(false);
    expect(measureTextarea.autocorrect).toBe("off");
    expect(measureTextarea.autocomplete).toBe("off");
    expect(measureTextarea.autocapitalize).toBe("off");
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

  it("uses the textarea as the visible editing surface and hides the Konva text", () => {
    const deps = createDeps();
    const element = textElement({ fill: "#0f172a" });
    const textNode = {
      hide: vi.fn(),
      show: vi.fn(),
      x: vi.fn(),
      y: vi.fn(),
      width: vi.fn(),
      height: vi.fn(),
      setAttrs: vi.fn(),
      visible: vi.fn(),
    };
    const node = makeNode({
      findOne: vi.fn((selector) => (selector === "Text" ? textNode : null)),
      getAttr: vi.fn(() => 0),
      setAttr: vi.fn(),
    });
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    expect(textarea.style.color).toBe("rgb(15, 23, 42)");
    expect(textNode.hide).toHaveBeenCalled();

    textarea.dispatchEvent(kEvent("Escape"));

    expect(textNode.show).toHaveBeenCalled();
    expect(controller.isEditing).toBe(false);
  });

  it("opens with the persisted editing box instead of the render box", () => {
    const deps = createDeps();
    const element = textElement({
      width: 180,
      height: 40,
      editWidth: 320,
      editHeight: 96,
    });
    const node = makeNode({
      width: vi.fn(() => 180),
      height: vi.fn(() => 40),
    });
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const frame = document.querySelector(".text-editor-frame");
    expect(Number.parseFloat(frame.style.width)).toBe(320);
    expect(Number.parseFloat(frame.style.height)).toBe(96);
  });

  it("commits manual editing dimensions without changing the render box", () => {
    const deps = createDeps();
    const element = textElement({
      width: 180,
      height: 40,
      editWidth: 320,
      editHeight: 96,
    });
    const node = makeNode({
      width: vi.fn(() => 180),
      height: vi.fn(() => 40),
    });
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);
    document.querySelector(".text-editor-frame textarea.text-editor").dispatchEvent(kEvent("Enter"));

    const updated = deps.setBoardElements.mock.calls[0][0][0];
    expect(updated).toMatchObject({
      width: 180,
      height: 40,
      editWidth: 320,
      editHeight: 96,
    });
  });

  it("keeps editing active when an editor resize starts", () => {
    const deps = createDeps();
    const element = textElement({ editWidth: 260, editHeight: 72 });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);
    deps.transformer.trigger("transformstart.editor");

    expect(controller.isEditing).toBe(true);
    expect(deps.setBoardElements).not.toHaveBeenCalled();
  });

  it("updates the editing frame while transformer resizing stays in edit mode", () => {
    let nodeWidth = 200;
    let nodeHeight = 60;
    const deps = createDeps();
    const element = textElement({ editWidth: 200, editHeight: 60 });
    const node = makeNode({
      width: vi.fn(function setWidth(value) {
        if (arguments.length > 0) nodeWidth = value;
        return nodeWidth;
      }),
      height: vi.fn(function setHeight(value) {
        if (arguments.length > 0) nodeHeight = value;
        return nodeHeight;
      }),
    });
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);
    deps.transformer.getActiveAnchor.mockReturnValue("middle-right");

    const controller = createEditController(deps);
    controller.editElement(element.id);
    nodeWidth = 260;
    nodeHeight = 92;
    deps.transformer.trigger("transform.editor");

    const frame = document.querySelector(".text-editor-frame");
    expect(controller.isEditing).toBe(true);
    expect(Number.parseFloat(frame.style.width)).toBe(260);
    expect(Number.parseFloat(frame.style.height)).toBe(60);
    expect(deps.setBoardElements).not.toHaveBeenCalled();
  });

  it("resizes editing width and height independently at corner anchors", () => {
    const deps = createDeps();
    const element = textElement({ editWidth: 200, editHeight: 60 });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(node);
    deps.transformer.getActiveAnchor.mockReturnValue("bottom-right");

    const controller = createEditController(deps);
    controller.editElement(element.id);
    const boundBox = deps.transformer.boundBoxFunc.mock.calls.at(-1)[0];
    const result = boundBox(
      { x: 0, y: 0, width: 200, height: 60 },
      { x: 0, y: 0, width: 260, height: 80 },
    );

    expect(result).toMatchObject({ width: 260, height: 80 });
  });

  it("limits edit-mode transformer actions to editing box resizing", () => {
    const deps = createDeps();
    const element = textElement();
    deps.findElement.mockReturnValue(element);
    deps.contentLayer.findOne.mockReturnValue(makeNode());

    const controller = createEditController(deps);
    controller.editElement(element.id);

    expect(deps.transformer.resizeEnabled).toHaveBeenCalledWith(true);
    expect(deps.transformer.rotateEnabled).toHaveBeenCalledWith(false);
  });

  it("persists manually resized editing dimensions while keeping render dimensions", () => {
    let nodeWidth = 200;
    let nodeHeight = 60;
    const deps = createDeps();
    const element = textElement({
      width: 180,
      height: 40,
      editWidth: 200,
      editHeight: 60,
    });
    const node = makeNode({
      width: vi.fn(function setWidth(value) {
        if (arguments.length > 0) nodeWidth = value;
        return nodeWidth;
      }),
      height: vi.fn(function setHeight(value) {
        if (arguments.length > 0) nodeHeight = value;
        return nodeHeight;
      }),
    });
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.contentLayer.findOne.mockReturnValue(node);
    deps.transformer.getActiveAnchor.mockReturnValue("bottom-right");

    const controller = createEditController(deps);
    controller.editElement(element.id);
    nodeWidth = 260;
    nodeHeight = 92;
    deps.transformer.trigger("transform.editor");
    document.querySelector(".text-editor-frame textarea.text-editor").dispatchEvent(kEvent("Enter"));

    const updated = deps.setBoardElements.mock.calls[0][0][0];
    expect(updated).toMatchObject({
      width: 180,
      height: 40,
      editWidth: 260,
      editHeight: 92,
    });
    expect(deps.onHistory).toHaveBeenCalledTimes(1);
    expect(deps.onHistory).toHaveBeenCalledWith("已编辑文字");
  });

  it("does not persist content-driven editor height growth", () => {
    const restoreScrollHeight = installTextareaScrollHeight((target) => (
      target.classList?.contains("text-editor-measure") ? 112 : 35
    ));
    try {
      const deps = createDeps();
      const element = textElement({
        width: 180,
        height: 40,
        editWidth: 200,
        editHeight: 35,
      });
      const node = makeNode({
        width: vi.fn(() => 180),
        height: vi.fn(() => 40),
      });
      deps.findElement.mockReturnValue(element);
      deps.getBoardElements.mockReturnValue([element]);
      deps.contentLayer.findOne.mockReturnValue(node);

      const controller = createEditController(deps);
      controller.editElement(element.id);
      const frame = document.querySelector(".text-editor-frame");
      expect(Number.parseFloat(frame.style.height)).toBeGreaterThan(112);
      frame.querySelector("textarea.text-editor").dispatchEvent(kEvent("Enter"));

      expect(deps.setBoardElements.mock.calls[0][0][0].editHeight).toBe(35);
    } finally {
      restoreScrollHeight();
    }
  });

  it("does not persist content-driven height when only the editing width is resized", () => {
    let nodeWidth = 200;
    let nodeHeight = 114;
    const restoreScrollHeight = installTextareaScrollHeight((target) => {
      if (!target.classList?.contains("text-editor-measure")) return 35;
      return Number.parseFloat(target.style.width) >= 260 ? 35 : 112;
    });
    try {
      const deps = createDeps();
      const element = textElement({
        width: 180,
        height: 40,
        editWidth: 200,
        editHeight: 35,
      });
      const node = makeNode({
        width: vi.fn(function setWidth(value) {
          if (arguments.length > 0) nodeWidth = value;
          return nodeWidth;
        }),
        height: vi.fn(function setHeight(value) {
          if (arguments.length > 0) nodeHeight = value;
          return nodeHeight;
        }),
      });
      deps.findElement.mockReturnValue(element);
      deps.getBoardElements.mockReturnValue([element]);
      deps.contentLayer.findOne.mockReturnValue(node);
      deps.transformer.getActiveAnchor.mockReturnValue("middle-right");

      const controller = createEditController(deps);
      controller.editElement(element.id);
      nodeWidth = 260;
      deps.transformer.trigger("transform.editor");
      expect(Number.parseFloat(document.querySelector(".text-editor-frame").style.height)).toBe(37);
      document.querySelector(".text-editor-frame textarea.text-editor").dispatchEvent(kEvent("Enter"));

      expect(deps.setBoardElements.mock.calls[0][0][0]).toMatchObject({
        editWidth: 260,
        editHeight: 35,
      });
    } finally {
      restoreScrollHeight();
    }
  });

  it("keeps the persisted editing height as the live minimum when content becomes shorter", () => {
    let measuredHeight = 112;
    const restoreScrollHeight = installTextareaScrollHeight((target) => (
      target.classList?.contains("text-editor-measure") ? measuredHeight : 35
    ));
    try {
      const deps = createDeps();
      const element = textElement({
        width: 180,
        height: 40,
        editWidth: 200,
        editHeight: 80,
      });
      const node = makeNode({
        width: vi.fn(() => 180),
        height: vi.fn(() => 40),
      });
      deps.findElement.mockReturnValue(element);
      deps.getBoardElements.mockReturnValue([element]);
      deps.contentLayer.findOne.mockReturnValue(node);

      const controller = createEditController(deps);
      controller.editElement(element.id);
      const frame = document.querySelector(".text-editor-frame");
      const textarea = frame.querySelector("textarea.text-editor");
      expect(Number.parseFloat(frame.style.height)).toBeGreaterThan(112);

      measuredHeight = 35;
      textarea.value = "short";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      expect(Number.parseFloat(frame.style.height)).toBe(80);
      textarea.dispatchEvent(kEvent("Enter"));
      expect(deps.setBoardElements.mock.calls[0][0][0].editHeight).toBe(80);
    } finally {
      restoreScrollHeight();
    }
  });

  it("expands an existing multiline latex text editor to show its source on open", () => {
    const restoreScrollHeight = installTextareaScrollHeight((element) => (
      element.classList?.contains("text-editor-measure") && element.value.includes("\\log n")
        ? 112
        : 35
    ));
    try {
      const deps = createDeps();
      const element = textElement({
        text: "$$\n\\log n\n$$",
        width: 160,
        height: 35,
      });
      const node = makeNode({
        width: vi.fn(() => 160),
        height: vi.fn(() => 35),
      });
      deps.findElement.mockReturnValue(element);
      deps.contentLayer.findOne.mockReturnValue(node);

      const controller = createEditController(deps);
      controller.editElement(element.id);

      const frame = document.querySelector(".text-editor-frame");
      expect(Number.parseFloat(frame.style.height)).toBeGreaterThanOrEqual(114);
      expect(node.height).toHaveBeenLastCalledWith(expect.any(Number));
      expect(node.height.mock.calls.at(-1)[0]).toBeGreaterThanOrEqual(114);
      expect(deps.transformer.forceUpdate).toHaveBeenCalled();
    } finally {
      restoreScrollHeight();
    }
  });

  it("recomputes multiline latex text box from rendered content on commit", () => {
    const restoreScrollHeight = installTextareaScrollHeight((element) => (
      element.classList?.contains("text-editor-measure") && element.value.includes("\\log n")
        ? 112
        : 35
    ));
    try {
      const deps = createDeps();
      const element = textElement({
        text: "$$\n\\log n\n$$",
        width: 160,
        height: 35,
      });
      const node = makeNode({
        width: vi.fn(() => 160),
        height: vi.fn(() => 35),
      });
      deps.findElement.mockReturnValue(element);
      deps.getBoardElements.mockReturnValue([element]);
      deps.contentLayer.findOne.mockReturnValue(node);
      deps.measureTextValue = vi.fn((_, value) => String(value).length * 10);

      const controller = createEditController(deps);
      controller.editElement(element.id);

      const frame = document.querySelector(".text-editor-frame");
      expect(Number.parseFloat(frame.style.height)).toBeGreaterThanOrEqual(114);

      const textarea = frame.querySelector("textarea.text-editor");
      textarea.dispatchEvent(kEvent("Enter"));

      const updatedElements = deps.setBoardElements.mock.calls[0][0];
      const updated = updatedElements.find((el) => el.id === element.id);
      expect(updated.text).toBe("$$\n\\log n\n$$");
      expect(updated.width).toBe(160);
      expect(updated.height).toBeGreaterThanOrEqual(30);
      expect(updated.height).toBeLessThan(80);
    } finally {
      restoreScrollHeight();
    }
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

  it("keeps a newly placed empty text element editing while resizing its editor frame", () => {
    const deps = createDeps();
    const element = textElement({ text: "" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    deps.transformer.trigger("transformstart.editor");

    expect(controller.isEditing).toBe(true);
    expect(deps.setBoardElements).not.toHaveBeenCalled();
    expect(node.show).not.toHaveBeenCalled();
  });

  it("does not commit editor when pointerdown lands inside a React context menu", () => {
    const deps = createDeps({
      stage: makeStage(),
    });
    const element = textElement({ text: "hello" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const menu = document.createElement("div");
    menu.dataset.reactContextMenu = "";
    const menuBtn = document.createElement("button");
    menu.appendChild(menuBtn);
    document.body.appendChild(menu);

    menuBtn.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

    expect(controller.isEditing).toBe(true);
    expect(deps.setBoardElements).not.toHaveBeenCalled();
    expect(deps.onHistory).not.toHaveBeenCalled();
  });

  it("keeps an empty text editor open when the DOM pointerdown lands on the canvas over a transformer", () => {
    const transformerTarget = { getClassName: vi.fn(() => "Transformer") };
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const deps = createDeps({
      stage: makeStage({
        setPointersPositions: vi.fn(),
        getPointerPosition: vi.fn(() => ({ x: 100, y: 80 })),
        getIntersection: vi.fn(() => transformerTarget),
      }),
    });
    const element = textElement({ text: "" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    canvas.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

    expect(controller.isEditing).toBe(true);
    expect(deps.stage.setPointersPositions).toHaveBeenCalled();
    expect(deps.stage.getIntersection).toHaveBeenCalledWith({ x: 100, y: 80 });
    expect(deps.setBoardElements).not.toHaveBeenCalled();
    expect(deps.onHistory).not.toHaveBeenCalledWith("已删除空文字");

    deps.transformer.trigger("transformstart.editor");

    expect(controller.isEditing).toBe(true);
    expect(deps.setBoardElements).not.toHaveBeenCalled();
  });

  it("does not let textarea blur commit after pointerdown on a transformer handle", async () => {
    const transformerTarget = { getClassName: vi.fn(() => "Transformer") };
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const deps = createDeps({
      stage: makeStage({
        setPointersPositions: vi.fn(),
        getPointerPosition: vi.fn(() => ({ x: 100, y: 80 })),
        getIntersection: vi.fn(() => transformerTarget),
      }),
    });
    const element = textElement({ text: "hello" });
    const node = makeNode();
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);
    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");

    canvas.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    textarea.dispatchEvent(new FocusEvent("blur"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.isEditing).toBe(true);
    expect(deps.setBoardElements).not.toHaveBeenCalled();
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

  it("cancels a manual editing box resize without creating history", () => {
    let nodeWidth = 200;
    let nodeHeight = 60;
    const deps = createDeps();
    const element = textElement({ editWidth: 200, editHeight: 60 });
    const node = makeNode({
      width: vi.fn(function setWidth(value) {
        if (arguments.length > 0) nodeWidth = value;
        return nodeWidth;
      }),
      height: vi.fn(function setHeight(value) {
        if (arguments.length > 0) nodeHeight = value;
        return nodeHeight;
      }),
    });
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.contentLayer.findOne.mockReturnValue(node);

    const controller = createEditController(deps);
    controller.editElement(element.id);
    nodeWidth = 280;
    nodeHeight = 110;
    deps.transformer.trigger("transform.editor");
    document.querySelector(".text-editor-frame textarea.text-editor").dispatchEvent(kEvent("Escape"));

    expect(deps.setBoardElements).not.toHaveBeenCalled();
    expect(deps.onHistory).not.toHaveBeenCalled();
    expect(deps.onRender).toHaveBeenCalledOnce();
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

  it("does not widen short latex text to the latex default width on commit", () => {
    const deps = createDeps();
    const element = textElement({ text: "", width: 220, height: 35 });
    const node = makeNode({
      width: vi.fn(() => 220),
      height: vi.fn(() => 35),
    });
    deps.findElement.mockReturnValue(element);
    deps.getBoardElements.mockReturnValue([element]);
    deps.getSelectedIds.mockReturnValue([element.id]);
    deps.contentLayer.findOne.mockReturnValue(node);
    deps.measureTextValue = vi.fn((_, value) => String(value).length * 4);

    const controller = createEditController(deps);
    controller.editElement(element.id);

    const textarea = document.querySelector(".text-editor-frame textarea.text-editor");
    textarea.value = "$x$";
    textarea.dispatchEvent(kEvent("Enter"));

    const updatedElements = deps.setBoardElements.mock.calls[0][0];
    const updated = updatedElements.find((el) => el.id === element.id);
    expect(updated.text).toBe("$x$");
    expect(updated.width).toBe(220);
    expect(updated.width).toBeLessThan(520);
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
