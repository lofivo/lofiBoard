/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStructureCellEditorController } from "../../src/app/structure-cell-editor-controller.js";
import {
  updateArrayItemValue,
  updateTreeNodeValue,
} from "../../src/structures/structure-templates.js";

function makeRect({ x = 10, y = 20, width = 30, height = 18 } = {}) {
  return {
    getAbsolutePosition: vi.fn(() => ({ x, y })),
    width: vi.fn(() => width),
    height: vi.fn(() => height),
  };
}

function makeGroup(child) {
  return {
    scaleX: vi.fn(() => 1),
    findOne: vi.fn(() => child),
  };
}

function createController(initialElements, overrides = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const valueRect = makeRect();
  const treeNode = {
    getAbsolutePosition: vi.fn(() => ({ x: 80, y: 90 })),
  };
  const group = makeGroup(valueRect);
  let elements = initialElements;
  const callbacks = {
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    selectIds: vi.fn(),
    setActiveLinearItem: vi.fn(),
    setSuppressNextCanvasSelection: vi.fn(),
    syncTreeStructurePanelState: vi.fn(),
  };
  const contentLayer = {
    findOne: vi.fn(() => group),
  };
  const controller = createStructureCellEditorController({
    container,
    contentLayer,
    stage: {
      scaleX: vi.fn(() => 2),
      container: vi.fn(() => ({
        getBoundingClientRect: () => ({ left: 5, top: 7 }),
      })),
    },
    getElements: () => elements,
    setElements: (nextElements) => { elements = nextElements; },
    getCurrentTool: () => overrides.currentTool ?? "select",
    selectTool: "select",
    isTemporaryPanActive: () => false,
    isLinearStructureElement: (element) => element?.type === "array-structure",
    findLinearItemNode: vi.fn(() => group),
    findTreeNodeGroup: vi.fn(() => treeNode),
    updateArrayItemValue,
    updateTreeNodeValue,
    structureInteraction: {
      setActiveTreeNode: vi.fn(),
    },
    requestAnimationFrameFn: (callback) => callback(),
    ...callbacks,
  });
  return {
    callbacks,
    container,
    controller,
    contentLayer,
    getElements: () => elements,
    group,
  };
}

function keydown(key) {
  return new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
}

describe("structure-cell-editor-controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("commits array cell edits and keeps the edited item selected", () => {
    const { callbacks, controller, getElements } = createController([
      {
        id: "array_1",
        type: "array-structure",
        items: [{ id: "item_1", value: "1" }],
      },
    ]);

    controller.editArrayStructureItem({ elementId: "array_1", index: 0, value: "1" });
    const input = document.querySelector(".cell-editor");
    input.value = "9";
    input.dispatchEvent(keydown("Enter"));

    expect(getElements()[0].items[0].value).toBe("9");
    expect(callbacks.selectIds).toHaveBeenLastCalledWith(["array_1"]);
    expect(callbacks.setActiveLinearItem).toHaveBeenCalledWith("array_1", 0, { rerender: false });
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已更新线性结构元素");
  });

  it("sets canvas selection suppression when an array editor is committed by a board click", () => {
    const { callbacks, container, controller } = createController([
      {
        id: "array_1",
        type: "array-structure",
        items: [{ id: "item_1", value: "1" }],
      },
    ]);
    const boardChild = document.createElement("button");
    container.appendChild(boardChild);

    controller.editArrayStructureItem({ elementId: "array_1", index: 0, value: "1" });
    boardChild.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    expect(callbacks.setSuppressNextCanvasSelection).toHaveBeenCalledWith(true);
    expect(document.querySelector(".cell-editor")).toBeNull();
  });

  it("keeps the active array editor aligned when requested", () => {
    const { controller } = createController([
      {
        id: "array_1",
        type: "array-structure",
        items: [{ id: "item_1", value: "1" }],
      },
    ]);

    controller.editArrayStructureItem({ elementId: "array_1", index: 0, value: "1" });
    const input = document.querySelector(".cell-editor");
    expect(input.style.left).toBe("15px");

    controller.syncActiveCellEditor();

    expect(input.style.fontSize).toBe("40px");
  });

  it("commits tree node edits and restores the active tree node", () => {
    const tree = {
      id: "tree_1",
      type: "tree-structure",
      style: { nodeRadius: 10 },
      nodes: [{ id: "node_1", label: "A", x: 0, y: 0 }],
      edges: [],
    };
    const { callbacks, controller, getElements } = createController([tree]);

    controller.editTreeStructureNode({ elementId: "tree_1", nodeId: "node_1", label: "A" });
    const input = document.querySelector(".cell-editor");
    input.value = "B";
    input.dispatchEvent(keydown("Enter"));

    expect(getElements()[0].nodes[0].label).toBe("B");
    expect(callbacks.selectIds).toHaveBeenLastCalledWith(["tree_1"]);
    expect(callbacks.syncTreeStructurePanelState).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已更新树节点");
  });
});
