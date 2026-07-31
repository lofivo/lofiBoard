import { describe, expect, it, vi } from "vitest";
import { createSelectionStyleActionController } from "../../../../src/app/inspector/selection-style/action-controller.js";

function createInput(value, checked = false) {
  return { value, checked };
}

function createController({
  selectedIds = ["rect_1"],
  didApplyStyle = true,
  didApplyCoordinateStyle = true,
  didToggleTextStyle = true,
} = {}) {
  const selectionStyleController = {
    applyCoordinateStyleToSelection: vi.fn(() => didApplyCoordinateStyle),
    applyStyleToSelection: vi.fn(() => didApplyStyle),
    toggleTextStyle: vi.fn(() => didToggleTextStyle),
  };
  const callbacks = {
    getStrokeStyleFromControls: vi.fn(() => ({ stroke: "#111827", strokeWidth: 2 })),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    saveToolPropertyControlsForCurrentTool: vi.fn(),
    setStatus: vi.fn(),
    updateContextPanel: vi.fn(),
  };
  const controller = createSelectionStyleActionController({
    getControlValues: () => ({
      arrowDoubleEnded: true,
      color: "#111827",
      coordinateAxisColor: "#0f172a",
      coordinateGridColor: "#94a3b8",
      coordinateLabelColor: "#475569",
      coordinateShowGrid: true,
      coordinateShowLabels: true,
      coordinateShowTicks: false,
      coordinateUnitSize: "40",
      coordinateFunctions: "sin(x)\nx^2",
      fill: "#ffffff",
      fillTransparent: false,
      fontFamily: "Inter",
      fontSize: "24",
      width: "2",
    }),
    getSelectedIds: () => selectedIds,
    selectionStyleController,
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    selectionStyleController,
  };
}

describe("app inspector selection-style action-controller", () => {
  it("saves tool controls instead of applying element style when there is no selection", () => {
    const { callbacks, controller, selectionStyleController } = createController({ selectedIds: [] });

    controller.applyStyleToSelection();

    expect(callbacks.saveToolPropertyControlsForCurrentTool).toHaveBeenCalled();
    expect(callbacks.updateContextPanel).toHaveBeenCalled();
    expect(selectionStyleController.applyStyleToSelection).not.toHaveBeenCalled();
    expect(callbacks.renderBoard).not.toHaveBeenCalled();
  });

  it("applies selected element style from DOM controls and pushes history", () => {
    const { callbacks, controller, selectionStyleController } = createController();

    controller.applyStyleToSelection();

    expect(selectionStyleController.applyStyleToSelection).toHaveBeenCalledWith({
      arrowDoubleEnded: true,
      color: "#111827",
      fillColor: "#ffffff",
      fillTransparent: false,
      fontFamily: "Inter",
      fontSize: "24",
      strokeStyle: { stroke: "#111827", strokeWidth: 2 },
      width: "2",
    });
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已更新样式");
  });

  it("applies coordinate style and text style only when the underlying controller changes elements", () => {
    const { callbacks, controller, selectionStyleController } = createController();

    controller.applyCoordinateStyleToSelection();
    controller.toggleTextStyle("bold");

    expect(selectionStyleController.applyCoordinateStyleToSelection).toHaveBeenCalledWith({
      axisStroke: "#0f172a",
      gridStroke: "#94a3b8",
      labelFill: "#475569",
      showGrid: true,
      showLabels: true,
      showTicks: false,
      unitSize: "40",
      functions: "sin(x)\nx^2",
    });
    expect(selectionStyleController.toggleTextStyle).toHaveBeenCalledWith("bold");
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已更新坐标系");
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已更新文字样式");

    const ignored = createController({ didApplyCoordinateStyle: false, didToggleTextStyle: false });
    ignored.controller.applyCoordinateStyleToSelection();
    ignored.controller.toggleTextStyle("italic");

    expect(ignored.callbacks.renderBoard).not.toHaveBeenCalled();
    expect(ignored.callbacks.pushHistory).not.toHaveBeenCalled();
  });

  it("selects all unlocked elements and reports the count", () => {
    const callbacks = {
      selectIds: vi.fn(),
      setStatus: vi.fn(),
    };
    const controller = createSelectionStyleActionController({
      getElements: () => [
        { id: "rect_1" },
        { id: "locked_1", locked: true },
        { id: "text_1" },
      ],
      getSelectedIds: () => [],
      selectionStyleController: {},
      ...callbacks,
    });

    controller.selectAllElements();

    expect(callbacks.selectIds).toHaveBeenCalledWith(["rect_1", "text_1"]);
    expect(callbacks.setStatus).toHaveBeenCalledWith("已选择全部对象 (2)");
  });
});
