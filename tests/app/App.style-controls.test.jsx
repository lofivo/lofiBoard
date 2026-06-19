// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createWhiteboardAppMock = vi.hoisted(() => vi.fn((root) => {
  const fillInput = document.createElement("input");
  fillInput.dataset.control = "fill";
  fillInput.type = "color";
  fillInput.value = "#ffffff";

  const fillTransparentInput = document.createElement("input");
  fillTransparentInput.dataset.control = "fill-transparent";
  fillTransparentInput.type = "checkbox";
  fillTransparentInput.checked = true;

  const stageContainer = document.createElement("div");
  stageContainer.id = "stage-container";

  root.append(fillInput, fillTransparentInput, stageContainer);
  root._getContextMenuActionStates = () => ({});
  root._getLayersData = () => [];
  root._getSelectedIds = () => [];
  root._commitActiveTextEditor = vi.fn();
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
      );
    },
  };
});

import App from "../../src/app/App.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot;

beforeEach(() => {
  vi.useFakeTimers();
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
    fillInput: host.querySelector('[data-control="fill"]'),
    fillTransparentInput: host.querySelector('[data-control="fill-transparent"]'),
    probe: () => host.querySelector('[data-testid="style-probe"]'),
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
});
