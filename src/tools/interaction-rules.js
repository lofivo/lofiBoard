import { TOOLS } from "../ui/ui-config.js";

export const CORNER_TRANSFORMER_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export const TEXT_TRANSFORMER_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
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

export function isTransformerAnchorTarget(target) {
  let node = target;
  while (node) {
    if (node.hasName?.("_anchor")) return true;
    if (node.getClassName?.() === "Transformer") return false;
    node = node.getParent?.();
  }
  return false;
}

export function shouldIgnoreCanvasPointerDown({ target, isEditingText }) {
  return Boolean(isEditingText || isTransformerAnchorTarget(target));
}

export function shouldEditTextOnTransformerDoubleClick({
  target,
  currentTool,
  isTemporaryPanActive = false,
  element,
  selectedIds = [],
}) {
  if (isTemporaryPanActive || currentTool !== TOOLS.SELECT || isTransformerAnchorTarget(target)) return false;
  if (!element || !["text", "sticky"].includes(element.type) || element.locked) return false;
  return selectedIds.includes(element.id);
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

export function isTransformerVerticalScaleAnchor(anchor) {
  return anchor === "top-center" || anchor === "bottom-center";
}

export function isTransformerScaleAnchor(anchor) {
  return CORNER_TRANSFORMER_ANCHORS.includes(anchor) || isTransformerVerticalScaleAnchor(anchor);
}

export function shouldUseUniformTransformerResize(elements, anchor) {
  if (!anchor || !Array.isArray(elements) || elements.length !== 1) return false;
  const type = elements[0]?.type;
  if (type === "text") {
    return isTransformerScaleAnchor(anchor);
  }
  if (type === "sticky" || String(type ?? "").endsWith("-structure")) {
    return CORNER_TRANSFORMER_ANCHORS.includes(anchor)
      || isTransformerVerticalScaleAnchor(anchor)
      || isTextWidthResizeAnchor(anchor);
  }
  return CORNER_TRANSFORMER_ANCHORS.includes(anchor);
}

export function getUniformScaledBoxForResize({
  elements,
  anchor,
  oldBox,
  newBox,
  minWidth = 1,
  minHeight = 1,
}) {
  if (!shouldUseUniformTransformerResize(elements, anchor)) return newBox;
  return getUniformScaledBoxForVerticalResize({
    anchor,
    oldBox,
    newBox,
    minWidth,
    minHeight,
  });
}

export function getUniformScaledBoxForVerticalResize({
  anchor,
  oldBox,
  newBox,
  minWidth = 1,
  minHeight = 1,
}) {
  if (
    !(
      isTransformerScaleAnchor(anchor)
      || isTextWidthResizeAnchor(anchor)
    )
    || !oldBox
    || !newBox
  ) return newBox;

  const oldWidth = Math.max(1, Math.abs(Number(oldBox.width) || 1));
  const oldHeight = Math.max(1, Math.abs(Number(oldBox.height) || 1));
  const minimumWidth = Math.max(1, Number(minWidth) || 1);
  const minimumHeight = Math.max(1, Number(minHeight) || 1);
  const requestedWidth = Math.max(minimumWidth, Math.abs(Number(newBox.width) || minimumWidth));
  const requestedHeight = Math.max(minimumHeight, Math.abs(Number(newBox.height) || minimumHeight));
  const requestedScale = isTransformerVerticalScaleAnchor(anchor)
    ? requestedHeight / oldHeight
    : isTextWidthResizeAnchor(anchor)
      ? requestedWidth / oldWidth
    : Math.max(requestedWidth / oldWidth, requestedHeight / oldHeight);
  const scale = Math.max(requestedScale, minimumWidth / oldWidth, minimumHeight / oldHeight);
  const nextWidth = oldWidth * scale;
  const nextHeight = oldHeight * scale;
  const centerX = oldBox.x + oldWidth / 2;
  const nextX = anchor.includes("left")
    ? oldBox.x + oldWidth - nextWidth
    : anchor.includes("right")
      ? oldBox.x
      : centerX - nextWidth / 2;
  const centerY = oldBox.y + oldHeight / 2;
  const nextY = anchor.includes("top")
    ? oldBox.y + oldHeight - nextHeight
    : anchor.includes("bottom")
      ? oldBox.y
      : centerY - nextHeight / 2;

  return {
    ...newBox,
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

export function getTextScaleCommitBox({
  element,
  nodeWidth,
  nodeHeight,
  nodeScaleX,
  nodeScaleY,
  anchor,
  minFontSize = 8,
}) {
  const scaleX = Math.abs(Number(nodeScaleX) || 1);
  const scaleY = Math.abs(Number(nodeScaleY) || 1);
  const baseWidth = Number(element?.width) || 1;
  if (isTextWidthResizeAnchor(anchor)) {
    return {
      width: Math.max(1, Number.isFinite(nodeWidth) ? nodeWidth * scaleX : baseWidth * scaleX),
      height: Number.isFinite(nodeHeight) ? Math.max(1, nodeHeight) : element?.height,
      fontSize: Number(element?.fontSize) || minFontSize,
    };
  }

  const fontSize = Number(element?.fontSize) || minFontSize;
  const baseHeight = Number(element?.height);
  const scale = Math.max(minFontSize / fontSize, Math.max(0.1, Math.max(scaleX, scaleY)));
  return {
    width: Math.max(1, baseWidth * scale),
    height: Number.isFinite(baseHeight) ? Math.max(1, baseHeight * scale) : element?.height,
    fontSize: fontSize * scale,
  };
}

export function getStickyScaleCommitBox({ element, nodeScaleX, nodeScaleY, minFontSize = 8 }) {
  const scaleX = Number.isFinite(nodeScaleX) && nodeScaleX > 0 ? nodeScaleX : 1;
  const scaleY = Number.isFinite(nodeScaleY) && nodeScaleY > 0 ? nodeScaleY : 1;
  const fontSize = Number(element?.fontSize) || minFontSize;
  const fontScale = Math.max(minFontSize / fontSize, Math.max(0.1, Math.max(scaleX, scaleY)));
  return {
    width: Math.max(1, (Number(element?.width) || 1) * scaleX),
    height: Math.max(1, (Number(element?.height) || 1) * scaleY),
    fontSize: fontSize * fontScale,
  };
}

export function getStickyEditorCommitBox({ committedWidth, committedHeight, stageScale = 1 }) {
  const scale = Number.isFinite(stageScale) && stageScale > 0 ? stageScale : 1;
  return {
    width: Math.max(1, (Number(committedWidth) || 1) / scale),
    height: Math.max(1, (Number(committedHeight) || 1) / scale),
  };
}

export function getStickyTextInsets(fontSize, baseFontSize = 22) {
  const scale = Math.max(0.01, (Number(fontSize) || baseFontSize) / baseFontSize);
  return {
    x: 14 * scale,
    y: 12 * scale,
  };
}

export function getStickyVisualMetrics(fontSize, baseFontSize = 22) {
  const scale = Math.max(0.01, (Number(fontSize) || baseFontSize) / baseFontSize);
  return {
    insets: getStickyTextInsets(fontSize, baseFontSize),
    cornerRadius: 6 * scale,
    strokeWidth: scale,
    shadowColor: "rgba(120, 113, 108, 0.24)",
    shadowBlur: 36 * scale,
    shadowOffset: { x: 0, y: 18 * scale },
    shadowOpacity: 1,
  };
}

export function getTextTransformMinimumSize({
  element,
  anchor,
  stageScale = 1,
  minFontSize = 8,
  lineHeight = 1.25,
}) {
  const scale = Math.max(0.01, Number(stageScale) || 1);
  const padding = Math.max(0, Number(element?.padding) || 0);
  const fontSize = Number(element?.fontSize) || minFontSize;
  const transformFontSize = isTextWidthResizeAnchor(anchor) ? fontSize : Math.min(fontSize, minFontSize);
  return {
    minWidth: (getMinimumTextResizeWidth(transformFontSize) + padding * 2) * scale,
    minHeight: getSingleLineTextEditorHeight(transformFontSize, scale, lineHeight),
  };
}

export function getMinimumTextResizeWidth(fontSize) {
  return Math.max(8, Number(fontSize) || 0);
}

export function getSingleLineTextEditorHeight(fontSize, scale = 1, lineHeight = 1.25) {
  return (Number(fontSize) || 0) * scale * lineHeight;
}

export function getTextEditorStyle({ element, scale = 1, horizontalPadding = 0, lineHeight = 1.25 }) {
  const fontStyle = String(element?.fontStyle ?? "");
  return {
    fontSize: `${(Number(element?.fontSize) || 0) * scale}px`,
    padding: `0 ${horizontalPadding}px`,
    color: "transparent",
    fontFamily: element?.fontFamily,
    fontStyle: fontStyle.includes("italic") ? "italic" : "normal",
    fontWeight: fontStyle.includes("bold") ? "700" : "400",
    textDecoration: element?.textDecoration || "none",
    lineHeight: String(lineHeight),
    letterSpacing: "0px",
  };
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

export function shouldUseBrowserSelectAll(event) {
  if (!shouldSelectAll(event)) return false;
  return isNativeTextEditingTarget(event.target);
}

export function isNativeTextEditingTarget(target) {
  if (target?.isContentEditable) return true;
  const tagName = String(target?.tagName ?? "").toLowerCase();
  if (tagName === "textarea") return true;
  if (tagName !== "input") return false;
  return ["text", "search", "url", "tel", "email", "password", "number"].includes(
    String(target?.type ?? "text").toLowerCase(),
  );
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

export function pickElementIdAtPoint({
  point,
  candidates = [],
  padding = 0,
  fallbackId = null,
  selectedIds = [],
  preferUnselected = false,
}) {
  if (!point || !Array.isArray(candidates)) return fallbackId ?? null;
  const selected = new Set(selectedIds);
  const hitPadding = Math.max(0, Number(padding) || 0);
  const hits = candidates
    .filter((candidate) => {
      if (!candidate?.id || !candidate.box) return false;
      return pointHitsSelectionBounds(point, [candidate.box], hitPadding);
    })
    .sort((a, b) => (Number(b.zIndex) || 0) - (Number(a.zIndex) || 0));

  if (preferUnselected) {
    if (selected.has(hits[0]?.id)) return null;
    return hits.find((candidate) => !selected.has(candidate.id))?.id ?? null;
  }

  return hits[0]?.id ?? (preferUnselected ? null : fallbackId ?? null);
}
