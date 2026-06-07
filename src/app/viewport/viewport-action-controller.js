import { computeFitViewport, computeViewportForBoundsVisibility } from "../../canvas/viewport-service.js";

export function createViewportActionController({
  getElementCount,
  getContentBounds,
  getSelectedContentBounds,
  getViewport,
  getStageSize,
  applyViewport,
  serializeCurrentBoard,
  setBoard,
  pushBoardHistory,
  setDirty,
  persistCurrentDraft,
  updateChrome,
  setStatus,
  getBackgroundMode,
  setBackgroundModeValue,
  applyBackground,
  pushHistory,
  closeMainMenu,
  computeFitViewportFn = computeFitViewport,
  computeViewportForBoundsVisibilityFn = computeViewportForBoundsVisibility,
}) {
  function commitSerializedBoard({ pushHistorySnapshot = false } = {}) {
    const nextBoard = serializeCurrentBoard();
    setBoard(nextBoard);
    if (pushHistorySnapshot) pushBoardHistory(nextBoard);
    setDirty(true);
    updateChrome();
    return nextBoard;
  }

  function fitContent() {
    if (getElementCount() === 0) {
      setStatus("当前白板没有可适配的内容");
      return;
    }

    const bounds = getContentBounds();
    if (!bounds) return;

    applyViewport(computeFitViewportFn({
      bounds,
      stageSize: getStageSize(),
      padding: 96,
    }));
    commitSerializedBoard({ pushHistorySnapshot: true });
    setStatus("已适配全部内容");
  }

  function ensureSelectionVisible() {
    const bounds = getSelectedContentBounds();
    if (!bounds) return;

    const viewport = getViewport();
    const nextViewport = computeViewportForBoundsVisibilityFn({
      bounds,
      viewport,
      stageSize: getStageSize(),
      padding: 96,
    });

    if (nextViewport.x === viewport.x && nextViewport.y === viewport.y && nextViewport.scale === viewport.scale) {
      return;
    }
    applyViewport(nextViewport);
    commitSerializedBoard();
  }

  function resetView() {
    applyViewport({ x: 0, y: 0, scale: 1 });
    commitSerializedBoard({ pushHistorySnapshot: true });
    const draftSaved = persistCurrentDraft();
    if (draftSaved) setStatus("已重置视图");
  }

  function setBackgroundMode(backgroundMode) {
    if (!["dots", "plain"].includes(backgroundMode)) return;
    if (getBackgroundMode() === backgroundMode) {
      closeMainMenu();
      return;
    }

    setBackgroundModeValue(backgroundMode);
    applyBackground();
    pushHistory(backgroundMode === "dots" ? "已切换为点阵背景" : "已切换为纯白背景");
    closeMainMenu();
  }

  return {
    ensureSelectionVisible,
    fitContent,
    resetView,
    setBackgroundMode,
  };
}
