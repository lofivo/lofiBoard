import { createId } from "../board/ids.js";

export const STRUCTURE_TYPES = {
  ARRAY: "array",
  GRAPH: "graph",
  TREE: "tree",
};

export const STRUCTURE_ELEMENT_TYPES = {
  ARRAY: "array-structure",
  GRAPH: "graph-structure",
  TREE: "tree-structure",
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

export const ARRAY_STRUCTURE_STYLE = Object.freeze({
  cellWidth: 72,
  cellHeight: 44,
  indexFill: "#eef2ff",
  valueFill: "#ffffff",
  stroke: "#111827",
  textFill: "#111827",
  indexTextFill: "#475569",
});

export const GRAPH_STRUCTURE_STYLE = Object.freeze({
  nodeRadius: 26,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  textFill: "#111827",
});

export const TREE_STRUCTURE_STYLE = Object.freeze({
  nodeRadius: 24,
  levelGap: 92,
  leafGap: 74,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  textFill: "#111827",
});

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
    const match = edgeText.match(/^(.+?)(?:\s*(->|-|—|–)\s*)(.+)$/);
    if (!match) {
      addNode(edgeText);
      continue;
    }
    const source = match[1].trim();
    const operator = match[2].trim();
    const target = match[3].trim();
    if (!source || !target) continue;
    addNode(source);
    addNode(target);
    edges.push({
      id: createId("edge"),
      from: source,
      to: target,
      directed: operator === "->",
      weight: "",
    });
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
  const element = type === STRUCTURE_TYPES.GRAPH
    ? createGraphStructureElement(parseGraphInput(normalizedInput), point, zIndexStart)
    : type === STRUCTURE_TYPES.TREE
      ? createTreeStructureElement(parseTreeInput(normalizedInput), point, zIndexStart)
      : createArrayStructureElement(parseArrayInput(normalizedInput), point, zIndexStart);
  return [element];
}

export function insertArrayItem(element, index = element?.items?.length ?? 0, value = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
  const items = [...(element.items ?? [])];
  const safeIndex = Math.min(items.length, Math.max(0, Number(index) || 0));
  items.splice(safeIndex, 0, {
    id: createId("item"),
    index: safeIndex,
    value: String(value),
  });
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function deleteArrayItem(element, index = (element?.items?.length ?? 1) - 1) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
  const items = [...(element.items ?? [])];
  if (items.length === 0) return element;
  const safeIndex = Math.min(items.length - 1, Math.max(0, Number(index) || 0));
  items.splice(safeIndex, 1);
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

function normalizeArrayStructureItems(element) {
  const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const nextItems = (element.items ?? []).map((item, index) => ({
    ...item,
    id: item.id ?? createId("item"),
    index,
    value: String(item.value ?? ""),
  }));
  const previousWidth = Number(element.width) || style.cellWidth;
  const nextWidth = Math.max(style.cellWidth, nextItems.length * style.cellWidth);
  return {
    ...element,
    x: (Number(element.x) || 0) - (nextWidth - previousWidth) / 2,
    width: nextWidth,
    height: style.cellHeight * 2,
    items: nextItems,
    style,
  };
}

function createArrayStructureElement(values, point, zIndex) {
  const cellWidth = ARRAY_STRUCTURE_STYLE.cellWidth;
  const cellHeight = ARRAY_STRUCTURE_STYLE.cellHeight;
  const width = Math.max(cellWidth, values.length * cellWidth);
  const height = cellHeight * 2;
  return {
    id: createId("array"),
    type: STRUCTURE_ELEMENT_TYPES.ARRAY,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    items: values.map((value, index) => ({
      id: createId("item"),
      index,
      value: String(value),
    })),
    style: { ...ARRAY_STRUCTURE_STYLE },
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

function createGraphStructureElement(graph, point, zIndex) {
  const nodeRadius = GRAPH_STRUCTURE_STYLE.nodeRadius;
  const count = Math.max(1, graph.nodes.length);
  const layoutRadius = count <= 2 ? 90 : Math.max(92, count * 26);
  const nodes = graph.nodes.map((label, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / count;
    return {
      id: label,
      label,
      x: layoutRadius + Math.cos(angle) * layoutRadius,
      y: layoutRadius + Math.sin(angle) * layoutRadius,
    };
  });
  const width = layoutRadius * 2 + nodeRadius * 2;
  const height = layoutRadius * 2 + nodeRadius * 2;
  const offset = nodeRadius;

  return {
    id: createId("graph"),
    type: STRUCTURE_ELEMENT_TYPES.GRAPH,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    nodes: nodes.map((node) => ({
      ...node,
      x: node.x + offset,
      y: node.y + offset,
    })),
    edges: graph.edges,
    settings: {
      directedDefault: graph.edges.some((edge) => edge.directed),
      weightedDefault: false,
    },
    style: { ...GRAPH_STRUCTURE_STYLE },
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

function createTreeStructureElement(values, point, zIndex) {
  const nodeRadius = TREE_STRUCTURE_STYLE.nodeRadius;
  const levelGap = TREE_STRUCTURE_STYLE.levelGap;
  const leafGap = TREE_STRUCTURE_STYLE.leafGap;
  const visibleIndexes = values
    .map((value, index) => ({ value, index }))
    .filter((item) => item.value !== null);
  const maxIndex = visibleIndexes.reduce((max, item) => Math.max(max, item.index), 0);
  const depth = Math.floor(Math.log2(maxIndex + 1));
  const width = Math.max(leafGap * 2, (2 ** depth) * leafGap) + nodeRadius * 2;
  const height = Math.max(nodeRadius * 2, (depth + 1) * levelGap);
  const nodes = visibleIndexes.map(({ value, index }) => {
    const level = Math.floor(Math.log2(index + 1));
    const levelStart = 2 ** level - 1;
    const positionInLevel = index - levelStart;
    const slots = 2 ** level;
    return {
      id: String(index),
      index,
      value: String(value),
      x: nodeRadius + ((positionInLevel + 0.5) * (width - nodeRadius * 2)) / slots,
      y: nodeRadius + level * levelGap,
      parentIndex: index === 0 ? null : Math.floor((index - 1) / 2),
    };
  });

  return {
    id: createId("tree"),
    type: STRUCTURE_ELEMENT_TYPES.TREE,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    nodes,
    values,
    style: { ...TREE_STRUCTURE_STYLE },
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

function splitCommaValues(input) {
  return String(input ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
