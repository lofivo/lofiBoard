import { normalizeRect } from "./geometry.js";
import { createId } from "./ids.js";
import { getFillValue } from "./tool-behavior.js";
import { TOOLS } from "./ui-config.js";

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
