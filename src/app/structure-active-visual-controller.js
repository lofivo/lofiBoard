export function createStructureActiveVisualController({
  contentLayer,
  getElements,
  structureInteraction,
  projectRuntimeElement,
  getElementNodeHandlers,
  syncLinearStructureNodeContent,
  isLinearStructureElement,
  isBinaryTreeElement,
  isGeneralTreeElement,
  treeStructureStyle,
  renderBinaryTreeControls,
  renderTreeNodeControls,
}) {
  function syncLinearItemActiveVisual(elementId) {
    if (!elementId) return;
    const element = getElements().find((item) => item.id === elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!isLinearStructureElement(element) || !group) return;
    const runtimeElement = projectRuntimeElement(element);
    syncLinearStructureNodeContent(group, runtimeElement, getElementNodeHandlers(runtimeElement));
    group.findOne(".array-drop-indicator")?.moveToTop();
  }

  function syncBinaryTreeActiveVisual(elementId) {
    syncTreeActiveVisual(elementId, {
      isTreeElement: isBinaryTreeElement,
      renderControls: renderBinaryTreeControls,
    });
  }

  function syncGeneralTreeActiveVisual(elementId) {
    syncTreeActiveVisual(elementId, {
      isTreeElement: isGeneralTreeElement,
      renderControls: renderTreeNodeControls,
    });
  }

  function syncTreeActiveVisual(elementId, { isTreeElement, renderControls }) {
    if (!elementId) return;
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    const element = getElements().find((item) => item.id === elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!isTreeElement(element) || !group) return;
    const style = { ...treeStructureStyle, ...(element.style ?? {}) };
    group.find(".tree-node").forEach((nodeGroup) => {
      const nodeId = nodeGroup.getAttr("treeNodeId");
      const ellipse = nodeGroup.findOne("Ellipse");
      if (!ellipse) return;
      const isActive = activeTreeNode?.elementId === elementId && activeTreeNode.nodeId === nodeId;
      ellipse.stroke(isActive ? "#2563eb" : style.nodeStroke);
      ellipse.strokeWidth(isActive ? 3 : 2);
      if (isActive) nodeGroup.moveToTop();
    });
    renderControls();
    contentLayer.batchDraw();
  }

  return {
    syncLinearItemActiveVisual,
    syncBinaryTreeActiveVisual,
    syncGeneralTreeActiveVisual,
  };
}
