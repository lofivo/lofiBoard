export function createViewportController({
  stage,
  container,
  zoomLabel,
  getZoomLevelButtons = () => [],
  updateBrushCursorStyle = () => {},
  updateEraserCursorStyle = () => {},
  updateLinearItemControlsPosition = () => {},
  syncActiveCellEditor = () => {},
  syncTextOverlays = () => {},
  updateContextPanel = () => {},
  schedulePersistCurrentDraft = () => {},
  closeZoomMenu = () => {},
}) {
  function getViewport() {
    return {
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX(),
    };
  }

  function updateGrid() {
    const scale = stage.scaleX();
    const size = Math.max(12, 32 * scale);
    container.style.setProperty("--grid-size", `${size}px`);
    container.style.setProperty("--grid-x", `${stage.x()}px`);
    container.style.setProperty("--grid-y", `${stage.y()}px`);
    updateLinearItemControlsPosition();
    syncActiveCellEditor();
    syncTextOverlays();
  }

  function getZoomLabelText() {
    return zoomLabel.textContent;
  }

  function updateViewportChrome() {
    zoomLabel.textContent = `${Math.round(stage.scaleX() * 100)}%`;
    for (const button of getZoomLevelButtons()) {
      button.classList.toggle(
        "active",
        Math.abs(Number(button.dataset.zoomLevel) - stage.scaleX()) < 0.02,
      );
    }
    updateContextPanel();
  }

  function applyViewport(viewport) {
    stage.position({ x: viewport.x, y: viewport.y });
    stage.scale({ x: viewport.scale, y: viewport.scale });
    updateGrid();
    updateBrushCursorStyle();
    updateEraserCursorStyle();
    syncTextOverlays();
  }

  function setZoomAtCenter(requestedScale) {
    const oldScale = stage.scaleX();
    const newScale = clamp(requestedScale, 0.12, 4);
    const center = {
      x: stage.width() / 2,
      y: stage.height() / 2,
    };
    const worldCenter = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: center.x - worldCenter.x * newScale,
      y: center.y - worldCenter.y * newScale,
    });
    closeZoomMenu();
    updateGrid();
    updateBrushCursorStyle();
    updateEraserCursorStyle();
    updateViewportChrome();
    syncTextOverlays();
    schedulePersistCurrentDraft();
  }

  function zoomBy(multiplier) {
    setZoomAtCenter(stage.scaleX() * multiplier);
  }

  function handleWheel(event) {
    event.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const newScale = clamp(
      direction > 0 ? oldScale * scaleBy : oldScale / scaleBy,
      0.12,
      4,
    );
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    updateGrid();
    updateBrushCursorStyle();
    updateEraserCursorStyle();
    updateViewportChrome();
    syncTextOverlays();
    schedulePersistCurrentDraft();
  }

  return {
    getViewport,
    getZoomLabelText,
    applyViewport,
    updateGrid,
    updateViewportChrome,
    setZoomAtCenter,
    zoomBy,
    handleWheel,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
