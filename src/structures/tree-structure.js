import { createId } from "../board/ids.js";
import { STRUCTURE_ELEMENT_TYPES } from "./types.js";
import { parseGraphInput } from "./graph-structure.js";
import { normalizeRandomArrayCount } from "./linear-structure.js";
import { normalizeStructureBounds } from "./shared.js";

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

export function isBinaryTreeStructure(element) {
  return element?.type === STRUCTURE_ELEMENT_TYPES.TREE && element.settings?.treeKind === "binary";
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
      const [firstChild, ...remainingChildren] = children.get(nodeId) ?? [];
      if (firstChild) visit(firstChild);
      order.push(nodeId);
      for (const childId of remainingChildren) visit(childId);
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

export function createCompleteTreeInput(count) {
  const safeCount = normalizeRandomArrayCount(count);
  const labels = Array.from({ length: safeCount }, (_, index) => String(index + 1));
  const edges = [];
  for (let index = 1; index < safeCount; index += 1) {
    const parentIndex = Math.floor((index - 1) / 2);
    edges.push(`${labels[parentIndex]}->${labels[index]}`);
  }
  return edges.length > 0 ? edges.join(", ") : labels[0];
}

export function createTreeStructureElement(tree, point, zIndex, { treeKind = "general" } = {}) {
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
