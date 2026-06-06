export function createLayerPanelController({
  layerPanel,
  layerList,
  closestElement,
  renderLayerItemsMarkup,
  isLayerPanelAvailable,
  getElements,
  getSelectedIds,
  selectTool,
  setTool,
  selectElementById,
  ensureSelectionVisible,
  applyPanelState,
}) {
  let layerPanelAvailable = false;

  function bindLayerPanelEvents() {
    layerList.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-layer-id]");
      if (!button) return;
      setTool(selectTool);
      selectElementById(button.dataset.layerId, event.shiftKey);
      ensureSelectionVisible();
    });
  }

  function updateLayerPanelAvailability() {
    layerPanelAvailable = isLayerPanelAvailable();
    layerPanel.hidden = !layerPanelAvailable;
    applyPanelState();
  }

  function renderLayerPanel() {
    layerList.innerHTML = renderLayerItemsMarkup({
      elements: getElements(),
      selectedIds: getSelectedIds(),
    });
  }

  function getLayerPanelAvailable() {
    return layerPanelAvailable;
  }

  return {
    bindLayerPanelEvents,
    getLayerPanelAvailable,
    renderLayerPanel,
    updateLayerPanelAvailability,
  };
}
