import Konva from "konva";
import { flattenPoints } from "./geometry.js";
import {
  ARRAY_STRUCTURE_STYLE,
  GRAPH_STRUCTURE_STYLE,
  LINEAR_STRUCTURE_TYPES,
  STRUCTURE_ELEMENT_TYPES,
  TREE_STRUCTURE_STYLE,
} from "../structures/structure-templates.js";

const imageCache = new Map();

export function syncTextNodeSize(node, { width, height, padding = 0 }) {
  if (!node || !Number.isFinite(width) || !Number.isFinite(height)) return;
  const nextWidth = Math.max(1, width);
  const nextHeight = Math.max(1, height);
  const horizontalPadding = Math.max(0, Number(padding) || 0);
  node.width(nextWidth);
  node.height(nextHeight);

  const textNode = node.findOne?.("Text");
  if (!textNode) return;
  textNode.x(horizontalPadding);
  textNode.y(0);
  textNode.width(Math.max(1, nextWidth - horizontalPadding * 2));
  textNode.height("auto");
  textNode.height(nextHeight);
}

export function syncTextNodeContent(node, element) {
  const textNode = node?.findOne?.("Text");
  if (!textNode || element?.type !== "text") return;
  textNode.setAttrs({
    text: element.text,
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
}

export function createElementNode(element, {
  draggable,
  onMove,
  onSelect,
  onEdit,
  onDragStart,
  onDragMove,
  onArrayItemMove,
  onArrayItemEdit,
  onArrayItemSelect,
  onArrayItemPress,
  onArrayItemRelease,
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
  } else if (LINEAR_STRUCTURE_TYPES.includes(element.type)) {
    node = createLinearStructureNode(element, common, {
      onArrayItemMove,
      onArrayItemEdit,
      onArrayItemSelect,
      onArrayItemPress,
      onArrayItemRelease,
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

function createLinearStructureNode(element, common, {
  onArrayItemMove,
  onArrayItemEdit,
  onArrayItemSelect,
  onArrayItemPress,
  onArrayItemRelease,
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
  const itemGroups = [];
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

  (element.items ?? []).forEach((item, index) => {
    const isActive = element.runtime?.activeIndex === index;
    const itemGroup = new Konva.Group({
      name: "array-item",
      x: index * cellWidth,
      y: 0,
      width: cellWidth,
      height: cellHeight * (showIndexes ? 2 : 1),
      draggable: false,
    });
    if (showIndexes) {
      itemGroup.add(new Konva.Rect({
        y: 0,
        width: cellWidth,
        height: cellHeight,
        stroke: isActive ? "#2563eb" : style.stroke,
        strokeWidth: isActive ? 3 : 2,
        fill: (element.markers?.highlight ?? []).includes(index) ? style.highlightFill : style.indexFill,
      }));
      itemGroup.add(new Konva.Text({
        y: 10,
        width: cellWidth,
        height: 24,
        text: String(index + indexBase),
        fontSize: 18,
        fontFamily: "Inter, system-ui, sans-serif",
        fill: style.indexTextFill,
        align: "center",
        verticalAlign: "middle",
      }));
    }
    itemGroup.add(new Konva.Rect({
      y: valueY,
      width: cellWidth,
      height: cellHeight,
      stroke: isActive ? "#2563eb" : style.stroke,
      strokeWidth: isActive ? 3 : 2,
      fill: (element.markers?.highlight ?? []).includes(index) ? style.highlightFill : style.valueFill,
    }));
    itemGroup.add(new Konva.Text({
      y: valueY + 10,
      width: cellWidth,
      height: 24,
      text: String(item.value ?? ""),
      fontSize: 20,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    }));
    itemGroup.on("dblclick dbltap", (event) => {
      event.cancelBubble = true;
      onArrayItemEdit?.({
        elementId: element.id,
        index,
        value: String(item.value ?? ""),
        trigger: "double",
      });
    });
    itemGroup.on("click tap", (event) => {
      event.cancelBubble = true;
      onArrayItemSelect?.({
        elementId: element.id,
        index,
        value: String(item.value ?? ""),
      });
    });
    itemGroup.on("mousedown touchstart", (event) => {
      onArrayItemPress?.({
        elementId: element.id,
        index,
        value: String(item.value ?? ""),
        phase: "start",
      });
    });
    itemGroup.on("mouseup touchend touchcancel", (event) => {
      onArrayItemRelease?.({
        elementId: element.id,
        index,
      });
    });
    let holdTimer = null;
    let longPressStarted = false;
    const clearHoldTimer = () => {
      if (!holdTimer) return;
      window.clearTimeout(holdTimer);
      holdTimer = null;
    };
    const restorePreview = () => {
      dropIndicator.visible(false);
      itemGroups.forEach((otherGroup, otherIndex) => {
        otherGroup.x(otherIndex * cellWidth);
        otherGroup.y(0);
        otherGroup.scale({ x: 1, y: 1 });
        otherGroup.opacity(1);
        otherGroup.shadowBlur(0);
        otherGroup.shadowOpacity(0);
        otherGroup.shadowOffsetY(0);
      });
      group.getLayer()?.batchDraw();
    };
    const updatePreview = (draggingGroup) => {
      const targetIndex = Math.max(0, Math.min((element.items?.length ?? 1) - 1, Math.round(draggingGroup.x() / cellWidth)));
      itemGroups.forEach((otherGroup, otherIndex) => {
        if (otherGroup === draggingGroup) return;
        otherGroup.y(0);
        if (index < targetIndex && otherIndex > index && otherIndex <= targetIndex) {
          otherGroup.x((otherIndex - 1) * cellWidth);
          return;
        }
        if (index > targetIndex && otherIndex >= targetIndex && otherIndex < index) {
          otherGroup.x((otherIndex + 1) * cellWidth);
          return;
        }
        otherGroup.x(otherIndex * cellWidth);
      });
      dropIndicator.x(targetIndex * cellWidth - 3);
      dropIndicator.visible(true);
      group.getLayer()?.batchDraw();
      return targetIndex;
    };
    itemGroup.on("pointerdown", () => {
      clearHoldTimer();
      longPressStarted = false;
      if (!common.draggable) return;
      holdTimer = window.setTimeout(() => {
        longPressStarted = true;
        onArrayItemPress?.({
          elementId: element.id,
          index,
          value: String(item.value ?? ""),
          phase: "hold",
        });
        group.draggable(false);
        itemGroup.draggable(true);
        itemGroup.scale({ x: 1.04, y: 1.04 });
        itemGroup.opacity(0.96);
        itemGroup.shadowColor("rgba(37,99,235,0.28)");
        itemGroup.shadowBlur(18);
        itemGroup.shadowOpacity(1);
        itemGroup.shadowOffsetY(-8);
        itemGroup.startDrag();
      }, 250);
    });
    itemGroup.on("pointerup pointercancel pointerleave", () => {
      clearHoldTimer();
    });
    itemGroup.on("dragstart", (event) => {
      event.cancelBubble = true;
      clearHoldTimer();
    });
    itemGroup.on("dragmove", (event) => {
      event.cancelBubble = true;
      itemGroup.y(-12);
      updatePreview(itemGroup);
    });
    itemGroup.on("dragend", (event) => {
      event.cancelBubble = true;
      clearHoldTimer();
      const targetIndex = updatePreview(itemGroup);
      itemGroup.draggable(false);
      group.draggable(Boolean(common.draggable));
      restorePreview();
      if (longPressStarted) {
        onArrayItemMove?.({
          elementId: element.id,
          fromIndex: index,
          toIndex: targetIndex,
        });
      }
      longPressStarted = false;
    });
    itemGroups.push(itemGroup);
    group.add(itemGroup);
  });

  group.add(dropIndicator);

  const pointerIndex = element.markers?.pointer;
  if (Number.isInteger(pointerIndex) && pointerIndex >= 0 && pointerIndex < (element.items?.length ?? 0)) {
    group.add(new Konva.RegularPolygon({
      x: pointerIndex * cellWidth + cellWidth / 2,
      y: -10,
      sides: 3,
      radius: 9,
      fill: style.pointerFill,
      rotation: 180,
      listening: false,
    }));
    group.add(new Konva.Text({
      x: pointerIndex * cellWidth,
      y: -30,
      width: cellWidth,
      height: 16,
      text: "i",
      fontSize: 13,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.pointerFill,
      align: "center",
      listening: false,
    }));
  }

  addLinearEndpointLabels(group, element, style, cellWidth);

  return group;
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
