export function createToolActivationController({
  root,
  toolController,
  tools,
  getStageContainer,
  getToolStatus,
  setActiveShapeToolState,
  setCurrentTool,
  cancelSelectionDrag,
  clearSelection,
  hideToolCursors,
  renderBoard,
  resetLinearItemPressState,
  resetLinearPointerPressState,
  restorePropertyControlsForTool,
  saveToolPropertyControlsForCurrentTool,
  setShapePopoverOpen,
  setStatus,
  setStructurePanelOpen,
  syncInspectorPanelState,
  syncSelectionNodes,
  syncWebpageOverlays = () => {},
  updateChrome,
  updateDraggableState,
}) {
  function setTool(tool) {
    const { previousTool, toolChanged } = toolController.setTool(tool);
    if (toolChanged) saveToolPropertyControlsForCurrentTool();
    setCurrentTool(toolController.currentTool);
    if (tool !== tools.SELECT) {
      resetLinearItemPressState();
      resetLinearPointerPressState();
      cancelSelectionDrag();
    }
    root.querySelectorAll("[data-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === tool);
    });
    if (tool !== tools.SHAPE) setShapePopoverOpen(false);
    if (tool !== tools.STRUCTURE) setStructurePanelOpen(false);
    if (tool === tools.STRUCTURE) setStructurePanelOpen(true);
    hideToolCursors();
    const stageContainer = getStageContainer();
    stageContainer.classList.remove("is-erasing");
    if (![tools.SELECT, tools.PAN].includes(tool)) {
      clearSelection();
    }
    updateDraggableState();
    syncSelectionNodes();
    syncWebpageOverlays();
    stageContainer.dataset.tool = tool;
    if (toolChanged) {
      restorePropertyControlsForTool(tool);
      syncInspectorPanelState({ forceReset: true });
    }
    updateChrome();
    setStatus(getToolStatus(tool));
    if (toolChanged && (tool === tools.SELECT || previousTool === tools.SELECT)) {
      renderBoard();
    }
  }

  function setActiveShapeTool(shapeTool) {
    const activeShapeTool = toolController.setActiveShapeTool(shapeTool);
    setActiveShapeToolState(activeShapeTool);
    return activeShapeTool;
  }

  return {
    setActiveShapeTool,
    setTool,
  };
}
