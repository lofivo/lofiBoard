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

  it("shows only canvas actions for blank canvas context menus", () => {
    const host = renderMenu({
      contextMenuVisible: true,
      contextMenuScope: "canvas",
      contextMenuPos: { x: 12, y: 24 },
      contextMenuDisabledActions: { paste: false },
    });

    expect(host.textContent).toContain("撤销");
    expect(host.textContent).toContain("重做");
    expect(host.textContent).toContain("粘贴");
    expect(host.textContent).not.toContain("复制");
    expect(host.textContent).not.toContain("删除");
    expect(host.textContent).not.toContain("锁定/解锁");
  });
});
