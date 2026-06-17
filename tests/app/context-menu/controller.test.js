// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  createContextMenuController,
  getContextMenuPosition,
  getWhiteboardContextMenuRequest,
  shouldShowContextMenu,
} from "../../../src/app/context-menu/controller.js";

describe("controller", () => {
  it("shows the object menu even on blank canvas context", () => {
    expect(shouldShowContextMenu({ targetId: null, selectedIds: [], hasClipboard: false })).toBe(true);
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
    expect(controller.isActionDisabled("undo", { selectedIds: [], canUndo: false })).toBe(true);
    expect(controller.isActionDisabled("undo", { selectedIds: [], canUndo: true })).toBe(false);
    expect(controller.isActionDisabled("redo", { selectedIds: [], canRedo: false })).toBe(true);
    expect(controller.isActionDisabled("redo", { selectedIds: [], canRedo: true })).toBe(false);
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

  it("classifies right-click targets inside the whiteboard", () => {
    const appRoot = document.createElement("div");
    const legacyRoot = document.createElement("div");
    const stageContainer = document.createElement("main");
    const toolbar = document.createElement("button");
    const input = document.createElement("textarea");
    const menu = document.createElement("div");
    menu.dataset.reactContextMenu = "";
    legacyRoot.append(stageContainer);
    appRoot.append(toolbar, menu, legacyRoot, input);
    document.body.append(appRoot);
    input.focus();

    const base = {
      appRoot,
      legacyRoot,
      stageContainer,
      activeElement: input,
      isNativeTextEditingTarget: (target) => target instanceof HTMLTextAreaElement,
    };

    expect(getWhiteboardContextMenuRequest({ ...base, target: stageContainer })).toEqual({ type: "canvas" });
    expect(getWhiteboardContextMenuRequest({ ...base, target: toolbar })).toEqual({ type: "ui" });
    expect(getWhiteboardContextMenuRequest({ ...base, target: menu })).toEqual({ type: "menu" });
    expect(getWhiteboardContextMenuRequest({ ...base, target: input })).toEqual({ type: "input", target: input });
    expect(getWhiteboardContextMenuRequest({ ...base, activeElement: document.body, target: input })).toEqual({ type: "input", target: input });
    expect(getWhiteboardContextMenuRequest({ ...base, target: document.createElement("div") })).toEqual({ type: "outside" });
  });
});
