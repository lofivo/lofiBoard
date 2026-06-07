import {
  getPropertyPanelTitle,
  getSelectionHydrateSource,
  getSelectionInspectorCapabilities,
  getSelectionPanelMode,
  getToolInspectorCapabilities,
  getToolPanelMode,
  getToolPropertyPanelTitle,
  isToolPropertyPanelAvailable,
} from "./inspector-model.js";
import { resolveActiveDrawingTool } from "../../tools/tool-behavior.js";

export function createInspectorPanelDomController({
  root,
  stylePanel,
  stylePanelTitle,
  getElements,
  getSelectedIds,
  getCurrentTool,
  getActiveShapeTool,
  hydrateControlsFromElement,
  applyPanelState,
}) {
  let stylePanelAvailable = true;

  function updateContextPanel() {
    const selectedIds = getSelectedIds();
    const selectedElements = getElements().filter((element) => selectedIds.includes(element.id));
    const first = selectedElements[0];

    if (first) {
      const hydrateSource = getSelectionHydrateSource(selectedElements) ?? first;
      hydrateControlsFromElement(hydrateSource);
      syncSelectionInspectorDataset(getSelectionInspectorCapabilities(selectedElements));
      stylePanel.hidden = false;
      stylePanelAvailable = true;
      root.dataset.panelMode = getSelectionPanelMode(selectedElements);
      syncPropertyPanelTitle(selectedElements);
      applyPanelState();
      return;
    }

    const currentTool = getCurrentTool();
    if (isToolPropertyPanelAvailable(currentTool)) {
      stylePanel.hidden = false;
      stylePanelAvailable = true;
      const activeShapeTool = getActiveShapeTool();
      const drawingTool = resolveActiveDrawingTool(currentTool, activeShapeTool);
      syncSelectionInspectorDataset(getToolInspectorCapabilities(drawingTool, currentTool));
      root.dataset.panelMode = getToolPanelMode(currentTool, drawingTool);
      syncToolPropertyPanelTitle(currentTool, activeShapeTool);
      applyPanelState();
      return;
    }

    stylePanel.hidden = true;
    stylePanelAvailable = false;
    root.dataset.panelMode = "hidden";
    root.dataset.structureSelection = "none";
    syncPropertyPanelTitle([]);
    syncSelectionInspectorDataset(getSelectionInspectorCapabilities([]));
    applyPanelState();
  }

  function syncPropertyPanelTitle(selectedElements = []) {
    if (!stylePanelTitle) return;
    stylePanelTitle.textContent = getPropertyPanelTitle(selectedElements);
  }

  function syncToolPropertyPanelTitle(currentTool, activeShapeTool) {
    if (!stylePanelTitle) return;
    stylePanelTitle.textContent = getToolPropertyPanelTitle(currentTool, activeShapeTool);
  }

  function syncSelectionInspectorDataset(capabilities) {
    root.dataset.selectionHasText = String(capabilities.text);
    root.dataset.selectionHasSticky = String(capabilities.sticky);
    root.dataset.selectionHasStroke = String(capabilities.stroke);
    root.dataset.selectionHasDrawing = String(capabilities.drawing);
    root.dataset.selectionHasFillShape = String(capabilities.fillShape);
    root.dataset.selectionHasArrow = String(capabilities.arrow);
    root.dataset.selectionHasCoordinate = String(capabilities.coordinate);
  }

  function getStylePanelAvailable() {
    return stylePanelAvailable;
  }

  return {
    getStylePanelAvailable,
    updateContextPanel,
  };
}
