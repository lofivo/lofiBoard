import { LINEAR_STRUCTURE_EVENT_TYPES } from "../../structures/event-adapter.js";

export function createLinearStructureGestureController({
  batchDraw = () => {},
  beginLinearItemDrag = () => {},
  beginLinearPointerDrag = () => {},
  beginSelectionDrag = () => {},
  cancelLinearPointerDrag = () => {},
  clearRootDragState = () => {},
  clearTimeoutFn = (timer) => globalThis.clearTimeout(timer),
  commitLinearItemDrag = () => false,
  commitLinearPointerDrag = () => false,
  expandGroupedIds = (ids) => ids,
  getCurrentTool = () => "select",
  getElements = () => [],
  getSelectedIds = () => [],
  getWorldPoint = () => null,
  isElementDraggable = () => false,
  isLinearStructureElement = () => false,
  isTemporaryPanActive = () => false,
  renderBinaryTreeControls = () => {},
  renderLinearItemControls = () => {},
  selectIds = () => {},
  selectTool = "select",
  setElementDraggableState = () => {},
  setSuppressSelectionDragOnce = () => {},
  setTimeoutFn = (callback, delay) => globalThis.setTimeout(callback, delay),
  stopElementDrag = () => {},
  structureInteraction,
  syncLinearItemActiveVisual = () => {},
  updateLinearItemDrag = () => false,
  updateLinearPointerDrag = () => false,
  updateSelectionDrag = () => {},
} = {}) {
  let linearItemPressState = null;
  let linearPointerPressState = null;
  let suppressLinearItemSelectTimer = null;

  function getElement(elementId) {
    return (getElements?.() ?? []).find((item) => item.id === elementId) ?? null;
  }

  function getInteractionContext() {
    return {
      elements: getElements?.() ?? [],
      currentTool: getCurrentTool(),
      isTemporaryPanActive: isTemporaryPanActive(),
    };
  }

  function dispatchLinearStructureEvent(event) {
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT) {
      handleArrayStructureItemSelect(event);
      return;
    }
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS) {
      handleArrayStructureItemPress(event);
      return;
    }
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_RELEASE) {
      handleArrayStructureItemRelease();
    }
  }

  function handlePointerMove(worldPoint) {
    if (structureInteraction.hasLinearPointerDragState()) {
      updateLinearPointerDrag(worldPoint);
      return true;
    }

    if (linearPointerPressState?.phase === "start" && linearPointerPressState.startWorldPoint) {
      linearPointerPressState = {
        ...linearPointerPressState,
        currentWorldPoint: worldPoint,
      };
      const distance = Math.hypot(
        worldPoint.x - linearPointerPressState.startWorldPoint.x,
        worldPoint.y - linearPointerPressState.startWorldPoint.y,
      );
      if (distance > 6) {
        beginLinearPointerDrag({
          elementId: linearPointerPressState.elementId,
          index: linearPointerPressState.index,
          worldPoint,
        });
        resetLinearPointerPressState();
        return true;
      }
    }

    if (structureInteraction.hasLinearItemDragState()) {
      updateLinearItemDrag(worldPoint);
      return true;
    }

    if (linearItemPressState?.phase === "start" && linearItemPressState.startWorldPoint) {
      const pressStart = linearItemPressState.startWorldPoint;
      const pressedElementId = linearItemPressState.elementId;
      linearItemPressState = {
        ...linearItemPressState,
        currentWorldPoint: worldPoint,
      };
      const distance = Math.hypot(
        worldPoint.x - pressStart.x,
        worldPoint.y - pressStart.y,
      );
      if (distance > 6) {
        const targetIds = expandGroupedIds([pressedElementId]);
        if (!getSelectedIds().some((id) => targetIds.includes(id))) {
          selectIds([pressedElementId]);
        }
        resetLinearItemPressState();
        beginSelectionDrag(pressStart);
        updateSelectionDrag(worldPoint);
        return true;
      }
    }

    return false;
  }

  function handlePointerUp() {
    if (structureInteraction.hasLinearPointerDragState()) {
      resetLinearPointerPressState();
      return Boolean(commitLinearPointerDrag());
    }

    resetLinearPointerPressState();

    if (structureInteraction.hasLinearItemDragState()) {
      resetLinearItemPressState();
      return Boolean(commitLinearItemDrag());
    }

    resetLinearItemPressState();
    return false;
  }

  function handleArrayStructureItemSelect({ elementId, index }) {
    const result = structureInteraction.handleEvent({
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT,
      elementId,
      index,
    }, getInteractionContext());
    if (!result.handled) return;
    if (result.clearSuppression) {
      clearLinearItemSelectSuppression();
      return;
    }
    selectIds(result.selectedIds);
    syncLinearItemActiveVisual(result.previousActiveLinearItem?.elementId);
    syncLinearItemActiveVisual(result.activeLinearItem?.elementId);
    renderLinearItemControls();
    renderBinaryTreeControls();
    batchDraw();
  }

  function handleArrayStructureItemPress({ elementId, index }) {
    const result = structureInteraction.handleEvent({
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS,
      elementId,
      index,
    }, getInteractionContext());
    if (!result.handled || !result.pressState) return;
    const worldPoint = getWorldPoint();
    if (result.clearSuppression) clearLinearItemSelectSuppression();
    setSuppressSelectionDragOnce(result.suppressSelectionDragOnce);
    if (result.stopElementDrag) stopElementDrag(elementId);
    linearItemPressState = {
      ...result.pressState,
      holdTimer: setTimeoutFn(() => {
        if (!linearItemPressState || linearItemPressState.elementId !== result.pressState.elementId || linearItemPressState.index !== result.pressState.index) return;
        linearItemPressState = {
          ...linearItemPressState,
          phase: "hold",
          holdTimer: null,
        };
        beginLinearItemDrag({
          elementId: result.pressState.elementId,
          index: result.pressState.index,
          worldPoint: linearItemPressState.currentWorldPoint ?? linearItemPressState.startWorldPoint ?? worldPoint,
        });
      }, 250),
      startWorldPoint: worldPoint,
      currentWorldPoint: worldPoint,
    };
    setElementDraggableState(result.pressState.elementId, false);
  }

  function handleArrayStructureItemRelease() {
    const result = structureInteraction.handleEvent({ type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_RELEASE });
    if (!result.handled) return;
    if (result.resetLinearItemPressState) resetLinearItemPressState();
  }

  function handleArrayPointerPress({ elementId, index }) {
    if (isTemporaryPanActive() || getCurrentTool() !== selectTool) return;
    const element = getElement(elementId);
    if (!isLinearStructureElement(element) || element.locked || (element.items?.length ?? 0) === 0) return;
    const worldPoint = getWorldPoint();
    if (!worldPoint) return;
    setSuppressSelectionDragOnce(true);
    clearRootDragState(elementId);
    linearPointerPressState = {
      elementId,
      index,
      phase: "start",
      holdTimer: setTimeoutFn(() => {
        if (!linearPointerPressState || linearPointerPressState.elementId !== elementId || linearPointerPressState.index !== index) return;
        linearPointerPressState = {
          ...linearPointerPressState,
          phase: "hold",
          holdTimer: null,
        };
        beginLinearPointerDrag({
          elementId,
          index,
          worldPoint: linearPointerPressState.currentWorldPoint ?? linearPointerPressState.startWorldPoint ?? worldPoint,
        });
      }, 250),
      startWorldPoint: worldPoint,
      currentWorldPoint: worldPoint,
    };
    setElementDraggableState(elementId, false);
    selectIds([elementId]);
  }

  function resetLinearItemPressState() {
    const elementId = linearItemPressState?.elementId;
    clearLinearItemPressTimer();
    linearItemPressState = null;
    if (elementId) {
      const element = getElement(elementId);
      setElementDraggableState(elementId, isElementDraggable(element) && !isLinearGestureElement(elementId));
    }
  }

  function resetLinearPointerPressState() {
    const elementId = linearPointerPressState?.elementId;
    clearLinearPointerPressTimer();
    linearPointerPressState = null;
    if (elementId) {
      const element = getElement(elementId);
      setElementDraggableState(elementId, isElementDraggable(element) && !isLinearGestureElement(elementId));
    }
  }

  function cancelLinearPointerGesture() {
    const pressedElementId = linearPointerPressState?.elementId;
    clearLinearPointerPressTimer();
    linearPointerPressState = null;
    cancelLinearPointerDrag(pressedElementId);
  }

  function suppressNextLinearItemSelect(elementId) {
    clearLinearItemSelectSuppression();
    structureInteraction.suppressNextLinearItemSelect(elementId);
    suppressLinearItemSelectTimer = setTimeoutFn(() => {
      clearLinearItemSelectSuppression();
    }, 500);
  }

  function clearLinearItemSelectSuppression() {
    if (suppressLinearItemSelectTimer) {
      clearTimeoutFn(suppressLinearItemSelectTimer);
      suppressLinearItemSelectTimer = null;
    }
    structureInteraction.clearLinearItemSelectSuppression();
  }

  function isLinearGestureElement(elementId) {
    return linearItemPressState?.elementId === elementId
      || structureInteraction.getLinearItemDragState()?.elementId === elementId
      || linearPointerPressState?.elementId === elementId
      || structureInteraction.getLinearPointerDragState()?.elementId === elementId;
  }

  function clearLinearItemPressTimer() {
    if (!linearItemPressState?.holdTimer) return;
    clearTimeoutFn(linearItemPressState.holdTimer);
    linearItemPressState.holdTimer = null;
  }

  function clearLinearPointerPressTimer() {
    if (!linearPointerPressState?.holdTimer) return;
    clearTimeoutFn(linearPointerPressState.holdTimer);
    linearPointerPressState.holdTimer = null;
  }

  return {
    cancelLinearPointerGesture,
    clearLinearItemSelectSuppression,
    dispatchLinearStructureEvent,
    handleArrayPointerPress,
    handlePointerMove,
    handlePointerUp,
    isLinearGestureElement,
    resetLinearItemPressState,
    resetLinearPointerPressState,
    suppressNextLinearItemSelect,
  };
}
