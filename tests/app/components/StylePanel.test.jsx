// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@douyinfe/semi-ui", async () => {
  const ReactModule = await import("react");
  const h = ReactModule.createElement;
  const ColorPicker = Object.assign(
    ({ children }) => h("div", null, children),
    { colorStringToValue: (value) => ({ hex: value }) },
  );

  return {
    Button: ({ children, onClick }) => h("button", { onClick }, children),
    Checkbox: ({ children }) => h("label", null, children),
    ColorPicker,
    Input: (props) => h("input", { value: props.value ?? "", readOnly: true }),
    Select: ({ value }) => h("select", { value, readOnly: true }),
    Slider: ({ value }) => h("input", { type: "range", value, readOnly: true }),
    Switch: ({ checked }) => h("input", { type: "checkbox", checked, readOnly: true }),
    TextArea: ({ value }) => h("textarea", { value: value ?? "", readOnly: true }),
  };
});

import StylePanel from "../../../src/app/components/StylePanel.jsx";
import { WhiteboardContext } from "../../../src/app/WhiteboardContext.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots = [];

function renderPanel(context) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mountedRoots.push(root);
  act(() => {
    root.render(
      <WhiteboardContext.Provider value={{ stylePanelCollapsed: false, ...context }}>
        <StylePanel />
      </WhiteboardContext.Provider>,
    );
  });
  return host;
}

function getPanelTitle(host) {
  return host.querySelector("aside > div > span")?.textContent.trim();
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = "";
});

describe("StylePanel", () => {
  it.each([
    ["text", "文字"],
    ["sticky", "标签"],
  ])("uses the %s tool name when the engine panel mode is hidden", (currentTool, title) => {
    const host = renderPanel({
      currentTool,
      panelMode: "hidden",
      stylePanelTitle: "属性",
    });

    expect(getPanelTitle(host)).toBe(title);
  });

  it.each([
    ["text", "文字", "文字"],
    ["sticky", "便签", "标签"],
  ])("uses the selected %s element name", (panelMode, stylePanelTitle, title) => {
    const host = renderPanel({
      currentTool: "select",
      panelMode,
      stylePanelTitle,
    });

    expect(getPanelTitle(host)).toBe(title);
  });

  it.each([
    ["rect", "tool"],
    ["ellipse", "tool"],
    ["line", "linear-tool"],
    ["arrow", "linear-tool"],
  ])("does not show the stroke preview frame for the %s tool", (activeShape, panelMode) => {
    const host = renderPanel({
      activeShape,
      currentTool: activeShape,
      panelMode,
      stylePanelTitle: "图形",
    });

    expect(host.querySelector('path[d^="M 14,24"]')).toBeNull();
  });

  it.each([
    ["rect", "element"],
    ["ellipse", "element"],
    ["line", "linear"],
    ["arrow", "linear"],
  ])("does not show the stroke preview frame for a selected %s", (activeShape, panelMode) => {
    const host = renderPanel({
      activeShape,
      currentTool: "select",
      panelMode,
      stylePanelTitle: "图形",
    });

    expect(host.querySelector('path[d^="M 14,24"]')).toBeNull();
  });

  it("keeps the stroke preview frame for the pen tool", () => {
    const host = renderPanel({
      currentTool: "pen",
      panelMode: "brush",
      stylePanelTitle: "画笔",
    });

    expect(host.querySelector('path[d^="M 14,24"]')).not.toBeNull();
  });

});
