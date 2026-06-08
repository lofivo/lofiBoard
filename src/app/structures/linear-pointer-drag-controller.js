import Konva from "konva";
import {
  isLinearStructureElement,
  setArrayPointer,
} from "../../structures/linear-structure.js";
import {
  LINEAR_POINTER_BASE_Y,
  LINEAR_POINTER_DRAG_Y,
  getLinearPointerIndexFromWorldPoint,
  getLinearStructureGeometry,
} from "./linear-runtime.js";

export function createLinearStructurePointerDragController({
  applyLinearPanelState,
  clearRootDragState,
  contentLayer,
  createTween = (config) => new Konva.Tween(config),
  getElements,
  isElementDraggable,
  pushHistory,
  renderBoard,
  selectIds,
  setElementDraggableState,
  setElements,
  setLinearPanelState,
  structureInteraction,
  tweenEasing = Konva.Easings.EaseOut,
}) {
  let linearPointerTween = null;

  function getElement(elementId) {
    return (getElements?.() ?? []).find((item) => item.id === elementId) ?? null;
  }

  function setPointerIndex(elementId, nextIndex) {
    setElements((getElements?.() ?? []).map((item) => (
      item.id === elementId ? setArrayPointer(item, nextIndex) : item
    )));
  }

  function syncPointerPanel(nextIndex) {
    const linearPanelState = setLinearPanelState({
      highlightPointer: String(nextIndex),
    });
    applyLinearPanelState(linearPanelState);
  }

  function cancelLinearPointerDrag(pressedElementId = null) {
    const elementId = structureInteraction.getLinearPointerDragState()?.elementId ?? pressedElementId;
    stopLinearPointerTween();
    structureInteraction.clearLinearPointerDrag();
    if (elementId) {
      const element = getElement(elementId);
      setElementDraggableState(elementId, isElementDraggable(element));
    }
  }

  function stopLinearPointerTween() {
    linearPointerTween?.destroy();
    linearPointerTween = null;
  }

  function animateLinearPointerDragVisual(elementId, nextIndex) {
    const element = getElement(elementId);
    if (!isLinearStructureElement(element) || !Number.isInteger(nextIndex)) return;
    const group = contentLayer.findOne(`#${elementId}`);
    const pointerNode = group?.findOne(".array-pointer-group");
    if (!pointerNode) return;
    const { cellWidth } = getLinearStructureGeometry(element);
    stopLinearPointerTween();
    pointerNode.setAttr("linearIndex", nextIndex);
    linearPointerTween = createTween({
      node: pointerNode,
      x: nextIndex * cellWidth,
      y: LINEAR_POINTER_DRAG_Y,
      duration: 0.12,
      easing: tweenEasing,
      onFinish: () => {
        linearPointerTween?.destroy();
        linearPointerTween = null;
      },
    });
    linearPointerTween.play();
  }

  function animateLinearPointerLift(elementId) {
    const pointerNode = contentLayer.findOne(`#${elementId}`)?.findOne(".array-pointer-group");
    if (!pointerNode) return;
    stopLinearPointerTween();
    linearPointerTween = createTween({
      node: pointerNode,
      y: LINEAR_POINTER_DRAG_Y,
      duration: 0.14,
      easing: tweenEasing,
      onFinish: () => {
        linearPointerTween?.destroy();
        linearPointerTween = null;
      },
    });
    linearPointerTween.play();
  }

  function animateLinearPointerDrop(dragState, finishLinearPointerDrop) {
    const element = getElement(dragState.elementId);
    const group = contentLayer.findOne(`#${dragState.elementId}`);
    const pointerNode = group?.findOne(".array-pointer-group");
    if (!isLinearStructureElement(element) || !pointerNode) {
      finishLinearPointerDrop();
      return;
    }
    const { cellWidth } = getLinearStructureGeometry(element);
    stopLinearPointerTween();
    linearPointerTween = createTween({
      node: pointerNode,
      x: dragState.nextIndex * cellWidth,
      y: LINEAR_POINTER_BASE_Y,
      duration: 0.16,
      easing: tweenEasing,
      onFinish: () => {
        linearPointerTween?.destroy();
        linearPointerTween = null;
        finishLinearPointerDrop();
      },
    });
    linearPointerTween.play();
  }

  function beginLinearPointerDrag({ elementId, index, worldPoint }) {
    const element = getElement(elementId);
    if (!isLinearStructureElement(element) || element.locked || (element.items?.length ?? 0) === 0) return;
    const group = contentLayer.findOne(`#${elementId}`);
    const nextIndex = getLinearPointerIndexFromWorldPoint(element, worldPoint, group) ?? index;
    const hadPointer = Number.isInteger(element.markers?.pointer);
    clearRootDragState(elementId);
    structureInteraction.beginLinearPointerDrag({
      elementId,
      fromIndex: index,
      nextIndex,
      hadPointer,
    });
    setElementDraggableState(elementId, false);
    selectIds([elementId]);
    animateLinearPointerLift(elementId);
    if (nextIndex !== index || !hadPointer) {
      setPointerIndex(elementId, nextIndex);
      syncPointerPanel(nextIndex);
      animateLinearPointerDragVisual(elementId, nextIndex);
    }
    updateLinearPointerDrag(worldPoint);
  }

  function updateLinearPointerDrag(worldPoint) {
    const linearPointerDragState = structureInteraction.getLinearPointerDragState();
    if (!linearPointerDragState) return false;
    const element = getElement(linearPointerDragState.elementId);
    if (!isLinearStructureElement(element)) return false;
    const group = contentLayer.findOne(`#${linearPointerDragState.elementId}`);
    const nextIndex = getLinearPointerIndexFromWorldPoint(element, worldPoint, group);
    if (!Number.isInteger(nextIndex) || nextIndex === linearPointerDragState.nextIndex) return true;
    const { linearPointerDragState: dragState } = structureInteraction.updateLinearPointerDrag({
      nextIndex,
    });
    if (!dragState) return false;
    setPointerIndex(dragState.elementId, nextIndex);
    syncPointerPanel(nextIndex);
    animateLinearPointerDragVisual(dragState.elementId, nextIndex);
    return true;
  }

  function commitLinearPointerDrag() {
    if (!structureInteraction.hasLinearPointerDragState()) return false;
    const { linearPointerDragState: dragState } = structureInteraction.finishLinearPointerDrag();
    if (!dragState) return false;
    clearRootDragState(dragState.elementId);
    const element = getElement(dragState.elementId);
    setElementDraggableState(dragState.elementId, isElementDraggable(element));
    const finishLinearPointerDrop = () => {
      renderBoard();
      selectIds([dragState.elementId]);
      if (dragState.didMove) {
        pushHistory("已移动数组指针");
      }
    };
    animateLinearPointerDrop(dragState, finishLinearPointerDrop);
    return true;
  }

  return {
    beginLinearPointerDrag,
    cancelLinearPointerDrag,
    commitLinearPointerDrag,
    updateLinearPointerDrag,
  };
}
