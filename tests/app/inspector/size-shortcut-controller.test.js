import { describe, expect, it, vi } from "vitest";
import { createSizeShortcutController } from "../../../src/app/inspector/size-shortcut-controller.js";
import { TOOLS } from "../../../src/ui/config.js";

function createController({
  panelMode = "brush",
  currentTool = TOOLS.PEN,
  structureSelection = "none",
  values = { width: "6", fontSize: "28", coordinateUnitSize: "40" },
  adjustGraphNodeSize = vi.fn(() => true),
} = {}) {
  const setControl = vi.fn((name, value) => {
    const key = name === "font-size"
      ? "fontSize"
      : name === "coordinate-unit-size"
        ? "coordinateUnitSize"
        : name;
    values[key] = String(value);
  });
  const controller = createSizeShortcutController({
    getPanelMode: () => panelMode,
    getCurrentTool: () => currentTool,
    getStructureSelection: () => structureSelection,
    getControlValues: () => ({ ...values }),
    setControl,
    adjustGraphNodeSize,
  });
  return { adjustGraphNodeSize, controller, setControl, values };
}

describe("size shortcut controller", () => {
  it("adjusts and clamps brush thickness", () => {
    const { controller, setControl, values } = createController({ values: { width: "28" } });

    expect(controller.adjustActiveSize(1)).toBe(true);
    expect(setControl).not.toHaveBeenCalled();
    values.width = "2";
    controller.adjustActiveSize(-1);
    expect(setControl).toHaveBeenLastCalledWith("width", 1);
  });

  it("uses the visible text and sticky font-size ranges", () => {
    const text = createController({ panelMode: "text", values: { fontSize: "28" } });
    const sticky = createController({ panelMode: "hidden", currentTool: TOOLS.STICKY, values: { fontSize: "64" } });

    text.controller.adjustActiveSize(1);
    sticky.controller.adjustActiveSize(1);

    expect(text.setControl).toHaveBeenLastCalledWith("font-size", 29);
    expect(sticky.setControl).not.toHaveBeenCalled();
  });

  it("adjusts coordinate spacing", () => {
    const { controller, setControl } = createController({
      panelMode: "coordinate-tool",
      values: { coordinateUnitSize: "40" },
    });

    controller.adjustActiveSize(-1);

    expect(setControl).toHaveBeenCalledWith("coordinate-unit-size", 39);
  });

  it("delegates graph node sizing and ignores ambiguous panels", () => {
    const graph = createController({ panelMode: "structure", structureSelection: "graph-structure" });
    const multi = createController({ panelMode: "multi" });

    expect(graph.controller.adjustActiveSize(1)).toBe(true);
    expect(graph.adjustGraphNodeSize).toHaveBeenCalledWith(1);
    expect(multi.controller.adjustActiveSize(1)).toBe(false);
    expect(multi.setControl).not.toHaveBeenCalled();
  });
});
