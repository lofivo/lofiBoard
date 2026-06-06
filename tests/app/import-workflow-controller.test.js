import { describe, expect, it, vi } from "vitest";
import { createImportWorkflowController } from "../../src/app/import-workflow-controller.js";
import { TOOLS } from "../../src/ui/ui-config.js";

function createEvent(overrides = {}) {
  return {
    target: null,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

function createController(overrides = {}) {
  let lastPointerWorldPoint = overrides.lastPointerWorldPoint ?? null;
  const imageInput = { files: [], value: "selected.png" };
  const stage = {
    width: vi.fn(() => 800),
    height: vi.fn(() => 600),
    x: vi.fn(() => 100),
    y: vi.fn(() => 50),
    scaleX: vi.fn(() => 2),
    setPointersPositions: vi.fn(),
  };
  const callbacks = {
    addElement: vi.fn(),
    selectIds: vi.fn(),
    setTool: vi.fn(),
    pasteClipboard: vi.fn(),
    setStatus: vi.fn(),
  };
  const controller = createImportWorkflowController({
    imageInput,
    stage,
    clipboardController: overrides.clipboardController ?? { hasSnapshot: vi.fn(() => false) },
    getLastPointerWorldPoint: () => lastPointerWorldPoint,
    setLastPointerWorldPoint: (point) => { lastPointerWorldPoint = point; },
    getBoardElementCount: overrides.getBoardElementCount ?? (() => 3),
    measureTextElementValue: vi.fn(() => ({ width: 120, height: 40 })),
    isTypingInEditableControl: overrides.isTypingInEditableControl ?? (() => false),
    readFileAsDataUrl: overrides.readFileAsDataUrl ?? vi.fn(async () => "data:image/png;base64,abc"),
    readImageSize: overrides.readImageSize ?? vi.fn(async () => ({ width: 320, height: 180 })),
    getWorldPointer: overrides.getWorldPointer ?? vi.fn(() => ({ x: 42, y: 84 })),
    createImageElement: overrides.createImageElement ?? vi.fn((options) => ({ id: "image_1", type: "image", ...options })),
    createTextElement: overrides.createTextElement ?? vi.fn((options) => ({ id: "text_1", type: "text", ...options })),
    getImageFileFromPasteEvent: overrides.getImageFileFromPasteEvent ?? vi.fn(() => null),
    getImageFileFromDropEvent: overrides.getImageFileFromDropEvent ?? vi.fn(() => null),
    getTextFromPasteEvent: overrides.getTextFromPasteEvent ?? vi.fn(() => ""),
    getTextFromDropEvent: overrides.getTextFromDropEvent ?? vi.fn(() => ""),
    getImageInsertPoint: overrides.getImageInsertPoint ?? vi.fn(() => ({ x: 300, y: 200 })),
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    imageInput,
    stage,
    getLastPointerWorldPoint: () => lastPointerWorldPoint,
  };
}

describe("import-workflow-controller", () => {
  it("imports the selected toolbar image at the viewport center", async () => {
    const file = { type: "image/png", name: "selected.png" };
    const createImageElement = vi.fn((options) => ({ id: "image_1", type: "image", ...options }));
    const getImageInsertPoint = vi.fn(() => ({ x: 300, y: 200 }));
    const { callbacks, controller, imageInput } = createController({
      createImageElement,
      getImageInsertPoint,
    });
    imageInput.files = [file];

    await controller.importSelectedImage();

    expect(imageInput.value).toBe("");
    expect(getImageInsertPoint).toHaveBeenCalledWith(null, { width: 800, height: 600 }, { x: 100, y: 50, scale: 2 }, { preferViewportCenter: true });
    expect(createImageElement).toHaveBeenCalledWith(expect.objectContaining({
      anchor: "center",
      point: { x: 300, y: 200 },
      width: 320,
      height: 180,
      zIndex: 3,
    }));
    expect(callbacks.addElement).toHaveBeenCalledWith(expect.objectContaining({ id: "image_1" }), "已导入图片");
    expect(callbacks.setTool).toHaveBeenCalledWith(TOOLS.SELECT);
    expect(callbacks.selectIds).toHaveBeenCalledWith(["image_1"]);
  });

  it("pastes plain text as a text element before falling back to clipboard snapshots", async () => {
    const createTextElement = vi.fn((options) => ({ id: "text_1", type: "text", ...options }));
    const { callbacks, controller } = createController({
      lastPointerWorldPoint: { x: 12, y: 18 },
      createTextElement,
      getTextFromPasteEvent: vi.fn(() => "hello"),
      clipboardController: { hasSnapshot: vi.fn(() => true) },
    });
    const event = createEvent();

    await controller.handlePaste(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(createTextElement).toHaveBeenCalledWith(expect.objectContaining({
      point: { x: 12, y: 18 },
      text: "hello",
      zIndex: 3,
    }));
    expect(callbacks.addElement).toHaveBeenCalledWith(expect.objectContaining({ id: "text_1" }), "已粘贴文字");
    expect(callbacks.pasteClipboard).not.toHaveBeenCalled();
  });

  it("drops images at the current world pointer and records that pointer", async () => {
    const file = { type: "image/png", name: "drop.png" };
    const getImageInsertPoint = vi.fn((lastPointer) => lastPointer);
    const { callbacks, controller, getLastPointerWorldPoint, stage } = createController({
      getImageFileFromDropEvent: vi.fn(() => file),
      getWorldPointer: vi.fn(() => ({ x: 44, y: 88 })),
      getImageInsertPoint,
    });
    const event = createEvent();

    await controller.handleImageDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(stage.setPointersPositions).toHaveBeenCalledWith(event);
    expect(getLastPointerWorldPoint()).toEqual({ x: 44, y: 88 });
    expect(getImageInsertPoint).toHaveBeenCalledWith({ x: 44, y: 88 }, expect.any(Object), expect.any(Object), { preferViewportCenter: false });
    expect(callbacks.addElement).toHaveBeenCalledWith(expect.objectContaining({ type: "image", point: { x: 44, y: 88 } }), "已拖入图片");
  });

  it("uses board clipboard when paste has no image or text", async () => {
    const { callbacks, controller } = createController({
      clipboardController: { hasSnapshot: vi.fn(() => true) },
    });
    const event = createEvent();

    await controller.handlePaste(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(callbacks.pasteClipboard).toHaveBeenCalled();
  });
});
