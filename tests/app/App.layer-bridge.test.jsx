// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const layerBridgeState = vi.hoisted(() => ({
  layers: [],
  selectedIds: [],
}));

vi.mock("../../src/app/whiteboard-app.js", () => ({
  createWhiteboardApp: vi.fn((root) => {
    const stageContainer = document.createElement("div");
    stageContainer.id = "stage-container";
    root.append(stageContainer);
    root._getContextMenuActionStates = () => ({});
    root._getLayersData = () => layerBridgeState.layers.map((layer) => ({ ...layer }));
    root._getSelectedIds = () => [...layerBridgeState.selectedIds];
    root._commitActiveTextEditor = vi.fn();
    return { destroy: vi.fn() };
  }),
}));

vi.mock("../../src/app/components/Topbar", () => ({ default: () => null }));
vi.mock("../../src/app/components/ToolDock", () => ({ default: () => null }));
vi.mock("../../src/app/components/StatusBar", () => ({ default: () => null }));
vi.mock("../../src/app/components/StylePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/StructurePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/ContextMenu", () => ({ default: () => null }));
vi.mock("../../src/app/components/LayerPanel", async () => {
  const ReactModule = await import("react");
  const { WhiteboardContext } = await import("../../src/app/WhiteboardContext.jsx");
  return {
    default: function LayerPanelProbe() {
      const ctx = ReactModule.useContext(WhiteboardContext);
      return ReactModule.createElement("div", {
        "data-testid": "layer-probe",
        "data-layers": JSON.stringify(ctx.layers ?? []),
        "data-selected-layer-ids": JSON.stringify(ctx.selectedLayerIds ?? []),
      });
    },
    LayerPanelToggle: () => null,
  };
});

import App from "../../src/app/App.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot;

beforeEach(() => {
  vi.useFakeTimers();
  layerBridgeState.layers = [];
  layerBridgeState.selectedIds = [];
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
    readLayers: () => JSON.parse(host.querySelector('[data-testid="layer-probe"]').dataset.layers),
    readSelectedLayerIds: () => JSON.parse(
      host.querySelector('[data-testid="layer-probe"]').dataset.selectedLayerIds,
    ),
    sync: () => {
      act(() => {
        vi.advanceTimersByTime(120);
      });
    },
  };
}

describe("App layer panel bridge", () => {
  it("refreshes layer lock state when only the locked flag changes", () => {
    layerBridgeState.layers = [
      { id: "rect_1", name: "矩形", level: 0, type: "rect", locked: false, groupId: undefined },
    ];
    const { readLayers, sync } = mountApp();
    sync();
    expect(readLayers()).toMatchObject([{ id: "rect_1", locked: false }]);

    layerBridgeState.layers = [
      { id: "rect_1", name: "矩形", level: 0, type: "rect", locked: true, groupId: undefined },
    ];
    sync();

    expect(readLayers()).toMatchObject([{ id: "rect_1", locked: true }]);
  });

  it("refreshes layer group state when only the groupId changes", () => {
    layerBridgeState.layers = [
      { id: "rect_1", name: "矩形", level: 1, type: "rect", locked: false, groupId: undefined },
      { id: "rect_2", name: "矩形 2", level: 0, type: "rect", locked: false, groupId: undefined },
    ];
    const { readLayers, sync } = mountApp();
    sync();

    layerBridgeState.layers = [
      { id: "rect_1", name: "矩形", level: 1, type: "rect", locked: false, groupId: "group_1" },
      { id: "rect_2", name: "矩形 2", level: 0, type: "rect", locked: false, groupId: "group_1" },
    ];
    sync();

    expect(readLayers()).toMatchObject([
      { id: "rect_1", groupId: "group_1" },
      { id: "rect_2", groupId: "group_1" },
    ]);
  });

  it("refreshes layer order and levels after layer reordering", () => {
    layerBridgeState.layers = [
      { id: "rect_2", name: "矩形 2", level: 1, type: "rect", locked: false, groupId: undefined },
      { id: "rect_1", name: "矩形", level: 0, type: "rect", locked: false, groupId: undefined },
    ];
    const { readLayers, sync } = mountApp();
    sync();
    expect(readLayers().map((layer) => layer.id)).toEqual(["rect_2", "rect_1"]);

    layerBridgeState.layers = [
      { id: "rect_1", name: "矩形", level: 1, type: "rect", locked: false, groupId: undefined },
      { id: "rect_2", name: "矩形 2", level: 0, type: "rect", locked: false, groupId: undefined },
    ];
    sync();

    expect(readLayers()).toMatchObject([
      { id: "rect_1", level: 1 },
      { id: "rect_2", level: 0 },
    ]);
  });

  it("keeps the selected layer ids in sync with the canvas selection", () => {
    layerBridgeState.layers = [
      { id: "rect_1", name: "矩形", level: 0, type: "rect", locked: false, groupId: undefined },
    ];
    const { readSelectedLayerIds, sync } = mountApp();
    sync();
    expect(readSelectedLayerIds()).toEqual([]);

    layerBridgeState.selectedIds = ["rect_1"];
    sync();

    expect(readSelectedLayerIds()).toEqual(["rect_1"]);
  });
});
