import { describe, expect, it, vi } from "vitest";
import { createKeyboardController } from "../../src/app/shell/keyboard-controller.js";
import { TOOLS } from "../../src/ui/ui-config.js";

function createEvent(overrides = {}) {
  return {
    key: "",
    code: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  };
}

function createWindowTarget() {
  const listeners = {};
  return {
    addEventListener: vi.fn((type, listener, options) => {
      listeners[type] = { listener, options };
    }),
    dispatch(type, event) {
      listeners[type]?.listener(event);
    },
    listeners,
  };
}

function createController(overrides = {}) {
  let currentTool = overrides.currentTool ?? TOOLS.PEN;
  let isSpaceDown = false;
  const windowTarget = createWindowTarget();
  const stageContainer = {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  };
  const callbacks = {
    clearNativeSelection: vi.fn(),
    clearSelection: vi.fn(),
    closeMainMenu: vi.fn(),
    copySelection: vi.fn(),
    cutSelection: vi.fn(),
    deleteSelection: vi.fn(),
    hideContextMenu: vi.fn(),
    hideToolCursors: vi.fn(),
    openBoardFile: vi.fn(),
    redoHistory: vi.fn(),
    saveBoardFile: vi.fn(),
    saveBoardFileAs: vi.fn(),
    selectAllElements: vi.fn(),
    setActiveShapeTool: vi.fn(),
    setShapePopoverOpen: vi.fn(),
    setStructurePanelOpen: vi.fn(),
    setTool: vi.fn((tool) => { currentTool = tool; }),
    setZoomMenuOpen: vi.fn(),
    undoHistory: vi.fn(),
    updateDraggableState: vi.fn(),
  };
  const controller = createKeyboardController({
    windowTarget,
    getCurrentTool: () => currentTool,
    getSelectedIds: overrides.getSelectedIds ?? (() => []),
    getIsSpaceDown: () => isSpaceDown,
    setIsSpaceDown: (nextValue) => { isSpaceDown = nextValue; },
    isTypingInEditableControl: overrides.isTypingInEditableControl ?? (() => false),
    shouldSelectAll: overrides.shouldSelectAll ?? ((event) => event.key === "a" && event.ctrlKey),
    shouldUseBrowserSelectAll: overrides.shouldUseBrowserSelectAll ?? (() => false),
    getStageContainer: () => stageContainer,
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    getCurrentTool: () => currentTool,
    getIsSpaceDown: () => isSpaceDown,
    stageContainer,
    windowTarget,
  };
}

describe("keyboard-controller", () => {
  it("binds key events in capture mode and handles whiteboard select-all before editable checks", () => {
    const { callbacks, controller, windowTarget } = createController({
      isTypingInEditableControl: () => true,
    });
    controller.bindKeyboard();
    const event = createEvent({ key: "a", ctrlKey: true });

    windowTarget.dispatch("keydown", event);

    expect(windowTarget.listeners.keydown.options).toEqual({ capture: true });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(callbacks.clearNativeSelection).toHaveBeenCalledTimes(2);
    expect(callbacks.selectAllElements).toHaveBeenCalled();
  });

  it("starts and stops temporary pan mode with space", () => {
    const { callbacks, controller, getIsSpaceDown, stageContainer, windowTarget } = createController();
    controller.bindKeyboard();

    windowTarget.dispatch("keydown", createEvent({ code: "Space" }));
    expect(getIsSpaceDown()).toBe(true);
    expect(stageContainer.classList.add).toHaveBeenCalledWith("is-pan-ready");
    expect(callbacks.hideToolCursors).toHaveBeenCalled();

    windowTarget.dispatch("keyup", createEvent({ code: "Space" }));
    expect(getIsSpaceDown()).toBe(false);
    expect(stageContainer.classList.remove).toHaveBeenCalledWith("is-pan-ready", "is-panning");
    expect(callbacks.updateDraggableState).toHaveBeenCalledTimes(2);
  });

  it("runs file and history shortcuts", () => {
    const { callbacks, controller, windowTarget } = createController();
    controller.bindKeyboard();

    windowTarget.dispatch("keydown", createEvent({ key: "s", ctrlKey: true }));
    windowTarget.dispatch("keydown", createEvent({ key: "s", ctrlKey: true, shiftKey: true }));
    windowTarget.dispatch("keydown", createEvent({ key: "o", ctrlKey: true }));
    windowTarget.dispatch("keydown", createEvent({ key: "z", ctrlKey: true }));
    windowTarget.dispatch("keydown", createEvent({ key: "z", ctrlKey: true, shiftKey: true }));
    windowTarget.dispatch("keydown", createEvent({ key: "y", ctrlKey: true }));

    expect(callbacks.saveBoardFile).toHaveBeenCalled();
    expect(callbacks.saveBoardFileAs).toHaveBeenCalled();
    expect(callbacks.openBoardFile).toHaveBeenCalled();
    expect(callbacks.undoHistory).toHaveBeenCalled();
    expect(callbacks.redoHistory).toHaveBeenCalledTimes(2);
  });

  it("runs selection shortcuts and escape cleanup", () => {
    const { callbacks, controller, windowTarget } = createController({
      currentTool: TOOLS.PEN,
      getSelectedIds: () => ["a"],
    });
    controller.bindKeyboard();

    windowTarget.dispatch("keydown", createEvent({ key: "c", ctrlKey: true }));
    windowTarget.dispatch("keydown", createEvent({ key: "x", ctrlKey: true }));
    windowTarget.dispatch("keydown", createEvent({ key: "Delete" }));
    windowTarget.dispatch("keydown", createEvent({ key: "Escape" }));

    expect(callbacks.copySelection).toHaveBeenCalled();
    expect(callbacks.cutSelection).toHaveBeenCalled();
    expect(callbacks.deleteSelection).toHaveBeenCalled();
    expect(callbacks.closeMainMenu).toHaveBeenCalled();
    expect(callbacks.setShapePopoverOpen).toHaveBeenCalledWith(false);
    expect(callbacks.setStructurePanelOpen).toHaveBeenCalledWith(false);
    expect(callbacks.setZoomMenuOpen).toHaveBeenCalledWith(false);
    expect(callbacks.hideContextMenu).toHaveBeenCalled();
    expect(callbacks.setTool).toHaveBeenCalledWith(TOOLS.SELECT);
  });

  it("maps letter shortcuts to tools and shape variants", () => {
    const { callbacks, controller, windowTarget } = createController();
    controller.bindKeyboard();

    windowTarget.dispatch("keydown", createEvent({ key: "v" }));
    windowTarget.dispatch("keydown", createEvent({ key: "r" }));
    windowTarget.dispatch("keydown", createEvent({ key: "l" }));
    windowTarget.dispatch("keydown", createEvent({ key: "a" }));

    expect(callbacks.setTool).toHaveBeenCalledWith(TOOLS.SELECT);
    expect(callbacks.setActiveShapeTool).toHaveBeenCalledWith(TOOLS.RECT);
    expect(callbacks.setActiveShapeTool).toHaveBeenCalledWith(TOOLS.LINE);
    expect(callbacks.setActiveShapeTool).toHaveBeenCalledWith(TOOLS.ARROW);
    expect(callbacks.setTool).toHaveBeenCalledWith(TOOLS.SHAPE);
  });
});
