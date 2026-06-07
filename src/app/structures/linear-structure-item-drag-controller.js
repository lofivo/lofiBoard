import Konva from "konva";
import { isLinearStructureElement } from "../../structures/structure-templates.js";
import {
  getLinearDragInsertIndex,
  getLinearItemDragStartState,
  getLinearItemDragUpdate,
  getLinearPreviewXForGap,
  getLinearStructureGeometry,
} from "./linear-structure-runtime.js";
import {
  findLinearItemNode,
  getLinearItemNodeIndex,
} from "./structure-node-query.js";

export function createLinearStructureItemDragController({
  contentLayer,
  createTween = (config) => new Konva.Tween(config),
  getElements,
  moveLinearItem,
  renderBoard,
  setActiveLinearItem,
  setElementDraggableState,
  setSuppressSelectionDragOnce = () => {},
  structureInteraction,
  suppressNextLinearItemSelect,
  clearRootDragState,
  tweenEasing = Konva.Easings.EaseOut,
}) {
  let linearItemLiftTween = null;

  function getElement(elementId) {
    return (getElements?.() ?? []).find((item) => item.id === elementId) ?? null;
  }

  function cancelLinearItemDragPreview() {
    if (!structureInteraction.hasLinearItemDragState()) return;
    structureInteraction.clearLinearItemDrag();
    renderBoard();
  }

  function animateLinearDragGapChange() {
    const linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    if (!group) return;
    const element = getElement(linearItemDragState.elementId);
    if (!isLinearStructureElement(element)) return;
    const { cellWidth } = getLinearStructureGeometry(element);
    const itemNodes = group.find(".array-item");
    itemNodes.forEach((node) => {
      const index = getLinearItemNodeIndex(node);
      if (index === linearItemDragState.fromIndex) {
        updateLinearDragVisualPosition();
        return;
      }
      const targetX = getLinearPreviewXForGap(
        index,
        linearItemDragState.fromIndex,
        linearItemDragState.cancelled ? linearItemDragState.fromIndex : linearItemDragState.previewGap,
        linearItemDragState.dragX,
        cellWidth,
      );
      node.to({
        x: targetX,
        y: 0,
        duration: 0.16,
        easing: tweenEasing,
      });
    });
    const indicator = group.findOne(".array-drop-indicator");
    if (indicator) {
      indicator.visible(false);
      indicator.to({
        x: (linearItemDragState.cancelled ? linearItemDragState.fromIndex : linearItemDragState.previewGap) * cellWidth - 3,
        duration: 0.14,
        easing: tweenEasing,
      });
    }
    contentLayer.batchDraw();
  }

  function animateLinearItemLift() {
    const linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return;
    const itemNode = findLinearItemNode(
      contentLayer.findOne(`#${linearItemDragState.elementId}`),
      linearItemDragState.fromIndex,
    );
    if (!itemNode) return;

    stopLinearItemLiftTween();
    linearItemLiftTween = createTween({
      node: itemNode,
      y: -12,
      scaleX: 1.04,
      scaleY: 1.04,
      opacity: 0.96,
      shadowBlur: 18,
      shadowOpacity: 1,
      shadowOffsetY: -8,
      duration: 0.16,
      easing: tweenEasing,
      onFinish: () => {
        linearItemLiftTween?.destroy();
        linearItemLiftTween = null;
        if (!structureInteraction.hasLinearItemDragState()) return;
        structureInteraction.markLinearItemDragLifted();
      },
    });
    linearItemLiftTween.play();
  }

  function stopLinearItemLiftTween() {
    linearItemLiftTween?.destroy();
    linearItemLiftTween = null;
  }

  function animateLinearItemDrop(dragState, finishLinearItemDrop) {
    const element = getElement(dragState.elementId);
    const group = contentLayer.findOne(`#${dragState.elementId}`);
    const itemNode = findLinearItemNode(group, dragState.fromIndex);
    if (!isLinearStructureElement(element) || !itemNode) {
      finishLinearItemDrop();
      return;
    }

    const { cellWidth } = getLinearStructureGeometry(element);
    const length = element.items?.length ?? 0;
    const toIndex = dragState.cancelled
      ? dragState.fromIndex
      : getLinearDragInsertIndex(dragState.fromIndex, dragState.previewGap, length);
    const targetX = toIndex * cellWidth;

    itemNode.to({
      x: targetX,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      shadowBlur: 0,
      shadowOpacity: 0,
      shadowOffsetY: 0,
      duration: 0.18,
      easing: tweenEasing,
      onFinish: finishLinearItemDrop,
    });
  }

  function beginLinearItemDrag({ elementId, index, worldPoint }) {
    const element = getElement(elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    const group = contentLayer.findOne(`#${elementId}`);
    structureInteraction.beginLinearItemDrag({
      elementId,
      fromIndex: index,
      ...getLinearItemDragStartState({
        element,
        index,
        worldPoint,
        renderedNode: group,
      }),
    });
    setElementDraggableState(elementId, false);
    setActiveLinearItem(elementId, index, { syncPanel: false, rerender: false });
    renderBoard();
    animateLinearItemLift();
  }

  function updateLinearDragVisualPosition() {
    let linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    const itemNode = findLinearItemNode(group, linearItemDragState.fromIndex);
    const indicator = group?.findOne(".array-drop-indicator");
    if (!itemNode) return;
    stopLinearItemLiftTween();
    if (!linearItemDragState.longPressTriggered) {
      structureInteraction.markLinearItemDragLifted();
      linearItemDragState = structureInteraction.getLinearItemDragState();
      if (!linearItemDragState) return;
    }
    itemNode.x(linearItemDragState.dragX);
    itemNode.y(linearItemDragState.cancelled ? 0 : linearItemDragState.dragY);
    itemNode.setAttrs({
      scaleX: linearItemDragState.longPressTriggered && !linearItemDragState.cancelled ? 1.04 : 1,
      scaleY: linearItemDragState.longPressTriggered && !linearItemDragState.cancelled ? 1.04 : 1,
      shadowBlur: linearItemDragState.cancelled ? 0 : 18,
      shadowOpacity: linearItemDragState.cancelled ? 0 : 1,
      shadowOffsetY: linearItemDragState.cancelled ? 0 : -8,
      opacity: linearItemDragState.cancelled ? 1 : 0.96,
    });
    if (indicator) {
      indicator.visible(false);
    }
    contentLayer.batchDraw();
  }

  function updateLinearItemDrag(worldPoint) {
    const linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return false;
    const element = getElement(linearItemDragState.elementId);
    if (!isLinearStructureElement(element)) return false;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    const {
      gapChanged,
      cancelChanged,
      ...dragPatch
    } = getLinearItemDragUpdate({
      element,
      dragState: linearItemDragState,
      worldPoint,
      renderedNode: group,
    });
    structureInteraction.updateLinearItemDrag({
      dragX: dragPatch.dragX,
      dragY: dragPatch.dragY,
      previewGap: dragPatch.previewGap,
      cancelled: dragPatch.cancelled,
      dragYRaw: dragPatch.dragYRaw,
    });
    if (gapChanged || cancelChanged) {
      structureInteraction.updateLinearItemDrag({ lastAnimatedGap: dragPatch.previewGap });
      animateLinearDragGapChange();
      return true;
    }
    updateLinearDragVisualPosition();
    return true;
  }

  function commitLinearItemDrag() {
    if (!structureInteraction.hasLinearItemDragState()) return false;
    const { linearItemDragState: dragState } = structureInteraction.finishLinearItemDrag();
    if (!dragState) return false;
    const element = getElement(dragState.elementId);
    stopLinearItemLiftTween();
    setSuppressSelectionDragOnce(false);
    clearRootDragState(dragState.elementId);
    suppressNextLinearItemSelect(dragState.elementId);
    const finishLinearItemDrop = () => {
      if (!isLinearStructureElement(element) || dragState.cancelled) {
        renderBoard();
        return;
      }
      const length = element.items?.length ?? 0;
      const toIndex = getLinearDragInsertIndex(dragState.fromIndex, dragState.previewGap, length);
      moveLinearItem({
        elementId: dragState.elementId,
        fromIndex: dragState.fromIndex,
        toIndex,
      });
    };
    animateLinearItemDrop(dragState, finishLinearItemDrop);
    return true;
  }

  return {
    beginLinearItemDrag,
    cancelLinearItemDragPreview,
    commitLinearItemDrag,
    updateLinearItemDrag,
  };
}
