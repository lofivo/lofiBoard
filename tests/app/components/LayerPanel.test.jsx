// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import LayerPanel from "../../../src/app/components/LayerPanel.jsx";
import { WhiteboardContext } from "../../../src/app/WhiteboardContext.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots = [];

function renderPanel(value) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <WhiteboardContext.Provider value={value}>
        <LayerPanel />
      </WhiteboardContext.Provider>,
    );
  });

  return host;
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
});

describe("LayerPanel", () => {
  it("opens the object context menu when right-clicking a layer item", () => {
    const openLayerItemContextMenu = vi.fn();
    const selectLayerItem = vi.fn();
    const host = renderPanel({
      layerPanelCollapsed: false,
      layers: [{ id: "rect_1", name: "矩形", type: "rect", level: 0 }],
      selectedLayerIds: [],
      openLayerItemContextMenu,
      selectLayerItem,
    });
    const item = [...host.querySelectorAll("[role='button']")]
      .find((button) => button.textContent.includes("矩形"));
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 120,
    });

    act(() => {
      item.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(openLayerItemContextMenu).toHaveBeenCalledWith("rect_1", {
      clientX: 80,
      clientY: 120,
    });
    expect(selectLayerItem).not.toHaveBeenCalled();
  });

  it("shows locked and grouped layer state", () => {
    const host = renderPanel({
      layerPanelCollapsed: false,
      layers: [{ id: "rect_1", name: "矩形", type: "rect", level: 0, locked: true, groupId: "group_1" }],
      selectedLayerIds: [],
    });
    const item = [...host.querySelectorAll("[role='button']")]
      .find((button) => button.textContent.includes("矩形"));

    expect(item.textContent).toContain("锁");
    expect(item.textContent).toContain("组");
    expect(item.getAttribute("aria-label")).toContain("锁定");
    expect(item.getAttribute("aria-label")).toContain("分组");
  });
});
