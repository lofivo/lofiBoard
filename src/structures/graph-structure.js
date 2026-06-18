import { createId } from "../board/ids.js";
import { STRUCTURE_ELEMENT_TYPES, STRUCTURE_TYPES, normalizeStructureInput } from "./types.js";
import { splitCommaValues } from "./shared.js";

export const GRAPH_STRUCTURE_STYLE = Object.freeze({
  nodeRadius: 26,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  highlightFill: "#fef3c7",
  edgeHighlightStroke: "#2563eb",
  textFill: "#111827",
});

// 边框尺寸只跟"节点数量 + 当前节点半径"有关:用作新建图的默认尺寸、
// 增删节点后的下限、以及拖拽缩放时的最小值。三处共用避免常数散落。
export function getGraphMinSize(count, nodeRadius = GRAPH_STRUCTURE_STYLE.nodeRadius) {
  const r = Number(nodeRadius) || GRAPH_STRUCTURE_STYLE.nodeRadius;
  const n = Math.max(1, Number(count) || 0);
  const layoutRadius = Math.max(r * 3.5, n <= 2 ? 0 : n * r);
  const size = layoutRadius * 2 + r * 2;
  return { width: size, height: size, layoutRadius };
}

// 增删节点后,把边框顶到 count 下限(只增不减,保留用户手动放大的尺寸)。
function growGraphBoundsToCount(element) {
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const min = getGraphMinSize((element.nodes ?? []).length, style.nodeRadius);
  return {
    ...element,
    width: Math.max(Number(element.width) || 0, min.width),
    height: Math.max(Number(element.height) || 0, min.height),
  };
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

export function addGraphNode(element, label = null, { position } = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const existing = new Set((element.nodes ?? []).map((node) => node.label));
  const nextLabel = label != null ? String(label) : getNextGraphNodeLabel(existing);
  if (existing.has(nextLabel)) return element;
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const nodes = [...(element.nodes ?? [])];
  const angle = (-Math.PI / 2) + (Math.PI * 2 * nodes.length) / Math.max(1, nodes.length + 1);
  const newX = position?.x ?? (element.width / 2 + Math.cos(angle) * Math.max(40, element.width / 3 - style.nodeRadius));
  const newY = position?.y ?? (element.height / 2 + Math.sin(angle) * Math.max(40, element.height / 3 - style.nodeRadius));
  nodes.push({
    id: createId("graph_node"),
    label: nextLabel,
    x: newX,
    y: newY,
  });
  return growGraphBoundsToCount({
    ...element,
    nodes,
  });
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
  let withNodes = element;
  for (const label of graph.nodes) {
    if (!(withNodes.nodes ?? []).some((node) => node.label === label)) {
      withNodes = addGraphNode(withNodes, label);
    }
  }
  const nodeIdByLabel = new Map((withNodes.nodes ?? []).map((node) => [node.label, node.id]));
  return {
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
  // 移动节点绝不改变边框尺寸:边框只跟节点数量有关,由用户拖拽边框调节。
  return {
    ...element,
    nodes: (element.nodes ?? []).map((node) => (
      node.id === nodeId ? { ...node, x: Number(x), y: Number(y) } : node
    )),
  };
}

// 全局调节节点半径(属性栏滑块):写入 style.nodeRadius,把边框顶到新半径下的
// count 下限,再把所有节点中心钳进 [r, 边长-r],保证整圆不出界。
export function setGraphNodeRadius(element, nodeRadius) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const r = Math.max(1, Number(nodeRadius) || GRAPH_STRUCTURE_STYLE.nodeRadius);
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}), nodeRadius: r };
  const min = getGraphMinSize((element.nodes ?? []).length, r);
  const width = Math.max(Number(element.width) || 0, min.width);
  const height = Math.max(Number(element.height) || 0, min.height);
  const clamp = (value, max) => Math.min(Math.max(Number(value) || 0, r), max - r);
  return {
    ...element,
    style,
    width,
    height,
    nodes: (element.nodes ?? []).map((node) => ({
      ...node,
      x: clamp(node.x, width),
      y: clamp(node.y, height),
    })),
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

// 整图切换有向/无向:翻转所有已有边的 directed,并同步默认(供属性栏"有向图"开关用)。
export function setGraphDirected(element, directed = true) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const value = Boolean(directed);
  return {
    ...element,
    edges: (element.edges ?? []).map((edge) => ({ ...edge, directed: value })),
    settings: {
      ...(element.settings ?? {}),
      directedDefault: value,
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

export function layoutGraph(element, mode = "circle") {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const nodes = element.nodes ?? [];
  if (nodes.length === 0) return element;
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
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
  return edges.map((edge) => {
    const from = labelById.get(edge.from) ?? edge.from;
    const to = labelById.get(edge.to) ?? edge.to;
    return `${from}${edge.directed ? "->" : "-"}${to}${edge.weight ? `:${edge.weight}` : ""}`;
  }).join(", ");
}

export function updateGraphFromInput(element, input) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.GRAPH) return element;
  const graph = parseGraphInput(normalizeStructureInput(STRUCTURE_TYPES.GRAPH, input));
  return updateGraphFromParsedGraph(element, graph);
}

export function createGraphStructureElement(graph, point, zIndex, styleOverride = {}) {
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(styleOverride ?? {}) };
  const nodeRadius = style.nodeRadius;
  const count = Math.max(1, graph.nodes.length);
  const { width, height, layoutRadius } = getGraphMinSize(count, nodeRadius);
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
    style,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
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

function updateGraphFromParsedGraph(element, graph) {
  const previousNodesByLabel = new Map((element.nodes ?? []).map((node) => [node.label ?? node.id, node]));
  const style = { ...GRAPH_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const created = createGraphStructureElement(graph, {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  }, element.zIndex ?? 0, style);
  const radius = Number(style.nodeRadius) || GRAPH_STRUCTURE_STYLE.nodeRadius;
  const clamp = (value, max) => {
    const upper = Math.max(radius, max - radius);
    return Math.min(Math.max(Number(value) || 0, radius), upper);
  };
  const nodes = created.nodes.map((node) => {
    const previous = previousNodesByLabel.get(node.label);
    const next = previous ? { ...node, id: previous.id, x: previous.x, y: previous.y } : node;
    return {
      ...next,
      x: clamp(next.x, created.width),
      y: clamp(next.y, created.height),
    };
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
    style,
  };
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
