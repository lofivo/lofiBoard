// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@douyinfe/semi-ui", async () => {
  const ReactModule = await import("react");
  const h = ReactModule.createElement;

  return {
    Button: ({ "aria-label": ariaLabel, "aria-pressed": ariaPressed, icon, onClick, theme, type }) => h(
      "button",
      { "aria-label": ariaLabel, "aria-pressed": ariaPressed, "data-theme": theme, "data-type": type, onClick },
      icon,
    ),
    Card: ({ children }) => h("section", null, children),
    Tooltip: ({ children, content }) => h("span", { "data-tooltip": content }, children),
  };
});

import ToolDock from "../../../src/app/components/ToolDock.jsx";
import { WhiteboardContext } from "../../../src/app/WhiteboardContext.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots = [];

function renderDock(overrides = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mountedRoots.push(root);
  const context = {
    currentTool: "select",
    keepToolActive: false,
    shapePopoverVisible: false,
    toggleKeepToolActive: vi.fn(),
    ...overrides,
  };

  act(() => {
    root.render(
      <WhiteboardContext.Provider value={context}>
        <ToolDock />
      </WhiteboardContext.Provider>,
    );
  });

  return { context, host };
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.innerHTML = "";
});

describe("ToolDock", () => {
  it("renders the placement lock as the leftmost toolbar button", () => {
    const { context, host } = renderDock({ keepToolActive: true });
    const buttons = [...host.querySelectorAll("button")];
    const lockButton = buttons[0];

    expect(lockButton.getAttribute("aria-label")).toBe("绘制后保持所选的工具栏状态 (Q)");
    expect(lockButton.getAttribute("aria-pressed")).toBe("true");
    expect(lockButton.dataset.theme).toBe("solid");
    expect(lockButton.closest("[data-tooltip]").dataset.tooltip).toBe("绘制后保持所选的工具栏状态 (Q)");

    act(() => lockButton.click());
    expect(context.toggleKeepToolActive).toHaveBeenCalledTimes(1);
  });

  it("groups tools by purpose with separators between groups", () => {
    const { host } = renderDock({ currentTool: "shape", activeShape: "line" });
    const toolbar = host.querySelector('[role="toolbar"][aria-label="白板工具"]');
    const items = [...toolbar.querySelectorAll('button, [role="separator"]')].map((item) => (
      item.getAttribute("role") === "separator" ? "separator" : item.getAttribute("aria-label")
    ));

    expect(items).toEqual([
      "绘制后保持所选的工具栏状态 (Q)",
      "separator",
      "选择 (V)",
      "平移 (H)",
      "separator",
      "画笔 (B)",
      "片段橡皮 (E)",
      "对象橡皮 (O)",
      "separator",
      "文字 (T)",
      "便签 (N)",
      "图片",
      "结构 (S)",
      "separator",
      "矩形 (R)",
      "椭圆",
      "直线 (L)",
      "箭头 (A)",
      "更多工具",
    ]);
    expect(toolbar.querySelector('[role="separator"]')?.getAttribute("aria-orientation")).toBe("vertical");
    const icons = [...toolbar.querySelectorAll(".icon-wrapper svg")];
    expect(icons).not.toHaveLength(0);
    expect(icons.every((item) => item.classList.contains("icon"))).toBe(true);
    expect(icons.every((item) => item.style.width === "" && item.style.height === "")).toBe(true);
    expect([...toolbar.querySelectorAll(".icon-wrapper")].every((item) => item.style.transform === "")).toBe(true);
  });

  it("keeps toolbar icons pixel-aligned after adding the separator", () => {
    const { host } = renderDock();
    const toolbar = host.querySelector('[role="toolbar"][aria-label="白板工具"]');
    const separator = toolbar.querySelector('[role="separator"]');

    expect(toolbar.style.transform).toBe("");
    expect(toolbar.style.left).toBe("0px");
    expect(toolbar.style.right).toBe("0px");
    expect(toolbar.style.width).toBe("max-content");
    expect(toolbar.style.margin).toBe("0px auto");
    expect(toolbar.querySelectorAll('[role="separator"]')).toHaveLength(4);
    expect(separator.style.width).toBe("2px");
    expect(separator.style.boxSizing).toBe("border-box");
    expect(separator.style.borderLeftWidth).toBe("1px");
  });

  it("keeps only the coordinate plane inside more tools", () => {
    const { host } = renderDock({
      currentTool: "shape",
      activeShape: "coordinate-plane",
      shapePopoverVisible: true,
      setShapePopoverVisible: vi.fn(),
    });
    const popover = host.querySelector(".shape-popover-grid");

    expect([...popover.querySelectorAll("button")].map((button) => button.textContent.trim())).toEqual(["坐标系"]);
    expect(popover.querySelector(".icon-wrapper svg")?.style.width).toBe("");
  });

  it("selects direct shapes while more tools only opens its menu", () => {
    const selectShape = vi.fn();
    const setTool = vi.fn();
    const setShapePopoverVisible = vi.fn();
    const { host } = renderDock({ selectShape, setTool, setShapePopoverVisible });

    act(() => host.querySelector('[aria-label="箭头 (A)"]').click());
    expect(selectShape).toHaveBeenCalledWith("arrow");

    act(() => host.querySelector('[aria-label="更多工具"]').click());
    expect(setTool).not.toHaveBeenCalled();
    expect(setShapePopoverVisible).toHaveBeenCalledTimes(1);
    expect(setShapePopoverVisible.mock.calls[0][0](false)).toBe(true);
  });

  it("cancels the structure tool when its open panel is toggled closed", () => {
    const setTool = vi.fn();
    const setStructurePanelVisible = vi.fn();
    const { host } = renderDock({
      currentTool: "structure",
      structurePanelVisible: true,
      setTool,
      setStructurePanelVisible,
    });

    act(() => host.querySelector('[aria-label="结构 (S)"]').click());

    expect(setStructurePanelVisible).toHaveBeenCalledWith(false);
    expect(setTool).toHaveBeenCalledWith("select");
  });

  it("highlights more tools and the coordinate plane when that tool is active", () => {
    const { host } = renderDock({
      currentTool: "shape",
      activeShape: "coordinate-plane",
      shapePopoverVisible: true,
      setShapePopoverVisible: vi.fn(),
    });

    expect(host.querySelector('[aria-label="更多工具"]').dataset.theme).toBe("solid");
    expect(host.querySelector(".shape-option-card").classList.contains("active")).toBe(true);
  });
});
