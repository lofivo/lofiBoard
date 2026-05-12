import { describe, expect, it } from "vitest";
import { createImageElement } from "../../src/board/element-factory.js";

describe("element factory", () => {
  it("can create an image centered on the requested point after display scaling", () => {
    const element = createImageElement({
      point: { x: 300, y: 200 },
      src: "data:image/png;base64,abc",
      width: 840,
      height: 420,
      zIndex: 0,
      anchor: "center",
    });

    expect(element).toMatchObject({
      type: "image",
      x: 90,
      y: 95,
      width: 420,
      height: 210,
    });
  });
});
