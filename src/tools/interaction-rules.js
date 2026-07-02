import { TOOLS } from "../ui/config.js";
import {
  canRenderLatexText,
  containsRenderableLatex,
  parseLatexText,
  tokenizeLatexText,
} from "../services/latex.js";

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

function closestDomTarget(target, selector) {
  if (!target || !selector) return null;
  if (typeof target.closest === "function") return target.closest(selector);
  return target.parentElement?.closest?.(selector) ?? null;
}

export function shouldPreserveTextEditorOnPointerDown({
  target,
  editorFrame,
  isTransformer = false,
  auxiliarySelector = "[data-style-panel], [data-panel-edge='style'], [data-react-context-menu], [data-context-menu]",
} = {}) {
  if (editorFrame?.contains?.(target)) return true;
  if (isTransformer) return true;
  return Boolean(closestDomTarget(target, auxiliarySelector));
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
  measureText,
}) {
  const scale = Math.max(0.01, Number(stageScale) || 1);
  const padding = Math.max(0, Number(element?.padding) || 0);
  const fontSize = Number(element?.fontSize) || minFontSize;
  const transformFontSize = isTextWidthResizeAnchor(anchor) ? fontSize : Math.min(fontSize, minFontSize);
  const minWidth = isTextWidthResizeAnchor(anchor)
    ? getMinimumTextBoxWidth({
      text: element?.text,
      fontSize: transformFontSize,
      padding,
      measureText,
    })
    : getMinimumTextResizeWidth(transformFontSize) + padding * 2;
  return {
    minWidth: minWidth * scale,
    minHeight: getSingleLineTextEditorHeight(transformFontSize, scale, lineHeight),
  };
}

export function getMinimumTextResizeWidth(fontSize) {
  return Math.max(8, Number(fontSize) || 0);
}

export function getMinimumTextBoxWidth({
  text = "",
  fontSize,
  padding = 0,
  measureText,
} = {}) {
  const size = Math.max(1, Number(fontSize) || 1);
  const horizontalPadding = Math.max(0, Number(padding) || 0);
  const baseWidth = getMinimumTextResizeWidth(size) + horizontalPadding * 2;
  if (!containsRenderableLatex(text) || !canRenderLatexText(text)) return baseWidth;
  return Math.max(baseWidth, getMinimumLatexTextBoxWidth({
    text,
    fontSize: size,
    padding: horizontalPadding,
    measureText,
  }));
}

export function getMinimumLatexTextBoxWidth({
  text = "",
  fontSize,
  padding = 0,
  measureText,
} = {}) {
  if (!containsRenderableLatex(text) || !canRenderLatexText(text)) return 0;
  const size = Math.max(1, Number(fontSize) || 1);
  const horizontalPadding = Math.max(0, Number(padding) || 0);
  const measure = typeof measureText === "function" ? measureText : (value) => String(value).length * size * 0.55;
  const tokens = tokenizeLatexText(text);
  const mathValues = tokens.some((token) => token.type === "math")
    ? tokens.filter((token) => token.type === "math").map((token) => token.value)
    : [parseLatexText(text).expression || text];
  const widestMath = Math.max(...mathValues.map((value) => getMinimumLatexExpressionWidth(value, {
    measure,
    fontSize: size,
  })), 0);
  const plainWidth = Math.max(0, ...tokens
    .filter((token) => token.type === "text")
    .map((token) => measure(token.value || " ")));
  return Math.ceil(Math.max(widestMath, plainWidth) + horizontalPadding * 2 + 1);
}

function getMinimumLatexExpressionWidth(value, { measure, fontSize }) {
  const expression = String(value || " ");
  const parts = getLatexBaseLikeParts(expression);
  const baseWidth = Math.max(
    ...(parts.length ? parts : [" "]).map((part) => measure(part || " ") + fontSize * 0.35),
    0,
  );
  return Math.max(baseWidth, ...getLatexCommandWidthCandidates(expression, { measure, fontSize }));
}

function getLatexBaseLikeParts(expression) {
  return String(expression || " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\\(.)/g, "$1")
    .replace(/[{}_^]/g, " ")
    .split(/\s+/)
    .flatMap((part) => part.split(/(?<=[+\-=<>*/])|(?=[+\-=<>*/])/))
    .reduce((parts, part) => {
      if (!part) return parts;
      const previous = parts.at(-1);
      if (/^[+\-=<>*/]$/.test(part) && previous) {
        parts[parts.length - 1] = `${previous}${part}`;
      } else {
        parts.push(part);
      }
      return parts;
    }, []);
}

function getLatexCommandWidthCandidates(expression, { measure, fontSize }) {
  const source = String(expression || "");
  const candidates = [];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "\\") continue;
    const commandMatch = /^\\([a-zA-Z]+)/.exec(source.slice(index));
    if (!commandMatch) continue;
    const command = commandMatch[1];
    let cursor = skipLatexWhitespace(source, index + commandMatch[0].length);
    if (["frac", "dfrac", "tfrac", "binom"].includes(command)) {
      const numerator = readLatexGroup(source, cursor);
      const denominator = numerator ? readLatexGroup(source, skipLatexWhitespace(source, numerator.end)) : null;
      if (numerator && denominator) {
        candidates.push(
          Math.max(
            getLatexGroupRenderedWidth(numerator.value, { measure, fontSize }),
            getLatexGroupRenderedWidth(denominator.value, { measure, fontSize }),
          ) + fontSize * 1.2,
        );
        index = denominator.end - 1;
      }
      continue;
    }
    if (command === "sqrt") {
      if (source[cursor] === "[") {
        const optionalEnd = source.indexOf("]", cursor + 1);
        if (optionalEnd !== -1) cursor = skipLatexWhitespace(source, optionalEnd + 1);
      }
      const group = readLatexGroup(source, cursor);
      if (group) {
        candidates.push(getLatexGroupRenderedWidth(group.value, { measure, fontSize }) + fontSize * 0.8);
        index = group.end - 1;
      }
      continue;
    }
    const group = readLatexGroup(source, cursor);
    if (group) {
      candidates.push(getLatexGroupRenderedWidth(group.value, { measure, fontSize }) + fontSize * 0.35);
      index = group.end - 1;
    }
  }
  return candidates;
}

function getLatexGroupRenderedWidth(value, { measure, fontSize }) {
  const visible = String(value || " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\\(.)/g, "$1")
    .replace(/[{}_^]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || " ";
  return Math.max(
    measure(visible),
    ...getLatexCommandWidthCandidates(value, { measure, fontSize }),
  );
}

function skipLatexWhitespace(source, index) {
  let cursor = index;
  while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  return cursor;
}

function readLatexGroup(source, start) {
  if (source[start] !== "{") return null;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "\\" && index + 1 < source.length) {
      index += 1;
      continue;
    }
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: source.slice(start + 1, index),
          end: index + 1,
        };
      }
    }
  }
  return null;
}

export function getPreferredTextBoxWidth({
  text = "",
  baseWidth = 220,
  contentWidth = 0,
  padding = 0,
  latexDefaultWidth = 0,
  maxWidth = 960,
} = {}) {
  const fallbackWidth = Math.max(1, Number(baseWidth) || 1);
  if (!containsRenderableLatex(text) || !canRenderLatexText(text)) return fallbackWidth;
  const horizontalPadding = Math.max(0, Number(padding) || 0);
  const measuredWidth = Math.ceil(Math.max(0, Number(contentWidth) || 0) + horizontalPadding * 2 + 1);
  const defaultWidth = Math.max(fallbackWidth, Number(latexDefaultWidth) || fallbackWidth);
  return Math.min(
    Math.max(1, Number(maxWidth) || 1),
    Math.max(defaultWidth, measuredWidth),
  );
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
  const getTextWidth = (value) => Math.max(0, Number(measure(value)) || 0);
  const splitTextUnits = (value) => Array.from(String(value));
  const paragraphs = String(text || " ").split("\n");
  const lineCount = paragraphs.reduce((count, paragraph) => {
    let lines = 1;
    let remaining = String(paragraph || " ");

    if (getTextWidth(remaining) <= width) return count + lines;

    lines = 0;
    while (remaining.length > 0) {
      const units = splitTextUnits(remaining);
      let low = 0;
      let high = units.length;
      let match = "";

      while (low < high) {
        const mid = (low + high) >>> 1;
        const candidate = units.slice(0, mid + 1).join("");
        if (getTextWidth(candidate) <= width) {
          low = mid + 1;
          match = candidate;
        } else {
          high = mid;
        }
      }

      if (!match) {
        low = 1;
        match = units[0] || " ";
      } else {
        const matchUnits = splitTextUnits(match);
        const nextUnit = units[matchUnits.length];
        const nextIsWordBoundary = nextUnit === " " || nextUnit === "-";
        if (!nextIsWordBoundary) {
          const lastSpaceIndex = matchUnits.lastIndexOf(" ");
          const lastDashIndex = matchUnits.lastIndexOf("-");
          const wrapIndex = Math.max(lastSpaceIndex, lastDashIndex) + 1;
          if (wrapIndex > 0) {
            low = wrapIndex;
            match = units.slice(0, low).join("");
          }
        }
      }

      lines += 1;
      remaining = units.slice(low).join("").trimStart();
      if (remaining.length > 0 && getTextWidth(remaining) <= width) {
        lines += 1;
        break;
      }
    }

    return count + lines;
  }, 0);

  return Math.max(Math.ceil(Number(minHeight) || 0), Math.ceil(lineCount * lineHeightPx));
}

function getTextBoxHeightMeasurement(text) {
  const source = String(text || " ");
  if (!containsRenderableLatex(source) || !canRenderLatexText(source)) {
    return { text: source, isRenderableLatex: false };
  }
  const tokens = tokenizeLatexText(source);
  if (tokens.some((token) => token.type === "math")) {
    return {
      text: tokens.map((token) => token.value || " ").join(""),
      isRenderableLatex: true,
    };
  }
  const parsed = parseLatexText(source);
  return {
    text: parsed.ok && parsed.expression ? parsed.expression : source,
    isRenderableLatex: true,
  };
}

export function getLatexTextBoxVerticalPadding({
  text = "",
  contentWidth,
  fontSize,
  lineHeight = 1.25,
  measureText,
} = {}) {
  const measurement = getTextBoxHeightMeasurement(text);
  if (!measurement.isRenderableLatex) return 0;
  const width = Math.max(1, Number(contentWidth) || 1);
  const size = Math.max(1, Number(fontSize) || 1);
  const lineHeightPx = size * (Number(lineHeight) || 1.25);
  const wrappedHeight = measureWrappedTextHeight({
    text: measurement.text,
    contentWidth: width,
    fontSize: size,
    lineHeight,
    measureText,
    minHeight: lineHeightPx,
  });
  const estimatedLines = Math.max(1, Math.ceil(wrappedHeight / lineHeightPx));
  return Math.ceil(estimatedLines * size * 0.55);
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
  const minWidth = getMinimumTextBoxWidth({
    text,
    fontSize: size,
    padding: horizontalPadding,
    measureText,
  });
  const nextWidth = Math.max(minWidth, Number(width) || minWidth);
  const contentWidth = Math.max(1, nextWidth - horizontalPadding * 2);
  const measurement = getTextBoxHeightMeasurement(text);
  return {
    width: nextWidth,
    height: measureWrappedTextHeight({
      text: measurement.text,
      contentWidth,
      fontSize: size,
      lineHeight,
      measureText,
      minHeight: size * lineHeight,
    }) + Math.max(0, Number(verticalGap) || 0) + getLatexTextBoxVerticalPadding({
      text,
      contentWidth,
      fontSize: size,
      lineHeight,
      measureText,
    }),
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

export function clampTransformerAnchorDragBySize({ transformer, oldAbsPos, newAbsPos, minWidth, minHeight }) {
  const anchor = transformer?.getActiveAnchor?.();
  if (!anchor || anchor === "rotater") return newAbsPos;
  const topLeft = transformer?.findOne?.(".top-left");
  const bottomRight = transformer?.findOne?.(".bottom-right");
  if (!topLeft || !bottomRight) return newAbsPos;

  const topLeftAbs = topLeft.getAbsolutePosition();
  const bottomRightAbs = bottomRight.getAbsolutePosition();
  const nextPos = clampResizeAnchorPosition({
    anchor,
    position: newAbsPos,
    topLeft: topLeftAbs,
    bottomRight: bottomRightAbs,
    minWidth: Number(minWidth) || 1,
    minHeight: Number(minHeight) || 1,
  });

  return Number.isFinite(nextPos.x) && Number.isFinite(nextPos.y) ? nextPos : oldAbsPos;
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
