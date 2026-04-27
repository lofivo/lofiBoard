import { clone, reorderElements } from "./board-model.js";
import { createId } from "./ids.js";

export function createClipboardSnapshot(elements, selectedIds) {
  return clone(elements.filter((element) => selectedIds.includes(element.id)));
}

export function createPastedElements(snapshot, { offset = 24, zIndexStart = 0 } = {}) {
  return snapshot.map((element, index) => ({
    ...clone(element),
    id: createId(element.type || "el"),
    x: Number(element.x ?? 0) + offset,
    y: Number(element.y ?? 0) + offset,
    zIndex: zIndexStart + index,
  }));
}

export function removeElementsById(elements, selectedIds) {
  return reorderElements(elements.filter((element) => !selectedIds.includes(element.id)));
}
