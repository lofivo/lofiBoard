// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { createWebpageOverlayController } from "../../src/services/webpage-overlay-controller.js";

function createHarness(overrides = {}) {
  const state = {
    elements: [{
      id: "webpage_1",
      type: "webpage",
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      src: "example.com/docs",
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    }],
    selectedIds: overrides.selectedIds ?? ["webpage_1"],
    currentTool: overrides.currentTool ?? "select",
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const callbacks = {
    renderBoard: vi.fn(),
    pushHistory: vi.fn(),
    promptValue: vi.fn((_, fallback) => fallback),
    schedulePersistCurrentDraft: vi.fn(),
    selectIds: vi.fn((ids) => { state.selectedIds = ids; }),
    setStatus: vi.fn(),
    setWebpageNodeVisible: vi.fn(),
    syncWebpageNode: vi.fn(),
    ...overrides.callbacks,
  };
  const controller = createWebpageOverlayController({
    container,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getCurrentTool: () => state.currentTool,
    getViewport: () => overrides.viewport ?? { x: 10, y: 20, scale: 2 },
    setElements: (elements) => { state.elements = elements; },
    selectIds: callbacks.selectIds,
    renderBoard: callbacks.renderBoard,
    pushHistory: callbacks.pushHistory,
    promptValue: callbacks.promptValue,
    schedulePersistCurrentDraft: callbacks.schedulePersistCurrentDraft,
    setStatus: callbacks.setStatus,
    setWebpageNodeVisible: callbacks.setWebpageNodeVisible,
    syncWebpageNode: callbacks.syncWebpageNode,
  });
  return { callbacks, container, controller, state };
}

function pointerEvent(type, { clientX = 0, clientY = 0, button = 0 } = {}) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button,
    clientX,
    clientY,
  });
}

describe("webpage-overlay-controller", () => {
  it("renders an iframe in the viewport and exposes selection controls", () => {
    const { container, controller } = createHarness();

    controller.sync();

    const overlay = container.querySelector(".webpage-overlay");
    const iframe = container.querySelector("iframe");
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains("is-interactive")).toBe(true);
    expect(iframe.src).toBe("https://example.com/docs");
    expect(iframe.getAttribute("loading")).toBe("eager");
    expect(overlay.style.left).toBe("30px");
    expect(overlay.style.top).toBe("60px");
    expect(container.querySelector(".webpage-overlay-resize")).toBeTruthy();
    expect(container.querySelectorAll("[data-webpage-resize]")).toHaveLength(8);
  });

  it("moves a selected webpage from its toolbar and records one history entry", () => {
    const { callbacks, container, controller, state } = createHarness();
    controller.sync();
    const chrome = container.querySelector("[data-webpage-drag]");

    chrome.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 120, clientY: 130 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 120, clientY: 130 }));

    expect(state.elements[0]).toMatchObject({ x: 20, y: 35 });
    expect(callbacks.renderBoard).toHaveBeenCalledTimes(1);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已移动网页");
    expect(callbacks.schedulePersistCurrentDraft).toHaveBeenCalledTimes(1);
  });

  it("syncs the canvas placeholder while moving the webpage overlay", () => {
    const { callbacks, container, controller } = createHarness();
    controller.sync();
    const chrome = container.querySelector("[data-webpage-drag]");

    chrome.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 120, clientY: 130 }));

    expect(callbacks.syncWebpageNode).toHaveBeenCalledWith(expect.objectContaining({
      id: "webpage_1",
      x: 20,
      y: 35,
    }));
  });

  it("allows dragging an unselected webpage from its label", () => {
    const { callbacks, container, controller, state } = createHarness({ selectedIds: [] });
    controller.sync();
    const chrome = container.querySelector("[data-webpage-drag]");

    chrome.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 120, clientY: 130 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 120, clientY: 130 }));

    expect(callbacks.selectIds).toHaveBeenCalledWith(["webpage_1"]);
    expect(state.elements[0]).toMatchObject({ x: 20, y: 35 });
  });

  it("edits the webpage URL from the label edit button", () => {
    const { callbacks, container, controller, state } = createHarness({
      selectedIds: [],
      callbacks: {
        promptValue: vi.fn(() => "https://new.example.com/docs"),
      },
    });
    controller.sync();
    const editButton = container.querySelector("[data-webpage-edit]");

    expect(editButton).toBeTruthy();
    editButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(callbacks.promptValue).toHaveBeenCalledWith(
      "请输入新的网页地址（例如 https://example.com）",
      "https://example.com/docs",
    );
    expect(state.elements[0].src).toBe("https://new.example.com/docs");
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已修改网页地址");
    expect(callbacks.schedulePersistCurrentDraft).toHaveBeenCalledTimes(1);
  });

  it("resizes a webpage with a minimum size without adding an error notice", () => {
    const { container, controller, state } = createHarness();
    controller.sync();
    const resizeHandle = container.querySelector("[data-webpage-resize-anchor=\"bottom-right\"]");

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: -400, clientY: -400 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: -400, clientY: -400 }));

    expect(state.elements[0].width).toBe(160);
    expect(state.elements[0].height).toBe(120);

    const iframe = container.querySelector("iframe");
    iframe.dispatchEvent(new Event("error"));
    expect(container.querySelector(".webpage-overlay-error")).toBeNull();
    expect(container.querySelector(".webpage-overlay-open")).toBeTruthy();
  });

  it("resizes from the top-left border and moves the opposite edge", () => {
    const { container, controller, state } = createHarness();
    controller.sync();
    const resizeHandle = container.querySelector("[data-webpage-resize-anchor=\"top-left\"]");

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 50, clientY: 60 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 50, clientY: 60 }));

    expect(state.elements[0]).toMatchObject({ x: -15, y: 0, width: 325, height: 220 });
  });

  it("disables iframe pointer events outside the select tool", () => {
    const { container, controller } = createHarness({ currentTool: "laser" });

    controller.sync();

    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-laser-mode")).toBe(true);
    expect(container.querySelector(".webpage-overlay").classList.contains("is-interactive")).toBe(false);
    expect(container.querySelector("iframe").style.pointerEvents).toBe("none");
  });

  it("routes pointer input to iframe content without raising the webpage visually", () => {
    const { callbacks, container, controller } = createHarness({ selectedIds: [] });

    controller.sync();

    const layer = container.querySelector(".webpage-overlay-layer");
    const wrapper = container.querySelector(".webpage-overlay");
    const iframe = container.querySelector("iframe");
    wrapper.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
    });
    expect(layer.classList.contains("is-page-interaction-mode")).toBe(false);
    expect(wrapper.style.pointerEvents).toBe("auto");
    expect(iframe.style.pointerEvents).toBe("auto");
    container.dispatchEvent(pointerEvent("pointermove", { clientX: 100, clientY: 100 }));
    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(true);
    expect(callbacks.selectIds).not.toHaveBeenCalled();
  });

  it("clears iframe pointer routing when the webpage is removed", () => {
    const { container, controller, state } = createHarness({ selectedIds: [] });

    controller.sync();
    const wrapper = container.querySelector(".webpage-overlay");
    wrapper.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
    });
    container.dispatchEvent(pointerEvent("pointermove", { clientX: 100, clientY: 100 }));
    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(true);

    state.elements = [];
    controller.sync();

    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(false);
  });

  it("places the canvas above webpage overlays while using the pen", () => {
    const { callbacks, container, controller } = createHarness({ currentTool: "pen" });

    controller.sync();

    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-canvas-above-webpage")).toBe(true);
    expect(container.classList.contains("is-canvas-above-webpage")).toBe(true);
    expect(callbacks.setWebpageNodeVisible).toHaveBeenCalledWith("webpage_1", false);
  });

  it("keeps the iframe visible while other canvas tools are active", () => {
    const { callbacks, container, controller } = createHarness({ currentTool: "rect" });

    controller.sync();

    expect(container.querySelector("iframe")).toBeTruthy();
    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-canvas-above-webpage")).toBe(true);
    expect(callbacks.setWebpageNodeVisible).toHaveBeenCalledWith("webpage_1", false);
  });

  it("keeps the canvas above the webpage after returning to the select tool", () => {
    const { callbacks, container, controller, state } = createHarness({ currentTool: "pen" });

    controller.sync();
    state.currentTool = "select";
    controller.sync();

    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-canvas-above-webpage")).toBe(true);
    expect(callbacks.setWebpageNodeVisible).toHaveBeenLastCalledWith("webpage_1", false);
  });
});
