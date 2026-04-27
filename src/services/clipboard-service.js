import { clone, reorderElements } from "../board/board-model.js";
import { createId } from "../board/ids.js";

export function createClipboardSnapshot(elements, selectedIds) {
  return clone(elements.filter((element) => selectedIds.includes(element.id)));
}

export function createPastedElements(snapshot, { offset = 24, targetPoint = null, zIndexStart = 0 } = {}) {
  const anchor = targetPoint ? getElementsAnchor(snapshot) : null;
  const dx = targetPoint ? targetPoint.x - anchor.x : offset;
  const dy = targetPoint ? targetPoint.y - anchor.y : offset;
  const groupIdMap = new Map();
  return snapshot.map((element, index) => ({
    ...translateElement(clone(element), dx, dy),
    id: createId(element.type || "el"),
    groupId: element.groupId ? getMappedGroupId(groupIdMap, element.groupId) : undefined,
    zIndex: zIndexStart + index,
  }));
}

function getMappedGroupId(groupIdMap, groupId) {
  if (!groupIdMap.has(groupId)) {
    groupIdMap.set(groupId, createId("group"));
  }
  return groupIdMap.get(groupId);
}

function getElementsAnchor(elements) {
  const bounds = elements.map(getElementBounds);
  return bounds.reduce(
    (anchor, bound) => ({
      x: Math.min(anchor.x, bound.x),
      y: Math.min(anchor.y, bound.y),
    }),
    { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY },
  );
}

function translateElement(element, dx, dy) {
  return {
    ...element,
    x: Number(element.x ?? 0) + dx,
    y: Number(element.y ?? 0) + dy,
  };
}

function getElementBounds(element) {
  if (element.type === "ellipse") {
    return {
      x: Number(element.x ?? 0) - Number(element.radiusX ?? 0),
      y: Number(element.y ?? 0) - Number(element.radiusY ?? 0),
    };
  }

  if ((element.type === "line" || element.type === "arrow") && Array.isArray(element.points)) {
    return getFlatPointBounds(element);
  }

  if (element.type === "stroke" && Array.isArray(element.points)) {
    return getStrokePointBounds(element);
  }

  return {
    x: Number(element.x ?? 0),
    y: Number(element.y ?? 0),
  };
}

function getFlatPointBounds(element) {
  const xs = element.points.filter((_, index) => index % 2 === 0);
  const ys = element.points.filter((_, index) => index % 2 === 1);
  return {
    x: Number(element.x ?? 0) + Math.min(...xs),
    y: Number(element.y ?? 0) + Math.min(...ys),
  };
}

function getStrokePointBounds(element) {
  return {
    x: Number(element.x ?? 0) + Math.min(...element.points.map((point) => Number(point.x ?? 0))),
    y: Number(element.y ?? 0) + Math.min(...element.points.map((point) => Number(point.y ?? 0))),
  };
}

export function removeElementsById(elements, selectedIds) {
  return reorderElements(elements.filter((element) => !selectedIds.includes(element.id)));
}
