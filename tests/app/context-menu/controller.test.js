// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  createContextMenuController,
  getInputContextMenuState,
  getContextMenuPosition,
  getWhiteboardContextMenuRequest,
  runInputContextAction,
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
    expect(getWhiteboardContextMenuRequest({ ...base, activeElement: document.body, target: input })).toEqual({ type: "ui" });
    expect(getWhiteboardContextMenuRequest({ ...base, target: document.createElement("div") })).toEqual({ type: "outside" });
  });

  it("only enables input actions that match the current text selection", () => {
    const input = document.createElement("textarea");
    input.value = "hello";
    input.setSelectionRange(1, 4);

    expect(getInputContextMenuState(input)).toEqual({
      "select-all": false,
      copy: false,
      cut: false,
      paste: false,
    });

    input.setSelectionRange(2, 2);

    expect(getInputContextMenuState(input)).toEqual({
      "select-all": false,
      copy: true,
      cut: true,
      paste: false,
    });

    input.value = "";

    expect(getInputContextMenuState(input)).toEqual({
      "select-all": true,
      copy: true,
      cut: true,
      paste: false,
    });
  });

  it("runs input context actions against the focused input without touching object clipboard state", async () => {
    const input = document.createElement("textarea");
    const events = [];
    const clipboard = {
      readText: async () => " paste",
      writeText: async (value) => events.push(["write", value]),
    };
    input.value = "hello";
    input.setSelectionRange(1, 4);
    input.addEventListener("input", () => events.push(["input", input.value]));
    document.body.append(input);

    await runInputContextAction("copy", input, { clipboard });
    expect(events).toEqual([["write", "ell"]]);

    await runInputContextAction("cut", input, { clipboard });
    expect(input.value).toBe("ho");
    expect(events).toContainEqual(["write", "ell"]);
    expect(events).toContainEqual(["input", "ho"]);
    expect(document.activeElement).toBe(input);

    input.setSelectionRange(2, 2);
    await runInputContextAction("paste", input, { clipboard });
    expect(input.value).toBe("ho paste");
    expect(events).toContainEqual(["input", "ho paste"]);

    await runInputContextAction("select-all", input, { clipboard });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it("selects all text even when the browser select helper is a no-op", async () => {
    const input = document.createElement("textarea");
    const events = [];
    input.value = "fresh edit text";
    input.setSelectionRange(input.value.length, input.value.length);
    input.select = () => {};
    input.addEventListener("input", () => events.push(input.value));
    document.body.append(input);
    input.focus();

    await runInputContextAction("select-all", input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(events).toEqual([]);
  });

  it("cuts selected text into the local fallback clipboard when system clipboard write is denied", async () => {
    const input = document.createElement("textarea");
    const events = [];
    const localClipboard = { text: "" };
    const clipboard = {
      writeText: async () => { throw new Error("denied"); },
    };
    const documentTarget = { execCommand: () => false };
    input.value = "hello";
    input.setSelectionRange(1, 4);
    input.addEventListener("input", () => events.push(input.value));
    document.body.append(input);

    const result = await runInputContextAction("cut", input, {
      clipboard,
      documentTarget,
      localClipboard,
    });

    expect(result).toBe(true);
    expect(localClipboard.text).toBe("ell");
    expect(input.value).toBe("ho");
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(1);
    expect(events).toEqual(["ho"]);
  });

  it("pastes from the local fallback clipboard when system clipboard read is denied", async () => {
    const input = document.createElement("textarea");
    const events = [];
    const localClipboard = { text: " pasted" };
    const clipboard = {
      readText: async () => { throw new Error("denied"); },
    };
    input.value = "hello";
    input.setSelectionRange(5, 5);
    input.addEventListener("input", () => events.push(input.value));
    document.body.append(input);

    const result = await runInputContextAction("paste", input, {
      clipboard,
      localClipboard,
    });

    expect(result).toBe(true);
    expect(input.value).toBe("hello pasted");
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(events).toEqual(["hello pasted"]);
  });
});
