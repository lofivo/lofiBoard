import { describe, expect, it, vi } from "vitest";
import { createPanelDomController } from "../../src/app/panel-dom-controller.js";
import { createPanelStateController } from "../../src/app/panel-state-controller.js";

function createClassList() {
  return {
    toggle: vi.fn(),
  };
}

function createSection(name) {
  const button = { setAttribute: vi.fn() };
  const content = { setAttribute: vi.fn() };
  return {
    dataset: { inspectorSection: name },
    hidden: false,
    querySelector: vi.fn((selector) => {
      if (selector === "[data-section-toggle]") return button;
      if (selector === "[data-section-content]") return content;
      return null;
    }),
    button,
    content,
  };
}

function createController({ getInspectorContext = () => "appearance" } = {}) {
  const sections = [
    createSection("appearance"),
    createSection("linear"),
  ];
  const nodes = {
    styleToggle: { textContent: "" },
    layerToggle: { textContent: "" },
    styleEdge: { classList: createClassList() },
    layerEdge: { classList: createClassList() },
  };
  const root = {
    querySelector: vi.fn((selector) => {
      if (selector === "[data-panel-toggle='style']") return nodes.styleToggle;
      if (selector === "[data-panel-toggle='layers']") return nodes.layerToggle;
      if (selector === "[data-panel-edge='style']") return nodes.styleEdge;
      if (selector === "[data-panel-edge='layers']") return nodes.layerEdge;
      return null;
    }),
    querySelectorAll: vi.fn((selector) => (selector === "[data-inspector-section]" ? sections : [])),
  };
  const stylePanel = { classList: createClassList() };
  const layerPanel = { classList: createClassList() };
  const panelBody = { scrollTo: vi.fn() };
  const panelStateController = createPanelStateController({
    initialPanelCollapsedState: { style: false, layers: true },
  });
  const controller = createPanelDomController({
    root,
    stylePanel,
    layerPanel,
    panelBody,
    panelStateController,
    getInspectorContext,
    getStylePanelAvailable: () => true,
    getLayerPanelAvailable: () => false,
    shouldShowPanelEdgeToggle: ({ collapsed, available }) => collapsed && available,
  });
  return {
    controller,
    layerPanel,
    nodes,
    panelBody,
    root,
    sections,
    stylePanel,
  };
}

describe("panel-dom-controller", () => {
  it("applies side panel collapsed state and edge toggles", () => {
    const { controller, layerPanel, nodes, stylePanel } = createController();

    controller.applyPanelState();

    expect(stylePanel.classList.toggle).toHaveBeenCalledWith("is-collapsed", false);
    expect(layerPanel.classList.toggle).toHaveBeenCalledWith("is-collapsed", true);
    expect(nodes.styleToggle.textContent).toBe("‹");
    expect(nodes.layerToggle.textContent).toBe("‹");
    expect(nodes.styleEdge.classList.toggle).toHaveBeenCalledWith("is-visible", false);
    expect(nodes.layerEdge.classList.toggle).toHaveBeenCalledWith("is-visible", false);

    controller.togglePanel("style");
    expect(stylePanel.classList.toggle).toHaveBeenLastCalledWith("is-collapsed", true);
    expect(nodes.styleToggle.textContent).toBe("›");
    expect(nodes.styleEdge.classList.toggle).toHaveBeenLastCalledWith("is-visible", true);
  });

  it("applies inspector section visibility and expanded state", () => {
    const { controller, sections } = createController();

    controller.applyInspectorSectionState();

    expect(sections[0].hidden).toBe(false);
    expect(sections[0].dataset.collapsed).toBe("false");
    expect(sections[0].button.setAttribute).toHaveBeenCalledWith("aria-expanded", "true");
    expect(sections[0].content.setAttribute).toHaveBeenCalledWith("aria-hidden", "false");
    expect(sections[1].hidden).toBe(true);
    expect(sections[1].dataset.collapsed).toBe("true");
  });

  it("syncs inspector context and resets scroll only when context changes", () => {
    let context = "appearance";
    const { controller, panelBody } = createController({
      getInspectorContext: () => context,
    });

    controller.syncInspectorPanelState();
    expect(panelBody.scrollTo).not.toHaveBeenCalled();

    context = "linear";
    controller.syncInspectorPanelState();
    expect(panelBody.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
