// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appDestroyMock = vi.hoisted(() => vi.fn());
const createWhiteboardAppMock = vi.hoisted(() => vi.fn((root) => {
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
  return { destroy: appDestroyMock };
}));

vi.mock("../../src/app/whiteboard-app.js", () => ({
  createWhiteboardApp: createWhiteboardAppMock,
}));

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
    const transparentAtFillInput = [];
    fillInput.addEventListener("input", () => {
      transparentAtFillInput.push(fillTransparentInput.checked);
    });

    act(() => {
      host.querySelector('[data-testid="set-fill"]').click();
    });

    expect(fillInput.value).toBe("#22c55e");
    expect(fillTransparentInput.checked).toBe(false);
    expect(transparentAtFillInput).toEqual([false]);
  });

  it("routes React text style toggles through the legacy text style button", () => {
    const { boldTextStyleButton, host } = mountApp();

    act(() => {
      host.querySelector('[data-testid="toggle-bold"]').click();
    });

    expect(boldTextStyleButton.dataset.clickCount).toBe("1");
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
