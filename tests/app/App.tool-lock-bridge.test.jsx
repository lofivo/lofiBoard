// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bridgeState = vi.hoisted(() => ({ legacyRoot: null }));

vi.mock("../../src/app/whiteboard-app.js", async () => {
  const { createFakeUiState } = await import("./fake-ui-state.js");
  return { createWhiteboardApp: vi.fn((root) => {
    bridgeState.legacyRoot = root;
    const stageContainer = document.createElement("div");
    stageContainer.id = "stage-container";
    stageContainer.dataset.tool = "pen";
    root.append(stageContainer);
    root.dataset.keepToolActive = "false";
    root._getContextMenuActionStates = () => ({});
    root._getSelectedIds = () => [];
    return {
      destroy: vi.fn(),
      getUiState: () => createFakeUiState({
        keepToolActive: root.dataset.keepToolActive === "true",
      }),
      commands: {
        runToolAction: vi.fn((action) => {
          if (action !== "toggle-tool-lock") return;
          root.dataset.keepToolActive = String(root.dataset.keepToolActive !== "true");
        }),
      },
    };
  }) };
});

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

describe("App 遗留 DOM 隐藏", () => {
  // 隐藏是静态的:遗留容器由 shell 模板一次生成,不会重建。
  // 用 class + CSS 隐藏,不要 MutationObserver —— 画一笔就有几十次 mutation,
  // 每次都跑一遍 querySelector 是纯浪费。
  it("用 class 而不是 MutationObserver 隐藏被 React 取代的遗留容器", () => {
    const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");
    const host = document.createElement("div");
    document.body.append(host);
    mountedRoot = createRoot(host);

    act(() => mountedRoot.render(<App />));

    expect(bridgeState.legacyRoot.classList.contains("legacy-chrome-hidden")).toBe(true);
    expect(observeSpy).not.toHaveBeenCalled();
    observeSpy.mockRestore();
  });
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
