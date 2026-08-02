// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { createWebpageOverlayController } from "../../src/services/webpage-overlay-controller.js";

function createHarness(overrides = {}) {
  const state = {
    elements: overrides.elements ?? [{
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
    isCanvasInteractionActive: overrides.isCanvasInteractionActive ?? (() => false),
    getCanvasInteractionAtClientPoint: overrides.getCanvasInteractionAtClientPoint ?? (() => null),
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
    expect(iframe.style.top).toBe("60px");
    expect(iframe.style.height).toBe("calc(100% - 60px)");
    expect(container.querySelector(".webpage-overlay-resize")).toBeTruthy();
    expect(container.querySelectorAll("[data-webpage-resize]")).toHaveLength(8);
  });

  it("keeps webpage title bars visible even when a webpage is not selected", () => {
    const { container, controller } = createHarness({
      selectedIds: ["webpage_a"],
      elements: [
        { id: "webpage_a", type: "webpage", x: 0, y: 0, width: 160, height: 120, src: "a.example", zIndex: 0 },
        { id: "webpage_b", type: "webpage", x: 200, y: 0, width: 160, height: 120, src: "b.example", zIndex: 1 },
      ],
    });

    controller.sync();

    const controls = [...container.querySelectorAll(".webpage-overlay-controls")];
    expect(controls[0].hidden).toBe(false);
    expect(controls[1].hidden).toBe(false);
    expect(controls[0].classList.contains("is-interactive")).toBe(true);
    expect(controls[1].classList.contains("is-interactive")).toBe(false);
    expect(controls.map((control) => control.querySelector(".webpage-overlay-title").textContent)).toEqual([
      "a.example",
      "b.example",
    ]);
    expect([...container.querySelectorAll("iframe")].map((iframe) => iframe.style.top)).toEqual(["60px", "60px"]);
  });

  it("selects an unselected webpage from its title bar without moving it", () => {
    const { callbacks, container, controller, state } = createHarness({ selectedIds: [] });

    controller.sync();
    const chrome = container.querySelector("[data-webpage-drag]");

    expect(chrome.style.pointerEvents).toBe("auto");
    chrome.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 40 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 100, clientY: 40 }));

    expect(callbacks.selectIds).toHaveBeenCalledWith(["webpage_1"]);
    expect(state.selectedIds).toEqual(["webpage_1"]);
    expect(state.elements[0]).toMatchObject({ x: 10, y: 20 });
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
  });

  it("keeps the selected control container transparent so the iframe can receive focus", () => {
    const { container, controller } = createHarness();

    controller.sync();

    expect(container.querySelector(".webpage-overlay-controls").style.pointerEvents).toBe("none");
    expect(container.querySelector("iframe").style.pointerEvents).toBe("auto");
  });

  it("does not move a selected webpage from iframe content input", () => {
    const { callbacks, container, controller, state } = createHarness();
    controller.sync();
    const iframe = container.querySelector("iframe");

    iframe.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 140, clientY: 150 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 140, clientY: 150 }));

    expect(state.elements[0]).toMatchObject({ x: 10, y: 20 });
    expect(callbacks.selectIds).not.toHaveBeenCalled();
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
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

  it("selects but does not move an unselected webpage from its label", () => {
    const { callbacks, container, controller, state } = createHarness({ selectedIds: [] });
    controller.sync();
    const chrome = container.querySelector("[data-webpage-drag]");

    chrome.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 120, clientY: 130 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 120, clientY: 130 }));

    expect(callbacks.selectIds).toHaveBeenCalledWith(["webpage_1"]);
    expect(state.selectedIds).toEqual(["webpage_1"]);
    expect(state.elements[0]).toMatchObject({ x: 10, y: 20 });
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
  });

  it("does not edit the URL from an unselected webpage label", () => {
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

    expect(callbacks.promptValue).not.toHaveBeenCalled();
    expect(state.elements[0].src).toBe("example.com/docs");
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
    expect(callbacks.schedulePersistCurrentDraft).not.toHaveBeenCalled();
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
    expect(layer.classList.contains("is-page-interaction-mode")).toBe(true);
    expect(wrapper.style.pointerEvents).toBe("none");
    expect(iframe.style.pointerEvents).toBe("auto");
    container.dispatchEvent(pointerEvent("pointermove", { clientX: 100, clientY: 100 }));
    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(true);
    expect(callbacks.selectIds).not.toHaveBeenCalled();
  });

  it("primes iframe routing when the pointer enters a webpage before the first click", () => {
    const { container, controller } = createHarness({ selectedIds: [] });

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
    container.dispatchEvent(pointerEvent("pointerenter", { clientX: 100, clientY: 100 }));

    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(true);
    expect(container.querySelector("iframe").style.pointerEvents).toBe("auto");
  });

  it("routes iframe input through a higher canvas band when its actual hit is empty", () => {
    const getCanvasInteractionAtClientPoint = vi.fn(() => null);
    const { container, controller } = createHarness({
      selectedIds: [],
      elements: [
        {
          id: "webpage_1",
          type: "webpage",
          x: 10,
          y: 20,
          width: 300,
          height: 200,
          src: "example.com/docs",
          zIndex: 0,
        },
        { id: "stroke_1", type: "stroke", zIndex: 1 },
      ],
      getCanvasInteractionAtClientPoint,
    });

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

    expect(getCanvasInteractionAtClientPoint).toHaveBeenCalledWith(100, 100);
    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(true);
  });

  it("keeps canvas routing when a selectable canvas element is inside the webpage", () => {
    const getCanvasInteractionAtClientPoint = vi.fn(() => ({
      blocksWebpage: true,
      elementId: "stroke_1",
    }));
    const { container, controller } = createHarness({
      selectedIds: ["stroke_1"],
      elements: [
        {
          id: "webpage_1",
          type: "webpage",
          x: 10,
          y: 20,
          width: 300,
          height: 200,
          src: "example.com/docs",
        },
        { id: "stroke_1", type: "stroke", zIndex: 1 },
      ],
      getCanvasInteractionAtClientPoint,
    });

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

    expect(getCanvasInteractionAtClientPoint).toHaveBeenCalledWith(100, 100);
    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(false);
  });

  it("keeps canvas routing for a selection overlay hit without an element id", () => {
    const getCanvasInteractionAtClientPoint = vi.fn(() => ({ blocksWebpage: true }));
    const { container, controller } = createHarness({
      selectedIds: [],
      getCanvasInteractionAtClientPoint,
    });

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

    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(false);
  });

  it("keeps canvas routing and lowers webpage controls while a canvas element is dragged", () => {
    let dragging = true;
    const { container, controller } = createHarness({
      selectedIds: [],
      isCanvasInteractionActive: () => dragging,
    });

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

    expect(container.classList.contains("is-webpage-interaction-hover")).toBe(false);
    expect(container.querySelector(".webpage-overlay-controls-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector(".webpage-overlay-controls").style.zIndex).toBe("1");
    expect(container.querySelector("iframe").style.pointerEvents).toBe("none");

    dragging = false;
    controller.sync();

    expect(container.querySelector(".webpage-overlay-controls-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector(".webpage-overlay").style.pointerEvents).toBe("none");
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

  it("keeps webpage overlays non-interactive while using the pen", () => {
    const { callbacks, container, controller } = createHarness({ currentTool: "pen" });

    controller.sync();

    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector(".webpage-overlay-controls-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector(".webpage-overlay").style.pointerEvents).toBe("none");
    expect(container.querySelector("iframe").style.pointerEvents).toBe("none");
    expect(callbacks.setWebpageNodeVisible).toHaveBeenCalledWith("webpage_1", false);
  });

  it("keeps the iframe visible while other canvas tools are active", () => {
    const { callbacks, container, controller } = createHarness({ currentTool: "rect" });

    controller.sync();

    expect(container.querySelector("iframe")).toBeTruthy();
    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector(".webpage-overlay").style.pointerEvents).toBe("none");
    expect(callbacks.setWebpageNodeVisible).toHaveBeenCalledWith("webpage_1", false);
  });

  it("restores iframe interaction after returning to the select tool", () => {
    const { callbacks, container, controller, state } = createHarness({ currentTool: "pen" });

    controller.sync();
    state.currentTool = "select";
    controller.sync();

    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector(".webpage-overlay-layer").classList.contains("is-page-interaction-mode")).toBe(true);
    expect(container.querySelector(".webpage-overlay-controls-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector("iframe").style.pointerEvents).toBe("auto");
    expect(callbacks.setWebpageNodeVisible).toHaveBeenLastCalledWith("webpage_1", false);
  });

  it("keeps unselected webpage controls below a higher-layer canvas element", () => {
    const { container, controller, state } = createHarness({ selectedIds: [] });
    state.elements = [
      { ...state.elements[0], zIndex: 0 },
      { id: "stroke_1", type: "stroke", zIndex: 1 },
    ];

    controller.sync();

    expect(container.querySelector(".webpage-overlay-controls-layer").classList.contains("is-canvas-above-webpage")).toBe(false);
    expect(container.querySelector(".webpage-overlay-controls").style.zIndex).toBe("1");
  });

  it("assigns interleaved webpage overlays their shared z-index positions", () => {
    const { container, controller } = createHarness({
      selectedIds: [],
      elements: [
        { id: "canvas_a", type: "stroke", zIndex: 0 },
        { id: "webpage_a", type: "webpage", zIndex: 1, x: 0, y: 0, width: 160, height: 120, src: "a.example" },
        { id: "canvas_b", type: "stroke", zIndex: 2 },
        { id: "webpage_b", type: "webpage", zIndex: 3, x: 0, y: 0, width: 160, height: 120, src: "b.example" },
        { id: "canvas_c", type: "stroke", zIndex: 4 },
      ],
    });

    controller.sync();

    const wrappers = [...container.querySelectorAll(".webpage-overlay")];
    const controls = [...container.querySelectorAll(".webpage-overlay-controls")];
    expect(wrappers.map((node) => [node.dataset.elementId, node.style.zIndex])).toEqual([
      ["webpage_a", "1"],
      ["webpage_b", "3"],
    ]);
    expect(controls.map((node) => [node.dataset.elementId, node.style.zIndex])).toEqual([
      ["webpage_a", "1"],
      ["webpage_b", "3"],
    ]);
  });

  it("does not add history for a click without movement", () => {
    const { callbacks, container, controller, state } = createHarness();
    controller.sync();
    const chrome = container.querySelector("[data-webpage-drag]");

    chrome.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 100, clientY: 100 }));

    expect(state.elements[0]).toMatchObject({ x: 10, y: 20 });
    expect(callbacks.renderBoard).not.toHaveBeenCalled();
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
    expect(callbacks.schedulePersistCurrentDraft).not.toHaveBeenCalled();
  });

  it("restores the webpage and skips history after pointer cancellation", () => {
    const { callbacks, container, controller, state } = createHarness();
    controller.sync();
    const chrome = container.querySelector("[data-webpage-drag]");

    chrome.dispatchEvent(pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 140, clientY: 150 }));
    expect(state.elements[0]).toMatchObject({ x: 30, y: 45 });

    window.dispatchEvent(pointerEvent("pointercancel", { clientX: 140, clientY: 150 }));

    expect(state.elements[0]).toMatchObject({ x: 10, y: 20 });
    expect(callbacks.pushHistory).not.toHaveBeenCalled();
  });
});
