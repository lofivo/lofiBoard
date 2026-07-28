import { normalizeRect } from "../canvas/geometry.js";
import { createId } from "./ids.js";
import { getFillValue } from "../tools/behavior.js";
import { getNormalizedTextBox, getPreferredTextBoxWidth } from "../tools/interaction-rules.js";
import { containsRenderableLatex } from "../services/latex.js";
import { TOOLS } from "../ui/config.js";

export const DEFAULT_TEXT_STYLE = Object.freeze({
  fill: "#111827",
  fontSize: 28,
  fontFamily: "Inter, system-ui, sans-serif",
  fontStyle: "normal",
  textDecoration: "",
  padding: 6,
});

export const DEFAULT_COORDINATE_PLANE_STYLE = Object.freeze({
  unitSize: 40,
  gridStroke: "#e5e7eb",
  axisStroke: "#111827",
  labelFill: "#64748b",
});

export function createTextElement({ point, zIndex, text = "", measureText }) {
  const width = 220;
  const defaultHeight = DEFAULT_TEXT_STYLE.fontSize * 1.25;
  const measure = typeof measureText === "function" ? measureText : null;
  const preferredWidth = text
    ? getPreferredTextBoxWidth({
      text,
      baseWidth: width,
      contentWidth: measure ? measure(text) : 0,
      padding: DEFAULT_TEXT_STYLE.padding,
    })
    : width;
  const normalizedBox = text
    ? getNormalizedTextBox({
      text,
      width: preferredWidth,
      fontSize: DEFAULT_TEXT_STYLE.fontSize,
      padding: DEFAULT_TEXT_STYLE.padding,
      lineHeight: 1.25,
      verticalGap: 2,
      measureText: measure,
    })
    : { width: preferredWidth, height: defaultHeight };
  const usesSeparateEditBox = containsRenderableLatex(text);

  return {
    id: createId("text"),
    type: "text",
    x: point.x,
    y: point.y,
    text,
    width: normalizedBox.width,
    height: normalizedBox.height,
    editWidth: usesSeparateEditBox ? width : normalizedBox.width,
    editHeight: usesSeparateEditBox ? defaultHeight : normalizedBox.height,
    fontSize: DEFAULT_TEXT_STYLE.fontSize,
    fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
    fontStyle: DEFAULT_TEXT_STYLE.fontStyle,
    textDecoration: DEFAULT_TEXT_STYLE.textDecoration,
    padding: DEFAULT_TEXT_STYLE.padding,
    fill: DEFAULT_TEXT_STYLE.fill,
    align: "left",
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

export function createStickyElement({ point, zIndex }) {
  return {
    id: createId("sticky"),
    type: "sticky",
    x: point.x,
    y: point.y,
    width: 220,
    height: 160,
    text: "",
    fontSize: 22,
    fontFamily: "Inter, system-ui, sans-serif",
    fill: "#fef08a",
    textFill: "#1f2937",
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

export function createImageElement({ point, src, width, height, zIndex, anchor = "top-left" }) {
  const maxWidth = 420;
  const scale = width > maxWidth ? maxWidth / width : 1;
  const displayWidth = Math.max(40, Math.round(width * scale));
  const displayHeight = Math.max(40, Math.round(height * scale));
  return {
    id: createId("image"),
    type: "image",
    x: anchor === "center" ? point.x - displayWidth / 2 : point.x,
    y: anchor === "center" ? point.y - displayHeight / 2 : point.y,
    width: displayWidth,
    height: displayHeight,
    src,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

export function createShapeElement({
  type,
  start,
  end,
  existingId,
  stroke,
  strokeWidth,
  fillColor,
  transparentFill,
  opacity = 1,
  lineCap = "round",
  brushStyle = "solid",
  doubleArrow = false,
  zIndex,
}) {
  const rect = normalizeRect(start, end);
  const common = {
    id: existingId ?? createId(type),
    type,
    stroke,
    strokeWidth,
    fill: getFillValue({ transparent: transparentFill, color: fillColor }),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };

  if (type === TOOLS.RECT) {
    return { ...common, type: "rect", ...rect };
  }

  if (type === TOOLS.ELLIPSE) {
    return {
      ...common,
      type: "ellipse",
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      radiusX: rect.width / 2,
      radiusY: rect.height / 2,
    };
  }

  if (type === TOOLS.COORDINATE_PLANE) {
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    return {
      ...common,
      type: "coordinate-plane",
      x: rect.x,
      y: rect.y,
      width,
      height,
      unitSize: DEFAULT_COORDINATE_PLANE_STYLE.unitSize,
      origin: { x: width / 2, y: height / 2 },
      settings: {
        showGrid: true,
        showTicks: true,
        showLabels: true,
      },
      style: {
        gridStroke: DEFAULT_COORDINATE_PLANE_STYLE.gridStroke,
        axisStroke: DEFAULT_COORDINATE_PLANE_STYLE.axisStroke,
        labelFill: DEFAULT_COORDINATE_PLANE_STYLE.labelFill,
      },
    };
  }

  return {
    ...common,
    type,
    x: 0,
    y: 0,
    points: [start.x, start.y, end.x, end.y],
    fill: stroke,
    opacity,
    lineCap,
    brushStyle,
    ...(type === TOOLS.ARROW
      ? {
        pointerAtBeginning: Boolean(doubleArrow),
        pointerAtEnding: true,
      }
      : {}),
  };
}

export function isTinyElement(element) {
  if (element.type === "rect") return element.width < 4 || element.height < 4;
  if (element.type === "ellipse") return element.radiusX < 3 || element.radiusY < 3;
  if (element.type === "coordinate-plane") return element.width < 24 || element.height < 24;
  if (element.type === "line" || element.type === "arrow") {
    return Math.hypot(element.points[2] - element.points[0], element.points[3] - element.points[1]) < 4;
  }
  return false;
}
