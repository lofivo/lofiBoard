import { describe, expect, it, vi } from "vitest";
import { createControlsBindingController } from "../../src/app/controls-binding-controller.js";
import { TOOLS } from "../../src/ui/ui-config.js";

function createClickable(dataset = {}) {
  const listeners = {};
  return {
    dataset,
    addEventListener: vi.fn((type, listener) => {
      listeners[type] = listener;
    }),
    click() {
      listeners.click?.({ target: this });
    },
    dispatch(type) {
      listeners[type]?.({ target: this });
    },
  };
}

function createRoot(nodes) {
  const rootListeners = {};
  return {
    addEventListener: vi.fn((type, listener) => {
      rootListeners[type] ??= [];
      rootListeners[type].push(listener);
    }),
    dispatchRoot(type, event, index = 0) {
      rootListeners[type]?.[index]?.(event);
    },
    querySelector: vi.fn((selector) => nodes.singletons[selector] ?? null),
    querySelectorAll: vi.fn((selector) => nodes.lists[selector] ?? []),
  };
}

function createController(overrides = {}) {
  const nodes = {
    lists: {
      "[data-tool]": [
        createClickable({ tool: TOOLS.SHAPE }),
      ],
      "[data-tool-action]": [
        createClickable({ toolAction: "import-image" }),
      ],
      "[data-action]": [
        createClickable({ action: "fit-content" }),
      ],
      "[data-background-mode]": [
        createClickable({ backgroundMode: "plain" }),
      ],
      "[data-zoom-level]": [
        createClickable({ zoomLevel: "2" }),
      ],
      "[data-shape-tool]": [
        createClickable({ shapeTool: TOOLS.ARROW }),
      ],
      "[data-structure-type]": [
        createClickable({ structureType: "tree" }),
      ],
      "[data-array-init-mode]": [
        createClickable({ arrayInitMode: "random" }),
      ],
      "[data-panel-toggle]": [
        createClickable({ panelToggle: "layers" }),
      ],
    },
    singletons: {
      "[data-structure-insert]": createClickable(),
      "[data-structure-cancel]": createClickable(),
    },
  };
  const root = createRoot(nodes);
  const refs = {
    graphStructureInput: createClickable(),
    imageInput: createClickable(),
    inspectorSectionButtons: [
      createClickable({ sectionToggle: "appearance" }),
    ],
    linearFieldInputs: {
      highlightStart: createClickable(),
    },
    linearValuesInput: createClickable(),
    menuButton: createClickable(),
    zoomButton: createClickable(),
    zoomInButton: createClickable(),
    zoomOutButton: createClickable(),
  };
  refs.linearValuesInput.value = "1,2,3";
  refs.graphStructureInput.value = "A B";
  refs.linearFieldInputs.highlightStart.value = "2";
  const callbacks = {
    applyInspectorSectionState: vi.fn(),
    bindArrayAlgorithmPanelEvents: vi.fn(),
    bindContextMenuActions: vi.fn(),
    bindLayerPanelEvents: vi.fn(),
    bindPropertyControlEvents: vi.fn(),
    closestElement: overrides.closestElement ?? (() => null),
    hydrateStructurePanel: vi.fn(),
    importSelectedImage: vi.fn(),
    insertStructureFromPanel: vi.fn(),
    runAction: vi.fn(),
    runBinaryTreeNodeAction: vi.fn(),
    runLinearItemAction: vi.fn(),
    runToolAction: vi.fn(),
    runTreeNodeAction: vi.fn(),
    runTreeTraversalAction: vi.fn(),
    setActiveShapeTool: vi.fn(),
    setActiveStructureType: vi.fn(),
    setArrayInitMode: vi.fn(),
    setBackgroundMode: vi.fn(),
    setGraphStructureDraft: vi.fn(),
    setLinearPanelField: vi.fn(),
    setLinearValuesDraft: vi.fn(),
    setShapePopoverOpen: vi.fn(),
    setStructurePanelOpen: vi.fn(),
    setTool: vi.fn(),
    setZoomAtCenter: vi.fn(),
    toggleInspectorSection: vi.fn(),
    toggleMainMenu: vi.fn(),
    togglePanel: vi.fn(),
    toggleZoomMenu: vi.fn(),
    zoomBy: vi.fn(),
  };
  const controller = createControlsBindingController({
    root,
    refs,
    ...callbacks,
  });
  return {
    callbacks,
    controller,
    nodes,
    refs,
    root,
  };
}

describe("controls-binding-controller", () => {
  it("binds top-level toolbar, menu, action, and import controls", () => {
    const { callbacks, controller, nodes, refs } = createController();

    controller.bindControls();

    nodes.lists["[data-tool]"][0].click();
    expect(callbacks.setTool).toHaveBeenCalledWith(TOOLS.SHAPE);
    expect(callbacks.setShapePopoverOpen).toHaveBeenCalledWith(true);
    expect(callbacks.setStructurePanelOpen).toHaveBeenCalledWith(false);

    nodes.lists["[data-tool-action]"][0].click();
    expect(callbacks.runToolAction).toHaveBeenCalledWith("import-image");
    nodes.lists["[data-action]"][0].click();
    expect(callbacks.runAction).toHaveBeenCalledWith("fit-content");
    refs.menuButton.click();
    expect(callbacks.toggleMainMenu).toHaveBeenCalled();
    refs.imageInput.dispatch("change");
    expect(callbacks.importSelectedImage).toHaveBeenCalled();
  });

  it("binds structure and inspector input drafts", () => {
    const { callbacks, controller, nodes, refs } = createController();

    controller.bindControls();

    refs.linearValuesInput.dispatch("input");
    expect(callbacks.setLinearValuesDraft).toHaveBeenCalledWith("1,2,3");
    refs.graphStructureInput.dispatch("input");
    expect(callbacks.setGraphStructureDraft).toHaveBeenCalledWith("A B");
    refs.linearFieldInputs.highlightStart.dispatch("input");
    expect(callbacks.setLinearPanelField).toHaveBeenCalledWith("highlightStart", "2");

    nodes.lists["[data-structure-type]"][0].click();
    expect(callbacks.setActiveStructureType).toHaveBeenCalledWith("tree");
    nodes.lists["[data-array-init-mode]"][0].click();
    expect(callbacks.setArrayInitMode).toHaveBeenCalledWith("random");
    expect(callbacks.hydrateStructurePanel).toHaveBeenCalled();
    nodes.singletons["[data-structure-insert]"].click();
    expect(callbacks.insertStructureFromPanel).toHaveBeenCalled();
  });

  it("delegates floating structure control actions through safe closest lookup", () => {
    const button = { dataset: { linearItemAction: "delete" } };
    const closestElement = vi.fn(() => button);
    const { callbacks, controller, root } = createController({
      closestElement,
    });

    controller.bindControls();
    root.dispatchRoot("click", { target: {} }, 0);

    expect(callbacks.closestElement).toHaveBeenCalledWith({}, "[data-linear-item-action]");
    expect(callbacks.runLinearItemAction).toHaveBeenCalledWith("delete");
  });

  it("binds secondary panel and zoom controls", () => {
    const { callbacks, controller, nodes, refs } = createController();

    controller.bindControls();

    nodes.lists["[data-background-mode]"][0].click();
    expect(callbacks.setBackgroundMode).toHaveBeenCalledWith("plain");
    nodes.lists["[data-zoom-level]"][0].click();
    expect(callbacks.setZoomAtCenter).toHaveBeenCalledWith(2);
    refs.zoomButton.click();
    expect(callbacks.toggleZoomMenu).toHaveBeenCalled();
    refs.zoomOutButton.click();
    expect(callbacks.zoomBy).toHaveBeenCalledWith(1 / 1.25);
    refs.zoomInButton.click();
    expect(callbacks.zoomBy).toHaveBeenCalledWith(1.25);
    nodes.lists["[data-panel-toggle]"][0].click();
    expect(callbacks.togglePanel).toHaveBeenCalledWith("layers");
    refs.inspectorSectionButtons[0].click();
    expect(callbacks.toggleInspectorSection).toHaveBeenCalledWith("appearance");
    expect(callbacks.applyInspectorSectionState).toHaveBeenCalled();
  });
});
