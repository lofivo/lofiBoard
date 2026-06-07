import { describe, expect, it, vi } from "vitest";
import { createInspectorPanelDomController } from "../../../src/app/inspector/inspector-panel-dom-controller.js";
import { TOOLS } from "../../../src/ui/ui-config.js";

function createController(overrides = {}) {
  const root = { dataset: {} };
  const stylePanel = { hidden: true };
  const stylePanelTitle = { textContent: "" };
  const callbacks = {
    applyPanelState: vi.fn(),
    hydrateControlsFromElement: vi.fn(),
  };
  const state = {
    activeShapeTool: overrides.activeShapeTool ?? TOOLS.RECT,
    currentTool: overrides.currentTool ?? TOOLS.SELECT,
    elements: overrides.elements ?? [],
    selectedIds: overrides.selectedIds ?? [],
  };
  const controller = createInspectorPanelDomController({
    root,
    stylePanel,
    stylePanelTitle,
    getElements: () => state.elements,
    getSelectedIds: () => state.selectedIds,
    getCurrentTool: () => state.currentTool,
    getActiveShapeTool: () => state.activeShapeTool,
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    root,
    state,
    stylePanel,
    stylePanelTitle,
  };
}

describe("inspector-panel-dom-controller", () => {
  it("shows selection properties and hydrates controls from the selected element", () => {
    const textElement = {
      id: "text_1",
      type: "text",
      text: "hello",
    };
    const { callbacks, controller, root, stylePanel, stylePanelTitle } = createController({
      elements: [textElement],
      selectedIds: ["text_1"],
    });

    controller.updateContextPanel();

    expect(callbacks.hydrateControlsFromElement).toHaveBeenCalledWith(textElement);
    expect(stylePanel.hidden).toBe(false);
    expect(controller.getStylePanelAvailable()).toBe(true);
    expect(root.dataset.panelMode).toBe("text");
    expect(root.dataset.selectionHasText).toBe("true");
    expect(root.dataset.selectionHasDrawing).toBe("false");
    expect(stylePanelTitle.textContent).toBe("文字");
    expect(callbacks.applyPanelState).toHaveBeenCalled();
  });

  it("shows tool properties when there is no selection and the current tool is configurable", () => {
    const { callbacks, controller, root, stylePanel, stylePanelTitle } = createController({
      currentTool: TOOLS.SHAPE,
      activeShapeTool: TOOLS.ARROW,
    });

    controller.updateContextPanel();

    expect(callbacks.hydrateControlsFromElement).not.toHaveBeenCalled();
    expect(stylePanel.hidden).toBe(false);
    expect(root.dataset.panelMode).toBe("linear-tool");
    expect(root.dataset.selectionHasArrow).toBe("true");
    expect(stylePanelTitle.textContent).toBe("箭头");
  });

  it("hides the panel when there is no selection and no configurable tool", () => {
    const { controller, root, stylePanel, stylePanelTitle } = createController({
      currentTool: TOOLS.SELECT,
    });

    controller.updateContextPanel();

    expect(stylePanel.hidden).toBe(true);
    expect(controller.getStylePanelAvailable()).toBe(false);
    expect(root.dataset.panelMode).toBe("hidden");
    expect(root.dataset.structureSelection).toBe("none");
    expect(root.dataset.selectionHasText).toBe("false");
    expect(stylePanelTitle.textContent).toBe("属性");
  });
});
