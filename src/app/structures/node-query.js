import { isLinearStructureElement as defaultIsLinearStructureElement } from "../../structures/linear-structure.js";

export function getLinearItemNodeIndex(node) {
  const linearIndex = node?.getAttr?.("linearIndex");
  return Number.isInteger(linearIndex) ? linearIndex : 0;
}

export function findLinearItemNode(group, index) {
  return group?.find(".array-item")?.find((node) => getLinearItemNodeIndex(node) === index) ?? null;
}

export function findLinearItemValueGroup(group, index) {
  const itemGroup = findLinearItemNode(group, index);
  return itemGroup?.findOne?.(".array-item-value-group") ?? null;
}

export function findTreeNodeGroup(group, nodeId) {
  if (!group || !nodeId) return null;
  return group.find(".tree-node").find((node) => node.getAttr("treeNodeId") === nodeId) ?? null;
}

export function isBinaryTreeElement(element) {
  return element?.type === "tree-structure" && element.settings?.treeKind === "binary";
}

export function isGeneralTreeElement(element) {
  return element?.type === "tree-structure" && element.settings?.treeKind !== "binary";
}

export function isTreeElementWithTraversal(element) {
  return element?.type === "tree-structure";
}

export function isInteractiveStructureElement(element, isLinearStructureElement = defaultIsLinearStructureElement) {
  return isLinearStructureElement(element) || element?.type === "tree-structure";
}

export function getTreeRootNodeId(element) {
  if (!element || element.type !== "tree-structure") return null;
  const nodeIds = (element.nodes ?? []).map((node) => node.id);
  const childIds = new Set((element.edges ?? []).map((edge) => edge.to));
  return element.settings?.rootId ?? nodeIds.find((id) => !childIds.has(id)) ?? nodeIds[0] ?? null;
}

export function getTreeParentNodeId(element, nodeId) {
  if (!element || element.type !== "tree-structure" || !nodeId) return null;
  return (element.edges ?? []).find((edge) => edge.to === nodeId)?.from ?? null;
}

export function isTreeRootNode(element, nodeId) {
  return Boolean(nodeId && nodeId === getTreeRootNodeId(element));
}

export function isTreeNodeHitTarget(target) {
  return Boolean(target?.hasName?.("tree-node") || target?.findAncestor?.(".tree-node"));
}

export function findGraphNodeGroup(group, nodeId) {
  if (!group || !nodeId) return null;
  return group.find(".graph-node")?.find((node) => node.getAttr("graphNodeId") === nodeId) ?? null;
}

export function isGraphNodeHitTarget(target) {
  return Boolean(target?.hasName?.("graph-node") || target?.findAncestor?.(".graph-node"));
}

export function isGraphStructureElement(element) {
  return element?.type === "graph-structure";
}
