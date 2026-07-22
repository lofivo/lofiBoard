// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bridgeState = vi.hoisted(() => ({ legacyRoot: null }));

vi.mock("../../src/app/whiteboard-app.js", () => ({
  createWhiteboardApp: vi.fn((root) => {
    bridgeState.legacyRoot = root;
    const stageContainer = document.createElement("div");
    stageContainer.id = "stage-container";
    stageContainer.dataset.tool = "pen";
    root.append(stageContainer);
    const lockButton = document.createElement("button");
    lockButton.dataset.toolAction = "toggle-tool-lock";
    lockButton.addEventListener("click", () => {
      root.dataset.keepToolActive = String(root.dataset.keepToolActive !== "true");
    });
    root.dataset.keepToolActive = "false";
    root.append(lockButton);
    root._getContextMenuActionStates = () => ({});
    root._getSelectedIds = () => [];
    return { destroy: vi.fn() };
  }),
}));

vi.mock("../../src/app/components/Topbar", () => ({ default: () => null }));
vi.mock("../../src/app/components/StatusBar", () => ({ default: () => null }));
vi.mock("../../src/app/components/StylePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/StructurePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/ContextMenu", () => ({ default: () => null }));
vi.mock("../../src/app/components/LayerPanel", () => ({ default: () => null, LayerPanelToggle: () => null }));
vi.mock("../../src/app/components/ToolDock", async () => {
  const ReactModule = await import("react");
  const { WhiteboardContext } = await import("../../src/app/WhiteboardContext.jsx");
  return {
    default: function ToolDockProbe() {
      const ctx = ReactModule.useContext(WhiteboardContext);
      return ReactModule.createElement("button", {
        "data-keep-tool-active": String(ctx.keepToolActive),
        "data-testid": "tool-lock-probe",
        onClick: ctx.toggleKeepToolActive,
      });
    },
  };
});

import App from "../../src/app/App.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot;

beforeEach(() => {
  vi.useFakeTimers();
  bridgeState.legacyRoot = null;
});

afterEach(() => {
  if (mountedRoot) {
    act(() => mountedRoot.unmount());
    mountedRoot = null;
  }
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("App placement tool lock bridge", () => {
  it("round-trips the legacy lock state through React context", () => {
    const host = document.createElement("div");
    document.body.append(host);
    mountedRoot = createRoot(host);

    act(() => mountedRoot.render(<App />));
    const probe = host.querySelector('[data-testid="tool-lock-probe"]');
    expect(probe.dataset.keepToolActive).toBe("false");

    act(() => probe.click());
    expect(probe.dataset.keepToolActive).toBe("true");

    bridgeState.legacyRoot.dataset.keepToolActive = "false";
    act(() => vi.advanceTimersByTime(120));
    expect(probe.dataset.keepToolActive).toBe("false");
  });
});
