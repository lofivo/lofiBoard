import { describe, expect, it, vi } from "vitest";
import { createAppActionController } from "../../src/app/app-action-controller.js";

function createController() {
  const callbacks = {
    beginGraphConnectMode: vi.fn(),
    beginTreeConnectMode: vi.fn(),
    bringSelectionForward: vi.fn(),
    bringSelectionToFront: vi.fn(),
    clearBoard: vi.fn(),
    closeMainMenu: vi.fn(),
    copySelectedGraphExport: vi.fn(),
    copySelectedTreeSubtree: vi.fn(),
    deleteSelection: vi.fn(),
    editGraphEdgeData: vi.fn((element) => element),
    editSelectedArrayStructure: vi.fn(),
    editSelectedStructure: vi.fn(),
    exportPng: vi.fn(),
    fitContent: vi.fn(),
    getActiveLinearIndex: vi.fn(() => 1),
    getActiveTreeNodeId: vi.fn(() => "node_1"),
    getGraphStructureDraft: vi.fn(() => "A B"),
    getLinearValuesDraft: vi.fn(() => "1,2,3"),
    getStructureInputValue: vi.fn(() => "A-B"),
    getTreeStructureInputValue: vi.fn(() => "root"),
    groupSelection: vi.fn(),
    newBoard: vi.fn(),
    openBoardFile: vi.fn(),
    openImagePicker: vi.fn(),
    promptMultiline: vi.fn((_, fallback) => fallback),
    promptValue: vi.fn((_, fallback) => fallback),
    readLinearDisplayIndexField: vi.fn((fieldName) => ({ highlightStart: 0, highlightEnd: 2, highlightPointer: 1 })[fieldName] ?? 0),
    redoHistory: vi.fn(),
    resetArrayAlgorithmSession: vi.fn(),
    resetView: vi.fn(),
    saveBoardFile: vi.fn(),
    saveBoardFileAs: vi.fn(),
    sendSelectionBackward: vi.fn(),
    sendSelectionToBack: vi.fn(),
    setBackgroundMode: vi.fn(),
    startSelectedArrayAlgorithm: vi.fn(),
    stepArrayAlgorithmNext: vi.fn(),
    stepArrayAlgorithmPrevious: vi.fn(),
    toggleArrayAlgorithmPlayback: vi.fn(),
    toggleSelectionLock: vi.fn(),
    undoHistory: vi.fn(),
    ungroupSelection: vi.fn(),
    stopArrayAlgorithmSession: vi.fn(),
  };
  const controller = createAppActionController(callbacks);
  return { callbacks, controller };
}

describe("app-action-controller", () => {
  it("runs top-level app actions after closing the main menu", () => {
    const { callbacks, controller } = createController();

    controller.runAction("fit-content");
    controller.runAction("save-as");

    expect(callbacks.closeMainMenu).toHaveBeenCalledTimes(2);
    expect(callbacks.fitContent).toHaveBeenCalled();
    expect(callbacks.saveBoardFileAs).toHaveBeenCalled();
  });

  it("runs toolbar tool actions without touching drawing tool state", () => {
    const { callbacks, controller } = createController();

    controller.runToolAction("import-image");

    expect(callbacks.openImagePicker).toHaveBeenCalled();
  });

  it("maps linear structure actions through the array edit boundary", () => {
    const { callbacks, controller } = createController();

    controller.runAction("linear-apply-values");
    const edit = callbacks.editSelectedArrayStructure.mock.calls[0][0];
    const nextElement = edit({ type: "array-structure", items: [{ value: "0" }] });

    expect(callbacks.getLinearValuesDraft).toHaveBeenCalled();
    expect(nextElement.items.map((item) => item.value)).toEqual(["1", "2", "3"]);
  });

  it("maps graph and tree actions through the structure edit boundary", () => {
    const { callbacks, controller } = createController();

    controller.runAction("graph-apply-structure");
    expect(callbacks.editSelectedStructure).toHaveBeenCalledWith(
      "graph-structure",
      expect.any(Function),
      "已更新图",
    );

    controller.runAction("tree-layout");
    expect(callbacks.editSelectedStructure).toHaveBeenLastCalledWith(
      "tree-structure",
      expect.any(Function),
      "已更新树布局",
    );
  });
});
