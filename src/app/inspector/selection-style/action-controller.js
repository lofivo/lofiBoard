export function createSelectionStyleActionController({
  getControlValues = () => ({}),
  getElements = () => [],
  getSelectedIds = () => [],
  getStrokeStyleFromControls = () => ({}),
  selectionStyleController,
  pushHistory = () => {},
  renderBoard = () => {},
  saveToolPropertyControlsForCurrentTool = () => {},
  selectIds = () => {},
  setStatus = () => {},
  updateContextPanel = () => {},
}) {
  function applyStyleToSelection() {
    if (getSelectedIds().length === 0) {
      saveToolPropertyControlsForCurrentTool();
      updateContextPanel();
      return;
    }

    const controls = getControlValues();
    const didApply = selectionStyleController.applyStyleToSelection({
      arrowDoubleEnded: controls.arrowDoubleEnded,
      color: controls.color,
      fillColor: controls.fill,
      fillTransparent: controls.fillTransparent,
      fontFamily: controls.fontFamily,
      fontSize: controls.fontSize,
      strokeStyle: getStrokeStyleFromControls(),
      width: controls.width,
    });
    if (!didApply) return;

    renderBoard();
    pushHistory("已更新样式");
  }

  function applyCoordinateStyleToSelection() {
    const controls = getControlValues();
    const didApply = selectionStyleController.applyCoordinateStyleToSelection({
      axisStroke: controls.coordinateAxisColor,
      gridStroke: controls.coordinateGridColor,
      labelFill: controls.coordinateLabelColor,
      showGrid: controls.coordinateShowGrid,
      showLabels: controls.coordinateShowLabels,
      showTicks: controls.coordinateShowTicks,
      unitSize: controls.coordinateUnitSize,
    });
    if (!didApply) return;

    renderBoard();
    pushHistory("已更新坐标系");
  }

  function toggleTextStyle(style) {
    const didToggle = selectionStyleController.toggleTextStyle(style);
    if (!didToggle) return;

    renderBoard();
    pushHistory("已更新文字样式");
  }

  function selectAllElements() {
    const selectableIds = getElements().filter((element) => !element.locked).map((element) => element.id);
    if (selectableIds.length === 0) return;

    selectIds(selectableIds);
    setStatus(`已选择全部对象 (${selectableIds.length})`);
  }

  return {
    applyCoordinateStyleToSelection,
    applyStyleToSelection,
    selectAllElements,
    toggleTextStyle,
  };
}
