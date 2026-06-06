import { describe, expect, it, vi } from "vitest";
import { createContextMenuDomController } from "../../src/app/context-menu-dom-controller.js";

function createButton(action) {
  return {
    dataset: { contextAction: action },
    disabled: false,
    addEventListener: vi.fn((type, listener) => {
      if (type === "click") {
        createButton.listeners.set(action, listener);
      }
    }),
  };
}

createButton.listeners = new Map();

function createController() {
  createButton.listeners.clear();
  const buttons = [createButton("copy"), createButton("paste")];
  const root = {
    querySelectorAll: vi.fn((selector) => (selector === "[data-context-action]" ? buttons : [])),
  };
  const contextMenu = {
    hidden: true,
    style: {},
    getBoundingClientRect: vi.fn(() => ({ width: 80, height: 40 })),
  };
  const contextMenuController = {
    getPosition: vi.fn(() => ({ left: 12, top: 24 })),
    isActionDisabled: vi.fn((action) => action === "paste"),
  };
  const actions = {
    copy: vi.fn(),
    paste: vi.fn(),
  };
  const controller = createContextMenuDomController({
    root,
    contextMenu,
    contextMenuController,
    getSelectedIds: () => ["rect_1"],
    hasClipboard: () => false,
    getViewport: () => ({ width: 300, height: 200 }),
    actions,
  });
  return {
    actions,
    buttons,
    contextMenu,
    contextMenuController,
    controller,
  };
}

describe("context-menu-dom-controller", () => {
  it("shows the context menu at the controller-computed viewport position", () => {
    const { contextMenu, contextMenuController, controller } = createController();

    controller.showContextMenu(100, 120);

    expect(contextMenu.hidden).toBe(false);
    expect(contextMenuController.getPosition).toHaveBeenCalledWith({
      clientX: 100,
      clientY: 120,
      menuBox: { width: 80, height: 40 },
      viewport: { width: 300, height: 200 },
    });
    expect(contextMenu.style.left).toBe("12px");
    expect(contextMenu.style.top).toBe("24px");
  });

  it("syncs context action disabled states from selection and clipboard state", () => {
    const { buttons, contextMenuController, controller } = createController();

    controller.updateContextMenuActions();

    expect(contextMenuController.isActionDisabled).toHaveBeenCalledWith("copy", {
      selectedIds: ["rect_1"],
      hasClipboard: false,
    });
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
  });

  it("hides the menu and runs the selected context action", () => {
    const { actions, contextMenu, controller } = createController();
    controller.bindContextMenuActions();
    contextMenu.hidden = false;

    createButton.listeners.get("copy")();

    expect(contextMenu.hidden).toBe(true);
    expect(actions.copy).toHaveBeenCalled();
  });

  it("ignores unknown context actions after hiding the menu", () => {
    const { contextMenu, controller } = createController();
    controller.bindContextMenuActions();
    contextMenu.hidden = false;

    controller.runContextAction("missing");

    expect(contextMenu.hidden).toBe(true);
  });
});
