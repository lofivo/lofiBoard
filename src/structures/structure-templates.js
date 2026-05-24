import { createId } from "../board/ids.js";

export const STRUCTURE_TYPES = {
  ARRAY: "array",
  STACK: "stack",
  QUEUE: "queue",
  DEQUE: "deque",
  GRAPH: "graph",
  TREE: "tree",
  BINARY_TREE: "binary-tree",
};

export const STRUCTURE_ELEMENT_TYPES = {
  ARRAY: "array-structure",
  STACK: "stack-structure",
  QUEUE: "queue-structure",
  DEQUE: "deque-structure",
  GRAPH: "graph-structure",
  TREE: "tree-structure",
};

export const LINEAR_STRUCTURE_TYPES = [
  STRUCTURE_ELEMENT_TYPES.ARRAY,
  STRUCTURE_ELEMENT_TYPES.STACK,
  STRUCTURE_ELEMENT_TYPES.QUEUE,
  STRUCTURE_ELEMENT_TYPES.DEQUE,
];

export const STRUCTURE_ITEMS = [
  {
    id: STRUCTURE_TYPES.ARRAY,
    label: "数组",
    defaultInput: "1,2,3,4,5",
    placeholder: "1,2,3,4,5",
  },
  {
    id: STRUCTURE_TYPES.STACK,
    label: "栈",
    defaultInput: "1,2,3",
    placeholder: "1,2,3",
  },
  {
    id: STRUCTURE_TYPES.QUEUE,
    label: "队列",
    defaultInput: "1,2,3",
    placeholder: "1,2,3",
  },
  {
    id: STRUCTURE_TYPES.DEQUE,
    label: "双端队列",
    defaultInput: "1,2,3",
    placeholder: "1,2,3",
  },
  {
    id: STRUCTURE_TYPES.GRAPH,
    label: "图",
    defaultInput: "A->B, A->C, B->D, C->D",
    placeholder: "A->B, A-C, B->D",
  },
  {
    id: STRUCTURE_TYPES.TREE,
    label: "树",
    defaultInput: "1->2, 1->3, 2->4, 2->5",
    placeholder: "1->2, 1->3, 2->4",
  },
  {
    id: STRUCTURE_TYPES.BINARY_TREE,
    label: "二叉树",
    defaultInput: "1->2, 1->3, 2->4, 2->5, 3->6, 3->7",
    placeholder: "1->2, 1->3, 2->4",
  },
];

export const ARRAY_STRUCTURE_STYLE = Object.freeze({
  cellWidth: 72,
  cellHeight: 44,
  indexFill: "#eef2ff",
  valueFill: "#ffffff",
  highlightFill: "#fef3c7",
  pointerFill: "#2563eb",
  stroke: "#111827",
  textFill: "#111827",
  indexTextFill: "#475569",
});

export const ARRAY_RANDOM_INIT_LIMITS = Object.freeze({
  defaultCount: 5,
  minCount: 1,
  maxCount: 64,
  minValue: 0,
  maxValue: 99,
});

export const GRAPH_STRUCTURE_STYLE = Object.freeze({
  nodeRadius: 26,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  highlightFill: "#fef3c7",
  edgeHighlightStroke: "#2563eb",
  textFill: "#111827",
});

export const TREE_STRUCTURE_STYLE = Object.freeze({
  nodeRadius: 24,
  levelGap: 92,
  leafGap: 74,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  highlightFill: "#fef3c7",
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
  const trimmedInput = String(input ?? "").trim();
  if (trimmedInput.length >= 2 && trimmedInput.startsWith('"') && trimmedInput.endsWith('"')) {
    return Array.from(trimmedInput.slice(1, -1)).map((value) => value || " ");
  }
  return splitCommaValues(input).map((value) => value || " ");
}

export function normalizeRandomArrayCount(count) {
  const numericCount = Number.parseInt(String(count ?? ""), 10);
  const countOrDefault = Number.isFinite(numericCount) ? numericCount : ARRAY_RANDOM_INIT_LIMITS.defaultCount;
  return clampNumber(countOrDefault, ARRAY_RANDOM_INIT_LIMITS.minCount, ARRAY_RANDOM_INIT_LIMITS.maxCount);
}

export function createRandomArrayValues(count, {
  random = Math.random,
  minValue = ARRAY_RANDOM_INIT_LIMITS.minValue,
  maxValue = ARRAY_RANDOM_INIT_LIMITS.maxValue,
} = {}) {
  const safeCount = normalizeRandomArrayCount(count);
  const min = Math.ceil(Number(minValue));
  const max = Math.floor(Number(maxValue));
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const span = high - low + 1;
  return Array.from({ length: safeCount }, () => {
    const ratio = clampNumber(Number(random()), 0, 0.999999999999);
    return String(low + Math.floor(ratio * span));
  });
}

export function parseGraphInput(input) {
  const edgeTexts = splitCommaValues(input);
  const edges = [];
  const nodes = [];
  const seenNodes = new Set();

  for (const edgeText of edgeTexts) {
    const { body, weight } = splitEdgeWeight(edgeText);
    const match = body.match(/^(.+?)(?:\s*(->|-|—|–)\s*)(.+)$/);
    if (!match) {
      addNode(body);
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
      weight,
    });
  }

  return { nodes, edges };

  function addNode(label) {
    if (!label || seenNodes.has(label)) return;
    seenNodes.add(label);
    nodes.push(label);
  }
}

function splitEdgeWeight(edgeText) {
  const match = String(edgeText).match(/^(.*?)(?::|=)\s*([^:=]+)$/);
  if (!match) {
    return { body: String(edgeText).trim(), weight: "" };
  }
  return {
    body: match[1].trim(),
    weight: match[2].trim(),
  };
}

export function parseTreeInput(input) {
  const parsed = parseGraphInput(input);
  return {
    nodes: parsed.nodes,
    edges: parsed.edges
      .filter((edge) => edge.directed)
      .map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
      })),
  };
}

export function createStructureElements({ type, input, point, zIndexStart = 0, initMode = "manual", randomCount, random } = {}) {
  const normalizedInput = normalizeStructureInput(type, input);
  const linearValues = isLinearStructureType(type) && initMode === "random"
    ? createRandomArrayValues(randomCount, { random })
    : parseArrayInput(normalizedInput);
  const element = type === STRUCTURE_TYPES.GRAPH
    ? createGraphStructureElement(parseGraphInput(normalizedInput), point, zIndexStart)
    : type === STRUCTURE_TYPES.TREE
      ? createTreeStructureElement(
        parseTreeInput(initMode === "random" ? createCompleteTreeInput(randomCount) : normalizedInput),
        point,
        zIndexStart,
        { treeKind: "general" },
      )
      : type === STRUCTURE_TYPES.BINARY_TREE
        ? createTreeStructureElement(
          parseTreeInput(initMode === "random" ? createCompleteTreeInput(randomCount) : normalizedInput),
          point,
          zIndexStart,
          { treeKind: "binary" },
        )
      : createLinearStructureElement(type, linearValues, point, zIndexStart);
  return [element];
}

export function isBinaryTreeStructure(element) {
  return element?.type === STRUCTURE_ELEMENT_TYPES.TREE && element.settings?.treeKind === "binary";
}

export function isLinearStructureElement(elementOrType) {
  const type = typeof elementOrType === "string" ? elementOrType : elementOrType?.type;
  return LINEAR_STRUCTURE_TYPES.includes(type);
}

export function isLinearStructureType(type) {
  return LINEAR_STRUCTURE_TYPES.includes(getLinearElementType(type));
}

export function insertArrayItem(element, index = element?.items?.length ?? 0, value = "") {
  if (!isLinearStructureElement(element)) return element;
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
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length === 0) return element;
  const safeIndex = Math.min(items.length - 1, Math.max(0, Number(index) || 0));
  items.splice(safeIndex, 1);
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function updateArrayItemValue(element, index = 0, value = "") {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length === 0) return element;
  const safeIndex = clampIndex(index, items.length - 1);
  items[safeIndex] = {
    ...items[safeIndex],
    value: String(value ?? ""),
  };
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function swapArrayItems(element, firstIndex = 0, secondIndex = 1) {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length < 2) return element;
  const first = clampIndex(firstIndex, items.length - 1);
  const second = clampIndex(secondIndex, items.length - 1);
  if (first === second) return element;
  [items[first], items[second]] = [items[second], items[first]];
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function moveArrayItem(element, fromIndex = 0, toIndex = 0) {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length < 2) return element;
  const from = clampIndex(fromIndex, items.length - 1);
  const to = clampIndex(toIndex, items.length - 1);
  if (from === to) return element;
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function updateArrayValues(element, input) {
  if (!isLinearStructureElement(element)) return element;
  const values = parseArrayInput(normalizeStructureInput(STRUCTURE_TYPES.ARRAY, input));
  return normalizeArrayStructureItems({
    ...element,
    items: values.map((value, index) => ({
      id: element.items?.[index]?.id ?? createId("item"),
      index,
      value,
    })),
  });
}

export function setArrayHighlight(element, { start = 0, end = start, pointer = start, showPointer = element?.markers?.showPointer ?? true } = {}) {
  if (!isLinearStructureElement(element)) return element;
  const length = element.items?.length ?? 0;
  if (length === 0) {
    return {
      ...element,
      markers: { highlight: [], pointer: null, showPointer: Boolean(showPointer) },
    };
  }
  const safeStart = clampIndex(start, length - 1);
  const safeEnd = clampIndex(end, length - 1);
  const min = Math.min(safeStart, safeEnd);
  const max = Math.max(safeStart, safeEnd);
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      highlight: Array.from({ length: max - min + 1 }, (_, offset) => min + offset),
      pointer: pointer === null || pointer === undefined ? null : clampIndex(pointer, length - 1),
      showPointer: Boolean(showPointer),
    },
  };
}

export function setArrayPointer(element, pointer = 0) {
  if (!isLinearStructureElement(element)) return element;
  const length = element.items?.length ?? 0;
  if (length === 0) {
    return {
      ...element,
      markers: { ...(element.markers ?? {}), pointer: null },
    };
  }
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      pointer: pointer === null || pointer === undefined ? null : clampIndex(pointer, length - 1),
    },
  };
}

export function setArrayPointerVisibility(element, showPointer = true) {
  if (!isLinearStructureElement(element)) return element;
  const length = element.items?.length ?? 0;
  const currentPointer = Number.isInteger(element.markers?.pointer)
    ? clampIndex(element.markers.pointer, Math.max(0, length - 1))
    : 0;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      pointer: length > 0 ? currentPointer : null,
      showPointer: Boolean(showPointer),
    },
  };
}

export function clearArrayHighlight(element) {
  if (!isLinearStructureElement(element)) return element;
  return {
    ...element,
    markers: { highlight: [], pointer: null },
  };
}

export function setLinearIndexOptions(element, { indexBase = element?.settings?.indexBase ?? 0, showIndexes = element?.settings?.showIndexes ?? true } = {}) {
  if (!isLinearStructureElement(element)) return element;
  return {
    ...element,
    settings: {
      ...(element.settings ?? {}),
      indexBase: Number(indexBase) === 1 ? 1 : 0,
      showIndexes: Boolean(showIndexes),
    },
  };
}

export function getLinearStructureLocalPoint(element, worldPoint, renderedNode = null) {
  const renderedX = Number(renderedNode?.x?.());
  const renderedY = Number(renderedNode?.y?.());
  const renderedScaleX = Number(renderedNode?.scaleX?.());
  const renderedScaleY = Number(renderedNode?.scaleY?.());
  const originX = Number.isFinite(renderedX) ? renderedX : Number(element?.x) || 0;
  const originY = Number.isFinite(renderedY) ? renderedY : Number(element?.y) || 0;
  const scaleX = getSafeLinearScale(Number.isFinite(renderedScaleX) ? renderedScaleX : element?.scaleX);
  const scaleY = getSafeLinearScale(Number.isFinite(renderedScaleY) ? renderedScaleY : element?.scaleY);
  return {
    x: (Number(worldPoint?.x) - originX) / scaleX,
    y: (Number(worldPoint?.y) - originY) / scaleY,
  };
}

function getSafeLinearScale(scale) {
  const value = Number(scale);
  return Number.isFinite(value) && value !== 0 ? value : 1;
}

export function clampLinearItemDropGap(gap, length) {
  return Math.min(Math.max(0, Number(length) || 0), Math.max(0, Number(gap) || 0));
}

export function getLinearItemPreviewGap({ localX = 0, length = 0, cellWidth = ARRAY_STRUCTURE_STYLE.cellWidth } = {}) {
  const safeCellWidth = Math.max(1, Number(cellWidth) || ARRAY_STRUCTURE_STYLE.cellWidth);
  const paddedX = Number(localX) + safeCellWidth * 0.35;
  return clampLinearItemDropGap(Math.floor(paddedX / safeCellWidth), length);
}

export function getLinearItemDropIndex(fromIndex, previewGap, length) {
  const safeFrom = clampIndex(fromIndex, Math.max(0, (Number(length) || 0) - 1));
  const safeGap = clampLinearItemDropGap(previewGap, length);
  return safeGap > safeFrom ? safeGap - 1 : safeGap;
}

export function addGraphNode(element, label = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const existing = new Set((element.nodes ?? []).map((node) => node.label));
  const nextLabel = String(label || getNextGraphNodeLabel(existing));
  if (existing.has(nextLabel)) return element;
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const nodes = [...(element.nodes ?? [])];
  const angle = (-Math.PI / 2) + (Math.PI * 2 * nodes.length) / Math.max(1, nodes.length + 1);
  nodes.push({
    id: createId("graph_node"),
    label: nextLabel,
    x: element.width / 2 + Math.cos(angle) * Math.max(40, element.width / 3 - style.nodeRadius),
    y: element.height / 2 + Math.sin(angle) * Math.max(40, element.height / 3 - style.nodeRadius),
  });
  return normalizeStructureBounds({
    ...element,
    nodes,
  }, GRAPH_STRUCTURE_STYLE);
}

export function addGraphEdge(element, from = null, to = null, { directed = false, weight = "" } = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const nodes = element.nodes ?? [];
  if (nodes.length < 2) return element;
  const source = from ?? nodes.at(-2)?.id;
  const target = to ?? nodes.at(-1)?.id;
  if (!source || !target) return element;
  return normalizeStructureBounds({
    ...element,
    edges: [
      ...(element.edges ?? []),
      {
        id: createId("edge"),
        from: source,
        to: target,
        directed,
        weight: String(weight ?? ""),
      },
    ],
  }, GRAPH_STRUCTURE_STYLE);
}

export function addGraphEdgeFromText(element, input) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const graph = parseGraphInput(input);
  if (graph.edges.length === 0) return element;
  let withNodes = element;
  for (const label of graph.nodes) {
    if (!(withNodes.nodes ?? []).some((node) => node.label === label)) {
      withNodes = addGraphNode(withNodes, label);
    }
  }
  const nodeIdByLabel = new Map((withNodes.nodes ?? []).map((node) => [node.label, node.id]));
  return normalizeStructureBounds({
    ...withNodes,
    edges: [
      ...(withNodes.edges ?? []),
      ...graph.edges
        .map((edge) => ({
          ...edge,
          from: nodeIdByLabel.get(edge.from),
          to: nodeIdByLabel.get(edge.to),
        }))
        .filter((edge) => edge.from && edge.to),
    ],
    settings: {
      ...(withNodes.settings ?? {}),
      directedDefault: (withNodes.settings?.directedDefault ?? false) || graph.edges.some((edge) => edge.directed),
      weightedDefault: (withNodes.settings?.weightedDefault ?? false) || graph.edges.some((edge) => edge.weight),
    },
  }, GRAPH_STRUCTURE_STYLE);
}

export function deleteGraphEdge(element, edgeId = null) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const edges = element.edges ?? [];
  if (edges.length === 0) return element;
  if (!edgeId) {
    return {
      ...element,
      edges: edges.slice(0, -1),
    };
  }
  return {
    ...element,
    edges: edges.filter((edge) => edge.id !== edgeId),
  };
}

export function deleteLastGraphEdge(element) {
  return deleteGraphEdge(element);
}

export function deleteGraphNode(element, nodeId = null) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const nodes = element.nodes ?? [];
  if (nodes.length === 0) return element;
  const targetId = nodeId ?? nodes.at(-1)?.id;
  if (!targetId) return element;
  return {
    ...element,
    nodes: nodes.filter((node) => node.id !== targetId),
    edges: (element.edges ?? []).filter((edge) => edge.from !== targetId && edge.to !== targetId),
  };
}

export function moveGraphNode(element, nodeId, x, y) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH || !nodeId) return element;
  return normalizeStructureBounds({
    ...element,
    nodes: (element.nodes ?? []).map((node) => (
      node.id === nodeId ? { ...node, x: Number(x), y: Number(y) } : node
    )),
  }, GRAPH_STRUCTURE_STYLE);
}

export function setGraphDirectedDefault(element, directedDefault = true) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  return {
    ...element,
    settings: {
      ...(element.settings ?? {}),
      directedDefault: Boolean(directedDefault),
    },
  };
}

export function updateGraphEdge(element, edgeId = null, updates = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const edges = element.edges ?? [];
  if (edges.length === 0) return element;
  const targetId = edgeId ?? edges.at(-1)?.id;
  return {
    ...element,
    edges: edges.map((edge) => (
      edge.id === targetId
        ? {
          ...edge,
          directed: updates.directed === undefined ? edge.directed : Boolean(updates.directed),
          weight: updates.weight === undefined ? edge.weight : String(updates.weight ?? ""),
        }
        : edge
    )),
  };
}

export function updateGraphNodeLabel(element, nodeId, label = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH || !nodeId) return element;
  return {
    ...element,
    nodes: (element.nodes ?? []).map((node) => (
      node.id === nodeId ? { ...node, label: String(label ?? "") } : node
    )),
  };
}

export function setGraphHighlight(element, { nodes = [], edges = [] } = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const nodeIds = new Set((element.nodes ?? []).map((node) => node.id));
  const edgeIds = new Set((element.edges ?? []).map((edge) => edge.id));
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      highlightedNodes: [...new Set(nodes.map(String).filter((id) => nodeIds.has(id)))],
      highlightedEdges: [...new Set(edges.map(String).filter((id) => edgeIds.has(id)))],
    },
  };
}

export function clearGraphHighlight(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      highlightedNodes: [],
      highlightedEdges: [],
    },
  };
}

export function layoutGraph(element, mode = "circle") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const nodes = element.nodes ?? [];
  if (nodes.length === 0) return element;
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  if (mode === "grid") {
    const columns = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / columns);
    const gapX = Math.max(style.nodeRadius * 2.5, (element.width - style.nodeRadius * 2) / Math.max(1, columns));
    const gapY = Math.max(style.nodeRadius * 2.5, (element.height - style.nodeRadius * 2) / Math.max(1, rows));
    return {
      ...element,
      nodes: nodes.map((node, index) => ({
        ...node,
        x: style.nodeRadius + gapX * (index % columns) + gapX / 2,
        y: style.nodeRadius + gapY * Math.floor(index / columns) + gapY / 2,
      })),
    };
  }
  if (mode === "layered") {
    const layers = getGraphLayers(element);
    const layerGap = (element.height - style.nodeRadius * 2) / Math.max(1, layers.length);
    return {
      ...element,
      nodes: nodes.map((node) => {
        const layerIndex = layers.findIndex((layer) => layer.includes(node.id));
        const layer = layers[Math.max(0, layerIndex)] ?? [node.id];
        const position = Math.max(0, layer.indexOf(node.id));
        const xGap = (element.width - style.nodeRadius * 2) / Math.max(1, layer.length);
        return {
          ...node,
          x: style.nodeRadius + xGap * position + xGap / 2,
          y: style.nodeRadius + layerGap * Math.max(0, layerIndex) + layerGap / 2,
        };
      }),
    };
  }
  if (mode === "force") {
    return forceLayoutGraph(element, style);
  }
  const radius = Math.max(style.nodeRadius * 2, Math.min(element.width, element.height) / 2 - style.nodeRadius * 1.5);
  const centerX = element.width / 2;
  const centerY = element.height / 2;
  return {
    ...element,
    nodes: nodes.map((node, index) => {
      const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / nodes.length;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    }),
  };
}

export function exportGraph(element, format = "edge-list") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return "";
  const nodes = element.nodes ?? [];
  const edges = element.edges ?? [];
  const labelById = new Map(nodes.map((node) => [node.id, node.label ?? node.id]));
  if (format === "adjacency-list") {
    const adjacency = new Map(nodes.map((node) => [node.id, []]));
    for (const edge of edges) {
      adjacency.get(edge.from)?.push(formatAdjacentTarget(labelById.get(edge.to) ?? edge.to, edge.weight));
      if (!edge.directed) adjacency.get(edge.to)?.push(formatAdjacentTarget(labelById.get(edge.from) ?? edge.from, edge.weight));
    }
    return nodes.map((node) => `${node.label ?? node.id}: ${(adjacency.get(node.id) ?? []).join(", ")}`).join("\n");
  }
  if (format === "adjacency-matrix") {
    const indexes = new Map(nodes.map((node, index) => [node.id, index]));
    const matrix = nodes.map(() => nodes.map(() => "0"));
    for (const edge of edges) {
      const from = indexes.get(edge.from);
      const to = indexes.get(edge.to);
      if (from === undefined || to === undefined) continue;
      const value = edge.weight || "1";
      matrix[from][to] = value;
      if (!edge.directed) matrix[to][from] = value;
    }
    return [
      `,${nodes.map((node) => node.label ?? node.id).join(",")}`,
      ...matrix.map((row, index) => `${nodes[index].label ?? nodes[index].id},${row.join(",")}`),
    ].join("\n");
  }
  return edges.map((edge) => {
    const from = labelById.get(edge.from) ?? edge.from;
    const to = labelById.get(edge.to) ?? edge.to;
    return `${from}${edge.directed ? "->" : "-"}${to}${edge.weight ? `:${edge.weight}` : ""}`;
  }).join(", ");
}

export function exportTree(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return "";
  const nodes = element.nodes ?? [];
  const edges = element.edges ?? [];
  const labelById = new Map(nodes.map((node) => [node.id, node.label ?? node.id]));
  const edgeText = edges
    .map((edge) => {
      const from = labelById.get(edge.from);
      const to = labelById.get(edge.to);
      return from && to ? `${from}->${to}` : "";
    })
    .filter(Boolean);
  const connected = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const standalone = nodes
    .filter((node) => !connected.has(node.id))
    .map((node) => node.label ?? node.id);
  return [...edgeText, ...standalone].join("\n");
}

export function importGraphFromText(element, input, format = "edge-list") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  if (format === "adjacency-list") {
    const edges = [];
    const nodes = [];
    const seen = new Set();
    const addNode = (label) => {
      if (!label || seen.has(label)) return;
      seen.add(label);
      nodes.push(label);
    };
    for (const line of String(input ?? "").split(/\n+/)) {
      const [sourceText, targetsText = ""] = line.split(":");
      const source = sourceText.trim();
      if (!source) continue;
      addNode(source);
      for (const targetText of targetsText.split(",")) {
        const { label, weight } = parseAdjacentTarget(targetText);
        if (!label) continue;
        addNode(label);
        edges.push({ id: createId("edge"), from: source, to: label, directed: true, weight });
      }
    }
    return updateGraphFromParsedGraph(element, { nodes, edges });
  }
  if (format === "adjacency-matrix") {
    const rows = String(input ?? "").split(/\n+/).map((line) => line.split(",").map((cell) => cell.trim())).filter((row) => row.length > 0);
    if (rows.length < 2) return element;
    const labels = rows[0][0] ? rows.map((row) => row[0]) : rows[0].slice(1);
    const matrixRows = rows[0][0] ? rows : rows.slice(1);
    const edges = [];
    labels.forEach((label) => {
      if (!label) return;
      if (!matrixRows.some((row) => row[0] === label)) matrixRows.push([label]);
    });
    matrixRows.forEach((row, rowIndex) => {
      const from = row[0] || labels[rowIndex];
      row.slice(1).forEach((value, columnIndex) => {
        const to = labels[columnIndex];
        if (!from || !to || !value || value === "0") return;
        edges.push({ id: createId("edge"), from, to, directed: true, weight: value === "1" ? "" : value });
      });
    });
    return updateGraphFromParsedGraph(element, { nodes: labels.filter(Boolean), edges });
  }
  return updateGraphFromInput(element, input);
}

export function updateGraphFromInput(element, input) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const graph = parseGraphInput(normalizeStructureInput(STRUCTURE_TYPES.GRAPH, input));
  return updateGraphFromParsedGraph(element, graph);
}

function updateGraphFromParsedGraph(element, graph) {
  const previousNodesByLabel = new Map((element.nodes ?? []).map((node) => [node.label ?? node.id, node]));
  const created = createGraphStructureElement(graph, {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  }, element.zIndex ?? 0);
  const nodes = created.nodes.map((node) => {
    const previous = previousNodesByLabel.get(node.label);
    return previous ? { ...node, id: previous.id, x: previous.x, y: previous.y } : node;
  });
  const idByLabel = new Map(nodes.map((node) => [node.label, node.id]));
  return {
    ...element,
    width: created.width,
    height: created.height,
    nodes,
    edges: graph.edges
      .map((edge) => ({
        ...edge,
        from: idByLabel.get(edge.from),
        to: idByLabel.get(edge.to),
      }))
      .filter((edge) => edge.from && edge.to),
    settings: created.settings,
    style: { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) },
  };
}

export function updateTreeFromInput(element, input) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const treeKind = element.settings?.treeKind === "binary" ? "binary" : "general";
  const created = createTreeStructureElement(parseTreeInput(input), {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  }, element.zIndex ?? 0, { treeKind });
  return {
    ...element,
    x: created.x,
    y: created.y,
    width: created.width,
    height: created.height,
    nodes: created.nodes,
    edges: created.edges,
    settings: created.settings,
    markers: {
      ...(element.markers ?? {}),
      collapsed: [],
      highlighted: [],
    },
    style: { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) },
  };
}

export function addTreeNode(element, value = "0") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const label = String(value ?? "0");
  const radius = (element.style?.nodeRadius ?? TREE_STRUCTURE_STYLE.nodeRadius);
  return normalizeStructureBounds({
    ...element,
    nodes: [
      ...(element.nodes ?? []),
      {
        id: createId("tree_node"),
        label,
        x: (Number(element.width) || radius * 4) / 2,
        y: (Number(element.height) || radius * 4) / 2,
      },
    ],
  }, TREE_STRUCTURE_STYLE);
}

export function addTreeChild(element, parentIndex = 0, value = "0") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  if (isBinaryTreeStructure(element)) return element;
  const parentId = String(parentIndex);
  const parent = (element.nodes ?? []).find((node) => node.id === parentId);
  if (!parent) return element;
  const label = String(value ?? "0");
  const child = {
    id: createId("tree_node"),
    label,
    x: parent.x,
    y: parent.y + (element.style?.levelGap ?? TREE_STRUCTURE_STYLE.levelGap),
  };
  const nextElement = {
    ...element,
    nodes: [...(element.nodes ?? []), child],
    edges: [
      ...(element.edges ?? []),
      { id: createId("tree_edge"), from: parentId, to: child.id },
    ],
  };
  return layoutTreeStructure(nextElement);
}

export function addTreeSibling(element, nodeIndex = 0, side = "right", value = "0") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  if (isBinaryTreeStructure(element)) return element;
  const nodeId = String(nodeIndex);
  const rootId = element.settings?.rootId ?? getDefaultTreeRootId((element.nodes ?? []).map((node) => node.id), element.edges ?? []);
  if (!nodeId || nodeId === rootId) return element;
  const parentEdge = (element.edges ?? []).find((edge) => edge.to === nodeId);
  if (!parentEdge) return element;
  const node = (element.nodes ?? []).find((item) => item.id === nodeId);
  if (!node) return element;
  const label = String(value ?? "0");
  const sibling = {
    id: createId("tree_node"),
    label,
    x: node.x,
    y: node.y,
  };
  const insertAfter = side === "right";
  const nextEdges = [];
  for (const edge of element.edges ?? []) {
    if (edge.id === parentEdge.id && !insertAfter) {
      nextEdges.push({ id: createId("tree_edge"), from: parentEdge.from, to: sibling.id });
    }
    nextEdges.push(edge);
    if (edge.id === parentEdge.id && insertAfter) {
      nextEdges.push({ id: createId("tree_edge"), from: parentEdge.from, to: sibling.id });
    }
  }
  return layoutTreeStructure({
    ...element,
    nodes: [...(element.nodes ?? []), sibling],
    edges: nextEdges,
  });
}

export function addBinaryTreeChild(element, parentIndex = 0, side = "left", value = "0") {
  if (!isBinaryTreeStructure(element)) return element;
  const parentId = String(parentIndex);
  const normalizedSide = side === "right" ? "right" : "left";
  const sides = getBinaryTreeChildSides(element, parentId);
  if (sides[normalizedSide]) return element;
  const parent = (element.nodes ?? []).find((node) => node.id === parentId);
  if (!parent) return element;
  const label = String(value ?? "0");
  const child = {
    id: createId("tree_node"),
    label,
    x: parent.x,
    y: parent.y + (element.style?.levelGap ?? TREE_STRUCTURE_STYLE.levelGap),
  };
  const nextElement = {
    ...element,
    nodes: [...(element.nodes ?? []), child],
  };
  return addTreeEdge(nextElement, parentId, child.id, { side: normalizedSide });
}

export function updateTreeNodeValue(element, nodeIndex = 0, value = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const targetId = String(nodeIndex);
  if (!(element.nodes ?? []).some((node) => node.id === targetId)) return element;
  return {
    ...element,
    nodes: (element.nodes ?? []).map((node) => (
      node.id === targetId ? { ...node, label: String(value ?? "") } : node
    )),
  };
}

export function moveTreeNode(element, nodeId, x, y) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE || !nodeId) return element;
  if (isBinaryTreeStructure(element)) return element;
  return normalizeStructureBounds({
    ...element,
    nodes: (element.nodes ?? []).map((node) => (
      node.id === nodeId ? { ...node, x: Number(x), y: Number(y) } : node
    )),
  }, TREE_STRUCTURE_STYLE);
}

export function layoutTreeStructure(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const style = { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) };
  return normalizeStructureBounds(layoutTree(element, {
    levelGap: style.levelGap,
    leafGap: style.leafGap,
    nodeRadius: style.nodeRadius,
  }), TREE_STRUCTURE_STYLE);
}

export function addTreeEdge(element, from = null, to = null, { side = null } = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE || !from || !to || from === to) return element;
  const nodeIds = new Set((element.nodes ?? []).map((node) => node.id));
  const source = String(from);
  const target = String(to);
  if (!nodeIds.has(source) || !nodeIds.has(target)) return element;
  const binary = isBinaryTreeStructure(element);
  const currentEdges = element.edges ?? [];
  if (binary) {
    const normalizedSide = side === "right" ? "right" : side === "left" ? "left" : getNextAvailableBinarySide(element, source, target);
    if (!normalizedSide) return element;
    const sides = getBinaryTreeChildSides(element, source, { ignoreChildId: target });
    if (sides[normalizedSide]) return element;
    side = normalizedSide;
  }
  const withoutPreviousParent = currentEdges.filter((edge) => edge.to !== target);
  const nextEdges = [...withoutPreviousParent, { id: createId("tree_edge"), from: source, to: target, ...(binary ? { side } : {}) }];
  const normalized = normalizeTreeEdges(nextEdges, element.settings?.rootId ?? getDefaultTreeRootId([...nodeIds], nextEdges), { binary });
  if (normalized.length !== nextEdges.length) return element;
  const nextElement = {
    ...element,
    edges: normalized,
    settings: {
      ...(element.settings ?? {}),
      rootId: element.settings?.rootId ?? getDefaultTreeRootId([...nodeIds], normalized),
    },
  };
  return binary ? layoutTreeStructure(nextElement) : nextElement;
}

export function setTreeTraversalHighlight(element, mode = "level") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const order = getTreeTraversalOrder(element, mode);
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      traversalMode: mode,
      traversalCursor: order.length > 0 ? 0 : -1,
      traversalOrder: order,
      highlighted: order.length > 0 ? [order[0]] : [],
    },
  };
}

export function clearTreeHighlight(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      traversalMode: null,
      highlighted: [],
      traversalCursor: -1,
      traversalOrder: [],
    },
  };
}

export function stepTreeTraversalHighlight(element, direction = 1) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const mode = element.markers?.traversalMode ?? "level";
  const order = getTreeTraversalOrder(element, mode);
  if (order.length === 0) return clearTreeHighlight(element);
  const currentIndex = Number(element.markers?.traversalCursor ?? -1);
  const nextIndex = ((currentIndex + Number(direction || 1)) % order.length + order.length) % order.length;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      traversalMode: mode,
      traversalCursor: nextIndex,
      highlighted: [order[nextIndex]],
      traversalOrder: order,
    },
  };
}

export function setTreeSubtreeCollapsed(element, nodeIndex = 0, collapsed = true) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const targetId = String(nodeIndex);
  if (!(element.nodes ?? []).some((node) => node.id === targetId)) return element;
  const collapsedSet = new Set(element.markers?.collapsed ?? []);
  if (collapsed) {
    collapsedSet.add(targetId);
  } else {
    collapsedSet.delete(targetId);
  }
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      collapsed: [...collapsedSet],
    },
  };
}

export function copyTreeSubtreeValues(element, nodeIndex = 0) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return [];
  const targetId = String(nodeIndex);
  const nodeById = new Map((element.nodes ?? []).map((node) => [node.id, node]));
  if (!nodeById.has(targetId)) return [];
  const children = getTreeChildrenMap(element);
  const values = [];
  const visit = (nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    values.push(node.label ?? node.value ?? "");
    for (const childId of children.get(nodeId) ?? []) visit(childId);
  };
  visit(targetId);
  return values;
}

export function moveTreeSubtree(element, fromIndex = 0, toIndex = 0) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  return addTreeEdge(element, toIndex, fromIndex);
}

export function deleteTreeSubtree(element, nodeIndex = element?.nodes?.at(-1)?.id) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const targetId = String(nodeIndex);
  if (!(element.nodes ?? []).some((node) => node.id === targetId)) return element;
  const children = getTreeChildrenMap(element);
  const removed = new Set();
  const visit = (nodeId) => {
    removed.add(nodeId);
    for (const childId of children.get(nodeId) ?? []) visit(childId);
  };
  visit(targetId);
  const nodes = (element.nodes ?? []).filter((node) => !removed.has(node.id));
  const edges = (element.edges ?? []).filter((edge) => !removed.has(edge.from) && !removed.has(edge.to));
  if (isBinaryTreeStructure(element) && targetId === element.settings?.rootId) {
    return {
      ...element,
      nodes: [],
      edges: [],
      settings: { ...(element.settings ?? {}), rootId: null },
      markers: {
        ...(element.markers ?? {}),
        collapsed: [],
        highlighted: [],
        traversalCursor: -1,
        traversalOrder: [],
      },
    };
  }
  const rootId = nodes.some((node) => node.id === element.settings?.rootId)
    ? element.settings.rootId
    : getDefaultTreeRootId(nodes.map((node) => node.id), edges);
  const nextElement = {
    ...element,
    nodes,
    edges,
    settings: { ...(element.settings ?? {}), rootId },
    markers: {
      ...(element.markers ?? {}),
      collapsed: (element.markers?.collapsed ?? []).filter((id) => !removed.has(id)),
      highlighted: (element.markers?.highlighted ?? []).filter((id) => !removed.has(id)),
      traversalOrder: (element.markers?.traversalOrder ?? []).filter((id) => !removed.has(id)),
    },
  };
  return isBinaryTreeStructure(element) ? layoutTreeStructure(nextElement) : nextElement;
}

export function deleteLastTreeNode(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const targetId = element.nodes?.at(-1)?.id;
  return targetId ? deleteTreeSubtree(element, targetId) : element;
}

export function getTreeTraversalOrder(element, mode = "level") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return [];
  if (mode === "inorder" && !isBinaryTreeStructure(element)) return [];
  const nodeIds = (element.nodes ?? []).map((node) => node.id);
  if (nodeIds.length === 0) return [];
  const rootId = element.settings?.rootId && nodeIds.includes(element.settings.rootId)
    ? element.settings.rootId
    : getDefaultTreeRootId(nodeIds, element.edges ?? []);
  const children = getTreeChildrenMap(element);
  if (mode === "level") {
    const queue = [rootId];
    const visited = new Set();
    const order = [];
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id || visited.has(id)) continue;
      visited.add(id);
      order.push(id);
      queue.push(...(children.get(id) ?? []));
    }
    return [...order, ...nodeIds.filter((id) => !visited.has(id))];
  }
  const order = [];
  const visit = (nodeId) => {
    if (mode === "inorder") {
      const [left, right] = children.get(nodeId) ?? [];
      if (left) visit(left);
      order.push(nodeId);
      if (right) visit(right);
      return;
    }
    if (mode === "preorder") order.push(nodeId);
    for (const childId of children.get(nodeId) ?? []) visit(childId);
    if (mode === "postorder") order.push(nodeId);
  };
  visit(rootId);
  for (const id of nodeIds) {
    if (!order.includes(id)) visit(id);
  }
  return order;
}

function getNextGraphNodeLabel(existing) {
  for (let code = 65; code <= 90; code += 1) {
    const label = String.fromCharCode(code);
    if (!existing.has(label)) return label;
  }
  let index = 1;
  while (existing.has(`N${index}`)) index += 1;
  return `N${index}`;
}

function clampIndex(index, maxIndex) {
  return Math.min(maxIndex, Math.max(0, Number(index) || 0));
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatAdjacentTarget(label, weight) {
  return weight ? `${label}(${weight})` : label;
}

function parseAdjacentTarget(input) {
  const value = String(input ?? "").trim();
  if (!value) return { label: "", weight: "" };
  const match = value.match(/^(.+?)\((.*)\)$/);
  return match
    ? { label: match[1].trim(), weight: match[2].trim() }
    : { label: value, weight: "" };
}

function getGraphLayers(element) {
  const nodes = element.nodes ?? [];
  const edges = element.edges ?? [];
  if (nodes.length === 0) return [];
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    if (!edge.directed) incoming.set(edge.from, (incoming.get(edge.from) ?? 0) + 1);
  }
  const start = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  const queue = start.length > 0 ? [...start] : [nodes[0].id];
  const visited = new Set();
  const layers = [];
  while (queue.length > 0) {
    const size = queue.length;
    const layer = [];
    for (let index = 0; index < size; index += 1) {
      const id = queue.shift();
      if (!id || visited.has(id)) continue;
      visited.add(id);
      layer.push(id);
      for (const edge of edges) {
        if (edge.from === id) queue.push(edge.to);
        if (!edge.directed && edge.to === id) queue.push(edge.from);
      }
    }
    if (layer.length > 0) layers.push(layer);
  }
  const rest = nodes.map((node) => node.id).filter((id) => !visited.has(id));
  if (rest.length > 0) layers.push(rest);
  return layers;
}

function forceLayoutGraph(element, style) {
  const width = element.width;
  const height = element.height;
  const nodes = (element.nodes ?? []).map((node) => ({ ...node }));
  const edges = element.edges ?? [];
  const area = Math.max(1, width * height);
  const ideal = Math.sqrt(area / Math.max(1, nodes.length));
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const movement = new Map(nodes.map((node) => [node.id, { x: 0, y: 0 }]));
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x || 0.01;
        const dy = a.y - b.y || 0.01;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = (ideal * ideal) / distance;
        const offsetX = (dx / distance) * force * 0.04;
        const offsetY = (dy / distance) * force * 0.04;
        movement.get(a.id).x += offsetX;
        movement.get(a.id).y += offsetY;
        movement.get(b.id).x -= offsetX;
        movement.get(b.id).y -= offsetY;
      }
    }
    for (const edge of edges) {
      const a = nodes.find((node) => node.id === edge.from);
      const b = nodes.find((node) => node.id === edge.to);
      if (!a || !b || a.id === b.id) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = ((distance * distance) / ideal) * 0.002;
      const offsetX = (dx / distance) * force;
      const offsetY = (dy / distance) * force;
      movement.get(a.id).x -= offsetX;
      movement.get(a.id).y -= offsetY;
      movement.get(b.id).x += offsetX;
      movement.get(b.id).y += offsetY;
    }
    for (const node of nodes) {
      const delta = movement.get(node.id);
      node.x = clampNumber(node.x + delta.x, style.nodeRadius, width - style.nodeRadius);
      node.y = clampNumber(node.y + delta.y, style.nodeRadius, height - style.nodeRadius);
    }
  }
  return {
    ...element,
    nodes,
  };
}

function normalizeStructureBounds(element, defaultStyle) {
  const style = { ...defaultStyle, ...(element.style ?? {}) };
  const radius = Number(style.nodeRadius) || 24;
  const nodes = element.nodes ?? [];
  if (nodes.length === 0) {
    return {
      ...element,
      width: Math.max(radius * 2, Number(element.width) || radius * 2),
      height: Math.max(radius * 2, Number(element.height) || radius * 2),
      style,
    };
  }
  const minX = Math.min(...nodes.map((node) => Number(node.x) || 0)) - radius;
  const minY = Math.min(...nodes.map((node) => Number(node.y) || 0)) - radius;
  const maxX = Math.max(...nodes.map((node) => Number(node.x) || 0)) + radius;
  const maxY = Math.max(...nodes.map((node) => Number(node.y) || 0)) + radius;
  const shiftX = Math.min(0, minX);
  const shiftY = Math.min(0, minY);
  const nextNodes = nodes.map((node) => ({
    ...node,
    x: (Number(node.x) || 0) - shiftX,
    y: (Number(node.y) || 0) - shiftY,
  }));
  return {
    ...element,
    x: (Number(element.x) || 0) + shiftX,
    y: (Number(element.y) || 0) + shiftY,
    width: Math.max(Number(element.width) || 0, maxX - shiftX),
    height: Math.max(Number(element.height) || 0, maxY - shiftY),
    nodes: nextNodes,
    style,
  };
}

function getDefaultTreeRootId(nodeIds, edges) {
  const incoming = new Set((edges ?? []).map((edge) => edge.to));
  return nodeIds.find((id) => !incoming.has(id)) ?? nodeIds[0] ?? null;
}

function normalizeTreeEdges(edges, rootId = null, { binary = false } = {}) {
  const result = [];
  const parentByChild = new Map();
  const childCountByParent = new Map();
  const usedSidesByParent = new Map();
  for (const edge of edges ?? []) {
    if (!edge.from || !edge.to || edge.from === edge.to) continue;
    if (parentByChild.has(edge.to)) continue;
    if (binary && (childCountByParent.get(edge.from) ?? 0) >= 2) continue;
    let side = null;
    if (binary) {
      const used = usedSidesByParent.get(edge.from) ?? new Set();
      side = edge.side === "right" ? "right" : edge.side === "left" ? "left" : (!used.has("left") ? "left" : "right");
      if (used.has(side)) continue;
      used.add(side);
      usedSidesByParent.set(edge.from, used);
    }
    const candidate = [...result, { id: edge.id ?? createId("tree_edge"), from: edge.from, to: edge.to, ...(binary ? { side } : {}) }];
    if (treeEdgesHaveCycle(candidate)) continue;
    parentByChild.set(edge.to, edge.from);
    childCountByParent.set(edge.from, (childCountByParent.get(edge.from) ?? 0) + 1);
    result.push(candidate.at(-1));
  }
  if (!rootId) return result;
  return result.filter((edge) => edge.to !== rootId);
}

function treeEdgesHaveCycle(edges) {
  const children = new Map();
  for (const edge of edges) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const child of children.get(id) ?? []) {
      if (visit(child)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...children.keys()].some((id) => visit(id));
}

function getTreeChildrenMap(element) {
  const children = new Map((element.nodes ?? []).map((node) => [node.id, []]));
  const edges = isBinaryTreeStructure(element)
    ? [...(element.edges ?? [])].sort((a, b) => getBinarySideOrder(a.side) - getBinarySideOrder(b.side))
    : element.edges ?? [];
  for (const edge of edges) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  return children;
}

export function getBinaryTreeChildSides(element, parentId, { ignoreChildId = null } = {}) {
  const result = { left: null, right: null };
  if (!isBinaryTreeStructure(element) || !parentId) return result;
  const edges = normalizeTreeEdges(element.edges ?? [], element.settings?.rootId, { binary: true })
    .filter((edge) => edge.from === parentId && edge.to !== ignoreChildId);
  for (const edge of edges) {
    if (edge.side === "right") result.right = edge.to;
    else result.left = edge.to;
  }
  return result;
}

function getNextAvailableBinarySide(element, parentId, childId = null) {
  const sides = getBinaryTreeChildSides(element, parentId, { ignoreChildId: childId });
  if (!sides.left) return "left";
  if (!sides.right) return "right";
  return null;
}

function getBinarySideOrder(side) {
  return side === "right" ? 1 : 0;
}

function layoutTree(element, { levelGap, leafGap, nodeRadius }) {
  const nodes = element.nodes ?? [];
  if (nodes.length === 0) return element;
  if (isBinaryTreeStructure(element)) {
    return layoutBinaryTree(element, { levelGap, leafGap, nodeRadius });
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const children = getTreeChildrenMap(element);
  const rootId = element.settings?.rootId ?? getDefaultTreeRootId(nodes.map((node) => node.id), element.edges ?? []);
  const levels = [];
  const queue = [{ id: rootId, depth: 0 }];
  const visited = new Set();
  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (!id || visited.has(id) || !nodeById.has(id)) continue;
    visited.add(id);
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(id);
    for (const childId of children.get(id) ?? []) queue.push({ id: childId, depth: depth + 1 });
  }
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const depth = levels.length;
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(node.id);
    }
  }
  const width = Math.max(nodeRadius * 4, Math.max(...levels.map((level) => level.length)) * leafGap + nodeRadius * 2);
  const laidOut = nodes.map((node) => {
    const depth = levels.findIndex((level) => level.includes(node.id));
    const level = levels[Math.max(0, depth)] ?? [node.id];
    const position = level.indexOf(node.id);
    const gap = width / Math.max(1, level.length + 1);
    return {
      ...node,
      x: gap * (position + 1),
      y: nodeRadius + Math.max(0, depth) * levelGap,
    };
  });
  return {
    ...element,
    width,
    height: Math.max(nodeRadius * 2, levels.length * levelGap),
    nodes: laidOut,
  };
}

function layoutBinaryTree(element, { levelGap, leafGap, nodeRadius }) {
  const nodes = element.nodes ?? [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const children = getTreeChildrenMap(element);
  const rootId = element.settings?.rootId ?? getDefaultTreeRootId(nodes.map((node) => node.id), element.edges ?? []);
  const positions = new Map();
  const depths = new Map();
  const visited = new Set();
  let leafIndex = 0;
  let maxDepth = 0;

  const visit = (id, depth) => {
    if (!id || visited.has(id) || !nodeById.has(id)) return null;
    visited.add(id);
    depths.set(id, depth);
    maxDepth = Math.max(maxDepth, depth);
    const childIds = (children.get(id) ?? []).filter((childId) => nodeById.has(childId)).slice(0, 2);
    if (childIds.length === 0) {
      const x = nodeRadius + leafIndex * leafGap;
      leafIndex += 1;
      positions.set(id, x);
      return x;
    }
    const childXs = childIds.map((childId) => visit(childId, depth + 1)).filter((x) => Number.isFinite(x));
    const x = childXs.length > 0
      ? childXs.reduce((sum, value) => sum + value, 0) / childXs.length
      : nodeRadius + leafIndex++ * leafGap;
    positions.set(id, x);
    return x;
  };

  visit(rootId, 0);
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const depth = maxDepth + 1;
    depths.set(node.id, depth);
    maxDepth = Math.max(maxDepth, depth);
    positions.set(node.id, nodeRadius + leafIndex * leafGap);
    leafIndex += 1;
  }

  const minX = Math.min(...nodes.map((node) => positions.get(node.id) ?? nodeRadius));
  const maxX = Math.max(...nodes.map((node) => positions.get(node.id) ?? nodeRadius));
  const offsetX = nodeRadius - minX;
  const laidOut = nodes.map((node) => ({
    ...node,
    x: (positions.get(node.id) ?? nodeRadius) + offsetX,
    y: nodeRadius + (depths.get(node.id) ?? 0) * levelGap,
  }));
  return {
    ...element,
    width: Math.max(nodeRadius * 4, maxX - minX + nodeRadius * 2),
    height: Math.max(nodeRadius * 2, (maxDepth + 1) * levelGap),
    nodes: laidOut,
  };
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
  const showIndexes = element.settings?.showIndexes ?? element.type === STRUCTURE_ELEMENT_TYPES.ARRAY;
  return {
    ...element,
    x: (Number(element.x) || 0) - (nextWidth - previousWidth) / 2,
    width: nextWidth,
    height: style.cellHeight * (showIndexes ? 2 : 1),
    items: nextItems,
    settings: getLinearStructureSettings(element.type, element.settings),
    style,
  };
}

function createLinearStructureElement(type, values, point, zIndex) {
  const elementType = getLinearElementType(type);
  const cellWidth = ARRAY_STRUCTURE_STYLE.cellWidth;
  const cellHeight = ARRAY_STRUCTURE_STYLE.cellHeight;
  const settings = getLinearStructureSettings(elementType);
  const width = Math.max(cellWidth, values.length * cellWidth);
  const height = cellHeight * (settings.showIndexes ? 2 : 1);
  return {
    id: createId(getLinearIdPrefix(elementType)),
    type: elementType,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    items: values.map((value, index) => ({
      id: createId("item"),
      index,
      value: String(value),
    })),
    settings,
    style: { ...ARRAY_STRUCTURE_STYLE },
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

function createCompleteTreeInput(count) {
  const safeCount = normalizeRandomArrayCount(count);
  const labels = Array.from({ length: safeCount }, (_, index) => String(index + 1));
  const edges = [];
  for (let index = 1; index < safeCount; index += 1) {
    const parentIndex = Math.floor((index - 1) / 2);
    edges.push(`${labels[parentIndex]}->${labels[index]}`);
  }
  return edges.length > 0 ? edges.join(", ") : labels[0];
}

function getLinearElementType(type) {
  return {
    [STRUCTURE_TYPES.ARRAY]: STRUCTURE_ELEMENT_TYPES.ARRAY,
    [STRUCTURE_TYPES.STACK]: STRUCTURE_ELEMENT_TYPES.STACK,
    [STRUCTURE_TYPES.QUEUE]: STRUCTURE_ELEMENT_TYPES.QUEUE,
    [STRUCTURE_TYPES.DEQUE]: STRUCTURE_ELEMENT_TYPES.DEQUE,
  }[type] ?? STRUCTURE_ELEMENT_TYPES.ARRAY;
}

function getLinearIdPrefix(type) {
  return {
    [STRUCTURE_ELEMENT_TYPES.ARRAY]: "array",
    [STRUCTURE_ELEMENT_TYPES.STACK]: "stack",
    [STRUCTURE_ELEMENT_TYPES.QUEUE]: "queue",
    [STRUCTURE_ELEMENT_TYPES.DEQUE]: "deque",
  }[type] ?? "linear";
}

function getLinearStructureSettings(type, settings = {}) {
  const isArray = type === STRUCTURE_ELEMENT_TYPES.ARRAY;
  return {
    indexBase: Number(settings.indexBase) === 1 ? 1 : 0,
    showIndexes: settings.showIndexes ?? isArray,
  };
}

function createGraphStructureElement(graph, point, zIndex) {
  const nodeRadius = GRAPH_STRUCTURE_STYLE.nodeRadius;
  const count = Math.max(1, graph.nodes.length);
  const layoutRadius = count <= 2 ? 90 : Math.max(92, count * 26);
  const labelToId = new Map(graph.nodes.map((label) => [label, createId("graph_node")]));
  const nodes = graph.nodes.map((label, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / count;
    return {
      id: labelToId.get(label),
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
    edges: graph.edges
      .map((edge) => ({
        ...edge,
        from: labelToId.get(edge.from),
        to: labelToId.get(edge.to),
      }))
      .filter((edge) => edge.from && edge.to),
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

function createTreeStructureElement(tree, point, zIndex, { treeKind = "general" } = {}) {
  const nodeRadius = TREE_STRUCTURE_STYLE.nodeRadius;
  const levelGap = TREE_STRUCTURE_STYLE.levelGap;
  const leafGap = Math.max(TREE_STRUCTURE_STYLE.leafGap, nodeRadius * 3);
  const labelToId = new Map((tree.nodes ?? []).map((label) => [label, createId("tree_node")]));
  const rawEdges = (tree.edges ?? [])
    .map((edge) => ({
      id: edge.id ?? createId("tree_edge"),
      from: labelToId.get(edge.from),
      to: labelToId.get(edge.to),
      side: edge.side,
    }))
    .filter((edge) => edge.from && edge.to);
  const rootId = getDefaultTreeRootId([...labelToId.values()], rawEdges);
  const edges = normalizeTreeEdges(rawEdges, rootId, { binary: treeKind === "binary" });
  const base = {
    id: createId("tree"),
    type: STRUCTURE_ELEMENT_TYPES.TREE,
    x: point.x,
    y: point.y,
    width: nodeRadius * 2,
    height: nodeRadius * 2,
    nodes: (tree.nodes ?? []).map((label) => ({
      id: labelToId.get(label),
      label,
      x: nodeRadius,
      y: nodeRadius,
    })),
    edges,
    settings: { rootId, treeKind },
    style: { ...TREE_STRUCTURE_STYLE },
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
  const laidOut = layoutTree(base, { levelGap, leafGap, nodeRadius });
  return normalizeStructureBounds({
    ...laidOut,
    x: point.x - laidOut.width / 2,
    y: point.y - laidOut.height / 2,
  }, TREE_STRUCTURE_STYLE);
}

function splitCommaValues(input) {
  return String(input ?? "")
    .split(/[,\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}
