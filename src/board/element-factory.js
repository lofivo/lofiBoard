import { normalizeRect } from "../canvas/geometry.js";
import { createId } from "./ids.js";
import { getFillValue } from "../tools/tool-behavior.js";
import { TOOLS } from "../ui/ui-config.js";

export function createTextElement({ point, color, fontSize, zIndex }) {
  return {
    id: createId("text"),
    type: "text",
    x: point.x,
    y: point.y,
    text: "",
    width: 280,
    fontSize,
    fontFamily: "Inter, system-ui, sans-serif",
    fill: color,
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

export function createImageElement({ point, src, width, height, zIndex }) {
  const maxWidth = 420;
  const scale = width > maxWidth ? maxWidth / width : 1;
  return {
    id: createId("image"),
    type: "image",
    x: point.x,
    y: point.y,
    width: Math.max(40, Math.round(width * scale)),
    height: Math.max(40, Math.round(height * scale)),
    src,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

export function createShapeElement({ type, start, end, existingId, stroke, strokeWidth, fillColor, transparentFill, zIndex }) {
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

  return {
    ...common,
    type,
    x: 0,
    y: 0,
    points: [start.x, start.y, end.x, end.y],
    fill: stroke,
  };
}

export function isTinyElement(element) {
  if (element.type === "rect") return element.width < 4 || element.height < 4;
  if (element.type === "ellipse") return element.radiusX < 3 || element.radiusY < 3;
  if (element.type === "line" || element.type === "arrow") {
    return Math.hypot(element.points[2] - element.points[0], element.points[3] - element.points[1]) < 4;
  }
  return false;
}
