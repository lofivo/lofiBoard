import Konva from "konva";
import { flattenPoints } from "./geometry.js";
import {
  ARRAY_STRUCTURE_STYLE,
} from "../structures/linear-structure.js";
import {
  LINEAR_STRUCTURE_TYPES,
  STRUCTURE_ELEMENT_TYPES,
} from "../structures/types.js";
import {
  GRAPH_STRUCTURE_STYLE,
} from "../structures/graph-structure.js";
import {
  TREE_STRUCTURE_STYLE,
  addTreeEdge,
} from "../structures/tree-structure.js";
import { getStickyVisualMetrics } from "../tools/interaction-rules.js";
import { getTextDisplayValue } from "../services/latex.js";

const imageCache = new Map();
const LINEAR_POINTER_BASE_Y = -30;
const ARRAY_ALGORITHM_FLOATING_KEY_GAP = 12;
const PRESSURE_VARIATION_THRESHOLD = 0.08;
export const PRESSURE_STROKE_PREVIEW_ATTR = "forcePressureStroke";

export function getStickyBorderColor(fill) {
  const fallback = "#eab308";
  const hex = String(fill ?? "").trim();
  if (hex.toLowerCase() === "#fef08a") return fallback;
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return fallback;
  const value = match[1];
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const next = [r, g, b].map((channel) => Math.max(0, Math.round(channel * 0.7)));
  return `#${next.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function syncTextNodeSize(node, { width, height, padding = 0 }) {
  if (!node || !Number.isFinite(width) || !Number.isFinite(height)) return;
  const nextWidth = Math.max(1, width);
  const nextHeight = Math.max(1, height);
  const horizontalPadding = Math.max(0, Number(padding) || 0);
  node.width(nextWidth);
  node.height(nextHeight);

  const hitArea = node.findOne?.(".text-hit-area");
  hitArea?.setAttrs({
    width: nextWidth,
    height: nextHeight,
  });

  const textNode = node.findOne?.("Text");
  if (!textNode) return;
  textNode.x(horizontalPadding);
  textNode.y(0);
  textNode.width(Math.max(1, nextWidth - horizontalPadding * 2));
  textNode.height("auto");
  textNode.height(nextHeight);

}

export function syncTextNodeScalePreview(node, element, {
  scaleX = node?.scaleX?.() ?? 1,
  scaleY = node?.scaleY?.() ?? 1,
} = {}) {
  const textNode = node?.findOne?.("Text");
  if (!textNode || element?.type !== "text") return;

  const visualScaleX = Math.max(0.01, Math.abs(Number(scaleX) || 1));
  const visualScaleY = Math.max(0.01, Math.abs(Number(scaleY) || 1));
  const nextWidth = Math.max(1, Number(element.width) || 1);
  const nextHeight = Math.max(1, Number(element.height) || 1);
  const horizontalPadding = Math.max(0, Number(element.padding) || 0);
  const displayText = getTextDisplayValue(element.text);

  textNode.setAttrs({
    x: horizontalPadding / visualScaleX,
    y: 0,
    text: displayText,
    width: Math.max(1, (nextWidth - horizontalPadding * 2) / visualScaleX),
    height: Math.max(1, nextHeight / visualScaleY),
    fontSize: Math.max(1, Number(element.fontSize) || 1) / visualScaleY,
    fontFamily: element.fontFamily,
    fontStyle: element.fontStyle ?? "normal",
    textDecoration: element.textDecoration ?? "",
    fill: element.fill,
    align: element.align ?? "left",
    lineHeight: 1.25,
    padding: 0,
  });
}

function normalizePressureValue(pressure) {
  if (!Number.isFinite(pressure) || pressure <= 0) return 0.5;
  return Math.min(1, Math.max(0.05, pressure));
}

function getStrokePressurePoints(element) {
  return (element.points ?? []).map((point) => ({
    x: Number(point.x) || 0,
    y: Number(point.y) || 0,
    pressure: normalizePressureValue(point.pressure),
  }));
}

function hasPressureVariation(points) {
  if (points.length < 2) return false;
  const firstPressure = normalizePressureValue(points[0].pressure);
  return points.some((point) => Math.abs(normalizePressureValue(point.pressure) - firstPressure) > PRESSURE_VARIATION_THRESHOLD);
}

function getPressureStrokeWidth(strokeWidth, pressure) {
  const baseWidth = Math.max(1, Number(strokeWidth) || 1);
  return Math.max(1, baseWidth * (0.35 + normalizePressureValue(pressure) * 1.15));
}

function getBrushLineCap(element) {
  if (element.brushStyle === "dot") return "round";
  return element.lineCap ?? "round";
}

function getPointAtDistance(start, end, distanceValue) {
  const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
  if (segmentLength <= 0) return { ...start };
  const ratio = Math.max(0, Math.min(1, distanceValue / segmentLength));
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
    pressure: normalizePressureValue(start.pressure + (end.pressure - start.pressure) * ratio),
  };
}

function drawStrokeSegment(context, start, end, width) {
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.setAttr("lineWidth", width);
  context.stroke();
}

function drawPressureSolidStroke(context, points, strokeWidth, hit = false) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const width = hit
      ? Math.max(strokeWidth + 14, 22)
      : getPressureStrokeWidth(strokeWidth, (previous.pressure + point.pressure) / 2);
    drawStrokeSegment(context, previous, point, width);
  }
}

function drawPressureDashedStroke(context, points, strokeWidth, hit = false) {
  const dashLength = strokeWidth * 3;
  const gapLength = strokeWidth * 2;
  const cycleLength = dashLength + gapLength;
  let travelled = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segmentStart = points[index - 1];
    const segmentEnd = points[index];
    const segmentLength = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.y - segmentStart.y);
    if (segmentLength <= 0) continue;
    let distanceValue = 0;
    while (distanceValue < segmentLength) {
      const absoluteDistance = travelled + distanceValue;
      const cyclePosition = absoluteDistance % cycleLength;
      if (cyclePosition < dashLength) {
        const visibleLength = dashLength - cyclePosition;
        const nextDistance = Math.min(segmentLength, distanceValue + visibleLength);
        const startPoint = getPointAtDistance(segmentStart, segmentEnd, distanceValue);
        const endPoint = getPointAtDistance(segmentStart, segmentEnd, nextDistance);
        const width = hit
          ? Math.max(strokeWidth + 14, 22)
          : getPressureStrokeWidth(strokeWidth, (startPoint.pressure + endPoint.pressure) / 2);
        drawStrokeSegment(context, startPoint, endPoint, width);
        distanceValue = nextDistance;
      } else {
        const hiddenLength = cycleLength - cyclePosition;
        distanceValue += Math.min(segmentLength - distanceValue, hiddenLength);
      }
    }
    travelled += segmentLength;
  }
}

function drawPressureDottedStroke(context, shape, points, strokeWidth, hit = false) {
  const spacing = Math.max(4, strokeWidth * 1.8);
  let nextDotAt = 0;
  let travelled = 0;
  context.setAttr("fillStyle", hit ? shape.colorKey : shape.stroke());
  for (let index = 1; index < points.length; index += 1) {
    const segmentStart = points[index - 1];
    const segmentEnd = points[index];
    const segmentLength = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.y - segmentStart.y);
    if (segmentLength <= 0) continue;
    while (nextDotAt <= travelled + segmentLength) {
      const localDistance = nextDotAt - travelled;
      const dotPoint = getPointAtDistance(segmentStart, segmentEnd, localDistance);
      const width = hit
        ? Math.max(strokeWidth + 14, 22)
        : getPressureStrokeWidth(strokeWidth, dotPoint.pressure);
      context.beginPath();
      context.arc(dotPoint.x, dotPoint.y, width / 2, 0, Math.PI * 2);
      context.fill();
      nextDotAt += spacing;
    }
    travelled += segmentLength;
  }
}

function getPressureStrokeRect(points, strokeWidth = 1) {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function drawPressureStroke(context, shape, { hit = false } = {}) {
  const points = shape.getAttr("pressurePoints") ?? [];
  if (points.length < 2) return;
  const strokeWidth = Math.max(1, Number(shape.strokeWidth()) || 1);
  const strokeColor = hit ? shape.colorKey : shape.stroke();
  context.setAttr("strokeStyle", strokeColor);
  context.setAttr("lineCap", shape.lineCap() ?? "round");
  context.setAttr("lineJoin", "round");
  context.setLineDash([]);
  context.setAttr("lineDashOffset", shape.dashOffset?.() ?? 0);
  if (hit) {
    drawPressureSolidStroke(context, points, strokeWidth, true);
    return;
  }
  const brushStyle = shape.getAttr("brushStyle") ?? "solid";
  if (brushStyle === "dash") {
    drawPressureDashedStroke(context, points, strokeWidth);
    return;
  }
  if (brushStyle === "dot") {
    drawPressureDottedStroke(context, shape, points, strokeWidth);
    return;
  }
  drawPressureSolidStroke(context, points, strokeWidth);
}

function createPressureStrokeNode(element, common) {
  const pressurePoints = getStrokePressurePoints(element);
  const shape = new Konva.Shape({
    ...common,
    x: element.x ?? 0,
    y: element.y ?? 0,
    pressurePoints,
    stroke: element.stroke,
    strokeWidth: element.strokeWidth,
    opacity: element.opacity ?? 1,
    lineCap: getBrushLineCap(element),
    lineJoin: "round",
    brushStyle: element.brushStyle ?? "solid",
    dash: getBrushDash(element),
    hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
    perfectDrawEnabled: false,
    shadowForStrokeEnabled: false,
    sceneFunc: (context, pressureShape) => drawPressureStroke(context, pressureShape),
    hitFunc: (context, pressureShape) => drawPressureStroke(context, pressureShape, { hit: true }),
  });
  shape.getSelfRect = function getSelfRect() {
    return getPressureStrokeRect(this.getAttr("pressurePoints") ?? [], this.strokeWidth());
  };
  shape._attrsAffectingSize = ["pressurePoints"];
  return shape;
}

export function syncTextNodeContent(node, element, { renderLatex = true } = {}) {
  const textNode = node?.findOne?.("Text");
  if (!textNode || !["text", "sticky"].includes(element?.type)) return;
  const displayText = renderLatex ? getTextDisplayValue(element.text) : element.text;
  if (element.type === "sticky") {
    const rect = node.findOne?.("Rect");
    const nextWidth = Math.max(1, Number(element.width) || 1);
    const nextHeight = Math.max(1, Number(element.height) || 1);
    const metrics = getStickyVisualMetrics(element.fontSize);
    const { insets } = metrics;
    node.width(nextWidth);
    node.height(nextHeight);
    rect?.setAttrs({
      width: nextWidth,
      height: nextHeight,
      fill: element.fill,
      stroke: getStickyBorderColor(element.fill),
      strokeWidth: metrics.strokeWidth,
      shadowColor: metrics.shadowColor,
      shadowBlur: metrics.shadowBlur,
      shadowOffset: metrics.shadowOffset,
      shadowOpacity: metrics.shadowOpacity,
      cornerRadius: metrics.cornerRadius,
    });
    textNode.setAttrs({
      x: insets.x,
      y: insets.y,
      width: Math.max(40, nextWidth - insets.x * 2),
      height: Math.max(32, nextHeight - insets.y * 2),
      text: displayText,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fontStyle: element.fontStyle ?? "normal",
      textDecoration: element.textDecoration ?? "",
      fill: element.textFill ?? "#1f2937",
      lineHeight: 1.25,
    });
    return;
  }
  textNode.setAttrs({
    text: displayText,
    fontSize: element.fontSize,
    fontFamily: element.fontFamily,
    fontStyle: element.fontStyle ?? "normal",
    textDecoration: element.textDecoration ?? "",
    fill: element.fill,
    align: element.align ?? "left",
    lineHeight: 1.25,
    padding: 0,
  });
  syncTextNodeSize(node, {
    width: element.width,
    height: element.height,
    padding: element.padding ?? 0,
  });
  if (!renderLatex) {
    node.setAttr("latexRenderVersion", (node.getAttr("latexRenderVersion") ?? 0) + 1);
    node.setAttr("latexRenderSignature", null);
    node.findOne?.(".latex-image")?.destroy();
    textNode.visible(true);
    return;
  }
  node.setAttr("latexRenderVersion", (node.getAttr("latexRenderVersion") ?? 0) + 1);
  node.setAttr("latexRenderSignature", null);
  node.findOne?.(".latex-image")?.destroy();
  textNode.visible(true);
}

export function createElementNode(element, {
  draggable,
  onMove,
  onSelect,
  onEdit,
  onDragStart,
  onDragMove,
  canEditArrayItems = true,
  onArrayItemMove,
  onArrayItemEdit,
  onArrayItemSelect,
  onArrayItemPress,
  onArrayItemRelease,
  onArrayPointerPress,
  onGraphNodeMove,
  onGraphNodeClick,
  onGraphNodeConnect,
  onGraphNodeEdit,
  onGraphEdgeEdit,
  onGraphNodeDragStart,
  getGraphEdgeState,
  onTreeNodeEdit,
  onTreeNodeClick,
  onTreeNodePress,
  onTreeNodeMove,
  onTreeNodeConnect,
  getTreeConnectState,
}) {
  let node;
  const common = {
    id: element.id,
    name: "element",
    elementType: element.type,
    draggable,
    rotation: element.rotation ?? 0,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
  };

  if (element.type === "stroke") {
    const pressurePoints = getStrokePressurePoints(element);
    node = (element[PRESSURE_STROKE_PREVIEW_ATTR] || hasPressureVariation(pressurePoints))
      ? createPressureStrokeNode(element, common)
      : new Konva.Line({
        ...common,
        ...createNodeAttrs(element),
      });
  } else if (element.type === "text") {
    const horizontalPadding = element.padding ?? 0;
    node = new Konva.Group({
      ...common,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    });
    node.add(new Konva.Rect({
      name: "text-hit-area",
      width: element.width,
      height: element.height,
      fill: "rgba(0,0,0,0)",
      strokeEnabled: false,
    }));
    node.add(new Konva.Text({
      x: horizontalPadding,
      y: 0,
      text: element.text,
      width: Math.max(1, element.width - horizontalPadding * 2),
      height: element.height,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fontStyle: element.fontStyle ?? "normal",
      textDecoration: element.textDecoration ?? "",
      fill: element.fill,
      align: element.align ?? "left",
      lineHeight: 1.25,
      padding: 0,
    }));
    syncTextNodeContent(node, element);
  } else if (element.type === "sticky") {
    const metrics = getStickyVisualMetrics(element.fontSize);
    const { insets } = metrics;
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
      stroke: getStickyBorderColor(element.fill),
      strokeWidth: metrics.strokeWidth,
      shadowColor: metrics.shadowColor,
      shadowBlur: metrics.shadowBlur,
      shadowOffset: metrics.shadowOffset,
      shadowOpacity: metrics.shadowOpacity,
      cornerRadius: metrics.cornerRadius,
    }));
    node.add(new Konva.Text({
      x: insets.x,
      y: insets.y,
      width: Math.max(40, element.width - insets.x * 2),
      height: Math.max(32, element.height - insets.y * 2),
      text: element.text,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fontStyle: element.fontStyle ?? "normal",
      textDecoration: element.textDecoration ?? "",
      fill: element.textFill ?? "#1f2937",
      lineHeight: 1.25,
    }));
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
      ...getFillAttrs(element.fill),
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
      ...getFillAttrs(element.fill),
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
      opacity: element.opacity ?? 1,
      lineCap: getBrushLineCap(element),
      lineJoin: "round",
      dash: getBrushDash(element),
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
      opacity: element.opacity ?? 1,
      pointerLength: 18,
      pointerWidth: 18,
      pointerAtBeginning: element.pointerAtBeginning ?? false,
      pointerAtEnding: element.pointerAtEnding ?? true,
      lineCap: getBrushLineCap(element),
      lineJoin: "round",
      dash: getBrushDash(element),
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
    });
  } else if (element.type === "coordinate-plane") {
    node = new Konva.Group({
      ...common,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    });
    syncCoordinatePlaneNodeContent(node, element);
  } else if (LINEAR_STRUCTURE_TYPES.includes(element.type)) {
    node = createLinearStructureNode(element, common, {
      canEditArrayItems,
      onArrayItemEdit,
      onArrayItemSelect,
      onArrayItemPress,
      onArrayItemRelease,
      onArrayPointerPress,
    });
  } else if (element.type === "graph-structure") {
    node = createGraphStructureNode(element, common, {
      onGraphNodeMove,
      onGraphNodeClick,
      onGraphNodeEdit,
      onGraphEdgeEdit,
      onGraphNodeDragStart,
    });
  } else if (element.type === "tree-structure") {
    node = createTreeStructureNode(element, common, {
      onTreeNodeEdit,
      onTreeNodeClick,
      onTreeNodePress,
      onTreeNodeMove,
      onTreeNodeConnect,
      getTreeConnectState,
    });
  }

  let didDrag = false;
  node.on("dragstart", () => {
    didDrag = false;
    onDragStart?.(node);
  });
  node.on("dragmove", () => {
    didDrag = true;
    onDragMove?.(node);
  });
  node.on("dragend", () => onMove(node));
  node.on("click tap", (event) => {
    if (didDrag) {
      didDrag = false;
      event.cancelBubble = true;
      return;
    }
    onSelect(event, node);
  });
  node.on("dblclick dbltap", (event) => onEdit?.(event, node));
  return node;
}

const SYNCABLE_ELEMENT_TYPES = new Set([
  "rect",
  "ellipse",
  "line",
  "arrow",
  "text",
  "sticky",
  "stroke",
  "image",
  "coordinate-plane",
  ...LINEAR_STRUCTURE_TYPES,
  "graph-structure",
  "tree-structure",
]);

export function syncElementNode(node, element, handlers = {}) {
  if (!node || !element || !SYNCABLE_ELEMENT_TYPES.has(element.type)) return false;
  if (node.getAttr("elementType") !== element.type) return false;
  node.setAttrs({
    id: element.id,
    name: "element",
    draggable: node.draggable(),
    rotation: element.rotation ?? 0,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
    ...createNodeAttrs(element),
  });
  if (["text", "sticky"].includes(element.type)) {
    syncTextNodeContent(node, element);
  }
  if (element.type === "image") {
    if (element.src && typeof window !== "undefined") attachCachedImage(node, element.src);
  }
  if (element.type === "coordinate-plane") {
    syncCoordinatePlaneNodeContent(node, element);
  }
  if (LINEAR_STRUCTURE_TYPES.includes(element.type)) {
    syncLinearStructureNodeContent(node, element, handlers);
  }
  if (element.type === "graph-structure") {
    syncGraphStructureNodeContent(node, element, handlers);
  }
  if (element.type === "tree-structure") {
    syncTreeStructureNodeContent(node, element, handlers);
  }
  return true;
}

function getSyncedStructureDraggable(group, handlers = {}) {
  return typeof handlers.draggable === "boolean" ? handlers.draggable : group.draggable();
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
      ...getFillAttrs(element.fill),
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
  if (element.type === "text") {
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
      ...getFillAttrs(element.fill),
    };
  }
  if (element.type === "stroke") {
    return {
      x: element.x ?? 0,
      y: element.y ?? 0,
      pressurePoints: getStrokePressurePoints(element),
      points: flattenPoints(element.points ?? []),
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      opacity: element.opacity ?? 1,
      lineCap: getBrushLineCap(element),
      lineJoin: "round",
      brushStyle: element.brushStyle ?? "solid",
      tension: element.smoothing ?? 0.45,
      dash: getBrushDash(element),
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
    };
  }
  if (element.type === "line" || element.type === "arrow") {
    return {
      x: element.x ?? 0,
      y: element.y ?? 0,
      points: element.points,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      opacity: element.opacity ?? 1,
      lineCap: getBrushLineCap(element),
      lineJoin: "round",
      brushStyle: element.brushStyle ?? "solid",
      dash: getBrushDash(element),
      fill: element.fill ?? element.stroke,
      pointerAtBeginning: element.pointerAtBeginning ?? false,
      pointerAtEnding: element.pointerAtEnding ?? true,
    };
  }
  if (element.type === "coordinate-plane") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      origin: element.origin,
    };
  }
  if (LINEAR_STRUCTURE_TYPES.includes(element.type) || element.type === "graph-structure" || element.type === "tree-structure") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }
  return {};
}

export function syncCoordinatePlaneNodeContent(group, element) {
  if (!group || element?.type !== "coordinate-plane") return;
  const width = Math.max(1, Number(element.width) || 1);
  const height = Math.max(1, Number(element.height) || 1);
  group.destroyChildren();
  group.width(width);
  group.height(height);
  addCoordinatePlaneContent(group, element, width, height);
}

export function syncLinearStructureNodeContent(group, element, handlers) {
  const reusableItems = new Map();
  group.find(".array-item").forEach((itemGroup) => {
    const index = itemGroup.getAttr("linearIndex");
    if (Number.isInteger(index)) reusableItems.set(index, itemGroup);
  });
  [...group.getChildren()].forEach((child) => {
    if (child.getAttr("name")?.split(" ").includes("array-item")) {
      child.remove();
      return;
    }
    child.destroy();
  });
  const nextGroup = createLinearStructureNode(element, {
    id: element.id,
    name: "element",
    elementType: element.type,
    draggable: getSyncedStructureDraggable(group, handlers),
    rotation: element.rotation ?? 0,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
  }, handlers);
  [...nextGroup.getChildren()].forEach((child) => {
    const index = child.getAttr("linearIndex");
    if (child.getAttr("name")?.split(" ").includes("array-item") && Number.isInteger(index)) {
      const reusableItem = reusableItems.get(index);
      if (reusableItem && syncLinearStructureItemNode(reusableItem, child)) {
        child.destroy();
        reusableItem.moveTo(group);
        reusableItems.delete(index);
        return;
      }
    }
    child.moveTo(group);
  });
  reusableItems.forEach((itemGroup) => itemGroup.destroy());
  nextGroup.destroy();
}

function syncLinearStructureItemNode(target, source) {
  const targetChildren = target.getChildren();
  const sourceChildren = source.getChildren();
  if (targetChildren.length !== sourceChildren.length) return false;
  const childrenMatch = targetChildren.every((targetChild, index) => (
    targetChild.getClassName() === sourceChildren[index].getClassName()
  ));
  if (!childrenMatch) return false;
  target.setAttrs({
    ...source.getAttrs(),
    listening: source.listening(),
    visible: source.visible(),
  });
  target.eventListeners = source.eventListeners;
  targetChildren.forEach((targetChild, index) => {
    const sourceChild = sourceChildren[index];
    if (targetChild.getClassName() === "Group") {
      syncLinearStructureItemNode(targetChild, sourceChild);
      return;
    }
    targetChild.setAttrs({
      ...sourceChild.getAttrs(),
      listening: sourceChild.listening(),
      visible: sourceChild.visible(),
    });
    targetChild.eventListeners = sourceChild.eventListeners;
  });
  return true;
}

function syncGraphStructureNodeContent(group, element, handlers) {
  group.destroyChildren();
  const nextGroup = createGraphStructureNode(element, {
    id: element.id,
    name: "element",
    elementType: element.type,
    draggable: getSyncedStructureDraggable(group, handlers),
    rotation: element.rotation ?? 0,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
  }, handlers);
  const resizeRuntime = nextGroup.graphResizeRuntime;
  [...nextGroup.getChildren()].forEach((child) => child.moveTo(group));
  if (resizeRuntime) {
    installGraphResizePreview(group, resizeRuntime);
  }
  nextGroup.destroy();
}

function syncTreeStructureNodeContent(group, element, handlers) {
  if (element.settings?.treeKind === "binary" && syncBinaryTreeNodeVisuals(group, element, handlers)) {
    return;
  }
  group.destroyChildren();
  const nextGroup = createTreeStructureNode(element, {
    id: element.id,
    name: "element",
    elementType: element.type,
    draggable: getSyncedStructureDraggable(group, handlers),
    rotation: element.rotation ?? 0,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
  }, handlers);
  [...nextGroup.getChildren()].forEach((child) => child.moveTo(group));
  nextGroup.destroy();
}

function syncBinaryTreeNodeVisuals(group, element, handlers = {}) {
  const treeNodes = group.find(".tree-node");
  if (treeNodes.length !== (element.nodes?.length ?? 0)) return false;
  const style = { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const activeNodeId = element.runtime?.activeNodeId ?? null;
  for (const nodeGroup of treeNodes) {
    const nodeId = nodeGroup.getAttr("treeNodeId");
    const node = (element.nodes ?? []).find((item) => item.id === nodeId);
    if (!node) return false;
    const ellipse = nodeGroup.findOne("Ellipse");
    if (!ellipse) return false;
    const text = nodeGroup.findOne("Text");
    if (!text) return false;
    const isActive = activeNodeId === nodeId;
    ellipse.stroke(isActive ? "#2563eb" : style.nodeStroke);
    ellipse.strokeWidth(isActive ? 3 : 2);
    ellipse.fill(getTreeNodeFill(element, node, style, handlers.getTreeConnectState));
    text.text(String(node.label ?? node.value ?? ""));
    if (isActive) nodeGroup.moveToTop();
  }
  return true;
}

function createLinearStructureNode(element, common, {
  canEditArrayItems = true,
  onArrayItemEdit,
  onArrayItemSelect,
  onArrayItemPress,
  onArrayItemRelease,
  onArrayPointerPress,
} = {}) {
  const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const showIndexes = element.settings?.showIndexes ?? element.type === STRUCTURE_ELEMENT_TYPES.ARRAY;
  const indexBase = Number(element.settings?.indexBase) === 1 ? 1 : 0;
  const group = new Konva.Group({
    ...common,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  });
  const cellWidth = style.cellWidth;
  const cellHeight = style.cellHeight;
  const valueY = showIndexes ? cellHeight : 0;
  const dragIndex = Number.isInteger(element.runtime?.dragIndex) ? element.runtime.dragIndex : null;
  const dragGap = Number.isInteger(element.runtime?.dragGap) ? element.runtime.dragGap : null;
  const dragLift = Boolean(element.runtime?.dragLift);
  const dragX = Number.isFinite(element.runtime?.dragX) ? element.runtime.dragX : 0;
  const dragY = Number.isFinite(element.runtime?.dragY) ? element.runtime.dragY : 0;
  const highlightedIndices = new Set(element.markers?.highlight ?? []);
  const algorithmActiveIndices = new Set(element.markers?.algorithm?.activeIndices ?? []);
  const algorithmSortedIndices = new Set(element.markers?.algorithm?.sortedIndices ?? []);
  const algorithmPendingSwapIndices = new Set(element.markers?.algorithm?.pendingSwapIndices ?? []);
  const algorithmMinIndex = Number.isInteger(element.markers?.algorithm?.minIndex) ? element.markers.algorithm.minIndex : null;
  const algorithmKeyIndex = Number.isInteger(element.markers?.algorithm?.keyIndex) ? element.markers.algorithm.keyIndex : null;
  const algorithmEmptyIndex = Number.isInteger(element.markers?.algorithm?.emptyIndex) ? element.markers.algorithm.emptyIndex : null;
  const algorithmFloatingKey = getLinearStructureFloatingKey(element.markers?.algorithm?.floatingKey, element.items?.length ?? 0);
  const dropIndicator = new Konva.Rect({
    name: "array-drop-indicator",
    y: valueY + 4,
    width: 6,
    height: Math.max(12, cellHeight - 8),
    fill: "#2563eb",
    cornerRadius: 999,
    listening: false,
    visible: false,
    shadowColor: "rgba(37,99,235,0.35)",
    shadowBlur: 10,
    shadowOpacity: 1,
  });
  dropIndicator.x((Number.isInteger(dragGap) ? dragGap : 0) * cellWidth - 3);

  const itemGroups = [];
  const topItemGroups = [];
  const borderOverlayGroups = [];
  let activeItemGroup = null;
  let draggedItemGroup = null;

  (element.items ?? []).forEach((item, index) => {
    const isActive = element.runtime?.activeIndex === index;
    const isDragging = dragIndex === index;
    const previewX = getLinearStructurePreviewX({
      index,
      dragIndex,
      dragGap,
      dragX,
      cellWidth,
    });
    const itemGroup = new Konva.Group({
      name: "array-item",
      linearIndex: index,
      x: previewX,
      y: isDragging ? dragY : 0,
      width: cellWidth,
      height: cellHeight * (showIndexes ? 2 : 1),
      draggable: false,
      scaleX: isDragging && dragLift ? 1.04 : 1,
      scaleY: isDragging && dragLift ? 1.04 : 1,
      opacity: isDragging && dragLift ? 0.96 : 1,
      shadowColor: isDragging && dragLift ? "rgba(37,99,235,0.28)" : "rgba(0,0,0,0)",
      shadowBlur: isDragging && dragLift ? 18 : 0,
      shadowOpacity: isDragging && dragLift ? 1 : 0,
      shadowOffsetY: isDragging && dragLift ? -8 : 0,
    });
    let indexRect = null;
    let indexText = null;
    if (showIndexes) {
      indexRect = new Konva.Rect({
        name: "array-item-index-hit",
        y: 0,
        width: cellWidth,
        height: cellHeight,
        stroke: style.stroke,
        strokeWidth: 2,
        fill: getLinearStructureCellFill(index, style.indexFill),
        dash: [],
      });
      indexText = new Konva.Text({
        name: "array-item-index-hit",
        y: 10,
        width: cellWidth,
        height: 24,
        text: String(index + indexBase),
        fontSize: 18,
        fontFamily: "Inter, system-ui, sans-serif",
        fill: style.indexTextFill,
        align: "center",
        verticalAlign: "middle",
      });
      itemGroup.add(indexRect);
      itemGroup.add(indexText);
    }
    const valueGroup = new Konva.Group({
      name: "array-item-value-group",
    });
    const valueRect = new Konva.Rect({
      name: "array-item-value-hit",
      y: valueY,
      width: cellWidth,
      height: cellHeight,
      stroke: style.stroke,
      strokeWidth: 2,
      fill: getLinearStructureCellFill(index, style.valueFill),
      dash: [],
    });
    const valueText = new Konva.Text({
      name: "array-item-value-hit",
      y: valueY + 10,
      width: cellWidth,
      height: 24,
      text: algorithmEmptyIndex === index ? "" : String(item.value ?? ""),
      fontSize: 20,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    });
    valueGroup.add(valueRect);
    valueGroup.add(valueText);
    itemGroup.add(valueGroup);

    const handleSelect = (event) => {
      event.cancelBubble = true;
      onArrayItemSelect?.({
        elementId: element.id,
        index,
        value: String(item.value ?? ""),
      });
    };

    const handleValueEdit = (event) => {
      event.cancelBubble = true;
      onArrayItemEdit?.({
        elementId: element.id,
        index,
        value: String(item.value ?? ""),
        trigger: "double",
      });
    };

    const swallowValuePointer = (event) => {
      event.cancelBubble = true;
    };

    let skipLegacyPress = false;
    let skipLegacyRelease = false;

    const handlePress = (event) => {
      event.cancelBubble = true;
      if ((event.type === "mousedown" || event.type === "touchstart") && skipLegacyPress) {
        skipLegacyPress = false;
        return;
      }
      skipLegacyPress = event.type === "pointerdown";
      onArrayItemPress?.({
        elementId: element.id,
        index,
        value: String(item.value ?? ""),
      });
    };

    const handleRelease = (event) => {
      if ((event.type === "mouseup" || event.type === "touchend" || event.type === "touchcancel") && skipLegacyRelease) {
        skipLegacyRelease = false;
        return;
      }
      skipLegacyPress = false;
      skipLegacyRelease = event.type === "pointerup" || event.type === "pointercancel";
      onArrayItemRelease?.({
        elementId: element.id,
        index,
      });
    };

    if (canEditArrayItems) {
      valueRect.on("dblclick dbltap", handleValueEdit);
      valueText.on("dblclick dbltap", handleValueEdit);
      valueRect.on("click tap", handleSelect);
      valueText.on("click tap", handleSelect);
      valueRect.on("pointerdown mousedown touchstart", handlePress);
      valueText.on("pointerdown mousedown touchstart", handlePress);
      valueRect.on("pointerup pointercancel mouseup touchend touchcancel", handleRelease);
      valueText.on("pointerup pointercancel mouseup touchend touchcancel", handleRelease);
      indexRect?.on("click tap", handleSelect);
      indexText?.on("click tap", handleSelect);
      indexRect?.on("pointerdown mousedown touchstart", handlePress);
      indexText?.on("pointerdown mousedown touchstart", handlePress);
      indexRect?.on("pointerup pointercancel mouseup touchend touchcancel", handleRelease);
      indexText?.on("pointerup pointercancel mouseup touchend touchcancel", handleRelease);
    }
    if (isDragging) {
      draggedItemGroup = itemGroup;
    } else if (isActive) {
      activeItemGroup = itemGroup;
    } else if (hasAlgorithmTopVisual(index)) {
      topItemGroups.push(itemGroup);
    } else {
      itemGroups.push(itemGroup);
    }
    const borderOverlayGroup = createLinearStructureBorderOverlay(index, isActive, showIndexes);
    if (borderOverlayGroup) borderOverlayGroups.push(borderOverlayGroup);
  });

  itemGroups.forEach((itemGroup) => group.add(itemGroup));
  topItemGroups.forEach((itemGroup) => group.add(itemGroup));
  if (activeItemGroup) group.add(activeItemGroup);
  if (draggedItemGroup) group.add(draggedItemGroup);
  const floatingKeyGroup = createLinearStructureFloatingKeyNode();
  if (floatingKeyGroup) group.add(floatingKeyGroup);
  borderOverlayGroups.forEach((overlayGroup) => group.add(overlayGroup));
  group.add(dropIndicator);

  const pointerIndex = element.markers?.pointer;
  const showPointer = element.markers?.showPointer ?? true;
  if (!algorithmFloatingKey && showPointer && Number.isInteger(pointerIndex) && pointerIndex >= 0 && pointerIndex < (element.items?.length ?? 0)) {
    const pointerGroup = new Konva.Group({
      name: "array-pointer-hit array-pointer-group",
      linearIndex: pointerIndex,
      x: pointerIndex * cellWidth,
      y: LINEAR_POINTER_BASE_Y,
      width: cellWidth,
      height: 30,
    });
    pointerGroup.add(new Konva.Rect({
      name: "array-pointer-hit",
      x: 0,
      y: 0,
      width: cellWidth,
      height: 30,
      fill: "rgba(0,0,0,0)",
    }));
    pointerGroup.add(new Konva.RegularPolygon({
      x: cellWidth / 2,
      y: 20,
      sides: 3,
      radius: 9,
      fill: style.pointerFill,
      rotation: 180,
    }));
    pointerGroup.add(new Konva.Text({
      x: 0,
      y: 0,
      width: cellWidth,
      height: 16,
      text: "i",
      fontSize: 13,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.pointerFill,
      align: "center",
    }));
    if (canEditArrayItems) {
      pointerGroup.on("mousedown touchstart", (event) => {
        event.cancelBubble = true;
        onArrayPointerPress?.({
          elementId: element.id,
          index: pointerIndex,
        });
      });
      pointerGroup.on("click tap", (event) => {
        event.cancelBubble = true;
      });
    }
    group.add(pointerGroup);
  }

  addLinearEndpointLabels(group, element, style, cellWidth);

  return group;

  function getLinearStructureCellFill(index, defaultFill) {
    if (algorithmEmptyIndex === index) return style.algorithmEmptyFill;
    if (algorithmPendingSwapIndices.has(index)) return style.highlightFill;
    if (algorithmActiveIndices.has(index)) return style.algorithmActiveFill;
    if (algorithmSortedIndices.has(index)) return style.algorithmSortedFill;
    if (highlightedIndices.has(index)) return style.highlightFill;
    return defaultFill;
  }

  function getLinearStructureOverlayStroke(index, isActive = false) {
    if (isActive) return "#2563eb";
    if (algorithmPendingSwapIndices.has(index)) return style.algorithmKeyStroke;
    if (algorithmKeyIndex === index) return style.algorithmKeyStroke;
    if (algorithmMinIndex === index) return style.algorithmMinStroke;
    if (algorithmActiveIndices.has(index)) return "#2563eb";
    if (algorithmEmptyIndex === index) return "#94a3b8";
    if (algorithmSortedIndices.has(index)) return "#16a34a";
    if (highlightedIndices.has(index)) return "#f59e0b";
    return null;
  }

  function hasAlgorithmTopVisual(index) {
    return algorithmPendingSwapIndices.has(index)
      || algorithmActiveIndices.has(index)
      || algorithmSortedIndices.has(index)
      || algorithmMinIndex === index
      || algorithmKeyIndex === index
      || algorithmEmptyIndex === index;
  }

  function createLinearStructureBorderOverlay(index, isActive, includesIndexRow) {
    const overlayStroke = getLinearStructureOverlayStroke(index, isActive);
    if (!overlayStroke) return null;
    const overlayDash = getLinearStructureCellDash(index);
    const outerStrokeWidth = 2;
    const overlayStrokeWidth = 3;
    const inset = outerStrokeWidth / 2 + overlayStrokeWidth / 2;
    const overlaySize = {
      x: inset,
      width: Math.max(1, cellWidth - inset * 2),
      height: Math.max(1, cellHeight - inset * 2),
    };
    const overlayHeight = includesIndexRow
      ? Math.max(1, cellHeight * 2 - inset * 2)
      : overlaySize.height;
    const overlayGroup = new Konva.Group({
      name: "array-item-border-overlay",
      linearIndex: index,
      x: getLinearStructurePreviewX({
        index,
        dragIndex,
        dragGap,
        dragX,
        cellWidth,
      }),
      y: dragIndex === index ? dragY : 0,
      width: cellWidth,
      height: cellHeight * (includesIndexRow ? 2 : 1),
      listening: false,
      scaleX: dragIndex === index && dragLift ? 1.04 : 1,
      scaleY: dragIndex === index && dragLift ? 1.04 : 1,
    });
    overlayGroup.add(new Konva.Rect({
      x: overlaySize.x,
      y: includesIndexRow ? inset : valueY + inset,
      width: overlaySize.width,
      height: overlayHeight,
      stroke: overlayStroke,
      strokeWidth: overlayStrokeWidth,
      dash: overlayDash,
      fillEnabled: false,
      listening: false,
    }));
    if (includesIndexRow) {
      overlayGroup.add(new Konva.Line({
        points: [inset, valueY, cellWidth - inset, valueY],
        stroke: overlayStroke,
        strokeWidth: overlayStrokeWidth,
        dash: overlayDash,
        listening: false,
      }));
    }
    return overlayGroup;
  }

  function getLinearStructureCellDash(index) {
    return algorithmEmptyIndex === index ? [6, 4] : [];
  }

  function hasAlgorithmTopVisual(index) {
    return algorithmActiveIndices.has(index)
      || algorithmSortedIndices.has(index)
      || algorithmMinIndex === index
      || algorithmKeyIndex === index
      || algorithmEmptyIndex === index;
  }

  function createLinearStructureFloatingKeyNode() {
    if (!algorithmFloatingKey) return null;
    const floatingGroup = new Konva.Group({
      name: "array-floating-key",
      linearIndex: algorithmFloatingKey.currentIndex,
      x: algorithmFloatingKey.currentIndex * cellWidth,
      y: valueY + cellHeight + ARRAY_ALGORITHM_FLOATING_KEY_GAP,
      width: cellWidth,
      height: cellHeight,
      listening: false,
      opacity: 0.96,
      shadowColor: "rgba(245,158,11,0.28)",
      shadowBlur: 18,
      shadowOpacity: 1,
      shadowOffsetY: 8,
    });
    floatingGroup.add(new Konva.Rect({
      width: cellWidth,
      height: cellHeight,
      stroke: style.algorithmKeyStroke,
      strokeWidth: 3,
      fill: style.valueFill,
    }));
    floatingGroup.add(new Konva.Text({
      y: 10,
      width: cellWidth,
      height: 24,
      text: algorithmFloatingKey.value,
      fontSize: 20,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    }));
    return floatingGroup;
  }
}

function getLinearStructureFloatingKey(floatingKey, length) {
  if (!floatingKey || length <= 0) return null;
  const sourceIndex = Number(floatingKey.sourceIndex);
  const currentIndex = Number(floatingKey.currentIndex);
  if (!Number.isInteger(sourceIndex) || !Number.isInteger(currentIndex)) return null;
  if (sourceIndex < 0 || sourceIndex >= length || currentIndex < 0 || currentIndex >= length) return null;
  return {
    sourceIndex,
    currentIndex,
    value: String(floatingKey.value ?? ""),
  };
}

function addCoordinatePlaneContent(group, element, width, height) {
  const unitSize = Math.max(8, Number(element.unitSize) || 40);
  const origin = {
    x: Number.isFinite(element.origin?.x) ? element.origin.x : width / 2,
    y: Number.isFinite(element.origin?.y) ? element.origin.y : height / 2,
  };
  const settings = {
    showGrid: element.settings?.showGrid ?? true,
    showTicks: element.settings?.showTicks ?? true,
    showLabels: element.settings?.showLabels ?? true,
  };
  const style = {
    gridStroke: "#e5e7eb",
    axisStroke: "#111827",
    labelFill: "#64748b",
    ...(element.style ?? {}),
  };
  // 定尺隐形边框矩形:把 group 的包围盒锚定到 element.width×height。
  // 不能给 fill(哪怕全透明),否则整块内部都会进命中画布,吞掉框选起手和
  // 画在坐标系上的元素点击(AGENTS.md #24)。空白选中/拖动靠包围盒 fallback。
  group.add(new Konva.Rect({
    name: "coordinate-plane-frame",
    width,
    height,
    listening: false,
  }));

  const startX = origin.x % unitSize;
  const startY = origin.y % unitSize;
  if (settings.showGrid) {
    for (let x = startX; x <= width; x += unitSize) {
      group.add(new Konva.Line({
        name: "coordinate-plane-grid",
        points: [x, 0, x, height],
        stroke: style.gridStroke,
        strokeWidth: 1,
        listening: false,
      }));
    }
    for (let y = startY; y <= height; y += unitSize) {
      group.add(new Konva.Line({
        name: "coordinate-plane-grid",
        points: [0, y, width, y],
        stroke: style.gridStroke,
        strokeWidth: 1,
        listening: false,
      }));
    }
  }

  group.add(new Konva.Arrow({
    name: "coordinate-plane-axis",
    points: [0, origin.y, width, origin.y],
    stroke: style.axisStroke,
    fill: style.axisStroke,
    strokeWidth: 2,
    pointerLength: 10,
    pointerWidth: 10,
    listening: false,
  }));
  group.add(new Konva.Arrow({
    name: "coordinate-plane-axis",
    points: [origin.x, height, origin.x, 0],
    stroke: style.axisStroke,
    fill: style.axisStroke,
    strokeWidth: 2,
    pointerLength: 10,
    pointerWidth: 10,
    listening: false,
  }));

  if (settings.showTicks) {
    addCoordinatePlaneTicks(group, { width, height, unitSize, origin, style, showLabels: settings.showLabels });
  }

  if (settings.showLabels) {
    addCoordinatePlaneLabel(group, "O", origin.x + 6, origin.y + 6, style);
    addCoordinatePlaneLabel(group, "x", width - 16, origin.y + 8, style);
    addCoordinatePlaneLabel(group, "y", origin.x + 8, 8, style);
  }

}

function addCoordinatePlaneTicks(group, { width, height, unitSize, origin, style, showLabels }) {
  const tickSize = 5;
  const maxPositiveX = Math.floor((width - origin.x) / unitSize);
  const maxNegativeX = Math.floor(origin.x / unitSize);
  for (let value = -maxNegativeX; value <= maxPositiveX; value += 1) {
    if (value === 0) continue;
    const x = origin.x + value * unitSize;
    group.add(new Konva.Line({
      name: "coordinate-plane-tick",
      points: [x, origin.y - tickSize, x, origin.y + tickSize],
      stroke: style.axisStroke,
      strokeWidth: 1.5,
      listening: false,
    }));
    if (showLabels) {
      addCoordinatePlaneLabel(group, String(value), x - 12, origin.y + 8, style);
    }
  }

  const maxPositiveY = Math.floor(origin.y / unitSize);
  const maxNegativeY = Math.floor((height - origin.y) / unitSize);
  for (let value = -maxNegativeY; value <= maxPositiveY; value += 1) {
    if (value === 0) continue;
    const y = origin.y - value * unitSize;
    group.add(new Konva.Line({
      name: "coordinate-plane-tick",
      points: [origin.x - tickSize, y, origin.x + tickSize, y],
      stroke: style.axisStroke,
      strokeWidth: 1.5,
      listening: false,
    }));
    if (showLabels) {
      addCoordinatePlaneLabel(group, String(value), origin.x + 8, y - 9, style);
    }
  }
}

function addCoordinatePlaneLabel(group, text, x, y, style) {
  group.add(new Konva.Text({
    name: "coordinate-plane-label",
    x,
    y,
    width: 24,
    height: 16,
    text,
    fontSize: 12,
    fontFamily: "Inter, system-ui, sans-serif",
    fill: style.labelFill,
    align: "center",
    listening: false,
  }));
}

function getLinearStructurePreviewX({
  index,
  dragIndex,
  dragGap,
  dragX,
  cellWidth,
}) {
  if (dragIndex === null || dragGap === null) {
    return index * cellWidth;
  }
  if (index === dragIndex) {
    return dragX;
  }
  const baseX = index * cellWidth;
  if (index < dragIndex && index >= dragGap) {
    return baseX + cellWidth;
  }
  if (index > dragIndex && index < dragGap) {
    return baseX - cellWidth;
  }
  return baseX;
}

function createGraphStructureNode(element, common, {
  onGraphNodeMove,
  onGraphNodeClick,
  onGraphNodeEdit,
  onGraphEdgeEdit,
  onGraphNodeDragStart,
} = {}) {
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const group = new Konva.Group({
    ...common,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  });
  // 定尺隐形边框矩形:把 group 的包围盒锚定到 element.width×height,
  // 这样 Transformer 选中框只跟边框尺寸有关,不会随节点往里拖而收缩。
  // listening:false 保证不上命中画布(不会劫持节点点击,见 AGENTS.md #24)。
  const frameRect = new Konva.Rect({
    name: "graph-frame",
    x: 0,
    y: 0,
    width: element.width,
    height: element.height,
    listening: false,
  });
  group.add(frameRect);
  const nodes = new Map((element.nodes ?? []).map((node) => [node.id, { ...node }]));
  const nodeGroups = new Map();
  const edgeRecords = [];

  const getNodePosition = (nodeId) => {
    const nodeGroup = nodeGroups.get(nodeId);
    if (nodeGroup) return { x: nodeGroup.x(), y: nodeGroup.y() };
    const node = nodes.get(nodeId);
    return node ? { x: node.x, y: node.y } : null;
  };

  const refreshEdges = () => {
    for (const record of edgeRecords) {
      const source = getNodePosition(record.edge.from);
      const target = getNodePosition(record.edge.to);
      if (!source || !target) continue;
      record.line.points(getGraphEdgePoints(source, target, record.edgeIndex, record.isSelfLoop, style.nodeRadius));
      if (record.weightBackground && record.weightLabel) {
        const labelPoint = getGraphEdgeLabelPoint(source, target, record.edgeIndex);
        const offsetX = labelPoint.offsetX ?? 0;
        const offsetY = labelPoint.offsetY ?? -16;
        record.weightBackground.position({ x: labelPoint.x + offsetX - 18, y: labelPoint.y + offsetY - 9 });
        record.weightLabel.position({ x: labelPoint.x + offsetX - 18, y: labelPoint.y + offsetY - 9 });
      }
    }
  };

  (element.edges ?? []).forEach((edge) => {
    const source = nodes.get(edge.from);
    const target = nodes.get(edge.to);
    if (!source || !target) return;
    const edgeIndex = getParallelEdgeIndex(element.edges ?? [], edge);
    const isSelfLoop = edge.from === edge.to;
    const lineAttrs = {
      points: getGraphEdgePoints(source, target, edgeIndex, isSelfLoop, style.nodeRadius),
      stroke: (element.markers?.highlightedEdges ?? []).includes(edge.id) ? style.edgeHighlightStroke : style.stroke,
      strokeWidth: 3,
      lineCap: "round",
      lineJoin: "round",
      hitStrokeWidth: 18,
      tension: isSelfLoop || edgeIndex !== 0 ? 0.45 : 0,
    };
    const line = edge.directed
      ? new Konva.Arrow({
        ...lineAttrs,
        fill: style.stroke,
        pointerLength: 12,
        pointerWidth: 12,
      })
      : new Konva.Line(lineAttrs);
    group.add(line);
    line.on("dblclick dbltap", (event) => {
      event.cancelBubble = true;
      onGraphEdgeEdit?.({
        elementId: element.id,
        edgeId: edge.id,
        directed: edge.directed,
        weight: edge.weight ?? "",
      });
    });
    const record = { edge, line, weightBackground: null, weightLabel: null, edgeIndex, isSelfLoop };
    if (edge.weight) {
      const labelPoint = getGraphEdgeLabelPoint(source, target, edgeIndex);
      const offsetX = labelPoint.offsetX ?? 0;
      const offsetY = labelPoint.offsetY ?? -16;
      record.weightBackground = new Konva.Rect({
        x: labelPoint.x + offsetX - 18,
        y: labelPoint.y + offsetY - 9,
        width: 36,
        height: 18,
        fill: "rgba(255,255,255,0.92)",
        cornerRadius: 4,
        listening: false,
      });
      group.add(record.weightBackground);
      record.weightLabel = new Konva.Text({
        x: labelPoint.x + offsetX - 18,
        y: labelPoint.y + offsetY - 9,
        width: 36,
        height: 18,
        text: String(edge.weight),
        fontSize: 14,
        fontFamily: "Inter, system-ui, sans-serif",
        fill: style.textFill,
        align: "center",
      });
      group.add(record.weightLabel);
    }
    if (line) edgeRecords.push(record);
  });

  for (const node of nodes.values()) {
    const isActiveGraphNode = element.runtime?.activeNodeId === node.id;
    const nodeGroup = new Konva.Group({
      name: "graph-node",
      x: node.x,
      y: node.y,
      draggable: Boolean(common.draggable),
      graphNodeId: node.id,
    });
    const getCurrentGraphGroup = () => nodeGroup.getParent() ?? group;
    if (common.draggable) {
      nodeGroup.dragBoundFunc((pos) => {
        const graphGroup = getCurrentGraphGroup();
        const transform = graphGroup.getAbsoluteTransform().copy();
        const localPos = transform.copy().invert().point(pos);
        const r = style.nodeRadius;
        const width = Number(graphGroup.width()) || element.width;
        const height = Number(graphGroup.height()) || element.height;
        const clampInside = (value, max) => {
          const upper = Math.max(r, max - r);
          return Math.min(Math.max(value, r), upper);
        };
        const nextLocalPos = {
          x: clampInside(localPos.x, width),
          y: clampInside(localPos.y, height),
        };
        return transform.point(nextLocalPos);
      });
    }
    nodeGroups.set(node.id, nodeGroup);
    nodeGroup.add(new Konva.Ellipse({
      radiusX: style.nodeRadius,
      radiusY: style.nodeRadius,
      stroke: isActiveGraphNode ? "#2563eb" : style.nodeStroke,
      strokeWidth: isActiveGraphNode ? 3 : 2,
      fill: getGraphNodeFill(element, node, style),
    }));
    // 标签字号随节点半径等比缩放(基准 20 @ r=26)
    const labelRatio = style.nodeRadius / GRAPH_STRUCTURE_STYLE.nodeRadius;
    const labelFontSize = 20 * labelRatio;
    const labelHeight = 24 * labelRatio;
    nodeGroup.add(new Konva.Text({
      x: -style.nodeRadius,
      y: -labelHeight / 2,
      width: style.nodeRadius * 2,
      height: labelHeight,
      text: String(node.label ?? node.id),
      fontSize: labelFontSize,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    }));
    nodeGroup.on("dragstart", (event) => {
      event.cancelBubble = true;
      getCurrentGraphGroup().draggable(false);
      onGraphNodeDragStart?.({
        elementId: element.id,
        nodeId: node.id,
      });
    });
    nodeGroup.on("dragmove", (event) => {
      event.cancelBubble = true;
      refreshEdges();
      getCurrentGraphGroup().getLayer()?.batchDraw();
    });
    nodeGroup.on("dragend", (event) => {
      event.cancelBubble = true;
      getCurrentGraphGroup().draggable(Boolean(common.draggable));
      onGraphNodeMove?.({
        elementId: element.id,
        nodeId: node.id,
        x: nodeGroup.x(),
        y: nodeGroup.y(),
      });
    });
    nodeGroup.on("click tap", (event) => {
      event.cancelBubble = true;
      onGraphNodeClick?.({
        elementId: element.id,
        nodeId: node.id,
      });
    });
    nodeGroup.on("dblclick dbltap", (event) => {
      event.cancelBubble = true;
      onGraphNodeEdit?.({
        elementId: element.id,
        nodeId: node.id,
        label: String(node.label ?? node.id),
      });
    });
    group.add(nodeGroup);
  }

  const resizeRuntime = { style, frameRect, nodeGroups, refreshEdges };
  installGraphResizePreview(group, resizeRuntime);
  group.graphResizeRuntime = resizeRuntime;

  return group;
}

function installGraphResizePreview(group, {
  style,
  frameRect,
  nodeGroups,
  refreshEdges,
}) {
  // 供边框拖拽实时 preview 调用:就地改边框尺寸,把出界节点钳进 [r,边长-r],
  // 并刷新边端点。节点本地坐标只在出界时收缩,不随边框等比缩放。
  group.applyGraphResize = (nextWidth, nextHeight) => {
    const width = Math.max(1, Number(nextWidth) || group.width());
    const height = Math.max(1, Number(nextHeight) || group.height());
    group.width(width);
    group.height(height);
    frameRect.width(width);
    frameRect.height(height);
    const r = style.nodeRadius;
    const clampInside = (value, max) => Math.min(Math.max(value, r), max - r);
    for (const nodeGroup of nodeGroups.values()) {
      nodeGroup.position({
        x: clampInside(nodeGroup.x(), width),
        y: clampInside(nodeGroup.y(), height),
      });
    }
    refreshEdges();
  };
}

function createTreeStructureNode(element, common, {
  onTreeNodeEdit,
  onTreeNodeClick,
  onTreeNodePress,
  onTreeNodeMove,
  onTreeNodeConnect,
  getTreeConnectState,
} = {}) {
  const style = { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const group = new Konva.Group({
    ...common,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  });
  const collapsed = new Set(element.markers?.collapsed ?? []);
  const hidden = getCollapsedTreeNodeIds(element, collapsed);
  const nodes = new Map((element.nodes ?? []).filter((node) => !hidden.has(node.id)).map((node) => [node.id, node]));
  const edgeRecords = [];
  const nodeGroups = new Map();
  let lastTreeNodePointerEvent = { nodeId: null, time: 0 };

  group.add(new Konva.Rect({
    name: "tree-blank-hit",
    width: element.width,
    height: element.height,
    fill: "rgba(255,255,255,0)",
    listening: true,
  }));

  const getNodePosition = (nodeId) => {
    const nodeGroup = nodeGroups.get(nodeId);
    if (nodeGroup) return { x: nodeGroup.x(), y: nodeGroup.y() };
    const node = nodes.get(nodeId);
    return node ? { x: node.x, y: node.y } : null;
  };

  const refreshEdges = () => {
    for (const record of edgeRecords) {
      const source = getNodePosition(record.edge.from);
      const target = getNodePosition(record.edge.to);
      if (!source || !target) continue;
      record.line.points([source.x, source.y, target.x, target.y]);
    }
  };

  for (const edge of element.edges ?? []) {
    const parent = nodes.get(edge.from);
    const node = nodes.get(edge.to);
    if (!parent || !node) continue;
    const line = new Konva.Line({
      points: [parent.x, parent.y, node.x, node.y],
      stroke: style.stroke,
      strokeWidth: 3,
      lineCap: "round",
      lineJoin: "round",
    });
    group.add(line);
    edgeRecords.push({ edge, line });
  }

  for (const node of nodes.values()) {
    const nodeDraggable = false;
    const isActiveTreeNode = element.runtime?.activeNodeId === node.id;
    const nodeGroup = new Konva.Group({
      name: "tree-node",
      x: node.x,
      y: node.y,
      draggable: nodeDraggable,
      treeNodeId: node.id,
    });
    nodeGroups.set(node.id, nodeGroup);
    nodeGroup.add(new Konva.Ellipse({
      radiusX: style.nodeRadius,
      radiusY: style.nodeRadius,
      stroke: isActiveTreeNode ? "#2563eb" : style.nodeStroke,
      strokeWidth: isActiveTreeNode ? 3 : 2,
      fill: getTreeNodeFill(element, node, style, getTreeConnectState),
    }));
    nodeGroup.add(new Konva.Text({
      x: -style.nodeRadius,
      y: -12,
      width: style.nodeRadius * 2,
      height: 24,
      text: String(node.label ?? node.value ?? ""),
      fontSize: 19,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    }));
    nodeGroup.on("dragstart", (event) => {
      if (!nodeDraggable) return;
      event.cancelBubble = true;
      group.draggable(false);
    });
    nodeGroup.on("dragmove", (event) => {
      if (!nodeDraggable) return;
      event.cancelBubble = true;
      refreshEdges();
      group.getLayer()?.batchDraw();
    });
    nodeGroup.on("dragend", (event) => {
      if (!nodeDraggable) return;
      event.cancelBubble = true;
      group.draggable(Boolean(common.draggable));
      const connectState = getTreeConnectState?.(element.id);
      const targetNodeId = getStructureNodeIdAtPoint(nodeGroups, node.id, nodeGroup.position(), style.nodeRadius);
      if (connectState && targetNodeId) {
        nodeGroup.position({ x: node.x, y: node.y });
        refreshEdges();
        onTreeNodeConnect?.({
          elementId: element.id,
          sourceNodeId: connectState.sourceNodeId ?? node.id,
          targetNodeId,
        });
        return;
      }
      onTreeNodeMove?.({
        elementId: element.id,
        nodeId: node.id,
        x: nodeGroup.x(),
        y: nodeGroup.y(),
      });
    });
    const selectTreeNode = () => {
      onTreeNodeClick?.({
        elementId: element.id,
        nodeId: node.id,
      });
    };
    const editTreeNode = () => {
      onTreeNodeEdit?.({
        elementId: element.id,
        nodeId: node.id,
        label: String(node.label ?? node.value ?? ""),
      });
    };
    nodeGroup.on("pointerdown mousedown touchstart", (event) => {
      const now = Date.now();
      if (nodeDraggable) {
        if (event.type !== "pointerdown"
          && lastTreeNodePointerEvent.nodeId === node.id
          && now - lastTreeNodePointerEvent.time < 50) {
          return;
        }
        if (event.type === "pointerdown") {
          lastTreeNodePointerEvent = { nodeId: node.id, time: now };
        }
        return;
      }
      if (element.settings?.treeKind === "binary") {
        onTreeNodePress?.(event, group);
      }
    });
    nodeGroup.on("dblclick dbltap", (event) => {
      event.cancelBubble = true;
      editTreeNode();
    });
    nodeGroup.on("click tap", (event) => {
      event.cancelBubble = true;
      selectTreeNode();
    });
    group.add(nodeGroup);
  }

  return group;
}

function addLinearEndpointLabels(group, element, style, cellWidth) {
  const count = element.items?.length ?? 0;
  if (count === 0) return;
  const labels = {
    [STRUCTURE_ELEMENT_TYPES.STACK]: [{ index: count - 1, text: "top" }],
    [STRUCTURE_ELEMENT_TYPES.QUEUE]: [
      { index: 0, text: "front" },
      { index: count - 1, text: "back" },
    ],
    [STRUCTURE_ELEMENT_TYPES.DEQUE]: [
      { index: 0, text: "left" },
      { index: count - 1, text: "right" },
    ],
  }[element.type] ?? [];
  for (const label of labels) {
    group.add(new Konva.Text({
      x: label.index * cellWidth,
      y: element.height + 6,
      width: cellWidth,
      height: 18,
      text: label.text,
      fontSize: 13,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.indexTextFill,
      align: "center",
      listening: false,
    }));
  }
}

function getParallelEdgeIndex(edges, edge) {
  const same = edges.filter((item) => (
    (item.from === edge.from && item.to === edge.to)
    || (!item.directed && !edge.directed && item.from === edge.to && item.to === edge.from)
  ));
  const index = same.findIndex((item) => item.id === edge.id);
  if (edge.from === edge.to) return index + 1;
  return index <= 0 ? 0 : index;
}

function getGraphEdgePoints(source, target, edgeIndex = 0, isSelfLoop = false, nodeRadius = 0) {
  const effectiveSelfLoop = isSelfLoop
    || (source.id != null && target.id != null && source.id === target.id)
    || (source.x === target.x && source.y === target.y);
  if (effectiveSelfLoop) {
    const radius = 28 + edgeIndex * 14;
    return [
      source.x,
      source.y - 24,
      source.x + radius,
      source.y - radius,
      source.x + radius,
      source.y + radius,
      source.x,
      source.y + 24,
    ];
  }
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const inset = Math.min(Math.max(0, Number(nodeRadius) || 0) + 4, Math.max(0, distance / 3));
  const startX = source.x + (dx / distance) * inset;
  const startY = source.y + (dy / distance) * inset;
  const endX = target.x - (dx / distance) * inset;
  const endY = target.y - (dy / distance) * inset;
  if (edgeIndex === 0) return [startX, startY, endX, endY];
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const offset = edgeIndex * 28;
  const middleX = (source.x + target.x) / 2 + normalX * offset;
  const middleY = (source.y + target.y) / 2 + normalY * offset;
  return [startX, startY, middleX, middleY, endX, endY];
}

function getGraphEdgeLabelPoint(source, target, edgeIndex = 0) {
  const dx = target.x - source.x || 0.01;
  const dy = target.y - source.y || 0.01;
  const distance = Math.hypot(dx, dy);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const offset = edgeIndex * 28;
  const midX = (source.x + target.x) / 2 + normalX * offset;
  const midY = (source.y + target.y) / 2 + normalY * offset;
  return {
    x: midX,
    y: midY,
    offsetX: normalX * 22,
    offsetY: normalY * 22,
  };
}

function getStructureNodeIdAtPoint(nodeGroups, sourceNodeId, point, radius) {
  const hitRadius = Math.max(18, Number(radius) || 24);
  for (const [nodeId, nodeGroup] of nodeGroups) {
    if (nodeId === sourceNodeId) continue;
    const distance = Math.hypot(nodeGroup.x() - point.x, nodeGroup.y() - point.y);
    if (distance <= hitRadius * 1.35) return nodeId;
  }
  return null;
}

function getCollapsedTreeNodeIds(element, collapsed) {
  const hidden = new Set();
  const children = new Map((element.nodes ?? []).map((node) => [node.id, []]));
  for (const edge of element.edges ?? []) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  const visit = (nodeId) => {
    for (const childId of children.get(nodeId) ?? []) {
      hidden.add(childId);
      visit(childId);
    }
  };
  for (const nodeId of collapsed) visit(nodeId);
  return hidden;
}

function getGraphNodeFill(element, node, style) {
  if ((element.markers?.highlightedNodes ?? []).includes(node.id)) return style.highlightFill;
  return style.nodeFill;
}

function getTreeNodeFill(element, node, style, getTreeConnectState) {
  if ((element.markers?.highlighted ?? []).includes(node.id)) return style.highlightFill;
  const state = getTreeConnectState?.(element.id);
  if (state?.sourceNodeId === node.id) return "#dbeafe";
  return style.nodeFill;
}

function getBrushDash(element) {
  const width = Math.max(1, Number(element.strokeWidth) || 1);
  if (element.brushStyle === "dash") return [width * 3, width * 2];
  if (element.brushStyle === "dot") return [0.01, width * 1.8];
  return [];
}

// 透明填充必须用 fillEnabled:false 关掉填充。Konva 的 hit context 里 _fill 是
// 无条件按 colorKey 填的(只看 fillEnabled,不看 fill 值),给 "transparent" /
// "rgba(0,0,0,0)" 这类值,整块内部照样进命中画布,于是未填充图形的内部空白会吞掉
// 框选起手,点里面的元素也会先命中外框(AGENTS.md #24 / #43)。
function getFillAttrs(fill) {
  const solid = Boolean(fill) && fill !== "transparent";
  return { fill: solid ? fill : undefined, fillEnabled: solid };
}

function attachCachedImage(node, src, callbacks = {}) {
  const entry = getCachedImage(src);
  node.image(entry.image);

  if (entry.loaded) {
    callbacks.onLoad?.(entry.image);
    return entry;
  }
  if (entry.failed) {
    callbacks.onError?.();
    return entry;
  }
  entry.waitingNodes.add(node);
  if (callbacks.onLoad) entry.loadCallbacks.add(callbacks.onLoad);
  if (callbacks.onError) entry.errorCallbacks.add(callbacks.onError);
  return entry;
}

function getCachedImage(src) {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const image = new window.Image();
  const entry = {
    image,
    loaded: false,
    failed: false,
    waitingNodes: new Set(),
    loadCallbacks: new Set(),
    errorCallbacks: new Set(),
  };

  image.onload = () => {
    entry.loaded = true;
    for (const node of entry.waitingNodes) {
      if (node.isDestroyed?.()) continue;
      node.image(image);
      node.getLayer()?.batchDraw();
    }
    for (const callback of entry.loadCallbacks) callback(image);
    entry.waitingNodes.clear();
    entry.loadCallbacks.clear();
    entry.errorCallbacks.clear();
  };
  image.onerror = () => {
    entry.failed = true;
    for (const callback of entry.errorCallbacks) callback();
    entry.waitingNodes.clear();
    entry.loadCallbacks.clear();
    entry.errorCallbacks.clear();
  };
  image.src = src;
  imageCache.set(src, entry);

  return entry;
}
