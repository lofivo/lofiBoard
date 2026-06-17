// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/app/whiteboard-app.js", () => ({
  createWhiteboardApp: vi.fn((root) => {
    const stageContainer = document.createElement("div");
    stageContainer.id = "stage-container";
    root.append(stageContainer);
    root._getContextMenuActionStates = () => ({});
    root._commitActiveTextEditor = vi.fn();
  }),
}));

vi.mock("../../src/app/components/Topbar", () => ({ default: () => null }));
vi.mock("../../src/app/components/ToolDock", () => ({ default: () => null }));
vi.mock("../../src/app/components/StatusBar", () => ({ default: () => null }));
vi.mock("../../src/app/components/StylePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/StructurePanel", () => ({ default: () => null }));
vi.mock("../../src/app/components/ContextMenu", () => ({ default: () => null }));
vi.mock("../../src/app/components/LayerPanel", () => ({
  default: () => null,
  LayerPanelToggle: () => null,
}));

import App from "../../src/app/App.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot;

afterEach(() => {
  if (mountedRoot) {
    act(() => {
      mountedRoot.unmount();
    });
    mountedRoot = null;
  }
  document.body.innerHTML = "";
});

describe("App context menu routing", () => {
  it("leaves editable controls on the browser native context menu", () => {
    const host = document.createElement("div");
    document.body.append(host);
    mountedRoot = createRoot(host);

    act(() => {
      mountedRoot.render(<App />);
    });

    const input = document.createElement("textarea");
    input.value = "editing text";
    host.querySelector(".app-shell").append(input);
    expect(document.activeElement).not.toBe(input);

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 50,
    });
    act(() => {
      input.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
  });
});
