import {
  createStickyElement as defaultCreateStickyElement,
  createTextElement as defaultCreateTextElement,
} from "../../board/element-factory.js";
import { getWorldPointer } from "../../canvas/geometry.js";
import { SM } from "../../tools/interaction-state-machine.js";
import {
  isTransformerAnchorTarget as defaultIsTransformerAnchorTarget,
  isTransformerTarget as defaultIsTransformerTarget,
  nextToolAfterTextPlacement,
  shouldEditTextOnTransformerDoubleClick,
  shouldIgnoreCanvasPointerDown as defaultShouldIgnoreCanvasPointerDown,
} from "../../tools/interaction-rules.js";
import { isShapeTool, resolveActiveDrawingTool } from "../../tools/behavior.js";
import {
  captureDrawingPointer,
  getPointerEventId,
  preventDrawingPointerDefault,
  releaseDrawingPointer,
  shouldHandlePointerEvent,
} from "../../tools/stroke-engine.js";
import { TOOLS } from "../../ui/config.js";

export function createStagePointerController({
  stage,
  drawingInteractionController,
  draftInteractionController,
  selectionDragController,
  structureInteraction,
  addElement = () => {},
  clearSelection = () => {},
  consumeSuppressNextCanvasSelection = () => false,
  consumeSuppressSelectionDragOnce = () => false,
  commitTextEditing = () => {},
  createStickyElement = defaultCreateStickyElement,
  createTextElement = defaultCreateTextElement,
  editElement = () => {},
  enterInteraction = () => {},
  exitInteractionToIdle = () => {},
  expandGroupedIds = (ids) => ids,
  getActiveShapeTool = () => TOOLS.RECT,
  getBaseEraserRadius = () => 24,
  getBoardElementCount = () => 0,
  getCurrentTool = () => TOOLS.SELECT,
  getElementIdFromNode = () => null,
  getElements = () => [],
  getIsSpaceDown = () => false,
  getNearbySelectedElementId = () => null,
  getSelectableElementIdAtWorldPoint = () => null,
  getSelectedIds = () => [],
  getWorldPoint = () => getWorldPointer(stage),
  handleLinearPointerMove = () => false,
  handleLinearPointerUp = () => false,
  hideBinaryTreeControls = () => {},
  hideContextMenu = () => {},
  hideEraser = () => {},
  hideToolCursors = () => {},
  hideTreeControls = () => {},
  hideGraphNodeControls = () => {},
  isBinaryTreeElement = () => false,
  isElementLocked = () => false,
  isEditingText = () => false,
  isGeneralTreeElement = () => false,
  isGraphNodeHitTarget = () => false,
  isGraphStructureElement = () => false,
  isTemporaryPanActive = () => false,
  isTransformerAnchorTarget = defaultIsTransformerAnchorTarget,
  isTransformerTarget = defaultIsTransformerTarget,
  isTreeNodeHitTarget = () => false,
  persistCurrentDraft = () => {},
  requestAnimationFrame = globalThis.requestAnimationFrame ?? ((callback) => callback()),
  selectElementById = () => {},
  selectIds = () => {},
  setLastPointerWorldPoint = () => {},
  setStructurePanelOpen = () => {},
  setTool = () => {},
  setZoomMenuOpen = () => {},
  shouldIgnoreCanvasPointerDown = defaultShouldIgnoreCanvasPointerDown,
  shouldShowContextMenu = () => false,
  showBrushCursor = () => {},
  showContextMenu = () => {},
  showObjectEraser = () => {},
  showStrokeEraser = () => {},
  syncBinaryTreeActiveVisual = () => {},
  syncGeneralTreeActiveVisual = () => {},
  syncGraphActiveVisual = () => {},
  updateGrid = () => {},
  updateViewportChrome = () => {},
} = {}) {
  let isPanning = false;
  let panStart = null;
  let activeDrawingPointerCapture = null;

  function beginDrawingPointerSession(event) {
    const nativeEvent = event?.evt;
    // Set the capture flag BEFORE calling setPointerCapture so the
    // synchronous pointerleave event sees an active session.
    activeDrawingPointerCapture = { pointerId: getPointerEventId(nativeEvent), captured: false };
    preventDrawingPointerDefault(nativeEvent);
    activeDrawingPointerCapture = captureDrawingPointer(nativeEvent);
  }

  function endDrawingPointerSession() {
    releaseDrawingPointer(activeDrawingPointerCapture);
    activeDrawingPointerCapture = null;
  }

  function updateLastPointerWorldPoint(worldPoint) {
    setLastPointerWorldPoint(worldPoint);
  }

  function handlePointerDown(event) {
    hideContextMenu();
    setZoomMenuOpen(false);

    if (shouldIgnoreCanvasPointerDown({ target: event.target, isEditingText: isEditingText() })) {
      return false;
    }

    const worldPoint = getWorldPoint();
    if (!worldPoint) return false;
    updateLastPointerWorldPoint(worldPoint);

    const currentTool = getCurrentTool();
    if (getIsSpaceDown() || currentTool === TOOLS.PAN || event.evt.button === 1) {
      isPanning = true;
      enterInteraction(SM.PANNING);
      stage.container().classList.add("is-panning");
      panStart = {
        pointer: stage.getPointerPosition(),
        stage: stage.position(),
      };
      return true;
    }

    if (currentTool === TOOLS.SELECT) {
      if (isTransformerTarget(event.target) && !isTransformerAnchorTarget(event.target)) {
        const passThroughId = getSelectableElementIdAtWorldPoint(worldPoint, {
          preferUnselected: true,
        });
        if (passThroughId) {
          selectElementById(passThroughId, event.evt.shiftKey);
          if (!event.evt.shiftKey) {
            selectionDragController.beginSelectionDrag(worldPoint);
          }
          return true;
        }
        selectionDragController.beginSelectionDrag(worldPoint);
        return true;
      }
      return handleSelectPointerDown(event, worldPoint);
    }

    clearSelection();

    if (currentTool === TOOLS.PEN) {
      showBrushCursor(worldPoint);
      beginDrawingPointerSession(event);
      drawingInteractionController.startStroke(worldPoint, event.evt.pressure);
      enterInteraction(SM.DRAWING);
      return true;
    }

    if (currentTool === TOOLS.ERASER_STROKE) {
      beginDrawingPointerSession(event);
      const radius = drawingInteractionController.beginEraser(worldPoint);
      enterInteraction(SM.ERASING);
      stage.container().classList.add("is-erasing");
      showStrokeEraser(worldPoint, radius);
      drawingInteractionController.eraseStrokeAt(worldPoint, radius);
      return true;
    }

    if (currentTool === TOOLS.ERASER_OBJECT) {
      beginDrawingPointerSession(event);
      drawingInteractionController.beginEraser(worldPoint);
      enterInteraction(SM.ERASING);
      stage.container().classList.add("is-erasing");
      drawingInteractionController.eraseObjectAt(event.target);
      showObjectEraser(worldPoint);
      return true;
    }

    if (currentTool === TOOLS.TEXT) {
      const element = createTextElement({
        point: worldPoint,
        zIndex: getBoardElementCount(),
      });
      addElement(element, "已添加文字");
      selectIds([element.id]);
      setTool(nextToolAfterTextPlacement(currentTool));
      requestAnimationFrame(() => editElement(element.id));
      return true;
    }

    if (currentTool === TOOLS.STICKY) {
      const element = createStickyElement({
        point: worldPoint,
        zIndex: getBoardElementCount(),
      });
      addElement(element, "已添加便签");
      selectIds([element.id]);
      setTool(TOOLS.SELECT);
      requestAnimationFrame(() => editElement(element.id));
      return true;
    }

    if (currentTool === TOOLS.STRUCTURE) {
      setStructurePanelOpen(true);
      return true;
    }

    const drawingTool = resolveActiveDrawingTool(currentTool, getActiveShapeTool());
    if (isShapeTool(drawingTool)) {
      beginDrawingPointerSession(event);
      draftInteractionController.startShapeDraft(worldPoint);
      enterInteraction(SM.DRAWING);
      return true;
    }

    return false;
  }

  function handlePointerMove(event) {
    if (!shouldHandlePointerEvent(event?.evt, activeDrawingPointerCapture?.pointerId)) return false;
    if (activeDrawingPointerCapture) preventDrawingPointerDefault(event?.evt);

    const worldPoint = getWorldPoint();
    if (!worldPoint) return false;
    updateLastPointerWorldPoint(worldPoint);

    if (isTemporaryPanActive() && !isPanning) {
      hideToolCursors();
      return true;
    }

    if (handleLinearPointerMove(worldPoint)) return true;

    if (isPanning && panStart) {
      hideToolCursors();
      const pointer = stage.getPointerPosition();
      stage.position({
        x: panStart.stage.x + pointer.x - panStart.pointer.x,
        y: panStart.stage.y + pointer.y - panStart.pointer.y,
      });
      updateGrid();
      updateViewportChrome();
      return true;
    }

    if (drawingInteractionController.hasStrokeDraft()) {
      drawingInteractionController.appendStroke(worldPoint, event.evt.pressure);
      showBrushCursor(worldPoint);
      return true;
    }

    if (draftInteractionController.hasShapeDraft()) {
      draftInteractionController.updateShapeDraft(worldPoint);
      return true;
    }

    if (draftInteractionController.hasSelectionDraft()) {
      draftInteractionController.updateSelectionDraft(worldPoint);
      return true;
    }

    if (selectionDragController.hasSelectionDrag()) {
      selectionDragController.updateSelectionDrag(worldPoint);
      return true;
    }

    const currentTool = getCurrentTool();
    if (currentTool === TOOLS.PEN) {
      showBrushCursor(worldPoint);
      return true;
    }

    if ((currentTool === TOOLS.ERASER_STROKE || currentTool === TOOLS.ERASER_OBJECT)
      && !drawingInteractionController.hasActiveEraserSnapshot()) {
      if (currentTool === TOOLS.ERASER_OBJECT) {
        showObjectEraser(worldPoint);
      } else {
        showStrokeEraser(worldPoint, getBaseEraserRadius());
      }
      return true;
    }

    if (currentTool === TOOLS.ERASER_STROKE && drawingInteractionController.hasActiveEraserSnapshot()) {
      const radius = drawingInteractionController.updateStrokeEraser(worldPoint);
      showStrokeEraser(worldPoint, radius);
      return true;
    }

    if (currentTool === TOOLS.ERASER_OBJECT && drawingInteractionController.hasActiveEraserSnapshot()) {
      drawingInteractionController.updateObjectEraser(worldPoint, event.target);
      showObjectEraser(worldPoint);
      return true;
    }

    return false;
  }

  function handlePointerUp(event) {
    if (!shouldHandlePointerEvent(event?.evt, activeDrawingPointerCapture?.pointerId)) return false;
    if (activeDrawingPointerCapture) preventDrawingPointerDefault(event?.evt);

    if (handleLinearPointerUp()) return true;

    if (isPanning) {
      isPanning = false;
      panStart = null;
      exitInteractionToIdle();
      stage.container().classList.remove("is-panning");
      persistCurrentDraft();
      return true;
    }

    if (drawingInteractionController.hasStrokeDraft()) {
      endDrawingPointerSession();
      drawingInteractionController.finishStroke();
      exitInteractionToIdle();
      return true;
    }

    if (draftInteractionController.hasShapeDraft()) {
      endDrawingPointerSession();
      draftInteractionController.finishShapeDraft();
      exitInteractionToIdle();
      return true;
    }

    if (draftInteractionController.hasSelectionDraft()) {
      draftInteractionController.finishSelectionDraft();
      exitInteractionToIdle();
      return true;
    }

    if (selectionDragController.hasSelectionDrag()) {
      selectionDragController.finishSelectionDrag();
      exitInteractionToIdle();
      return true;
    }

    if (drawingInteractionController.hasActiveEraserSnapshot()) {
      endDrawingPointerSession();
      stage.container().classList.remove("is-erasing");
      drawingInteractionController.finishEraser();
      exitInteractionToIdle();
      return true;
    }

    return false;
  }

  function handleContextMenu(event) {
    event.preventDefault();
    if (isEditingText()) {
      commitTextEditing();
    }
    stage.setPointersPositions(event);
    const pointer = stage.getPointerPosition();
    const worldPoint = getWorldPoint();
    if (worldPoint) {
      updateLastPointerWorldPoint(worldPoint);
    }
    // 像素级 getIntersection 会命中 Transformer 的 overdraw 背板（选中态盖在元素上方），
    // 也会漏掉未填充图形的内部；与左键选中共用包围盒命中，保证右键目标一致。
    const intersectionNode = pointer ? stage.getIntersection(pointer) : null;
    const targetId = (worldPoint
      ? getSelectableElementIdAtWorldPoint(worldPoint, { fallbackNode: intersectionNode })
      : null) ?? getElementIdFromNode(intersectionNode);

    if (targetId && !getSelectedIds().includes(targetId)) {
      selectIds([targetId]);
    }

    if (!shouldShowContextMenu({
      targetId,
      selectedIds: getSelectedIds(),
    })) {
      return false;
    }

    showContextMenu(event.clientX, event.clientY, { targetId });
    return true;
  }

  function handleTransformerDoubleClick(event) {
    const currentTool = getCurrentTool();
    if (isTemporaryPanActive() || currentTool !== TOOLS.SELECT || isTransformerAnchorTarget(event.target)) return false;
    const worldPoint = getWorldPoint();
    if (!worldPoint) return false;
    const id = getSelectableElementIdAtWorldPoint(worldPoint);
    const editable = getElements().find((item) => item.id === id);
    if (!shouldEditTextOnTransformerDoubleClick({
      target: event.target,
      currentTool,
      isTemporaryPanActive: isTemporaryPanActive(),
      element: editable,
      selectedIds: getSelectedIds(),
    })) return false;
    event.cancelBubble = true;
    selectIds([id]);
    requestAnimationFrame(() => editElement(id));
    return true;
  }

  function handleSelectPointerDown(event, worldPoint) {
    if (consumeSuppressNextCanvasSelection()) {
      return true;
    }
    if (consumeSuppressSelectionDragOnce()) {
      return true;
    }
    const rawTargetElement = getElementIdFromNode(event.target);
    const targetElement = getSelectableElementIdAtWorldPoint(worldPoint, {
      fallbackNode: event.target,
    });
    if (targetElement) {
      const element = getElements().find((item) => item.id === targetElement);
      const targetIds = expandGroupedIds([targetElement]);
      const activeTreeNode = structureInteraction.getActiveTreeNode();
      if (isBinaryTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement) {
        const shouldDragBinaryTreeBlank = !event.evt.shiftKey && targetIds.some((id) => getSelectedIds().includes(id));
        const previousActiveTreeElementId = activeTreeNode.elementId;
        structureInteraction.clearActiveTreeNode();
        hideBinaryTreeControls();
        syncBinaryTreeActiveVisual(previousActiveTreeElementId);
        if (shouldDragBinaryTreeBlank) {
          selectionDragController.beginSelectionDrag(worldPoint);
        }
        return true;
      }
      if (isGeneralTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement) {
        const shouldDragTreeBlank = !event.evt.shiftKey && targetIds.some((id) => getSelectedIds().includes(id));
        const previousActiveTreeElementId = activeTreeNode.elementId;
        structureInteraction.clearActiveTreeNode();
        hideTreeControls();
        syncGeneralTreeActiveVisual(previousActiveTreeElementId);
        if (shouldDragTreeBlank) {
          selectionDragController.beginSelectionDrag(worldPoint);
        }
        return true;
      }
      if (isGeneralTreeElement(element) && isTreeNodeHitTarget(event.target)) {
        return true;
      }
      const activeGraphNode = structureInteraction.getActiveGraphNode();
      if (isGraphStructureElement(element) && !isGraphNodeHitTarget(event.target) && activeGraphNode?.elementId === targetElement) {
        const shouldDragGraphBlank = !event.evt.shiftKey && targetIds.some((id) => getSelectedIds().includes(id));
        const previousActiveGraphElementId = activeGraphNode.elementId;
        structureInteraction.clearActiveGraphNode();
        hideGraphNodeControls();
        syncGraphActiveVisual(previousActiveGraphElementId);
        if (shouldDragGraphBlank) {
          selectionDragController.beginSelectionDrag(worldPoint);
        }
        return true;
      }
      if (isGraphStructureElement(element) && isGraphNodeHitTarget(event.target)) {
        return true;
      }
      if (!event.evt.shiftKey && targetIds.some((id) => getSelectedIds().includes(id))) {
        selectionDragController.beginSelectionDrag(worldPoint);
        return true;
      }
      selectElementById(targetElement, event.evt.shiftKey);
      if (!event.evt.shiftKey && element && (["text", "sticky"].includes(element.type) || targetElement !== rawTargetElement)) {
        selectionDragController.beginSelectionDrag(worldPoint);
      }
      return true;
    }

    const nearbySelectedId = getNearbySelectedElementId(worldPoint);
    if (nearbySelectedId && getSelectedIds().some((id) => !isElementLocked(id))) {
      selectionDragController.beginSelectionDrag(worldPoint);
      return true;
    }

    clearSelection();
    enterInteraction(SM.SELECTING);
    draftInteractionController.startSelectionDraft(worldPoint);
    return true;
  }

  function hasActiveDrawingPointerCapture() {
    return Boolean(activeDrawingPointerCapture);
  }

  function hasActivePan() {
    return isPanning;
  }

  return {
    handleContextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleSelectPointerDown,
    handleTransformerDoubleClick,
    hasActiveDrawingPointerCapture,
    hasActivePan,
  };
}
