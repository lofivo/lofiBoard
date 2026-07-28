// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bridgeState = vi.hoisted(() => ({
  tool: "pen",
  activeShape: "rect",
  commands: null,
}));

vi.mock("../../src/app/whiteboard-app.js", async () => {
  const { createFakeUiState } = await import("./fake-ui-state.js");
  return {
    createWhiteboardApp: vi.fn((root) => {
      const stageContainer = document.createElement("div");
      stageContainer.id = "stage-container";
      root.append(stageContainer);
      root._getContextMenuActionStates = () => ({});
      bridgeState.commands = {
        setTool: vi.fn((tool) => { bridgeState.tool = tool; }),
        runToolAction: vi.fn(),
      };
      return {
        destroy: vi.fn(),
        getUiState: () => createFakeUiState({
          tool: bridgeState.tool,
          activeShape: bridgeState.activeShape,
        }),
        commands: bridgeState.commands,
      };
    }),
  };
});

vi.mock("../../src/app/components/Topbar", () => ({ default: () => null }));
vi.mock("../../src/app/components/StatusBar", () => ({ default: () => null }));
vi.mock("../../src/app/components/StylePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/ContextMenu", () => ({ default: () => null }));
vi.mock("../../src/app/components/LayerPanel", () => ({
  default: () => null,
  LayerPanelToggle: () => null,
}));
vi.mock("../../src/app/components/StructurePanel", async () => {
  const ReactModule = await import("react");
  const { WhiteboardContext } = await import("../../src/app/WhiteboardContext.jsx");
  return {
    default: function StructurePanelProbe() {
      const ctx = ReactModule.useContext(WhiteboardContext);
      return ReactModule.createElement("output", {
        "data-testid": "structure-panel-state",
        "data-visible": String(ctx.structurePanelVisible),
      });
    },
  };
});
vi.mock("../../src/app/components/ToolDock", async () => {
  const ReactModule = await import("react");
  const { WhiteboardContext } = await import("../../src/app/WhiteboardContext.jsx");
  return {
    default: function ToolDockProbe() {
      const ctx = ReactModule.useContext(WhiteboardContext);
      return ReactModule.createElement(ReactModule.Fragment, null,
        ReactModule.createElement("button", {
          "data-testid": "open-shape-popover",
          onClick: () => ctx.setShapePopoverVisible(true),
        }),
        ReactModule.createElement("button", {
          "data-testid": "open-structure-panel",
          onClick: () => {
            ctx.setTool("structure");
            ctx.setStructurePanelVisible(true);
          },
        }),
        ReactModule.createElement("output", {
          "data-testid": "shape-popover-state",
          "data-visible": String(ctx.shapePopoverVisible),
        }),
      );
    },
  };
});

import App from "../../src/app/App.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot;

function renderApp() {
  const host = document.createElement("div");
  document.body.append(host);
  mountedRoot = createRoot(host);
  act(() => mountedRoot.render(<App />));
  return host;
}

beforeEach(() => {
  vi.useFakeTimers();
  bridgeState.tool = "pen";
  bridgeState.activeShape = "rect";
  bridgeState.commands = null;
});

afterEach(() => {
  if (mountedRoot) {
    act(() => mountedRoot.unmount());
    mountedRoot = null;
  }
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("App tool popover bridge", () => {
  it("closes the shape popover when the engine switches tools", () => {
    const host = renderApp();
    act(() => host.querySelector('[data-testid="open-shape-popover"]').click());
    expect(host.querySelector('[data-testid="shape-popover-state"]').dataset.visible).toBe("true");

    bridgeState.tool = "text";
    act(() => vi.advanceTimersByTime(120));

    expect(host.querySelector('[data-testid="shape-popover-state"]').dataset.visible).toBe("false");
  });

  it("closes the more-tools popover when a direct shape shortcut selects another shape", () => {
    bridgeState.tool = "shape";
    bridgeState.activeShape = "coordinate-plane";
    const host = renderApp();
    act(() => vi.advanceTimersByTime(120));
    act(() => host.querySelector('[data-testid="open-shape-popover"]').click());
    expect(host.querySelector('[data-testid="shape-popover-state"]').dataset.visible).toBe("true");

    bridgeState.activeShape = "arrow";
    act(() => vi.advanceTimersByTime(120));

    expect(host.querySelector('[data-testid="shape-popover-state"]').dataset.visible).toBe("false");
  });

  it("closes React tool popovers on Escape and cancels an active structure tool", () => {
    const host = renderApp();
    act(() => host.querySelector('[data-testid="open-shape-popover"]').click());
    act(() => host.querySelector('[data-testid="open-structure-panel"]').click());
    expect(host.querySelector('[data-testid="structure-panel-state"]').dataset.visible).toBe("true");

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));

    expect(host.querySelector('[data-testid="shape-popover-state"]').dataset.visible).toBe("false");
    expect(host.querySelector('[data-testid="structure-panel-state"]').dataset.visible).toBe("false");
    expect(bridgeState.commands.setTool).toHaveBeenLastCalledWith("select");
  });
});
