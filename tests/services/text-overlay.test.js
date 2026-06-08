import { describe, expect, it, vi } from "vitest";
import {
  createTextOverlayController,
  getTextOverlayStyle,
  shouldRenderTextOverlay,
} from "../../src/services/text-overlay.js";

describe("text overlay service", () => {
  class FakeElement {
    constructor() {
      this.children = [];
      this.dataset = {};
      this.style = {};
      this.hidden = false;
      this.innerHTML = "";
      this.parent = null;
      this.className = "";
    }

    appendChild(child) {
      child.parent = this;
      this.children.push(child);
      return child;
    }

    remove() {
      if (!this.parent) return;
      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    }

    querySelector(selector) {
      const match = /^\[data-text-overlay-id='([^']+)'\]$/.exec(selector);
      if (!match) return null;
      return this.children.find((child) => child.dataset.textOverlayId === match[1]) ?? null;
    }
  }

  const textElement = {
    id: "text_1",
    type: "text",
    x: 20,
    y: 30,
    width: 180,
    height: 48,
    rotation: 12,
    text: "速度 $v=\\frac{s}{t}$",
    fontSize: 28,
    fontFamily: "Inter, sans-serif",
    fontStyle: "bold italic",
    textDecoration: "underline",
    padding: 6,
    fill: "#111827",
    align: "center",
  };

  it("only renders overlays for text elements with renderable latex", () => {
    expect(shouldRenderTextOverlay(textElement)).toBe(true);
    expect(shouldRenderTextOverlay({ ...textElement, text: "plain text" })).toBe(false);
    expect(shouldRenderTextOverlay({ ...textElement, type: "sticky" })).toBe(false);
    expect(shouldRenderTextOverlay({ ...textElement, text: "价格 \\$5" })).toBe(false);
  });

  it("computes fixed overlay styles from element and stage transform", () => {
    expect(getTextOverlayStyle(textElement, {
      containerRect: { left: 100, top: 50 },
      stage: { x: 10, y: 15, scale: 2 },
    })).toMatchObject({
      left: "150px",
      top: "125px",
      width: "360px",
      minHeight: "96px",
      padding: "0 12px",
      color: "#111827",
      fontSize: "56px",
      fontFamily: "Inter, sans-serif",
      fontWeight: "700",
      fontStyle: "italic",
      textAlign: "center",
      lineHeight: "1.25",
      overflow: "visible",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      transform: "rotate(12deg)",
      textDecoration: "underline",
    });
  });

  it("syncs vector html overlays and hides fallback text nodes after rendering", async () => {
    globalThis.document = { createElement: () => new FakeElement() };
    const container = new FakeElement();
    const textNode = { visible: vi.fn() };
    const contentLayer = {
      findOne: vi.fn(() => ({ findOne: vi.fn(() => textNode) })),
    };
    const controller = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await controller.sync([textElement]);

    const overlay = container.querySelector("[data-text-overlay-id='text_1']");
    expect(overlay).toBeTruthy();
    expect(overlay.innerHTML).toContain("katex");
    expect(overlay.style.pointerEvents).toBe("none");
    expect(overlay.style.overflowWrap).toBe("anywhere");
    expect(overlay.style.wordBreak).toBe("break-word");
    expect(textNode.visible).toHaveBeenCalledWith(false);

    await controller.sync([{ ...textElement, text: "plain text" }]);
    expect(container.querySelector("[data-text-overlay-id='text_1']")).toBeNull();
    expect(textNode.visible).toHaveBeenLastCalledWith(true);
  });

  it("keeps the fallback text hidden while rerendering an existing latex overlay", async () => {
    globalThis.document = { createElement: () => new FakeElement() };
    const container = new FakeElement();
    const textNode = { visible: vi.fn() };
    const contentLayer = {
      findOne: vi.fn(() => ({ findOne: vi.fn(() => textNode) })),
      batchDraw: vi.fn(),
    };
    const controller = createTextOverlayController({
      container,
      contentLayer,
      getContainerRect: () => ({ left: 0, top: 0 }),
      getStageState: () => ({ x: 0, y: 0, scale: 1 }),
    });

    await controller.sync([textElement]);
    textNode.visible.mockClear();
    await controller.sync([{ ...textElement, fontSize: 36 }]);

    expect(textNode.visible).not.toHaveBeenCalledWith(true);
    expect(textNode.visible).toHaveBeenLastCalledWith(false);
  });
});
