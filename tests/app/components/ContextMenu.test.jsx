// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@douyinfe/semi-ui", async () => {
  const ReactModule = await import("react");
  const h = ReactModule.createElement;

  return {
    Dropdown: {
      Menu: ({ children, ...props }) => h("ul", { role: "menu", ...props }, children),
      Item: ({
        children,
        disabled,
        icon,
        onClick,
        onContextMenu,
        onMouseEnter,
        onMouseLeave,
        onMouseDown,
        onMouseDownCapture,
        onPointerDown,
        onPointerDownCapture,
        ...props
      }) => h(
        "li",
        {
          role: "menuitem",
          "aria-disabled": disabled ? "true" : "false",
          onClick: disabled ? undefined : onClick,
          onContextMenu: disabled ? undefined : onContextMenu,
          onMouseEnter: disabled ? undefined : onMouseEnter,
          onMouseLeave: disabled ? undefined : onMouseLeave,
          ...props,
        },
        icon,
        children,
      ),
    },
  };
});

import ContextMenu from "../../../src/app/components/ContextMenu.jsx";
import { WhiteboardContext } from "../../../src/app/WhiteboardContext.jsx";
import { runInputContextAction } from "../../../src/app/context-menu/controller.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots = [];

function renderMenu(value) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <WhiteboardContext.Provider value={value}>
        <ContextMenu />
      </WhiteboardContext.Provider>,
    );
  });

  return host;
}

function menuItems(host) {
  return [...host.querySelectorAll("[role='menuitem']")];
}

function findMenuItem(host, label) {
  return menuItems(host).find((item) => item.textContent.includes(label));
}

function isMenuItemDisabled(item) {
  return Boolean(item.disabled) || item.getAttribute("aria-disabled") === "true";
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
});

describe("ContextMenu", () => {
  it("renders object actions with undo and redo disabled states", () => {
    const host = renderMenu({
      contextMenuVisible: true,
      contextMenuMode: "object",
      contextMenuPos: { x: 12, y: 24 },
      contextMenuDisabledActions: { undo: true, redo: false, copy: true },
    });

    expect(host.textContent).toContain("撤销");
    expect(host.textContent).toContain("重做");
    expect(host.textContent.indexOf("撤销")).toBeLessThan(host.textContent.indexOf("复制"));
    expect(isMenuItemDisabled(findMenuItem(host, "撤销"))).toBe(true);
    expect(isMenuItemDisabled(findMenuItem(host, "重做"))).toBe(false);
    expect(isMenuItemDisabled(findMenuItem(host, "复制"))).toBe(true);
  });

  it("renders input actions instead of object actions for focused text editing", () => {
    const runInputContextAction = vi.fn();
    const host = renderMenu({
      contextMenuVisible: true,
      contextMenuMode: "input",
      contextMenuPos: { x: 12, y: 24 },
      inputContextMenuDisabledActions: { "select-all": true, copy: false, cut: false, paste: false },
      runInputContextAction,
    });

    expect(host.textContent).toContain("全选");
    expect(host.textContent).toContain("复制");
    expect(host.textContent).toContain("剪切");
    expect(host.textContent).toContain("粘贴");
    expect(host.textContent).not.toContain("撤销");
    expect(isMenuItemDisabled(findMenuItem(host, "全选"))).toBe(true);

    act(() => {
      findMenuItem(host, "复制").click();
    });

    expect(runInputContextAction).toHaveBeenCalledWith("copy");
  });

  it("prevents menu pointer defaults before input actions so the editor does not blur", () => {
    const input = document.createElement("textarea");
    const blur = vi.fn();
    input.value = "hello";
    document.body.append(input);
    input.focus();
    input.addEventListener("blur", blur);
    const host = renderMenu({
      contextMenuVisible: true,
      contextMenuMode: "input",
      contextMenuPos: { x: 12, y: 24 },
      inputContextMenuDisabledActions: { "select-all": false, copy: false, cut: false, paste: false },
      runInputContextAction: vi.fn(),
    });
    const selectAllButton = findMenuItem(host, "全选");

    const pointerDown = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
    act(() => {
      selectAllButton.dispatchEvent(pointerDown);
    });
    if (!pointerDown.defaultPrevented) input.blur();

    expect(pointerDown.defaultPrevented).toBe(true);
    expect(blur).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it("runs input actions from pointer down because preventing the default can suppress click", async () => {
    const runInputContextAction = vi.fn();
    const hideContextMenu = vi.fn();
    const host = renderMenu({
      contextMenuVisible: true,
      contextMenuMode: "input",
      contextMenuPos: { x: 12, y: 24 },
      inputContextMenuDisabledActions: { "select-all": false, copy: false, cut: false, paste: false },
      runInputContextAction,
      hideContextMenu,
    });
    const pasteButton = findMenuItem(host, "粘贴");
    const pointerDown = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });

    await act(async () => {
      pasteButton.dispatchEvent(pointerDown);
    });

    expect(pointerDown.defaultPrevented).toBe(true);
    expect(runInputContextAction).toHaveBeenCalledWith("paste");
    expect(hideContextMenu).toHaveBeenCalled();
  });

  it("applies select all, copy, and paste actions to the focused text input", async () => {
    const input = document.createElement("textarea");
    const writes = [];
    const clipboard = {
      readText: vi.fn(async () => " pasted"),
      writeText: vi.fn(async (value) => {
        writes.push(value);
      }),
    };
    input.value = "hello";
    input.setSelectionRange(1, 4);
    document.body.append(input);
    input.focus();
    const host = renderMenu({
      contextMenuVisible: true,
      contextMenuMode: "input",
      contextMenuPos: { x: 12, y: 24 },
      inputContextMenuDisabledActions: { "select-all": false, copy: false, cut: false, paste: false },
      runInputContextAction: (action) => runInputContextAction(action, input, { clipboard }),
      hideContextMenu: vi.fn(),
    });

    await act(async () => {
      findMenuItem(host, "全选").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(5);

    await act(async () => {
      findMenuItem(host, "复制").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    expect(writes).toEqual(["hello"]);

    input.setSelectionRange(5, 5);
    await act(async () => {
      findMenuItem(host, "粘贴").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe("hello pasted");
  });

  it("applies cut and paste button actions through the local text clipboard fallback", async () => {
    const input = document.createElement("textarea");
    const localClipboard = { text: "" };
    const clipboard = {
      readText: vi.fn(async () => { throw new Error("denied"); }),
      writeText: vi.fn(async () => { throw new Error("denied"); }),
    };
    const documentTarget = { execCommand: vi.fn(() => false) };
    input.value = "hello";
    input.setSelectionRange(1, 4);
    document.body.append(input);
    input.focus();
    const host = renderMenu({
      contextMenuVisible: true,
      contextMenuMode: "input",
      contextMenuPos: { x: 12, y: 24 },
      inputContextMenuDisabledActions: { "select-all": false, copy: false, cut: false, paste: false },
      runInputContextAction: (action) => runInputContextAction(action, input, {
        clipboard,
        documentTarget,
        localClipboard,
      }),
      hideContextMenu: vi.fn(),
    });

    await act(async () => {
      findMenuItem(host, "剪切").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe("ho");
    expect(localClipboard.text).toBe("ell");

    input.setSelectionRange(2, 2);
    await act(async () => {
      findMenuItem(host, "粘贴").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe("hoell");
  });
});
