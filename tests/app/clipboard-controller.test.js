import { describe, expect, it } from "vitest";
import { createClipboardController } from "../../src/app/clipboard-controller.js";

describe("clipboard-controller", () => {
  it("starts empty and reports snapshot availability", () => {
    const controller = createClipboardController();

    expect(controller.hasSnapshot()).toBe(false);
    expect(controller.getSnapshot()).toEqual([]);
  });

  it("copies selected elements into an isolated snapshot", () => {
    const controller = createClipboardController();
    const elements = [
      { id: "a", type: "rect", x: 1 },
      { id: "b", type: "text", x: 2 },
    ];

    expect(controller.copy(elements, ["b"])).toEqual([{ id: "b", type: "text", x: 2 }]);
    elements[1].x = 99;

    expect(controller.getSnapshot()).toEqual([{ id: "b", type: "text", x: 2 }]);
    expect(controller.hasSnapshot()).toBe(true);
  });

  it("creates pasted elements from the current snapshot and refreshes the clipboard to pasted copies", () => {
    const controller = createClipboardController();
    controller.copy([{ id: "a", type: "rect", x: 10, y: 12 }], ["a"]);

    const pasted = controller.createPastedElements({
      offset: 5,
      zIndexStart: 3,
    });

    expect(pasted).toHaveLength(1);
    expect(pasted[0]).toMatchObject({ type: "rect", x: 15, y: 17, zIndex: 3 });
    expect(pasted[0].id).not.toBe("a");

    controller.replaceWithElements(pasted);
    expect(controller.getSnapshot()).toEqual(pasted);
  });
});
