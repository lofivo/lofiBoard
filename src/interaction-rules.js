import { TOOLS } from "./ui-config.js";

export function isTransformerTarget(target) {
  let node = target;
  while (node) {
    if (node.getClassName?.() === "Transformer") return true;
    node = node.getParent?.();
  }
  return false;
}

export function shouldIgnoreCanvasPointerDown({ target, isEditingText }) {
  return Boolean(isEditingText || isTransformerTarget(target));
}

export function nextToolAfterTextPlacement(tool) {
  return tool === TOOLS.TEXT ? TOOLS.SELECT : tool;
}

export function getSelectionHitRadius(scale) {
  return Math.max(6, Math.round(12 / scale));
}

export function shouldSelectAll(event) {
  return event.key?.toLowerCase() === "a" && (event.altKey || event.ctrlKey || event.metaKey);
}
