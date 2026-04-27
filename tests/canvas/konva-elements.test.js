import { afterEach, describe, expect, it, vi } from "vitest";
import { createElementNode } from "../../src/canvas/konva-elements.js";

const baseHandlers = {
  draggable: false,
  onMove: vi.fn(),
  onSelect: vi.fn(),
  onEditText: vi.fn(),
};

describe("konva elements", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it("reuses loaded image instances so rerendering does not flash blank", () => {
    const createdImages = [];

    globalThis.window = {
      Image: class FakeImage {
        constructor() {
          createdImages.push(this);
        }

        set src(value) {
          this.currentSrc = value;
          this.onload?.();
        }
      },
    };

    const element = {
      id: "image_1",
      type: "image",
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      src: "data:image/png;base64,abc",
    };

    const firstNode = createElementNode(element, baseHandlers);
    const secondNode = createElementNode(element, baseHandlers);

    expect(createdImages).toHaveLength(1);
    expect(firstNode.image()).toBe(createdImages[0]);
    expect(secondNode.image()).toBe(createdImages[0]);
  });
});
