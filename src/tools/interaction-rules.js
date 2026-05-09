import { TOOLS } from "../ui/ui-config.js";

export const CORNER_TRANSFORMER_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export const TEXT_TRANSFORMER_ANCHORS = [
  "top-left",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-right",
];

export const ALL_TRANSFORMER_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

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

export function getTransformerAnchorsForSelection(elements, canTransform) {
  if (!canTransform || !Array.isArray(elements) || elements.length === 0) return [];
  return elements.every((element) => element.type === "text")
    ? TEXT_TRANSFORMER_ANCHORS
    : ALL_TRANSFORMER_ANCHORS;
}

export function isTextWidthResizeAnchor(anchor) {
  return anchor === "middle-left" || anchor === "middle-right";
}

export function getMinimumTextResizeWidth(fontSize) {
  return Math.max(8, Number(fontSize) || 0);
}

export function getSingleLineTextEditorHeight(fontSize, scale = 1, lineHeight = 1.25) {
  return (Number(fontSize) || 0) * scale * lineHeight;
}

export function getTextPointerIntent({ dx = 0, dy = 0, threshold = 4 }) {
  return Math.hypot(dx, dy) > threshold ? "drag" : "edit";
}

export function measureTextareaContentHeight({ sourceTextarea, measureTextarea, width, minHeight = 0 }) {
  if (!sourceTextarea || !measureTextarea) return Math.max(0, Math.ceil(minHeight));

  const nextWidth = Math.max(1, Number(width) || 1);
  const minimumHeight = Math.max(0, Number(minHeight) || 0);
  measureTextarea.value = sourceTextarea.value || " ";
  measureTextarea.rows = 1;
  measureTextarea.style.width = `${nextWidth}px`;
  measureTextarea.style.height = "0px";
  measureTextarea.style.minHeight = "0px";
  measureTextarea.style.boxSizing = sourceTextarea.style.boxSizing || "border-box";
  measureTextarea.style.fontSize = sourceTextarea.style.fontSize;
  measureTextarea.style.padding = sourceTextarea.style.padding;
  measureTextarea.style.fontFamily = sourceTextarea.style.fontFamily;
  measureTextarea.style.fontStyle = sourceTextarea.style.fontStyle;
  measureTextarea.style.fontWeight = sourceTextarea.style.fontWeight;
  measureTextarea.style.textDecoration = sourceTextarea.style.textDecoration;
  measureTextarea.style.lineHeight = sourceTextarea.style.lineHeight || "1.25";
  measureTextarea.style.letterSpacing = sourceTextarea.style.letterSpacing;
  return Math.max(minimumHeight, Math.ceil(Number(measureTextarea.scrollHeight) || 0));
}

export function getSelectionHitRadius(scale) {
  return Math.max(6, Math.round(12 / scale));
}

export function shouldSelectAll(event) {
  const isAKey = event.key?.toLowerCase() === "a" || event.code === "KeyA";
  return isAKey && (event.ctrlKey || event.metaKey);
}

export function shouldPreventBrowserZoom(event) {
  return Boolean(event.ctrlKey || event.metaKey);
}

export function pointHitsSelectionBounds(point, boxes, padding = 0) {
  if (!point || !Array.isArray(boxes) || boxes.length === 0) return false;
  const bounds = boxes.reduce(
    (acc, box) => ({
      minX: Math.min(acc.minX, box.x),
      minY: Math.min(acc.minY, box.y),
      maxX: Math.max(acc.maxX, box.x + box.width),
      maxY: Math.max(acc.maxY, box.y + box.height),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  return (
    point.x >= bounds.minX - padding &&
    point.x <= bounds.maxX + padding &&
    point.y >= bounds.minY - padding &&
    point.y <= bounds.maxY + padding
  );
}
