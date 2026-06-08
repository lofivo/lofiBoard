import { describe, expect, it, vi } from "vitest";
import { createLayerPanelController } from "../../../../src/app/panels/layer/controller.js";

function createController(overrides = {}) {
  const listeners = {};
  const layerPanel = { hidden: true };
  const layerList = {
    innerHTML: "",
    addEventListener: vi.fn((type, listener) => {
      listeners[type] = listener;
    }),
  };
  const callbacks = {
    applyPanelState: vi.fn(),
    ensureSelectionVisible: vi.fn(),
    selectElementById: vi.fn(),
    setTool: vi.fn(),
  };
  const controller = createLayerPanelController({
    layerPanel,
    layerList,
    closestElement: overrides.closestElement ?? (() => null),
    renderLayerItemsMarkup: overrides.renderLayerItemsMarkup ?? (() => "<button></button>"),
    isLayerPanelAvailable: overrides.isLayerPanelAvailable ?? (() => true),
    getElements: overrides.getElements ?? (() => [{ id: "rect_1", type: "rect" }]),
    getSelectedIds: overrides.getSelectedIds ?? (() => ["rect_1"]),
    selectTool: "select",
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    layerList,
    layerPanel,
    listeners,
  };
}

describe("app panels layer controller", () => {
  it("syncs layer panel availability and applies panel state", () => {
    const { callbacks, controller, layerPanel } = createController({
      isLayerPanelAvailable: () => true,
    });

    controller.updateLayerPanelAvailability();

    expect(controller.getLayerPanelAvailable()).toBe(true);
    expect(layerPanel.hidden).toBe(false);
    expect(callbacks.applyPanelState).toHaveBeenCalled();
  });

  it("renders layer items from board elements and selected ids", () => {
    const renderLayerItemsMarkup = vi.fn(() => "<button data-layer-id=\"rect_1\"></button>");
    const { controller, layerList } = createController({
      renderLayerItemsMarkup,
      getElements: () => [{ id: "rect_1", type: "rect" }],
      getSelectedIds: () => ["rect_1"],
    });

    controller.renderLayerPanel();

    expect(renderLayerItemsMarkup).toHaveBeenCalledWith({
      elements: [{ id: "rect_1", type: "rect" }],
      selectedIds: ["rect_1"],
    });
    expect(layerList.innerHTML).toBe("<button data-layer-id=\"rect_1\"></button>");
  });

  it("selects a layer item through delegated clicks", () => {
    const button = { dataset: { layerId: "rect_1" } };
    const { callbacks, controller, listeners } = createController({
      closestElement: () => button,
    });
    controller.bindLayerPanelEvents();

    listeners.click({ target: {}, shiftKey: true });

    expect(callbacks.setTool).toHaveBeenCalledWith("select");
    expect(callbacks.selectElementById).toHaveBeenCalledWith("rect_1", true);
    expect(callbacks.ensureSelectionVisible).toHaveBeenCalled();
  });

  it("ignores delegated clicks that do not hit a layer item", () => {
    const { callbacks, controller, listeners } = createController();
    controller.bindLayerPanelEvents();

    listeners.click({ target: {}, shiftKey: false });

    expect(callbacks.setTool).not.toHaveBeenCalled();
    expect(callbacks.selectElementById).not.toHaveBeenCalled();
  });
});
