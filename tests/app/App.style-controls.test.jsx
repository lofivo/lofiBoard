// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appDestroyMock = vi.hoisted(() => vi.fn());
const uiStateHelper = vi.hoisted(() => ({ createFakeUiState: null }));
const toggleTextStyleMock = vi.hoisted(() => vi.fn());
const propertyWrites = vi.hoisted(() => []);
const createWhiteboardAppMock = vi.hoisted(() => vi.fn((root) => {
  const uiStateListeners = new Set();
  // 保留这批 fake input：测试用它们模拟“引擎属性变化”，getUiState 从中组装。
  const colorInput = document.createElement("input");
  colorInput.dataset.control = "color";
  colorInput.type = "color";
  colorInput.value = "#111827";

  const widthInput = document.createElement("input");
  widthInput.dataset.control = "width";
  widthInput.type = "range";
  widthInput.value = "6";

  const fillInput = document.createElement("input");
  fillInput.dataset.control = "fill";
  fillInput.type = "color";
  fillInput.value = "#ffffff";

  const fillTransparentInput = document.createElement("input");
  fillTransparentInput.dataset.control = "fill-transparent";
  fillTransparentInput.type = "checkbox";
  fillTransparentInput.checked = true;

  const fontFamilyInput = document.createElement("input");
  fontFamilyInput.dataset.control = "font-family";
  fontFamilyInput.value = "Inter, system-ui, sans-serif";

  const fontSizeInput = document.createElement("input");
  fontSizeInput.dataset.control = "font-size";
  fontSizeInput.type = "range";
  fontSizeInput.value = "28";

  const coordinateUnitSizeInput = document.createElement("input");
  coordinateUnitSizeInput.dataset.control = "coordinate-unit-size";
  coordinateUnitSizeInput.type = "range";
  coordinateUnitSizeInput.value = "40";

  const coordinateShowGridInput = document.createElement("input");
  coordinateShowGridInput.dataset.control = "coordinate-show-grid";
  coordinateShowGridInput.type = "checkbox";
  coordinateShowGridInput.checked = true;

  const coordinateGridColorInput = document.createElement("input");
  coordinateGridColorInput.dataset.control = "coordinate-grid-color";
  coordinateGridColorInput.type = "color";
  coordinateGridColorInput.value = "#e5e7eb";

  const coordinateAxisColorInput = document.createElement("input");
  coordinateAxisColorInput.dataset.control = "coordinate-axis-color";
  coordinateAxisColorInput.type = "color";
  coordinateAxisColorInput.value = "#111827";

  const coordinateLabelColorInput = document.createElement("input");
  coordinateLabelColorInput.dataset.control = "coordinate-label-color";
  coordinateLabelColorInput.type = "color";
  coordinateLabelColorInput.value = "#64748b";

  const boldTextStyleButton = document.createElement("button");
  boldTextStyleButton.type = "button";
  boldTextStyleButton.dataset.textStyle = "bold";
  boldTextStyleButton.addEventListener("click", () => {
    boldTextStyleButton.dataset.clickCount = String(Number(boldTextStyleButton.dataset.clickCount || "0") + 1);
  });

  const stageContainer = document.createElement("div");
  stageContainer.id = "stage-container";

  root.append(
    colorInput,
    widthInput,
    fillInput,
    fillTransparentInput,
    fontFamilyInput,
    fontSizeInput,
    coordinateUnitSizeInput,
    coordinateShowGridInput,
    coordinateGridColorInput,
    coordinateAxisColorInput,
    coordinateLabelColorInput,
    boldTextStyleButton,
    stageContainer,
  );
  root._getContextMenuActionStates = () => ({});
  root._getLayersData = () => [];
  root._getSelectedIds = () => [];
  root._commitActiveTextEditor = vi.fn();
  root._emitUiStateChange = () => uiStateListeners.forEach((listener) => listener());

  // 引擎的 setProperty 直接写主控件并跑副作用,不再派发合成事件。
  const masters = {
    color: colorInput,
    width: widthInput,
    fill: fillInput,
    "fill-transparent": fillTransparentInput,
    "font-family": fontFamilyInput,
    "font-size": fontSizeInput,
    "coordinate-unit-size": coordinateUnitSizeInput,
    "coordinate-show-grid": coordinateShowGridInput,
    "coordinate-grid-color": coordinateGridColorInput,
    "coordinate-axis-color": coordinateAxisColorInput,
    "coordinate-label-color": coordinateLabelColorInput,
  };
  propertyWrites.length = 0;
  return {
    destroy: appDestroyMock,
    subscribeUiState: (listener) => {
      uiStateListeners.add(listener);
      return () => uiStateListeners.delete(listener);
    },
    getUiState: () => uiStateHelper.createFakeUiState({
      graphDirected: root.dataset.graphDirected === "true",
      properties: {
        ...uiStateHelper.createFakeUiState().properties,
        color: colorInput.value,
        width: widthInput.value,
        fill: fillInput.value,
        fillTransparent: fillTransparentInput.checked,
        fontFamily: fontFamilyInput.value,
        fontSize: fontSizeInput.value,
        coordinateUnitSize: coordinateUnitSizeInput.value,
        coordinateShowGrid: coordinateShowGridInput.checked,
        coordinateGridColor: coordinateGridColorInput.value,
        coordinateAxisColor: coordinateAxisColorInput.value,
        coordinateLabelColor: coordinateLabelColorInput.value,
      },
    }),
    commands: {
      setProperty: vi.fn((name, value, { checked, silent = false } = {}) => {
        const input = masters[name];
        if (!input) return;
        if (input.type === "checkbox") input.checked = Boolean(checked ?? value);
        else input.value = String(value);
        propertyWrites.push({ name, value, checked, silent });
      }),
      toggleTextStyle: toggleTextStyleMock,
    },
  };
}));

vi.mock("../../src/app/whiteboard-app.js", async () => {
  uiStateHelper.createFakeUiState = (await import("./fake-ui-state.js")).createFakeUiState;
  return { createWhiteboardApp: createWhiteboardAppMock };
});

vi.mock("../../src/app/components/Topbar", () => ({ default: () => null }));
vi.mock("../../src/app/components/ToolDock", () => ({ default: () => null }));
vi.mock("../../src/app/components/StatusBar", () => ({ default: () => null }));
vi.mock("../../src/app/components/StructurePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/ContextMenu", () => ({ default: () => null }));
vi.mock("../../src/app/components/LayerPanel", () => ({
  default: () => null,
  LayerPanelToggle: () => null,
}));
vi.mock("../../src/app/components/StylePanel", async () => {
  const ReactModule = await import("react");
  const { WhiteboardContext } = await import("../../src/app/WhiteboardContext.jsx");
  return {
    default: function StylePanelProbe() {
      const ctx = ReactModule.useContext(WhiteboardContext);
      return ReactModule.createElement(
        "div",
        {
          "data-testid": "style-probe",
          "data-fill-color": ctx.fillColor,
          "data-fill-transparent": String(ctx.fillTransparent),
          "data-brush-color": ctx.brushColor,
          "data-brush-width": String(ctx.brushWidth),
          "data-text-color": ctx.textColor,
          "data-font-size": String(ctx.fontSize),
          "data-font-family": ctx.fontFamily,
          "data-sticky-bg-color": ctx.stickyBgColor,
          "data-sticky-text-color": ctx.stickyTextColor,
          "data-coordinate-unit-size": String(ctx.coordinateUnitSize),
          "data-coordinate-show-grid": String(ctx.coordinateShowGrid),
          "data-coordinate-grid-color": ctx.coordinateGridColor,
          "data-graph-directed": String(ctx.graphDirected),
        },
        ReactModule.createElement(
          "button",
          {
            type: "button",
            "data-testid": "set-fill",
            onClick: () => ctx.setFillColor?.("#22c55e"),
          },
          "set fill",
        ),
        ReactModule.createElement(
          "button",
          {
            type: "button",
            "data-testid": "toggle-bold",
            onClick: () => ctx.setTextStyle?.("bold"),
          },
          "toggle bold",
        ),
        ReactModule.createElement(
          "button",
          {
            type: "button",
            "data-testid": "set-sticky-style",
            onClick: () => {
              ctx.setStickyBgColor?.("#bbf7d0");
              ctx.setStickyTextColor?.("#2563eb");
              ctx.setStickyFontFamily?.("Georgia, serif");
              ctx.setStickyFontSize?.(30);
            },
          },
          "set sticky style",
        ),
        ReactModule.createElement(
          "button",
          {
            type: "button",
            "data-testid": "set-coordinate-colors",
            onClick: () => {
              ctx.setCoordinateGridColor?.("#94a3b8");
              ctx.setCoordinateAxisColor?.("#0f172a");
              ctx.setCoordinateLabelColor?.("#475569");
            },
          },
          "set coordinate colors",
        ),
      );
    },
  };
});

import App from "../../src/app/App.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot;

beforeEach(() => {
  vi.useFakeTimers();
  appDestroyMock.mockClear();
  createWhiteboardAppMock.mockClear();
});

afterEach(() => {
  if (mountedRoot) {
    act(() => {
      mountedRoot.unmount();
    });
    mountedRoot = null;
  }
  vi.useRealTimers();
  document.body.innerHTML = "";
});

function mountApp() {
  const host = document.createElement("div");
  document.body.append(host);
  mountedRoot = createRoot(host);
  act(() => {
    mountedRoot.render(React.createElement(App));
  });
  return {
    host,
    boldTextStyleButton: host.querySelector('[data-text-style="bold"]'),
    colorInput: host.querySelector('[data-control="color"]'),
    widthInput: host.querySelector('[data-control="width"]'),
    fillInput: host.querySelector('[data-control="fill"]'),
    fillTransparentInput: host.querySelector('[data-control="fill-transparent"]'),
    fontFamilyInput: host.querySelector('[data-control="font-family"]'),
    fontSizeInput: host.querySelector('[data-control="font-size"]'),
    coordinateUnitSizeInput: host.querySelector('[data-control="coordinate-unit-size"]'),
    coordinateShowGridInput: host.querySelector('[data-control="coordinate-show-grid"]'),
    coordinateGridColorInput: host.querySelector('[data-control="coordinate-grid-color"]'),
    coordinateAxisColorInput: host.querySelector('[data-control="coordinate-axis-color"]'),
    coordinateLabelColorInput: host.querySelector('[data-control="coordinate-label-color"]'),
    probe: () => host.querySelector('[data-testid="style-probe"]'),
    legacyRoot: host.querySelector("#stage-container").parentElement,
  };
}

describe("App style control bridge", () => {
  it("syncs selected shape fill controls from the legacy property inputs", () => {
    const { fillInput, fillTransparentInput, probe } = mountApp();

    fillInput.value = "#fef08a";
    fillTransparentInput.checked = false;
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(probe().dataset.fillColor).toBe("#fef08a");
    expect(probe().dataset.fillTransparent).toBe("false");
  });

  it("syncs React style state from legacy master property inputs", () => {
    const {
      colorInput,
      coordinateGridColorInput,
      coordinateShowGridInput,
      coordinateUnitSizeInput,
      fontFamilyInput,
      fontSizeInput,
      probe,
      widthInput,
    } = mountApp();

    colorInput.value = "#2563eb";
    widthInput.value = "14";
    fontFamilyInput.value = "Georgia, serif";
    fontSizeInput.value = "36";
    coordinateUnitSizeInput.value = "64";
    coordinateShowGridInput.checked = false;
    coordinateGridColorInput.value = "#94a3b8";
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(probe().dataset.brushColor).toBe("#2563eb");
    expect(probe().dataset.brushWidth).toBe("14");
    expect(probe().dataset.textColor).toBe("#2563eb");
    expect(probe().dataset.fontFamily).toBe("Georgia, serif");
    expect(probe().dataset.fontSize).toBe("36");
    expect(probe().dataset.stickyTextColor).toBe("#2563eb");
    expect(probe().dataset.coordinateUnitSize).toBe("64");
    expect(probe().dataset.coordinateShowGrid).toBe("false");
    expect(probe().dataset.coordinateGridColor).toBe("#94a3b8");
  });

  it("syncs preview font size on the next frame instead of waiting for the polling interval", () => {
    const { fontSizeInput, legacyRoot, probe } = mountApp();

    fontSizeInput.value = "42";
    act(() => {
      legacyRoot._emitUiStateChange();
      vi.advanceTimersByTime(16);
    });

    expect(probe().dataset.fontSize).toBe("42");
  });

  it("syncs graph directed state from the legacy root dataset", () => {
    const { legacyRoot, probe } = mountApp();

    legacyRoot.dataset.graphDirected = "true";
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(probe().dataset.graphDirected).toBe("true");

    legacyRoot.dataset.graphDirected = "false";
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(probe().dataset.graphDirected).toBe("false");
  });

  it("clears transparent fill before applying a React fill color change", () => {
    const { fillInput, fillTransparentInput, host } = mountApp();

    act(() => {
      host.querySelector('[data-testid="set-fill"]').click();
    });

    expect(fillInput.value).toBe("#22c55e");
    expect(fillTransparentInput.checked).toBe(false);
    // 顺序要紧:先静默清掉透明填充,再写颜色,否则颜色会被透明态覆盖
    expect(propertyWrites.map(({ name, silent }) => [name, silent])).toEqual([
      ["fill-transparent", true],
      ["fill", false],
    ]);
  });

  it("routes React text style toggles through the engine command", () => {
    const { host } = mountApp();

    act(() => {
      host.querySelector('[data-testid="toggle-bold"]').click();
    });

    expect(toggleTextStyleMock).toHaveBeenCalledWith("bold");
  });

  it("syncs React sticky style controls to the legacy property inputs", () => {
    const { colorInput, fillInput, fillTransparentInput, fontFamilyInput, fontSizeInput, host } = mountApp();

    act(() => {
      host.querySelector('[data-testid="set-sticky-style"]').click();
    });

    expect(fillInput.value).toBe("#bbf7d0");
    expect(fillTransparentInput.checked).toBe(false);
    expect(colorInput.value).toBe("#2563eb");
    expect(fontFamilyInput.value).toBe("Georgia, serif");
    expect(fontSizeInput.value).toBe("30");
  });

  it("syncs React coordinate color controls to the legacy property inputs", () => {
    const {
      coordinateAxisColorInput,
      coordinateGridColorInput,
      coordinateLabelColorInput,
      host,
    } = mountApp();

    act(() => {
      host.querySelector('[data-testid="set-coordinate-colors"]').click();
    });

    expect(coordinateGridColorInput.value).toBe("#94a3b8");
    expect(coordinateAxisColorInput.value).toBe("#0f172a");
    expect(coordinateLabelColorInput.value).toBe("#475569");
  });

  it("destroys the legacy whiteboard app when React unmounts", () => {
    mountApp();

    act(() => {
      mountedRoot.unmount();
    });
    mountedRoot = null;

    expect(appDestroyMock).toHaveBeenCalledTimes(1);
  });
});
