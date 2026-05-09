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

export function truncateWithEllipsis(value, maxLength) {
  const text = String(value ?? "");
  const length = Math.max(1, Number(maxLength) || 1);
  const characters = Array.from(text);
  if (characters.length <= length) return text;
  return `${characters.slice(0, Math.max(0, length - 1)).join("")}…`;
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

export function measureWrappedTextHeight({
  text = "",
  contentWidth,
  fontSize,
  lineHeight = 1.25,
  measureText,
  minHeight = 0,
}) {
  const width = Math.max(1, Number(contentWidth) || 1);
  const size = Math.max(1, Number(fontSize) || 1);
  const lineHeightPx = size * (Number(lineHeight) || 1.25);
  const measure = typeof measureText === "function" ? measureText : (value) => String(value).length * size * 0.55;
  const paragraphs = String(text || " ").split("\n");
  const lineCount = paragraphs.reduce((count, paragraph) => {
    const tokens = String(paragraph || " ").split(/(\s+)/).filter((token) => token.length > 0);
    let lines = 1;
    let currentWidth = 0;

    for (const token of tokens.length ? tokens : [" "]) {
      const tokenWidth = measure(token);
      if (tokenWidth > width) {
        for (const character of Array.from(token)) {
          const characterWidth = Math.max(1, measure(character));
          if (currentWidth > 0 && currentWidth + characterWidth > width) {
            lines += 1;
            currentWidth = 0;
          }
          if (characterWidth > width) {
            lines += Math.max(0, Math.ceil(characterWidth / width) - 1);
            currentWidth = characterWidth % width;
            if (currentWidth === 0) currentWidth = width;
          } else {
            currentWidth += characterWidth;
          }
        }
        continue;
      }
      if (currentWidth > 0 && currentWidth + tokenWidth > width) {
        lines += 1;
        currentWidth = token.trim() ? tokenWidth : 0;
      } else {
        currentWidth += tokenWidth;
      }
    }

    return count + lines;
  }, 0);

  return Math.max(Math.ceil(Number(minHeight) || 0), Math.ceil(lineCount * lineHeightPx));
}

export function getNormalizedTextBox({
  text = "",
  width,
  fontSize,
  padding = 0,
  lineHeight = 1.25,
  verticalGap = 2,
  measureText,
}) {
  const size = Math.max(1, Number(fontSize) || 1);
  const horizontalPadding = Math.max(0, Number(padding) || 0);
  const minWidth = getMinimumTextResizeWidth(size) + horizontalPadding * 2;
  const nextWidth = Math.max(minWidth, Number(width) || minWidth);
  return {
    width: nextWidth,
    height: measureWrappedTextHeight({
      text,
      contentWidth: Math.max(1, nextWidth - horizontalPadding * 2),
      fontSize: size,
      lineHeight,
      measureText,
      minHeight: size * lineHeight,
    }) + Math.max(0, Number(verticalGap) || 0),
  };
}

export function clampResizeAnchorPosition({
  anchor,
  position,
  topLeft,
  bottomRight,
  minWidth,
  minHeight,
}) {
  if (!anchor || anchor === "rotater" || !position || !topLeft || !bottomRight) return position;
  const nextPosition = { ...position };
  const minimumWidth = Math.max(1, Number(minWidth) || 1);
  const minimumHeight = Math.max(1, Number(minHeight) || 1);

  if (anchor.includes("right")) {
    nextPosition.x = Math.max(nextPosition.x, topLeft.x + minimumWidth);
  }
  if (anchor.includes("left")) {
    nextPosition.x = Math.min(nextPosition.x, bottomRight.x - minimumWidth);
  }
  if (anchor.includes("bottom")) {
    nextPosition.y = Math.max(nextPosition.y, topLeft.y + minimumHeight);
  }
  if (anchor.includes("top")) {
    nextPosition.y = Math.min(nextPosition.y, bottomRight.y - minimumHeight);
  }

  return nextPosition;
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
