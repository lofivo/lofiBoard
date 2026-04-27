import Konva from "konva";
import { flattenPoints } from "./geometry.js";

export function createElementNode(element, { draggable, onMove, onSelect, onEditText }) {
  let node;
  const common = {
    id: element.id,
    name: "element",
    draggable,
    rotation: element.rotation ?? 0,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
  };

  if (element.type === "stroke") {
    node = new Konva.Line({
      ...common,
      x: element.x ?? 0,
      y: element.y ?? 0,
      points: flattenPoints(element.points ?? []),
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      lineCap: "round",
      lineJoin: "round",
      tension: 0.45,
    });
  } else if (element.type === "text") {
    node = new Konva.Text({
      ...common,
      x: element.x,
      y: element.y,
      text: element.text,
      width: element.width,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fill: element.fill,
      lineHeight: 1.25,
    });
    node.on("dblclick dbltap", () => onEditText(element.id));
  } else if (element.type === "rect") {
    node = new Konva.Rect({
      ...common,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      fill: resolveFill(element.fill),
    });
  } else if (element.type === "ellipse") {
    node = new Konva.Ellipse({
      ...common,
      x: element.x,
      y: element.y,
      radiusX: element.radiusX,
      radiusY: element.radiusY,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      fill: resolveFill(element.fill),
    });
  } else if (element.type === "line") {
    node = new Konva.Line({
      ...common,
      x: element.x ?? 0,
      y: element.y ?? 0,
      points: element.points,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      lineCap: "round",
      lineJoin: "round",
    });
  } else if (element.type === "arrow") {
    node = new Konva.Arrow({
      ...common,
      x: element.x ?? 0,
      y: element.y ?? 0,
      points: element.points,
      stroke: element.stroke,
      fill: element.fill ?? element.stroke,
      strokeWidth: element.strokeWidth,
      pointerLength: 18,
      pointerWidth: 18,
      lineCap: "round",
      lineJoin: "round",
    });
  }

  node.on("dragend", () => onMove(node));
  node.on("click tap", (event) => onSelect(event, node));
  return node;
}

export function createNodeAttrs(element) {
  if (element.type === "rect") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      fill: resolveFill(element.fill),
    };
  }
  if (element.type === "ellipse") {
    return {
      x: element.x,
      y: element.y,
      radiusX: element.radiusX,
      radiusY: element.radiusY,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      fill: resolveFill(element.fill),
    };
  }
  if (element.type === "line" || element.type === "arrow") {
    return {
      points: element.points,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      fill: element.fill ?? element.stroke,
    };
  }
  return {};
}

function resolveFill(fill) {
  return fill === "transparent" ? undefined : fill;
}
