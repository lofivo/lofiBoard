import { TOOLS } from "../../ui/config.js";

export function createControlsBindingController({
  root,
  refs,
  closestElement,
  runToolAction,
  runAction,
  runLinearItemAction,
  runTreeNodeAction,
  runBinaryTreeNodeAction,
  runGraphNodeAction,
  runTreeTraversalAction,
  setTool,
  setShapePopoverOpen,
  setStructurePanelOpen,
  setBackgroundMode,
  setZoomAtCenter,
  setActiveShapeTool,
  setActiveStructureType,
  setArrayInitMode,
  hydrateStructurePanel,
  insertStructureFromPanel,
  bindPropertyControlEvents,
  bindArrayAlgorithmPanelEvents,
  bindContextMenuActions,
  bindLayerPanelEvents,
  toggleMainMenu,
  toggleZoomMenu,
  zoomBy,
  importSelectedImage,
  togglePanel,
  toggleInspectorSection,
  applyInspectorSectionState,
  setLinearValuesDraft,
  setGraphStructureDraft,
  setGraphNodeScale,
  setLinearPanelField,
}) {
  const {
    graphStructureInput,
    graphNodeScale,
    imageInput,
    inspectorSectionButtons,
    linearFieldInputs,
    linearValuesInput,
    menuButton,
    zoomButton,
    zoomInButton,
    zoomOutButton,
  } = refs;

  function bindControls() {
    for (const button of root.querySelectorAll("[data-tool]")) {
      button.addEventListener("click", () => {
        setTool(button.dataset.tool);
        setShapePopoverOpen(button.dataset.tool === TOOLS.SHAPE);
        setStructurePanelOpen(button.dataset.tool === TOOLS.STRUCTURE);
      });
    }
    for (const button of root.querySelectorAll("[data-tool-action]")) {
      button.addEventListener("click", () => runToolAction(button.dataset.toolAction));
    }

    menuButton.addEventListener("click", toggleMainMenu);

    for (const button of root.querySelectorAll("[data-action]")) {
      button.addEventListener("click", () => runAction(button.dataset.action));
    }
    linearValuesInput?.addEventListener("input", () => {
      setLinearValuesDraft(linearValuesInput.value);
    });
    bindArrayAlgorithmPanelEvents();
    graphStructureInput?.addEventListener("input", () => {
      setGraphStructureDraft(graphStructureInput.value);
    });
    graphNodeScale?.addEventListener("input", () => {
      setGraphNodeScale?.(Number(graphNodeScale.value));
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-linear-item-action]");
      if (!button) return;
      runLinearItemAction(button.dataset.linearItemAction);
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-tree-node-action]");
      if (!button) return;
      runTreeNodeAction(button.dataset.treeNodeAction);
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-binary-tree-node-action]");
      if (!button) return;
      runBinaryTreeNodeAction(button.dataset.binaryTreeNodeAction);
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-binary-tree-traversal-action]");
      if (!button) return;
      runTreeTraversalAction(button.dataset.binaryTreeTraversalAction);
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-graph-node-action]");
      if (!button) return;
      runGraphNodeAction(button.dataset.graphNodeAction);
    });

    for (const button of root.querySelectorAll("[data-background-mode]")) {
      button.addEventListener("click", () => setBackgroundMode(button.dataset.backgroundMode));
    }

    bindContextMenuActions();

    for (const button of root.querySelectorAll("[data-zoom-level]")) {
      button.addEventListener("click", () => setZoomAtCenter(Number(button.dataset.zoomLevel)));
    }

    for (const button of root.querySelectorAll("[data-shape-tool]")) {
      button.addEventListener("click", () => {
        setActiveShapeTool(button.dataset.shapeTool);
        setTool(TOOLS.SHAPE);
        setShapePopoverOpen(false);
      });
    }

    for (const button of root.querySelectorAll("[data-structure-type]")) {
      button.addEventListener("click", () => {
        setActiveStructureType(button.dataset.structureType);
      });
    }
    for (const button of root.querySelectorAll("[data-array-init-mode]")) {
      button.addEventListener("click", () => {
        setArrayInitMode(button.dataset.arrayInitMode);
        hydrateStructurePanel();
      });
    }
    root.querySelector("[data-structure-insert]")?.addEventListener("click", insertStructureFromPanel);
    root.querySelector("[data-structure-cancel]")?.addEventListener("click", () => {
      setStructurePanelOpen(false);
      setTool(TOOLS.SELECT);
    });
    hydrateStructurePanel();

    bindPropertyControlEvents();
    zoomButton.addEventListener("click", toggleZoomMenu);
    zoomOutButton.addEventListener("click", () => zoomBy(1 / 1.25));
    zoomInButton.addEventListener("click", () => zoomBy(1.25));
    imageInput.addEventListener("change", importSelectedImage);
    for (const button of root.querySelectorAll("[data-panel-toggle]")) {
      button.addEventListener("click", () => togglePanel(button.dataset.panelToggle));
    }
    inspectorSectionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        toggleInspectorSection(button.dataset.sectionToggle);
        applyInspectorSectionState();
      });
    });
    Object.entries(linearFieldInputs).forEach(([key, input]) => {
      if (!input) return;
      input.addEventListener("input", () => {
        setLinearPanelField(key, input.value);
      });
    });
    bindLayerPanelEvents();
  }

  return { bindControls };
}
