import Konva from "konva";
import { flattenPoints } from "./geometry.js";

const imageCache = new Map();

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
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
      perfectDrawEnabled: false,
      shadowForStrokeEnabled: false,
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
  } else if (element.type === "sticky") {
    node = new Konva.Group({
      ...common,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    });
    node.add(new Konva.Rect({
      width: element.width,
      height: element.height,
      fill: element.fill,
      stroke: "#facc15",
      strokeWidth: 1,
      shadowColor: "rgba(15,23,42,0.18)",
      shadowBlur: 12,
      shadowOffset: { x: 0, y: 6 },
      shadowOpacity: 0.35,
      cornerRadius: 3,
    }));
    node.add(new Konva.Text({
      x: 14,
      y: 12,
      width: Math.max(40, element.width - 28),
      height: Math.max(32, element.height - 24),
      text: element.text,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fill: element.textFill ?? "#1f2937",
      lineHeight: 1.25,
    }));
    node.on("dblclick dbltap", () => onEditText(element.id));
  } else if (element.type === "image") {
    node = new Konva.Image({
      ...common,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      stroke: "#cbd5e1",
      strokeWidth: 1,
    });
    if (element.src && typeof window !== "undefined") {
      attachCachedImage(node, element.src);
    }
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
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 8, 14),
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
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 8, 14),
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
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
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
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
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
  if (element.type === "sticky") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }
  if (element.type === "image") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
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
  return fill === "transparent" ? "rgba(0,0,0,0)" : fill;
}

function attachCachedImage(node, src) {
  const entry = getCachedImage(src);
  node.image(entry.image);

  if (entry.loaded) return;
  entry.waitingNodes.add(node);
}

function getCachedImage(src) {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const image = new window.Image();
  const entry = {
    image,
    loaded: false,
    waitingNodes: new Set(),
  };

  image.onload = () => {
    entry.loaded = true;
    for (const node of entry.waitingNodes) {
      node.image(image);
      node.getLayer()?.batchDraw();
    }
    entry.waitingNodes.clear();
  };
  image.src = src;
  imageCache.set(src, entry);

  return entry;
}
