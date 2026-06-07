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
