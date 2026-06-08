export function createAppChromeController({
  root,
  activeFileLabel,
  zoomLabel,
  panelStateController,
  getElements,
  getSelectedIds,
  getActiveFileName,
  isDirty,
  getScale,
  getBackgroundMode,
  getActiveShapeTool,
  getActiveStructureType,
  syncLinearPanelState,
  syncArrayAlgorithmPanelState,
  syncGraphStructurePanelState,
  syncTreeStructurePanelState,
  syncInspectorPanelState,
  syncBrushPresetButtons,
  updateLayerPanelAvailability,
  renderLayerPanel,
  updateContextPanel,
}) {
  function updateChrome() {
    const elements = getElements();
    const selectedIds = getSelectedIds();
    const activeShapeTool = getActiveShapeTool();

    panelStateController.setPanelCollapsedStateForLayerContent(elements.length > 0);
    const dirtyMarker = isDirty() ? " *" : "";
    activeFileLabel.textContent = `${getActiveFileName()}${dirtyMarker}`;
    zoomLabel.textContent = `${Math.round(getScale() * 100)}%`;
    root.dataset.hasSelection = selectedIds.length > 0 ? "true" : "false";
    const selectedStructures = elements.filter((element) => selectedIds.includes(element.id) && element.type.endsWith?.("-structure"));
    root.dataset.structureSelection = selectedStructures.length === 1 ? selectedStructures[0].type : "none";
    root.querySelectorAll("[data-background-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.backgroundMode === getBackgroundMode());
    });
    root.querySelectorAll("[data-shape-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.shapeTool === activeShapeTool);
    });
    root.dataset.activeShape = selectedIds.length === 1
      ? elements.find((element) => element.id === selectedIds[0])?.type ?? activeShapeTool
      : activeShapeTool;
    const activeStructureType = getActiveStructureType();
    root.querySelectorAll("[data-structure-type]").forEach((button) => {
      button.classList.toggle("active", button.dataset.structureType === activeStructureType);
    });
    root.querySelectorAll("[data-zoom-level]").forEach((button) => {
      button.classList.toggle(
        "active",
        Math.abs(Number(button.dataset.zoomLevel) - getScale()) < 0.02,
      );
    });
    syncLinearPanelState();
    syncArrayAlgorithmPanelState();
    syncGraphStructurePanelState();
    syncTreeStructurePanelState();
    syncInspectorPanelState();
    syncBrushPresetButtons();
    updateLayerPanelAvailability();
    renderLayerPanel();
    updateContextPanel();
  }

  return { updateChrome };
}
