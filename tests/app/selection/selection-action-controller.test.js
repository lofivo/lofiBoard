import { describe, expect, it, vi } from "vitest";
import { createSelectionActionController } from "../../../src/app/selection/selection-action-controller.js";

function createController(initialElements, selectedIds = []) {
  let elements = initialElements;
  let currentSelectedIds = selectedIds;
  const callbacks = {
    clearSelection: vi.fn(() => { currentSelectedIds = []; }),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
  };
  const controller = createSelectionActionController({
    getElements: () => elements,
    setElements: (nextElements) => { elements = nextElements; },
    getSelectedIds: () => currentSelectedIds,
    createId: vi.fn(() => "group_test"),
    moveElementsByLayer: (items, ids, direction) => {
      const next = [...items];
      const index = next.findIndex((item) => ids.includes(item.id));
      if (index < 0) return next;
      const targetIndex = Math.max(0, Math.min(next.length - 1, index + direction));
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    },
    reorderElements: (items) => items.map((item, index) => ({ ...item, zIndex: index })),
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    getElements: () => elements,
    getSelectedIds: () => currentSelectedIds,
  };
}

describe("selection-action-controller", () => {
  it("moves selected elements to the front and back", () => {
    const { callbacks, controller, getElements } = createController([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ], ["b"]);

    controller.bringSelectionToFront();
    expect(getElements().map((element) => element.id)).toEqual(["a", "c", "b"]);
    expect(callbacks.pushHistory).toHaveBeenLastCalledWith("已置顶对象");

    controller.sendSelectionToBack();
    expect(getElements().map((element) => element.id)).toEqual(["b", "a", "c"]);
    expect(callbacks.pushHistory).toHaveBeenLastCalledWith("已置底对象");
    expect(callbacks.renderBoard).toHaveBeenCalledTimes(2);
  });

  it("moves selected elements one layer at a time only when order changes", () => {
    const { callbacks, controller, getElements } = createController([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ], ["b"]);

    controller.bringSelectionForward();
    expect(getElements().map((element) => element.id)).toEqual(["a", "c", "b"]);
    expect(callbacks.pushHistory).toHaveBeenLastCalledWith("已上移对象");

    controller.bringSelectionForward();
    expect(callbacks.pushHistory).toHaveBeenCalledTimes(1);
  });

  it("groups and ungroups editable selected elements", () => {
    const { callbacks, controller, getElements } = createController([
      { id: "a" },
      { id: "b", locked: true },
      { id: "c" },
    ], ["a", "b", "c"]);

    controller.groupSelection();
    expect(getElements()).toMatchObject([
      { id: "a", groupId: "group_test" },
      { id: "b", locked: true },
      { id: "c", groupId: "group_test" },
    ]);
    expect(callbacks.pushHistory).toHaveBeenLastCalledWith("已分组对象");

    controller.ungroupSelection();
    expect(getElements()).toMatchObject([
      { id: "a", groupId: undefined },
      { id: "b", locked: true },
      { id: "c", groupId: undefined },
    ]);
    expect(callbacks.pushHistory).toHaveBeenLastCalledWith("已取消分组");
  });

  it("toggles lock state for the current selection", () => {
    const { callbacks, controller, getElements } = createController([
      { id: "a", locked: false },
      { id: "b", locked: true },
      { id: "c", locked: false },
    ], ["a", "b"]);

    controller.toggleSelectionLock();
    expect(getElements()).toMatchObject([
      { id: "a", locked: true },
      { id: "b", locked: true },
      { id: "c", locked: false },
    ]);
    expect(callbacks.pushHistory).toHaveBeenLastCalledWith("已锁定对象");

    controller.toggleSelectionLock();
    expect(getElements()).toMatchObject([
      { id: "a", locked: false },
      { id: "b", locked: false },
      { id: "c", locked: false },
    ]);
    expect(callbacks.pushHistory).toHaveBeenLastCalledWith("已解锁对象");
  });

  it("clears the board and selection", () => {
    const { callbacks, controller, getElements, getSelectedIds } = createController([
      { id: "a" },
    ], ["a"]);

    controller.clearBoard();

    expect(getElements()).toEqual([]);
    expect(getSelectedIds()).toEqual([]);
    expect(callbacks.clearSelection).toHaveBeenCalled();
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已清空白板");
  });
});
