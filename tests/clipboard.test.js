import { describe, expect, it } from "vitest";
import {
  createClipboardSnapshot,
  createPastedElements,
  removeElementsById,
} from "../src/clipboard-service.js";

describe("clipboard service", () => {
  it("copies selected elements without mutating originals", () => {
    const elements = [
      { id: "a", type: "rect", x: 10, y: 20, zIndex: 0 },
      { id: "b", type: "text", x: 30, y: 40, zIndex: 1 },
    ];

    const snapshot = createClipboardSnapshot(elements, ["b"]);
    snapshot[0].x = 999;

    expect(snapshot).toEqual([{ id: "b", type: "text", x: 999, y: 40, zIndex: 1 }]);
    expect(elements[1].x).toBe(30);
  });

  it("pastes copies with new ids, offset positions, and normalized z-index", () => {
    const pasted = createPastedElements(
      [{ id: "a", type: "rect", x: 10, y: 20, zIndex: 0 }],
      { offset: 24, zIndexStart: 3 },
    );

    expect(pasted).toHaveLength(1);
    expect(pasted[0]).toMatchObject({ type: "rect", x: 34, y: 44, zIndex: 3 });
    expect(pasted[0].id).not.toBe("a");
  });

  it("pastes copies at the requested pointer target", () => {
    const pasted = createPastedElements(
      [
        { id: "a", type: "rect", x: 10, y: 20, zIndex: 0 },
        { id: "b", type: "text", x: 40, y: 70, zIndex: 1 },
      ],
      { targetPoint: { x: 200, y: 300 }, zIndexStart: 5 },
    );

    expect(pasted[0]).toMatchObject({ type: "rect", x: 200, y: 300, zIndex: 5 });
    expect(pasted[1]).toMatchObject({ type: "text", x: 230, y: 350, zIndex: 6 });
  });

  it("removes selected elements for cut", () => {
    expect(removeElementsById([{ id: "a" }, { id: "b" }], ["a"])).toEqual([{ id: "b", zIndex: 0 }]);
  });

  it("creates a new group id when pasting grouped elements", () => {
    const pasted = createPastedElements(
      [
        { id: "a", type: "rect", x: 0, y: 0, groupId: "group_1" },
        { id: "b", type: "rect", x: 10, y: 0, groupId: "group_1" },
      ],
      { zIndexStart: 0 },
    );

    expect(pasted[0].groupId).toBe(pasted[1].groupId);
    expect(pasted[0].groupId).not.toBe("group_1");
  });
});
