import { describe, expect, it, vi } from "vitest";
import { createAppChromeController } from "../../../src/app/shell/chrome-controller.js";

function createButton(dataset) {
  return {
    dataset,
    classList: { toggle: vi.fn() },
  };
}

function createController(overrides = {}) {
  const buttons = {
    backgrounds: [
      createButton({ backgroundMode: "dots" }),
      createButton({ backgroundMode: "plain" }),
    ],
    shapes: [
      createButton({ shapeTool: "rect" }),
      createButton({ shapeTool: "arrow" }),
    ],
    structures: [
      createButton({ structureType: "array" }),
      createButton({ structureType: "tree" }),
    ],
    zooms: [
      createButton({ zoomLevel: "1" }),
      createButton({ zoomLevel: "2" }),
    ],
  };
  const root = {
    dataset: {},
    querySelectorAll: vi.fn((selector) => {
      if (selector === "[data-background-mode]") return buttons.backgrounds;
      if (selector === "[data-shape-tool]") return buttons.shapes;
      if (selector === "[data-structure-type]") return buttons.structures;
      if (selector === "[data-zoom-level]") return buttons.zooms;
      return [];
    }),
  };
  const activeFileLabel = { textContent: "" };
  const zoomLabel = { textContent: "" };
  const callbacks = {
    renderLayerPanel: vi.fn(),
    syncArrayAlgorithmPanelState: vi.fn(),
    syncGraphStructurePanelState: vi.fn(),
    syncInspectorPanelState: vi.fn(),
    syncLinearPanelState: vi.fn(),
    syncTreeStructurePanelState: vi.fn(),
    updateContextPanel: vi.fn(),
    updateLayerPanelAvailability: vi.fn(),
  };
  const state = {
    activeFileName: overrides.activeFileName ?? "board.lofibrd",
    activeShapeTool: overrides.activeShapeTool ?? "rect",
    activeStructureType: overrides.activeStructureType ?? "array",
    backgroundMode: overrides.backgroundMode ?? "dots",
    dirty: overrides.dirty ?? true,
    elements: overrides.elements ?? [
      { id: "rect_1", type: "rect" },
      { id: "tree_1", type: "tree-structure" },
    ],
    scale: overrides.scale ?? 1,
    selectedIds: overrides.selectedIds ?? ["tree_1"],
  };
  const panelStateController = {
    setPanelCollapsedStateForLayerContent: vi.fn(),
  };
  const controller = createAppChromeController({
    root,
    activeFileLabel,
    zoomLabel,
    panelStateController,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getActiveFileName: () => state.activeFileName,
    isDirty: () => state.dirty,
    getScale: () => state.scale,
    getBackgroundMode: () => state.backgroundMode,
    getActiveShapeTool: () => state.activeShapeTool,
    getActiveStructureType: () => state.activeStructureType,
    ...callbacks,
  });
  return {
    activeFileLabel,
    buttons,
    callbacks,
    controller,
    panelStateController,
    root,
    zoomLabel,
  };
}

describe("app shell chrome-controller", () => {
  it("syncs file, zoom, selection, and toolbar chrome", () => {
    const {
      activeFileLabel,
      buttons,
      controller,
      panelStateController,
      root,
      zoomLabel,
    } = createController();

    controller.updateChrome();

    expect(panelStateController.setPanelCollapsedStateForLayerContent).toHaveBeenCalledWith(true);
    expect(activeFileLabel.textContent).toBe("board.lofibrd *");
    expect(zoomLabel.textContent).toBe("100%");
    expect(root.dataset.hasSelection).toBe("true");
    expect(root.dataset.structureSelection).toBe("tree-structure");
    expect(root.dataset.activeShape).toBe("tree-structure");
    expect(buttons.backgrounds[0].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(buttons.backgrounds[1].classList.toggle).toHaveBeenCalledWith("active", false);
    expect(buttons.shapes[0].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(buttons.shapes[1].classList.toggle).toHaveBeenCalledWith("active", false);
    expect(buttons.structures[0].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(buttons.zooms[0].classList.toggle).toHaveBeenCalledWith("active", true);
  });

  it("falls back to active shape and refreshes dependent panels", () => {
    const { callbacks, controller, root } = createController({
      dirty: false,
      elements: [{ id: "rect_1", type: "rect" }],
      selectedIds: [],
    });

    controller.updateChrome();

    expect(root.dataset.hasSelection).toBe("false");
    expect(root.dataset.structureSelection).toBe("none");
    expect(root.dataset.activeShape).toBe("rect");
    expect(callbacks.syncLinearPanelState).toHaveBeenCalled();
    expect(callbacks.syncArrayAlgorithmPanelState).toHaveBeenCalled();
    expect(callbacks.syncGraphStructurePanelState).toHaveBeenCalled();
    expect(callbacks.syncTreeStructurePanelState).toHaveBeenCalled();
    expect(callbacks.syncInspectorPanelState).toHaveBeenCalled();
    expect(callbacks.updateLayerPanelAvailability).toHaveBeenCalled();
    expect(callbacks.renderLayerPanel).toHaveBeenCalled();
    expect(callbacks.updateContextPanel).toHaveBeenCalled();
  });
});
