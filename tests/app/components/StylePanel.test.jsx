// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@douyinfe/semi-ui", async () => {
  const ReactModule = await import("react");
  const h = ReactModule.createElement;
  const ColorPicker = Object.assign(
    ({ children, popoverProps, width, height }) => h("div", {
      "data-color-picker": "true",
      "data-popover-visible": String(Boolean(popoverProps?.visible)),
      "data-picker-width": String(width ?? ""),
      "data-picker-height": String(height ?? ""),
    }, children),
    { colorStringToValue: (value) => ({ hex: value }) },
  );

  return {
    Button: ({ children, onClick }) => h("button", { onClick }, children),
    Checkbox: ({ children }) => h("label", null, children),
    ColorPicker,
    Input: (props) => h("input", {
      type: props.type,
      value: props.value ?? "",
      onInput: (event) => props.onChange?.(event.currentTarget.value),
    }),
    Select: ({ value }) => h("select", { value, readOnly: true }),
    Slider: ({ value }) => h("input", { type: "range", value, readOnly: true }),
    Switch: ({ checked, onChange }) => h("input", {
      type: "checkbox",
      checked,
      onChange: (event) => onChange?.(event.currentTarget.checked),
    }),
    TextArea: ({ value, onChange }) => h("textarea", {
      value: value ?? "",
      onInput: (event) => onChange?.(event.currentTarget.value),
    }),
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
  it("renders and updates two-dimensional array properties", () => {
    const updateMatrixStructure = vi.fn();
    const host = renderPanel({
      currentTool: "select",
      panelMode: "structure",
      stylePanelTitle: "二维数组",
      structureSelection: "matrix-structure",
      matrixStructure: {
        elementId: "matrix_1",
        input: "A,B\nC,D",
        rows: 2,
        columns: 2,
        indexBase: 0,
        showIndexes: true,
      },
      updateMatrixStructure,
    });

    expect(host.textContent).toContain("2 行 x 2 列");
    expect(host.querySelector("textarea").value).toBe("A,B\nC,D");

    const sizeInputs = host.querySelectorAll('input[type="number"]');
    expect(sizeInputs).toHaveLength(2);

    act(() => {
      host.querySelector("textarea").value = "1,2,3\n4,5,6";
      host.querySelector("textarea").dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      sizeInputs[0].value = "3";
      sizeInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
      sizeInputs[1].value = "4";
      sizeInputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      [...host.querySelectorAll("button")].find((button) => button.textContent === "应用结构").click();
      [...host.querySelectorAll("button")].find((button) => button.textContent === "应用尺寸").click();
      [...host.querySelectorAll("button")].find((button) => button.textContent === "1 下标").click();
      host.querySelector('input[type="checkbox"]').click();
    });

    expect(updateMatrixStructure).toHaveBeenNthCalledWith(1, { input: "1,2,3\n4,5,6" });
    expect(updateMatrixStructure).toHaveBeenNthCalledWith(2, { rows: 3, columns: 4 });
    expect(updateMatrixStructure).toHaveBeenNthCalledWith(3, { indexBase: 1 });
    expect(updateMatrixStructure).toHaveBeenNthCalledWith(4, { showIndexes: false });
  });

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

  it("closes the palette when its trigger is clicked again", () => {
    const host = renderPanel({
      brushColor: "#111827",
      currentTool: "pen",
      panelMode: "brush",
      stylePanelTitle: "画笔",
    });
    const trigger = host.querySelector('[aria-label="颜色调色板"]');
    const picker = trigger?.closest('[data-color-picker="true"]');

    expect(trigger).toBeTruthy();
    expect(picker?.dataset.popoverVisible).toBe("false");

    act(() => trigger.click());
    expect(picker?.dataset.popoverVisible).toBe("true");

    act(() => trigger.click());
    expect(picker?.dataset.popoverVisible).toBe("false");
  });

  it("uses a compact palette area", () => {
    const host = renderPanel({
      brushColor: "#111827",
      currentTool: "pen",
      panelMode: "brush",
      stylePanelTitle: "画笔",
    });
    const picker = host.querySelector('[data-color-picker="true"]');

    expect(picker?.dataset.pickerWidth).toBe("220");
    expect(picker?.dataset.pickerHeight).toBe("180");
  });

});
