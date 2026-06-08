import { createId } from "../board/ids.js";
import { STRUCTURE_ELEMENT_TYPES, STRUCTURE_TYPES, normalizeStructureInput } from "./types.js";
import { clampNumber, normalizeStructureBounds, splitCommaValues } from "./shared.js";

export const GRAPH_STRUCTURE_STYLE = Object.freeze({
  nodeRadius: 26,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  highlightFill: "#fef3c7",
  edgeHighlightStroke: "#2563eb",
  textFill: "#111827",
});

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

export function createGraphStructureElement(graph, point, zIndex) {
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

function getNextGraphNodeLabel(existing) {
  for (let code = 65; code <= 90; code += 1) {
    const label = String.fromCharCode(code);
    if (!existing.has(label)) return label;
  }
  let index = 1;
  while (existing.has(`N${index}`)) index += 1;
  return `N${index}`;
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
