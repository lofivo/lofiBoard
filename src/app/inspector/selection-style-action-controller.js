export function createSelectionStyleActionController({
  controls = {},
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

    const didApply = selectionStyleController.applyStyleToSelection({
      arrowDoubleEnded: controls.arrowDoubleEndedInput?.checked,
      color: controls.colorInput?.value,
      fillColor: controls.fillInput?.value,
      fillTransparent: controls.fillTransparentInput?.checked,
      fontFamily: controls.fontFamilyInput?.value,
      fontSize: controls.fontSizeInput?.value,
      strokeStyle: getStrokeStyleFromControls(),
      width: controls.widthInput?.value,
    });
    if (!didApply) return;

    renderBoard();
    pushHistory("已更新样式");
  }

  function applyCoordinateStyleToSelection() {
    const didApply = selectionStyleController.applyCoordinateStyleToSelection({
      axisStroke: controls.coordinateAxisColorInput?.value,
      gridStroke: controls.coordinateGridColorInput?.value,
      labelFill: controls.coordinateLabelColorInput?.value,
      showGrid: controls.coordinateShowGridInput?.checked,
      showLabels: controls.coordinateShowLabelsInput?.checked,
      showTicks: controls.coordinateShowTicksInput?.checked,
      unitSize: controls.coordinateUnitSizeInput?.value,
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
