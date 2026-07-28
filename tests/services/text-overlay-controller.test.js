/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createTextOverlayController,
  getTextOverlayDisplayStyle,
} from "../../src/services/text-overlay-controller.js";
import { getStickyTextInsets } from "../../src/tools/interaction-rules.js";

describe("text-overlay-controller", () => {
  let container;
  let contentLayer;

  const textElement = {
    id: "text_1",
    type: "text",
    x: 20,
    y: 30,
    width: 180,
    height: 48,
    rotation: 0,
    text: "Hello World",
    fontSize: 28,
    fontFamily: "Inter, sans-serif",
    fontStyle: "normal",
    textDecoration: "",
    padding: 6,
    fill: "#111827",
    align: "left",
  };

  const stickyElement = {
    id: "sticky_1",
    type: "sticky",
    x: 50,
    y: 60,
    width: 220,
    height: 160,
    rotation: 0,
    text: "Sticky note",
    fontSize: 22,
    fontFamily: "Inter, sans-serif",
    fontStyle: "normal",
    textDecoration: "",
    padding: 6,
    fill: "#fef3c7",
    textFill: "#1f2937",
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    contentLayer = {
      findOne: vi.fn(() => null),
      batchDraw: vi.fn(),
    };
  });

  it("returns the expected API", () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });
    expect(ctrl).toHaveProperty("sync");
    expect(ctrl).toHaveProperty("getOverlay");
    expect(ctrl).toHaveProperty("enterEditMode");
    expect(ctrl).toHaveProperty("exitEditMode");
    expect(ctrl).toHaveProperty("setHiddenIds");
    expect(ctrl).toHaveProperty("clear");
  });

  it("creates DOM overlays for text elements", async () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([textElement]);

    const overlay = container.querySelector('[data-element-id="text_1"]');
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains("text-dom-overlay")).toBe(true);
    expect(overlay.contentEditable).toBe("false");
    expect(overlay.textContent).toBe("Hello World");
  });

  it("returns the intrinsic rendered text height in world coordinates", async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.dataset?.elementId === "text_1" ? 84 : 0;
      },
    });
    try {
      const ctrl = createTextOverlayController({
        container,
        contentLayer,
        getContainerRect: () => ({ left: 0, top: 0 }),
        getStageState: () => ({ x: 0, y: 0, scale: 2 }),
      });

      const measurements = await ctrl.sync([{ ...textElement, height: 20 }]);

      expect(measurements).toEqual([{ id: "text_1", height: 42 }]);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalDescriptor);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  });

  it("keeps measured world height stable when the viewport scale produces fractional pixels", async () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.dataset?.elementId === "text_1" ? 53 : 0;
      },
    });
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.dataset?.elementId === "text_1") {
        return { x: 0, y: 0, top: 0, right: 270, bottom: 52.5, left: 0, width: 270, height: 52.5 };
      }
      return { x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 };
    };
    try {
      const ctrl = createTextOverlayController({
        container,
        contentLayer,
        getContainerRect: () => ({ left: 0, top: 0 }),
        getStageState: () => ({ x: 0, y: 0, scale: 1.5 }),
      });

      const measurements = await ctrl.sync([{ ...textElement, height: 20 }]);

      expect(measurements).toEqual([{ id: "text_1", height: 35 }]);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  });

  it("measures latex only after the rendered formula is in the overlay", async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        if (this.dataset?.elementId !== "text_1") return 0;
        return this.innerHTML.includes("katex") ? 120 : 20;
      },
    });
    try {
      const ctrl = createTextOverlayController({
        container,
        contentLayer,
        getContainerRect: () => ({ left: 0, top: 0 }),
        getStageState: () => ({ x: 0, y: 0, scale: 1 }),
      });

      const measurements = await ctrl.sync([{
        ...textElement,
        text: "$$\\frac{a}{b}$$",
        height: 24,
      }]);

      expect(measurements).toEqual([{ id: "text_1", height: 120 }]);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalDescriptor);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  });

  it("includes latex descendants that extend below the overlay line box", async () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.dataset?.elementId === "text_1" ? 40 : 0;
      },
    });
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.dataset?.elementId === "text_1") {
        return { x: 0, y: 10, top: 10, right: 180, bottom: 50, left: 0, width: 180, height: 40 };
      }
      if (this.classList?.contains("katex")) {
        return { x: 0, y: 10, top: 10, right: 120, bottom: 106, left: 0, width: 120, height: 96 };
      }
      return { x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 };
    };
    try {
      const ctrl = createTextOverlayController({
        container,
        contentLayer,
        getContainerRect: () => ({ left: 0, top: 0 }),
        getStageState: () => ({ x: 0, y: 0, scale: 1 }),
      });

      const measurements = await ctrl.sync([{
        ...textElement,
        text: "$$\\frac{a}{b}$$",
        height: 24,
      }]);

      expect(measurements).toEqual([{ id: "text_1", height: 96 }]);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  });

  it("measures text before rotation instead of using the rotated bounding box", async () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.dataset?.elementId === "text_1" ? 80 : 0;
      },
    });
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.dataset?.elementId !== "text_1") {
        return { x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 };
      }
      const height = this.style.transform === "none" ? 80 : 180;
      return { x: 0, y: 10, top: 10, right: 180, bottom: 10 + height, left: 0, width: 180, height };
    };
    try {
      const ctrl = createTextOverlayController({
        container,
        contentLayer,
        getContainerRect: () => ({ left: 0, top: 0 }),
        getStageState: () => ({ x: 0, y: 0, scale: 1 }),
      });

      const measurements = await ctrl.sync([{
        ...textElement,
        rotation: 45,
        height: 24,
      }]);

      expect(measurements).toEqual([{ id: "text_1", height: 80 }]);
      expect(ctrl.getOverlay("text_1").style.transform).toBe("rotate(45deg)");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  });

  it("creates DOM overlays for sticky elements", async () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([stickyElement]);

    const overlay = container.querySelector('[data-element-id="sticky_1"]');
    expect(overlay).toBeTruthy();
    expect(overlay.textContent).toBe("Sticky note");
  });

  it("removes overlays when elements are no longer present", async () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([textElement]);
    expect(container.querySelector('[data-element-id="text_1"]')).toBeTruthy();

    await ctrl.sync([]);
    expect(container.querySelector('[data-element-id="text_1"]')).toBeNull();
  });

  it("updates overlay content when text changes", async () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([textElement]);
    await ctrl.sync([{ ...textElement, text: "Updated text" }]);

    const overlay = container.querySelector('[data-element-id="text_1"]');
    expect(overlay.textContent).toBe("Updated text");
  });

  it("computes correct display styles for text elements", () => {
    const style = getTextOverlayDisplayStyle(textElement, {
      containerRect: { left: 100, top: 50 },
      stage: { x: 10, y: 15, scale: 2 },
    });

    expect(style).toMatchObject({
      position: "fixed",
      fontSize: "56px",
      color: "#111827",
      textAlign: "left",
      fontFamily: "Inter, sans-serif",
      lineHeight: "1.25",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    });
    expect(style.left).toMatch(/^\d+px$/);
    expect(style.top).toMatch(/^\d+px$/);
    expect(style.width).toMatch(/^\d+px$/);
  });

  it("computes correct display styles for sticky elements", () => {
    const style = getTextOverlayDisplayStyle(stickyElement, {
      containerRect: { left: 0, top: 0 },
      stage: { x: 0, y: 0, scale: 1 },
    });

    expect(style).toMatchObject({
      position: "fixed",
      color: "#1f2937",
      fontFamily: "Inter, sans-serif",
      fontSize: "22px",
    });
  });

  it("applies sticky text insets as padding in the DOM overlay", () => {
    const insets = getStickyTextInsets(stickyElement.fontSize);
    expect(insets.x).toBe(14);
    expect(insets.y).toBe(12);

    const style = getTextOverlayDisplayStyle(stickyElement, {
      containerRect: { left: 0, top: 0 },
      stage: { x: 0, y: 0, scale: 1 },
    });

    expect(style.padding).toBe("12px 14px");
  });

  it("scales sticky text inset padding with stage scale", () => {
    const style = getTextOverlayDisplayStyle(stickyElement, {
      containerRect: { left: 0, top: 0 },
      stage: { x: 0, y: 0, scale: 2 },
    });

    expect(style.padding).toBe("24px 28px");
  });

  it("hides overlays by id", async () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([textElement]);
    ctrl.setHiddenIds(["text_1"]);

    const overlay = container.querySelector('[data-element-id="text_1"]');
    expect(overlay.hidden).toBe(true);
  });

  it("does not revisit overlays when the hidden id set is unchanged", async () => {
    const textNode = { visible: vi.fn() };
    contentLayer.findOne.mockReturnValue({ findOne: vi.fn(() => textNode) });
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });
    await ctrl.sync([textElement]);
    ctrl.setHiddenIds(["text_1"]);
    contentLayer.findOne.mockClear();
    contentLayer.batchDraw.mockClear();

    ctrl.setHiddenIds(["text_1"]);

    expect(contentLayer.findOne).not.toHaveBeenCalled();
    expect(contentLayer.batchDraw).not.toHaveBeenCalled();
  });

  it("enters and exits edit mode on overlay", async () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([textElement]);

    const editOverlay = ctrl.enterEditMode("text_1");
    expect(editOverlay).toBeTruthy();
    expect(editOverlay.contentEditable).toBe("true");
    expect(editOverlay.classList.contains("is-editing")).toBe(true);

    ctrl.exitEditMode("text_1");
    expect(editOverlay.contentEditable).toBe("false");
    expect(editOverlay.classList.contains("is-editing")).toBe(false);
  });

  it("returns null for getOverlay on nonexistent id", () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    expect(ctrl.getOverlay("nonexistent")).toBeNull();
  });

  it("clears all overlays", async () => {
    const ctrl = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([textElement, stickyElement]);
    ctrl.clear();

    expect(container.querySelector('[data-element-id="text_1"]')).toBeNull();
    expect(container.querySelector('[data-element-id="sticky_1"]')).toBeNull();
  });

  it("hides Konva Text nodes when overlay is visible", async () => {
    const textNode = { visible: vi.fn() };
    const layer = {
      findOne: vi.fn(() => ({ findOne: vi.fn(() => textNode) })),
      batchDraw: vi.fn(),
    };

    const ctrl = createTextOverlayController({
      container,
      contentLayer: layer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await ctrl.sync([textElement]);
    expect(textNode.visible).toHaveBeenCalledWith(false);
  });
});
