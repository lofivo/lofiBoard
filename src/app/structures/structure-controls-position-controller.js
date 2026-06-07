export function createStructureControlsPositionController({
  contentLayer,
  getStageContainerRect,
  getElements,
  structureInteraction,
  findLinearItemNode,
  findTreeNodeGroup,
  isSelectedGeneralTreeElement,
  isSelectedBinaryTreeElement,
  isSelectedTreeElementWithTraversal,
  getLinearItemControls,
  getTreeNodeControls,
  getBinaryTreeNodeControls,
  getTreeTraversalControls,
}) {
  const controller = {
    updateLinearItemControlsPosition,
    updateTreeControlsPosition,
    updateTreeNodeControlsPosition,
    updateBinaryTreeNodeControlsPosition,
    updateTreeTraversalControlsPosition,
  };

  function updateLinearItemControlsPosition() {
    const controls = getLinearItemControls();
    const activeLinearItem = structureInteraction.getActiveLinearItem();
    if (!controls || controls.hidden || !activeLinearItem) return;
    const group = contentLayer.findOne(`#${activeLinearItem.elementId}`);
    const itemNode = findLinearItemNode(group, activeLinearItem.index);
    if (!itemNode) {
      controls.hidden = true;
      return;
    }
    const box = itemNode.getClientRect();
    const stageBox = getStageContainerRect();
    controls.style.left = `${stageBox.left + box.x + box.width / 2}px`;
    controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;
  }

  function updateTreeControlsPosition() {
    controller.updateTreeNodeControlsPosition();
    controller.updateBinaryTreeNodeControlsPosition();
    controller.updateTreeTraversalControlsPosition();
  }

  function updateTreeNodeControlsPosition() {
    positionActiveTreeNodeControls({
      controls: getTreeNodeControls(),
      isSelectedTreeElement: isSelectedGeneralTreeElement,
    });
  }

  function updateBinaryTreeNodeControlsPosition() {
    positionActiveTreeNodeControls({
      controls: getBinaryTreeNodeControls(),
      isSelectedTreeElement: isSelectedBinaryTreeElement,
    });
  }

  function positionActiveTreeNodeControls({ controls, isSelectedTreeElement }) {
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    if (!controls || controls.hidden || !activeTreeNode) return;
    const element = getElements().find((item) => item.id === activeTreeNode.elementId);
    if (!isSelectedTreeElement(element)) return;
    const treeNode = findTreeNodeGroup(contentLayer.findOne(`#${element.id}`), activeTreeNode.nodeId);
    if (!treeNode) {
      controls.hidden = true;
      return;
    }
    positionNodeControls(controls, treeNode);
  }

  function updateTreeTraversalControlsPosition() {
    const controls = getTreeTraversalControls();
    if (!controls || controls.hidden) return;
    const element = getElements().find((item) => isSelectedTreeElementWithTraversal(item));
    const group = element ? contentLayer.findOne(`#${element.id}`) : null;
    if (!group) {
      controls.hidden = true;
      return;
    }
    const box = group.getClientRect();
    const stageBox = getStageContainerRect();
    controls.style.left = `${stageBox.left + box.x + box.width - controls.offsetWidth}px`;
    controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;
    controls.style.transform = "none";
  }

  function positionNodeControls(controls, treeNode) {
    const box = treeNode.getClientRect();
    const stageBox = getStageContainerRect();
    controls.style.left = `${stageBox.left + box.x + box.width / 2}px`;
    controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;
    controls.style.transform = "translateX(-50%)";
  }

  return controller;
}
