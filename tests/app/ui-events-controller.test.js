import { describe, expect, it, vi } from "vitest";
import { createUiEventsController } from "../../src/app/shell/ui-events-controller.js";

function createEventTarget() {
  const listeners = {};
  return {
    addEventListener: vi.fn((type, listener, options) => {
      listeners[type] ??= [];
      listeners[type].push({ listener, options });
    }),
    dispatch(type, event, index = 0) {
      listeners[type]?.[index]?.listener(event);
    },
    listeners,
  };
}

function createController(overrides = {}) {
  const windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  const container = createEventTarget();
  container.clientWidth = 800;
  container.clientHeight = 600;
  const stage = {
    width: vi.fn(),
    height: vi.fn(),
  };
  const callbacks = {
    closeMainMenu: vi.fn(),
    handleImageDragOver: vi.fn(),
    handleImageDrop: vi.fn(),
    handlePaste: vi.fn(),
    hideContextMenu: vi.fn(),
    persistCurrentDraft: vi.fn(),
    setShapePopoverOpen: vi.fn(),
    setStructurePanelOpen: vi.fn(),
    setZoomMenuOpen: vi.fn(),
    syncTextOverlays: vi.fn(),
    updateGrid: vi.fn(),
  };
  const state = {
    contextMenuHidden: overrides.contextMenuHidden ?? false,
    mainMenuOpen: overrides.mainMenuOpen ?? true,
    shapePopoverHidden: overrides.shapePopoverHidden ?? false,
    structurePanelHidden: overrides.structurePanelHidden ?? false,
    zoomMenuOpen: overrides.zoomMenuOpen ?? true,
  };
  const controller = createUiEventsController({
    windowTarget,
    documentTarget,
    container,
    stage,
    closestElement: overrides.closestElement ?? (() => null),
    isNativeTextEditingTarget: overrides.isNativeTextEditingTarget ?? (() => false),
    shouldPreventBrowserZoom: overrides.shouldPreventBrowserZoom ?? (() => false),
    isMainMenuOpen: () => state.mainMenuOpen,
    isZoomMenuOpen: () => state.zoomMenuOpen,
    isShapePopoverHidden: () => state.shapePopoverHidden,
    isStructurePanelHidden: () => state.structurePanelHidden,
    isContextMenuHidden: () => state.contextMenuHidden,
    ...callbacks,
  });
  return {
    callbacks,
    container,
    controller,
    documentTarget,
    stage,
    state,
    windowTarget,
  };
}

describe("ui-events-controller", () => {
  it("syncs viewport-sized UI when the window resizes", () => {
    const { callbacks, controller, stage, windowTarget } = createController();
    controller.bindUiEvents();

    windowTarget.dispatch("resize", {});

    expect(stage.width).toHaveBeenCalledWith(800);
    expect(stage.height).toHaveBeenCalledWith(600);
    expect(callbacks.updateGrid).toHaveBeenCalled();
    expect(callbacks.syncTextOverlays).toHaveBeenCalled();
  });

  it("prevents page selection outside native editing targets", () => {
    const { controller, documentTarget } = createController();
    const event = { target: {}, preventDefault: vi.fn() };
    controller.bindUiEvents();

    documentTarget.dispatch("selectstart", event);

    expect(documentTarget.listeners.selectstart[0].options).toEqual({ capture: true });
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("prevents browser zoom when requested by interaction rules", () => {
    const { controller, windowTarget } = createController({
      shouldPreventBrowserZoom: () => true,
    });
    const event = { preventDefault: vi.fn() };
    controller.bindUiEvents();

    windowTarget.dispatch("wheel", event);

    expect(windowTarget.listeners.wheel[0].options).toEqual({ capture: true, passive: false });
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("closes floating panels from outside pointer downs", () => {
    const { callbacks, controller, windowTarget } = createController();
    controller.bindUiEvents();
    const event = { target: {} };

    windowTarget.dispatch("pointerdown", event, 0);
    windowTarget.dispatch("pointerdown", event, 1);
    windowTarget.dispatch("pointerdown", event, 2);
    windowTarget.dispatch("pointerdown", event, 3);
    windowTarget.dispatch("pointerdown", event, 4);

    expect(callbacks.closeMainMenu).toHaveBeenCalled();
    expect(callbacks.setShapePopoverOpen).toHaveBeenCalledWith(false);
    expect(callbacks.setStructurePanelOpen).toHaveBeenCalledWith(false);
    expect(callbacks.setZoomMenuOpen).toHaveBeenCalledWith(false);
    expect(callbacks.hideContextMenu).toHaveBeenCalled();
  });

  it("keeps floating panels open for inside pointer downs", () => {
    const { callbacks, controller, windowTarget } = createController({
      closestElement: () => ({}),
    });
    controller.bindUiEvents();
    const event = { target: {} };

    windowTarget.dispatch("pointerdown", event, 0);
    windowTarget.dispatch("pointerdown", event, 1);
    windowTarget.dispatch("pointerdown", event, 2);
    windowTarget.dispatch("pointerdown", event, 3);
    windowTarget.dispatch("pointerdown", event, 4);

    expect(callbacks.closeMainMenu).not.toHaveBeenCalled();
    expect(callbacks.setShapePopoverOpen).not.toHaveBeenCalled();
    expect(callbacks.setStructurePanelOpen).not.toHaveBeenCalled();
    expect(callbacks.setZoomMenuOpen).not.toHaveBeenCalled();
    expect(callbacks.hideContextMenu).not.toHaveBeenCalled();
  });

  it("binds paste, beforeunload, dragover, and drop handlers", () => {
    const { callbacks, container, controller, windowTarget } = createController();
    controller.bindUiEvents();

    expect(windowTarget.listeners.paste[0].listener).toBe(callbacks.handlePaste);
    expect(windowTarget.listeners.beforeunload[0].listener).toBe(callbacks.persistCurrentDraft);
    expect(container.listeners.dragover[0].listener).toBe(callbacks.handleImageDragOver);
    expect(container.listeners.drop[0].listener).toBe(callbacks.handleImageDrop);
  });
});
