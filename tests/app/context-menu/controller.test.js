import { describe, expect, it } from "vitest";
import {
  createContextMenuController,
  getContextMenuPosition,
  shouldShowContextMenu,
} from "../../../src/app/context-menu/controller.js";

describe("controller", () => {
  it("only shows the menu when a target, selection, or clipboard content exists", () => {
    expect(shouldShowContextMenu({ targetId: null, selectedIds: [], hasClipboard: false })).toBe(false);
    expect(shouldShowContextMenu({ targetId: "a", selectedIds: [], hasClipboard: false })).toBe(true);
    expect(shouldShowContextMenu({ targetId: null, selectedIds: ["a"], hasClipboard: false })).toBe(true);
    expect(shouldShowContextMenu({ targetId: null, selectedIds: [], hasClipboard: true })).toBe(true);
  });

  it("computes action disabled state from selection and clipboard availability", () => {
    const controller = createContextMenuController();

    expect(controller.isActionDisabled("copy", { selectedIds: [], hasClipboard: false })).toBe(true);
    expect(controller.isActionDisabled("copy", { selectedIds: ["a"], hasClipboard: false })).toBe(false);
    expect(controller.isActionDisabled("paste", { selectedIds: [], hasClipboard: false })).toBe(true);
    expect(controller.isActionDisabled("paste", { selectedIds: [], hasClipboard: true })).toBe(false);
    expect(controller.isActionDisabled("group", { selectedIds: ["a"], hasClipboard: false })).toBe(true);
    expect(controller.isActionDisabled("group", { selectedIds: ["a", "b"], hasClipboard: false })).toBe(false);
  });

  it("keeps the menu inside the viewport with an edge padding", () => {
    expect(getContextMenuPosition({
      clientX: 290,
      clientY: 190,
      menuBox: { width: 80, height: 60 },
      viewport: { width: 300, height: 200 },
      padding: 8,
    })).toEqual({ left: 212, top: 132 });
  });
});
