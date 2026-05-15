import Konva from "konva";
import { flattenPoints } from "./geometry.js";
import {
  ARRAY_STRUCTURE_STYLE,
  GRAPH_STRUCTURE_STYLE,
  LINEAR_STRUCTURE_TYPES,
  STRUCTURE_ELEMENT_TYPES,
  TREE_STRUCTURE_STYLE,
} from "../structures/structure-templates.js";
import { getStickyVisualMetrics } from "../tools/interaction-rules.js";
import { getTextDisplayValue, isLatexText, renderLatexToImageSource } from "../services/latex-service.js";

const imageCache = new Map();
const LINEAR_POINTER_BASE_Y = -30;

function getLatexRenderSignature(element) {
  const padding = element?.padding ?? 0;
  const width = Math.max(80, Math.max(1, Number(element?.width) || 1) - padding * 2);
  return JSON.stringify({
    text: String(element?.text ?? "").trim(),
    fill: element?.fill,
    fontSize: element?.fontSize,
    maxWidth: width,
    padding: 0,
  });
}

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

  const latexNode = node.findOne?.(".latex-image");
  latexNode?.setAttrs({
    x: horizontalPadding,
    y: 0,
    width: Math.max(1, nextWidth - horizontalPadding * 2),
    height: nextHeight,
  });
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
  syncLatexNodeContent(node, element);
}

export function syncLatexNodeContent(node, element) {
  if (!node || element?.type !== "text") return false;
  const textNode = node.findOne?.("Text");
  if (!textNode) return false;
  const existingLatexNode = node.findOne?.(".latex-image");
  if (!isLatexText(element.text)) {
    node.setAttr("latexRenderVersion", (node.getAttr("latexRenderVersion") ?? 0) + 1);
    node.setAttr("latexRenderSignature", null);
    existingLatexNode?.destroy();
    textNode.visible(true);
    return false;
  }

  const renderSignature = getLatexRenderSignature(element);
  if (existingLatexNode && node.getAttr("latexRenderSignature") === renderSignature) {
    textNode.visible(!existingLatexNode.visible());
    return true;
  }

  const renderVersion = (node.getAttr("latexRenderVersion") ?? 0) + 1;
  node.setAttr("latexRenderVersion", renderVersion);
  node.setAttr("latexRenderSignature", renderSignature);
  const padding = element.padding ?? 0;
  const nextWidth = Math.max(1, Number(element.width) || 1);
  const nextHeight = Math.max(1, Number(element.height) || 1);
  const latexNode = existingLatexNode ?? new Konva.Image({
    name: "latex-image",
    x: padding,
    y: 0,
    width: Math.max(1, nextWidth - padding * 2),
    height: nextHeight,
    listening: false,
  });
  if (!existingLatexNode) node.add(latexNode);
  latexNode.setAttrs({
    x: padding,
    y: 0,
    width: Math.max(1, nextWidth - padding * 2),
    height: nextHeight,
    visible: false,
  });
  textNode.visible(true);
  renderLatexToImageSource(element.text, {
    fill: element.fill,
    fontSize: element.fontSize,
    maxWidth: Math.max(80, nextWidth - padding * 2),
    padding: 0,
  }).then((imageSource) => {
    if (!imageSource || latexNode.isDestroyed?.()) return;
    if (node.getAttr("latexRenderVersion") !== renderVersion) return;
    latexNode.width(Math.max(1, imageSource.width));
    latexNode.height(Math.max(1, imageSource.height));
    node.width(Math.max(nextWidth, imageSource.width + padding * 2));
    node.height(Math.max(nextHeight, imageSource.height));
    attachCachedImage(latexNode, imageSource.src, {
      onLoad: () => {
        if (latexNode.isDestroyed?.()) return;
        if (node.getAttr("latexRenderVersion") !== renderVersion) return;
        latexNode.visible(true);
        textNode.visible(false);
        node.getLayer()?.batchDraw();
      },
      onError: () => {
        if (node.getAttr("latexRenderVersion") !== renderVersion) return;
        latexNode.destroy();
        textNode.visible(true);
        node.getLayer()?.batchDraw();
      },
    });
    node.getLayer()?.batchDraw();
  }).catch(() => {
    if (node.getAttr("latexRenderVersion") !== renderVersion) return;
    latexNode.destroy();
    textNode.visible(true);
    node.getLayer()?.batchDraw();
  });
  return true;
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
  onGraphEdgeEdit,
  getGraphEdgeState,
  onTreeNodeEdit,
  onTreeNodeClick,
}) {
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
      opacity: element.opacity ?? 1,
      lineCap: element.lineCap ?? "round",
      lineJoin: "round",
      tension: element.smoothing ?? 0.45,
      dash: getBrushDash(element),
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
      perfectDrawEnabled: false,
      shadowForStrokeEnabled: false,
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
      onGraphEdgeEdit,
      getGraphEdgeState,
    });
  } else if (element.type === "tree-structure") {
    node = createTreeStructureNode(element, common, { onTreeNodeEdit, onTreeNodeClick });
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
      fill: resolveFill(element.fill),
    };
  }
  if (element.type === "stroke") {
    return {
      points: flattenPoints(element.points ?? []),
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      opacity: element.opacity ?? 1,
      lineCap: element.lineCap ?? "round",
      tension: element.smoothing ?? 0.45,
      dash: getBrushDash(element),
      hitStrokeWidth: Math.max((element.strokeWidth ?? 1) + 14, 22),
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
        stroke: isActive ? "#2563eb" : style.stroke,
        strokeWidth: isActive ? 3 : 2,
        fill: (element.markers?.highlight ?? []).includes(index) ? style.highlightFill : style.indexFill,
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
    const valueRect = new Konva.Rect({
      name: "array-item-value-hit",
      y: valueY,
      width: cellWidth,
      height: cellHeight,
      stroke: isActive ? "#2563eb" : style.stroke,
      strokeWidth: isActive ? 3 : 2,
      fill: (element.markers?.highlight ?? []).includes(index) ? style.highlightFill : style.valueFill,
    });
    const valueText = new Konva.Text({
      name: "array-item-value-hit",
      y: valueY + 10,
      width: cellWidth,
      height: 24,
      text: String(item.value ?? ""),
      fontSize: 20,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    });
    itemGroup.add(valueRect);
    itemGroup.add(valueText);

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

    const handlePress = (event) => {
      onArrayItemPress?.({
        elementId: element.id,
        index,
        value: String(item.value ?? ""),
      });
    };

    const handleRelease = (event) => {
      event.cancelBubble = true;
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
      valueRect.on("mousedown touchstart", handlePress);
      valueText.on("mousedown touchstart", handlePress);
      valueRect.on("mouseup touchend touchcancel", handleRelease);
      valueText.on("mouseup touchend touchcancel", handleRelease);
      indexRect?.on("click tap", handleSelect);
      indexText?.on("click tap", handleSelect);
      indexRect?.on("mousedown touchstart", handlePress);
      indexText?.on("mousedown touchstart", handlePress);
      indexRect?.on("mouseup touchend touchcancel", handleRelease);
      indexText?.on("mouseup touchend touchcancel", handleRelease);
    }
    if (isDragging) {
      draggedItemGroup = itemGroup;
    } else if (isActive) {
      activeItemGroup = itemGroup;
    } else {
      itemGroups.push(itemGroup);
    }
  });

  itemGroups.forEach((itemGroup) => group.add(itemGroup));
  if (activeItemGroup) group.add(activeItemGroup);
  if (draggedItemGroup) group.add(draggedItemGroup);
  group.add(dropIndicator);

  const pointerIndex = element.markers?.pointer;
  const showPointer = element.markers?.showPointer ?? true;
  if (showPointer && Number.isInteger(pointerIndex) && pointerIndex >= 0 && pointerIndex < (element.items?.length ?? 0)) {
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
  group.add(new Konva.Rect({
    width,
    height,
    fill: "rgba(255,255,255,0)",
    listening: true,
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
  onGraphEdgeEdit,
  getGraphEdgeState,
} = {}) {
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const group = new Konva.Group({
    ...common,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  });
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
      record.line.points([source.x, source.y, target.x, target.y]);
      if (record.weightBackground && record.weightLabel) {
        const x = (source.x + target.x) / 2 - 18;
        const y = (source.y + target.y) / 2 - 18;
        record.weightBackground.position({ x, y });
        record.weightLabel.position({ x, y });
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
      points: getGraphEdgePoints(source, target, edgeIndex),
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
    const record = { edge, line, weightBackground: null, weightLabel: null };
    if (edge.weight) {
      const labelPoint = getGraphEdgeLabelPoint(source, target, edgeIndex);
      record.weightBackground = new Konva.Rect({
        x: labelPoint.x - 18,
        y: labelPoint.y - 9,
        width: 36,
        height: 18,
        fill: "rgba(255,255,255,0.92)",
        cornerRadius: 4,
        listening: false,
      });
      group.add(record.weightBackground);
      record.weightLabel = new Konva.Text({
        x: labelPoint.x - 18,
        y: labelPoint.y - 9,
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
    const nodeGroup = new Konva.Group({
      name: "graph-node",
      x: node.x,
      y: node.y,
      draggable: Boolean(common.draggable),
    });
    nodeGroups.set(node.id, nodeGroup);
    nodeGroup.add(new Konva.Ellipse({
      radiusX: style.nodeRadius,
      radiusY: style.nodeRadius,
      stroke: style.nodeStroke,
      strokeWidth: 2,
      fill: getGraphNodeFill(element, node, style, getGraphEdgeState),
    }));
    nodeGroup.add(new Konva.Text({
      x: -style.nodeRadius,
      y: -12,
      width: style.nodeRadius * 2,
      height: 24,
      text: String(node.label ?? node.id),
      fontSize: 20,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    }));
    nodeGroup.on("dragstart", (event) => {
      event.cancelBubble = true;
      group.draggable(false);
    });
    nodeGroup.on("dragmove", (event) => {
      event.cancelBubble = true;
      refreshEdges();
      group.getLayer()?.batchDraw();
    });
    nodeGroup.on("dragend", (event) => {
      event.cancelBubble = true;
      group.draggable(Boolean(common.draggable));
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
    group.add(nodeGroup);
  }

  return group;
}

function createTreeStructureNode(element, common, { onTreeNodeEdit, onTreeNodeClick } = {}) {
  const style = { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const group = new Konva.Group({
    ...common,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  });
  const collapsed = new Set(element.markers?.collapsed ?? []);
  const hidden = getCollapsedTreeIndexes(collapsed, Math.max(0, ...(element.nodes ?? []).map((node) => node.index ?? 0)));
  const nodes = new Map((element.nodes ?? []).filter((node) => !hidden.has(node.index)).map((node) => [node.index, node]));

  for (const node of nodes.values()) {
    if (node.parentIndex === null || node.parentIndex === undefined) continue;
    const parent = nodes.get(node.parentIndex);
    if (!parent) continue;
    group.add(new Konva.Line({
      points: [parent.x, parent.y, node.x, node.y],
      stroke: style.stroke,
      strokeWidth: 3,
      lineCap: "round",
      lineJoin: "round",
    }));
  }

  for (const node of nodes.values()) {
    const nodeGroup = new Konva.Group({
      name: "tree-node",
      x: node.x,
      y: node.y,
    });
    nodeGroup.add(new Konva.Ellipse({
      radiusX: style.nodeRadius,
      radiusY: style.nodeRadius,
      stroke: style.nodeStroke,
      strokeWidth: 2,
      fill: (element.markers?.highlighted ?? []).includes(node.index) ? style.highlightFill : style.nodeFill,
    }));
    nodeGroup.add(new Konva.Text({
      x: -style.nodeRadius,
      y: -12,
      width: style.nodeRadius * 2,
      height: 24,
      text: String(node.value ?? ""),
      fontSize: 19,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    }));
    nodeGroup.on("dblclick dbltap", (event) => {
      event.cancelBubble = true;
      onTreeNodeEdit?.({
        elementId: element.id,
        index: node.index,
        value: String(node.value ?? ""),
      });
    });
    nodeGroup.on("click tap", (event) => {
      event.cancelBubble = true;
      onTreeNodeClick?.({
        elementId: element.id,
        index: node.index,
      });
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

function getGraphEdgePoints(source, target, edgeIndex = 0) {
  if (source.id === target.id || (source.x === target.x && source.y === target.y)) {
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
  if (edgeIndex === 0) return [source.x, source.y, target.x, target.y];
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const offset = edgeIndex * 28;
  const middleX = (source.x + target.x) / 2 + normalX * offset;
  const middleY = (source.y + target.y) / 2 + normalY * offset;
  return [source.x, source.y, middleX, middleY, target.x, target.y];
}

function getGraphEdgeLabelPoint(source, target, edgeIndex = 0) {
  const points = getGraphEdgePoints(source, target, edgeIndex);
  if (points.length >= 6) {
    return { x: points[2], y: points[3] };
  }
  return {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };
}

function getCollapsedTreeIndexes(collapsed, maxIndex = 0) {
  const hidden = new Set();
  const visit = (index) => {
    if (index > maxIndex) return;
    const left = index * 2 + 1;
    const right = index * 2 + 2;
    if (left <= maxIndex) hidden.add(left);
    if (right <= maxIndex) hidden.add(right);
    visit(left);
    visit(right);
  };
  for (const index of collapsed) visit(index);
  return hidden;
}

function getGraphNodeFill(element, node, style, getGraphEdgeState) {
  if ((element.markers?.highlightedNodes ?? []).includes(node.id)) return style.highlightFill;
  const state = getGraphEdgeState?.(element.id);
  if (state?.sourceNodeId === node.id) return "#dbeafe";
  return style.nodeFill;
}

function getBrushDash(element) {
  const width = Math.max(1, Number(element.strokeWidth) || 1);
  if (element.brushStyle === "dash") return [width * 3, width * 2];
  if (element.brushStyle === "dot") return [0.01, width * 1.8];
  return [];
}

function resolveFill(fill) {
  return fill === "transparent" ? "rgba(0,0,0,0)" : fill;
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
