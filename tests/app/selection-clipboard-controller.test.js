import { describe, expect, it, vi } from "vitest";
import { createSelectionClipboardController } from "../../src/app/selection/selection-clipboard-controller.js";
import { TOOLS } from "../../src/ui/ui-config.js";

function createClipboardController({ pasted = [] } = {}) {
  let snapshot = [];
  return {
    copy: vi.fn((elements, ids) => {
      snapshot = elements.filter((element) => ids.includes(element.id));
    }),
    createPastedElements: vi.fn(() => pasted),
    hasSnapshot: vi.fn(() => snapshot.length > 0 || pasted.length > 0),
    replaceWithElements: vi.fn((elements) => {
      snapshot = elements;
    }),
  };
}

function createController(initialElements, selectedIds = [], options = {}) {
  let elements = initialElements;
  let currentSelectedIds = selectedIds;
  const clipboardController = options.clipboardController ?? createClipboardController(options);
  const callbacks = {
    clearArrayAlgorithmSessionForRemovedIds: vi.fn(),
    clearSelection: vi.fn(() => { currentSelectedIds = []; }),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    selectIds: vi.fn((ids) => { currentSelectedIds = ids; }),
    setStatus: vi.fn(),
    setTool: vi.fn(),
    updateContextMenuActions: vi.fn(),
  };
  const controller = createSelectionClipboardController({
    clipboardController,
    getElements: () => elements,
    setElements: (nextElements) => { elements = nextElements; },
    getSelectedIds: () => currentSelectedIds,
    getLastPointerWorldPoint: () => options.lastPointerWorldPoint ?? null,
    isElementLocked: options.isElementLocked ?? ((id) => elements.find((element) => element.id === id)?.locked ?? false),
    removeElementsById: (items, ids) => items.filter((element) => !ids.includes(element.id)),
    reorderElements: (items) => items.map((item, index) => ({ ...item, zIndex: index })),
    ...callbacks,
  });
  return {
    callbacks,
    clipboardController,
    controller,
    getElements: () => elements,
    getSelectedIds: () => currentSelectedIds,
  };
}

describe("selection-clipboard-controller", () => {
  it("copies selected elements and refreshes context menu actions", () => {
    const { callbacks, clipboardController, controller } = createController([
      { id: "a" },
      { id: "b" },
    ], ["b"]);

    controller.copySelection();

    expect(clipboardController.copy).toHaveBeenCalledWith([{ id: "a" }, { id: "b" }], ["b"]);
    expect(callbacks.updateContextMenuActions).toHaveBeenCalled();
    expect(callbacks.setStatus).toHaveBeenCalledWith("已复制对象");
  });

  it("cuts only editable selected elements", () => {
    const { callbacks, clipboardController, controller, getElements, getSelectedIds } = createController([
      { id: "a" },
      { id: "b", locked: true },
      { id: "c" },
    ], ["a", "b"]);

    controller.cutSelection();

    expect(clipboardController.copy).toHaveBeenCalledWith(expect.any(Array), ["a"]);
    expect(callbacks.clearArrayAlgorithmSessionForRemovedIds).toHaveBeenCalledWith(["a"]);
    expect(getElements().map((element) => element.id)).toEqual(["b", "c"]);
    expect(getSelectedIds()).toEqual([]);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已剪切对象");
  });

  it("pastes clipboard elements at the last pointer and selects them", () => {
    const pasted = [{ id: "p1" }, { id: "p2" }];
    const { callbacks, clipboardController, controller, getElements, getSelectedIds } = createController([
      { id: "a" },
    ], [], {
      pasted,
      lastPointerWorldPoint: { x: 10, y: 20 },
    });

    controller.pasteClipboard();

    expect(clipboardController.createPastedElements).toHaveBeenCalledWith({
      offset: 24,
      targetPoint: { x: 10, y: 20 },
      zIndexStart: 1,
    });
    expect(clipboardController.replaceWithElements).toHaveBeenCalledWith(pasted);
    expect(getElements().map((element) => element.id)).toEqual(["a", "p1", "p2"]);
    expect(getSelectedIds()).toEqual(["p1", "p2"]);
    expect(callbacks.setTool).toHaveBeenCalledWith(TOOLS.SELECT);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已粘贴对象");
  });

  it("deletes only editable selected elements", () => {
    const { callbacks, controller, getElements, getSelectedIds } = createController([
      { id: "a" },
      { id: "b", locked: true },
    ], ["a", "b"]);

    controller.deleteSelection();

    expect(callbacks.clearArrayAlgorithmSessionForRemovedIds).toHaveBeenCalledWith(["a"]);
    expect(getElements().map((element) => element.id)).toEqual(["b"]);
    expect(getSelectedIds()).toEqual([]);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已删除对象");
  });
});
