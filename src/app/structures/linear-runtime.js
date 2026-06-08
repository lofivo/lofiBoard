import {
  ARRAY_STRUCTURE_STYLE,
  clampLinearItemDropGap,
  getLinearItemDropIndex,
  getLinearItemPreviewGap,
  getLinearStructureLocalPoint,
} from "../../structures/linear-structure.js";

export const LINEAR_POINTER_BASE_Y = -30;
export const LINEAR_POINTER_DRAG_Y = -40;

export function getLinearStructureGeometry(element) {
  const style = { ...ARRAY_STRUCTURE_STYLE, ...(element?.style ?? {}) };
  const showIndexes = element?.settings?.showIndexes ?? element?.type === "array-structure";
  const cellWidth = style.cellWidth;
  const cellHeight = style.cellHeight;
  const totalHeight = cellHeight * (showIndexes ? 2 : 1);
  return { style, showIndexes, cellWidth, cellHeight, totalHeight };
}

export function getLinearItemDragThresholdY(element) {
  const { totalHeight } = getLinearStructureGeometry(element);
  return Math.max(28, totalHeight * 1.2);
}

export function clampLinearGap(gap, length) {
  return clampLinearItemDropGap(gap, length);
}

export function getLinearPreviewGap(element, localX) {
  const length = element?.items?.length ?? 0;
  const { cellWidth } = getLinearStructureGeometry(element);
  return getLinearItemPreviewGap({ localX, length, cellWidth });
}

export function getLinearDragInsertIndex(fromIndex, previewGap, length) {
  return getLinearItemDropIndex(fromIndex, previewGap, length);
}

export function getLinearPreviewXForGap(index, dragIndex, dragGap, dragX, cellWidth) {
  if (!Number.isInteger(dragIndex) || !Number.isInteger(dragGap)) {
    return index * cellWidth;
  }
  if (index === dragIndex) {
    return dragX;
  }
  const baseX = index * cellWidth;
  if (index < dragIndex && index >= dragGap) {
    return baseX + cellWidth;
  }
  if (index > dragIndex && index < dragGap) {
    return baseX - cellWidth;
  }
  return baseX;
}

export function getLinearPointerIndexFromWorldPoint(element, worldPoint, renderedNode = null) {
  const length = element?.items?.length ?? 0;
  if (length <= 0) return null;
  const { cellWidth } = getLinearStructureGeometry(element);
  const localX = getLinearStructureLocalPoint(element, worldPoint, renderedNode).x;
  const centeredIndex = Math.floor(localX / cellWidth);
  return Math.min(length - 1, Math.max(0, centeredIndex));
}

export function getLinearItemDragStartState({ element, index, worldPoint, renderedNode = null } = {}) {
  const { cellWidth } = getLinearStructureGeometry(element);
  const { x: relativeX, y: relativeY } = getLinearStructureLocalPoint(element, worldPoint, renderedNode);
  const baseX = index * cellWidth;
  return {
    pointerOffsetX: relativeX - baseX,
    pointerOffsetY: relativeY,
    dragX: baseX,
    dragY: 0,
    previewGap: clampLinearGap(index, element?.items?.length ?? 0),
  };
}

export function getLinearItemDragUpdate({ element, dragState, worldPoint, renderedNode = null } = {}) {
  const { x: localX, y: localY } = getLinearStructureLocalPoint(element, worldPoint, renderedNode);
  const thresholdY = getLinearItemDragThresholdY(element);
  const offsetY = localY - dragState.pointerOffsetY;
  const cancelled = Math.abs(offsetY) > thresholdY;
  const previewGap = getLinearPreviewGap(element, localX);
  const dragX = localX - dragState.pointerOffsetX;

  return {
    dragX,
    dragY: cancelled ? 0 : -12,
    previewGap,
    cancelled,
    dragYRaw: offsetY,
    gapChanged: dragState.previewGap !== previewGap,
    cancelChanged: dragState.cancelled !== cancelled,
  };
}
