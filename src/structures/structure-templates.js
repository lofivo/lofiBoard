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
  highlightFill: "#fef3c7",
  pointerFill: "#2563eb",
  stroke: "#111827",
  textFill: "#111827",
  indexTextFill: "#475569",
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
  return splitCommaValues(input).map((value) => value || " ");
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

export function updateArrayItemValue(element, index = 0, value = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
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
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
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
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
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
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
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

export function setArrayHighlight(element, { start = 0, end = start, pointer = start } = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
  const length = element.items?.length ?? 0;
  if (length === 0) {
    return {
      ...element,
      markers: { highlight: [], pointer: null },
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
    },
  };
}

export function clearArrayHighlight(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      highlight: [],
      pointer: null,
    },
  };
}

export function setArrayStructureMode(element, mode = "array") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.ARRAY) return element;
  const allowedModes = new Set(["array", "stack", "queue", "deque"]);
  return {
    ...element,
    settings: {
      ...(element.settings ?? {}),
      mode: allowedModes.has(mode) ? mode : "array",
    },
  };
}

export function addGraphNode(element, label = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const existing = new Set((element.nodes ?? []).map((node) => node.id));
  const nextLabel = String(label || getNextGraphNodeLabel(existing));
  if (existing.has(nextLabel)) return element;
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const nodes = [...(element.nodes ?? [])];
  const angle = (-Math.PI / 2) + (Math.PI * 2 * nodes.length) / Math.max(1, nodes.length + 1);
  nodes.push({
    id: nextLabel,
    label: nextLabel,
    x: element.width / 2 + Math.cos(angle) * Math.max(40, element.width / 3 - style.nodeRadius),
    y: element.height / 2 + Math.sin(angle) * Math.max(40, element.height / 3 - style.nodeRadius),
  });
  return {
    ...element,
    nodes,
  };
}

export function addGraphEdge(element, from = null, to = null, { directed = false, weight = "" } = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const nodes = element.nodes ?? [];
  if (nodes.length < 2) return element;
  const source = from ?? nodes.at(-2)?.id;
  const target = to ?? nodes.at(-1)?.id;
  if (!source || !target) return element;
  return {
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
  };
}

export function addGraphEdgeFromText(element, input) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const graph = parseGraphInput(input);
  if (graph.edges.length === 0) return element;
  const existingNodes = new Set((element.nodes ?? []).map((node) => node.id));
  const withNodes = graph.nodes.reduce((current, label) => (
    existingNodes.has(label) ? current : addGraphNode(current, label)
  ), element);
  return {
    ...withNodes,
    edges: [
      ...(withNodes.edges ?? []),
      ...graph.edges,
    ],
    settings: {
      ...(withNodes.settings ?? {}),
      directedDefault: (withNodes.settings?.directedDefault ?? false) || graph.edges.some((edge) => edge.directed),
      weightedDefault: (withNodes.settings?.weightedDefault ?? false) || graph.edges.some((edge) => edge.weight),
    },
  };
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
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const radius = style.nodeRadius;
  const nextX = clampNumber(Number(x), radius, Math.max(radius, (element.width ?? radius * 2) - radius));
  const nextY = clampNumber(Number(y), radius, Math.max(radius, (element.height ?? radius * 2) - radius));
  return {
    ...element,
    nodes: (element.nodes ?? []).map((node) => (
      node.id === nodeId ? { ...node, x: nextX, y: nextY } : node
    )),
  };
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
  if (format === "adjacency-list") {
    const adjacency = new Map(nodes.map((node) => [node.id, []]));
    for (const edge of edges) {
      adjacency.get(edge.from)?.push(formatAdjacentTarget(edge.to, edge.weight));
      if (!edge.directed) adjacency.get(edge.to)?.push(formatAdjacentTarget(edge.from, edge.weight));
    }
    return nodes.map((node) => `${node.id}: ${(adjacency.get(node.id) ?? []).join(", ")}`).join("\n");
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
      `,${nodes.map((node) => node.id).join(",")}`,
      ...matrix.map((row, index) => `${nodes[index].id},${row.join(",")}`),
    ].join("\n");
  }
  return edges.map((edge) => `${edge.from}${edge.directed ? "->" : "-"}${edge.to}${edge.weight ? `:${edge.weight}` : ""}`).join(", ");
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
  const previousNodes = new Map((element.nodes ?? []).map((node) => [node.id, node]));
  const created = createGraphStructureElement(graph, {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  }, element.zIndex ?? 0);
  return {
    ...element,
    width: created.width,
    height: created.height,
    nodes: created.nodes.map((node) => previousNodes.get(node.id) ?? node),
    edges: created.edges,
    settings: created.settings,
    style: { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) },
  };
}

export function updateTreeFromInput(element, input) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const created = createTreeStructureElement(parseTreeInput(input), {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  }, element.zIndex ?? 0);
  return {
    ...element,
    x: created.x,
    y: created.y,
    width: created.width,
    height: created.height,
    nodes: created.nodes,
    values: created.values,
    style: { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) },
  };
}

export function addTreeNode(element, value = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  return updateTreeFromInput(element, [...(element.values ?? []), String(value)].join(", "));
}

export function addTreeChild(element, parentIndex = 0, side = "left", value = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const parent = (element.nodes ?? []).find((node) => node.index === Number(parentIndex));
  if (!parent) return element;
  const targetIndex = parent.index * 2 + (side === "right" ? 2 : 1);
  const values = [...(element.values ?? [])];
  while (values.length <= targetIndex) values.push(null);
  values[targetIndex] = String(value ?? "");
  return updateTreeFromInput(element, values.map((item) => item ?? "null").join(", "));
}

export function updateTreeNodeValue(element, nodeIndex = 0, value = "") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const targetIndex = Number(nodeIndex);
  const values = [...(element.values ?? [])];
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= values.length || values[targetIndex] === null) {
    return element;
  }
  values[targetIndex] = String(value ?? "");
  return updateTreeFromInput(element, values.map((item) => item ?? "null").join(", "));
}

export function setTreeTraversalHighlight(element, mode = "level") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      traversalMode: mode,
      highlighted: getTreeTraversalOrder(element, mode),
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
  const targetIndex = Number(nodeIndex);
  if (!Number.isInteger(targetIndex)) return element;
  const collapsedSet = new Set(element.markers?.collapsed ?? []);
  if (collapsed) {
    collapsedSet.add(targetIndex);
  } else {
    collapsedSet.delete(targetIndex);
  }
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      collapsed: [...collapsedSet].sort((a, b) => a - b),
    },
  };
}

export function copyTreeSubtreeValues(element, nodeIndex = 0) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return [];
  const targetIndex = Number(nodeIndex);
  const values = element.values ?? [];
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= values.length || values[targetIndex] === null) {
    return [];
  }
  const copied = [];
  const visit = (sourceIndex, targetPosition) => {
    if (sourceIndex >= values.length || values[sourceIndex] === null) return;
    copied[targetPosition] = values[sourceIndex];
    visit(sourceIndex * 2 + 1, targetPosition * 2 + 1);
    visit(sourceIndex * 2 + 2, targetPosition * 2 + 2);
  };
  visit(targetIndex, 0);
  return copied.map((value) => value ?? null);
}

export function moveTreeSubtree(element, fromIndex = 0, toIndex = 0) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const source = Number(fromIndex);
  const target = Number(toIndex);
  const values = [...(element.values ?? [])];
  if (!Number.isInteger(source) || !Number.isInteger(target) || source < 0 || target < 0 || source >= values.length || values[source] === null) {
    return element;
  }
  const subtree = copyTreeSubtreeValues(element, source);
  const remove = (index) => {
    if (index >= values.length) return;
    values[index] = null;
    remove(index * 2 + 1);
    remove(index * 2 + 2);
  };
  const place = (relativeIndex, targetRoot) => {
    if (relativeIndex >= subtree.length || subtree[relativeIndex] === null) return;
    while (values.length <= targetRoot) values.push(null);
    values[targetRoot] = subtree[relativeIndex];
    place(relativeIndex * 2 + 1, targetRoot * 2 + 1);
    place(relativeIndex * 2 + 2, targetRoot * 2 + 2);
  };
  remove(source);
  place(0, target);
  while (values.length > 0 && values.at(-1) === null) values.pop();
  return updateTreeFromInput(element, values.map((item) => item ?? "null").join(", "));
}

export function deleteTreeSubtree(element, nodeIndex = (element?.values?.length ?? 1) - 1) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  const targetIndex = Number(nodeIndex);
  const values = [...(element.values ?? [])];
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= values.length || values[targetIndex] === null) {
    return element;
  }
  const remove = (index) => {
    if (index >= values.length) return;
    values[index] = null;
    remove(index * 2 + 1);
    remove(index * 2 + 2);
  };
  remove(targetIndex);
  while (values.length > 0 && values.at(-1) === null) values.pop();
  return updateTreeFromInput(element, values.map((item) => item ?? "null").join(", "));
}

export function deleteLastTreeNode(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return element;
  return updateTreeFromInput(element, (element.values ?? []).slice(0, -1).join(", "));
}

export function getTreeTraversalOrder(element, mode = "level") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.TREE) return [];
  const nodes = [...(element.nodes ?? [])].sort((a, b) => a.index - b.index);
  const byIndex = new Map(nodes.map((node) => [node.index, node]));
  if (mode === "level") return nodes.map((node) => node.index);

  const visit = (index, order) => {
    const node = byIndex.get(index);
    if (!node) return;
    if (mode === "preorder") order.push(index);
    visit(index * 2 + 1, order);
    if (mode === "inorder") order.push(index);
    visit(index * 2 + 2, order);
    if (mode === "postorder") order.push(index);
  };
  const order = [];
  visit(0, order);
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
