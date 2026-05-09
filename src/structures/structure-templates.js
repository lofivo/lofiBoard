import { createId } from "../board/ids.js";

export const STRUCTURE_TYPES = {
  ARRAY: "array",
  GRAPH: "graph",
  TREE: "tree",
};

export const STRUCTURE_ITEMS = [
  {
    id: STRUCTURE_TYPES.ARRAY,
    label: "数组",
    defaultInput: "1,2,3,4,5",
    placeholder: "1,2,3,4,5",
  },
  {
    id: STRUCTURE_TYPES.GRAPH,
    label: "图",
    defaultInput: "A-B, A-C, B-D, C-D",
    placeholder: "A-B, A-C, B-D",
  },
  {
    id: STRUCTURE_TYPES.TREE,
    label: "树",
    defaultInput: "A, B, C, D, E, F, G",
    placeholder: "A, B, C, D, E, null, F",
  },
];

const BASE_STROKE = "#111827";
const MUTED_STROKE = "#94a3b8";
const TEXT_FILL = "#111827";
const SUBTLE_TEXT_FILL = "#475569";
const NODE_FILL = "#f8fafc";
const ARRAY_INDEX_FILL = "#eef2ff";
const ARRAY_VALUE_FILL = "#ffffff";

export function getStructureItem(type) {
  return STRUCTURE_ITEMS.find((item) => item.id === type) ?? STRUCTURE_ITEMS[0];
}

export function normalizeStructureInput(type, input) {
  const value = String(input ?? "").trim();
  return value || getStructureItem(type).defaultInput;
}

export function parseArrayInput(input) {
  return splitCommaValues(input).map((value) => value || " ");
}

export function parseGraphInput(input) {
  const edgeTexts = splitCommaValues(input);
  const edges = [];
  const nodes = [];
  const seenNodes = new Set();

  for (const edgeText of edgeTexts) {
    const match = edgeText.match(/^(.+?)(?:\s*(?:->|-|—|–)\s*)(.+)$/);
    if (!match) {
      addNode(edgeText);
      continue;
    }
    const source = match[1].trim();
    const target = match[2].trim();
    if (!source || !target) continue;
    addNode(source);
    addNode(target);
    edges.push({ source, target });
  }

  return { nodes, edges };

  function addNode(label) {
    if (!label || seenNodes.has(label)) return;
    seenNodes.add(label);
    nodes.push(label);
  }
}

export function parseTreeInput(input) {
  return splitCommaValues(input).map((value) => (
    /^(null|nil|none|undefined|#)$/i.test(value) ? null : value
  ));
}

export function createStructureElements({ type, input, point, zIndexStart = 0 }) {
  const normalizedInput = normalizeStructureInput(type, input);
  if (type === STRUCTURE_TYPES.GRAPH) {
    return createGraphElements(parseGraphInput(normalizedInput), point, zIndexStart);
  }
  if (type === STRUCTURE_TYPES.TREE) {
    return createTreeElements(parseTreeInput(normalizedInput), point, zIndexStart);
  }
  return createArrayElements(parseArrayInput(normalizedInput), point, zIndexStart);
}

function createArrayElements(values, point, zIndexStart) {
  const groupId = createId("group");
  const cellWidth = 72;
  const cellHeight = 44;
  const startX = point.x;
  const startY = point.y;
  const elements = [];

  values.forEach((value, index) => {
    const x = startX + index * cellWidth;
    elements.push(createRect({
      x,
      y: startY,
      width: cellWidth,
      height: cellHeight,
      fill: ARRAY_INDEX_FILL,
      groupId,
    }));
    elements.push(createText({
      x,
      y: startY + 8,
      width: cellWidth,
      height: 24,
      text: String(index),
      fill: SUBTLE_TEXT_FILL,
      fontSize: 18,
      align: "center",
      groupId,
    }));
    elements.push(createRect({
      x,
      y: startY + cellHeight,
      width: cellWidth,
      height: cellHeight,
      fill: ARRAY_VALUE_FILL,
    }));
    elements.push(createText({
      x,
      y: startY + cellHeight + 8,
      width: cellWidth,
      height: 24,
      text: String(value),
      fill: TEXT_FILL,
      fontSize: 20,
      align: "center",
    }));
  });

  return assignZIndexes(elements, zIndexStart);
}

function createGraphElements(graph, point, zIndexStart) {
  const groupId = createId("group");
  const nodeRadius = 26;
  const count = Math.max(1, graph.nodes.length);
  const layoutRadius = count <= 2 ? 90 : Math.max(92, count * 26);
  const center = {
    x: point.x + layoutRadius,
    y: point.y + layoutRadius,
  };
  const positions = new Map();

  graph.nodes.forEach((label, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / count;
    positions.set(label, {
      x: center.x + Math.cos(angle) * layoutRadius,
      y: center.y + Math.sin(angle) * layoutRadius,
    });
  });

  const elements = [];
  graph.edges.forEach((edge) => {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (!source || !target) return;
    elements.push(createLine({
      points: [source.x, source.y, target.x, target.y],
      stroke: MUTED_STROKE,
      strokeWidth: 3,
      groupId,
    }));
  });

  graph.nodes.forEach((label) => {
    const position = positions.get(label);
    elements.push(createEllipse({
      x: position.x,
      y: position.y,
      radiusX: nodeRadius,
      radiusY: nodeRadius,
      fill: NODE_FILL,
      groupId,
    }));
    elements.push(createText({
      x: position.x - nodeRadius,
      y: position.y - 12,
      width: nodeRadius * 2,
      height: 24,
      text: label,
      fill: TEXT_FILL,
      fontSize: 20,
      align: "center",
      groupId,
    }));
  });

  return assignZIndexes(elements, zIndexStart);
}

function createTreeElements(values, point, zIndexStart) {
  const groupId = createId("group");
  const nodeRadius = 24;
  const levelGap = 92;
  const leafGap = 74;
  const visibleIndexes = values
    .map((value, index) => ({ value, index }))
    .filter((item) => item.value !== null);
  const maxIndex = visibleIndexes.reduce((max, item) => Math.max(max, item.index), 0);
  const depth = Math.floor(Math.log2(maxIndex + 1));
  const positions = new Map();
  const width = Math.max(leafGap * 2, (2 ** depth) * leafGap);

  visibleIndexes.forEach(({ value, index }) => {
    const level = Math.floor(Math.log2(index + 1));
    const levelStart = 2 ** level - 1;
    const positionInLevel = index - levelStart;
    const slots = 2 ** level;
    positions.set(index, {
      value,
      x: point.x + ((positionInLevel + 0.5) * width) / slots,
      y: point.y + level * levelGap,
    });
  });

  const elements = [];
  for (const [index, position] of positions) {
    if (index === 0) continue;
    const parentIndex = Math.floor((index - 1) / 2);
    const parent = positions.get(parentIndex);
    if (!parent) continue;
    elements.push(createLine({
      points: [parent.x, parent.y, position.x, position.y],
      stroke: MUTED_STROKE,
      strokeWidth: 3,
      groupId,
    }));
  }

  for (const position of positions.values()) {
    elements.push(createEllipse({
      x: position.x,
      y: position.y,
      radiusX: nodeRadius,
      radiusY: nodeRadius,
      fill: NODE_FILL,
      groupId,
    }));
    elements.push(createText({
      x: position.x - nodeRadius,
      y: position.y - 12,
      width: nodeRadius * 2,
      height: 24,
      text: position.value,
      fill: TEXT_FILL,
      fontSize: 19,
      align: "center",
      groupId,
    }));
  }

  return assignZIndexes(elements, zIndexStart);
}

function splitCommaValues(input) {
  return String(input ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function assignZIndexes(elements, zIndexStart) {
  return elements.map((element, index) => ({
    ...element,
    zIndex: zIndexStart + index,
  }));
}

function createRect({ x, y, width, height, fill, groupId }) {
  return {
    id: createId("rect"),
    type: "rect",
    x,
    y,
    width,
    height,
    stroke: BASE_STROKE,
    strokeWidth: 2,
    fill,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    groupId,
  };
}

function createEllipse({ x, y, radiusX, radiusY, fill, groupId }) {
  return {
    id: createId("ellipse"),
    type: "ellipse",
    x,
    y,
    radiusX,
    radiusY,
    stroke: BASE_STROKE,
    strokeWidth: 2,
    fill,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    groupId,
  };
}

function createLine({ points, stroke, strokeWidth, groupId }) {
  return {
    id: createId("line"),
    type: "line",
    x: 0,
    y: 0,
    points,
    stroke,
    strokeWidth,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    groupId,
  };
}

function createText({ x, y, width, height, text, fill, fontSize, align, groupId }) {
  return {
    id: createId("text"),
    type: "text",
    x,
    y,
    text: String(text),
    width,
    height,
    fontSize,
    fontFamily: "Inter, system-ui, sans-serif",
    fontStyle: "normal",
    textDecoration: "",
    padding: 4,
    fill,
    align,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    groupId,
  };
}
