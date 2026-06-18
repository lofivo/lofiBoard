export function createStructureControlsController({
  root,
  contentLayer,
  getElements,
  getSelectedIds,
  structureInteraction,
  isLinearStructureElement,
  isSelectedGeneralTreeElement,
  isSelectedBinaryTreeElement,
  isSelectedTreeElementWithTraversal,
  isSelectedGraphElement,
  findTreeNodeGroup,
  findGraphNodeGroup,
  isTreeRootNode,
  getBinaryTreeChildSides,
  updateLinearItemControlsPosition,
  updateTreeNodeControlsPosition,
  updateBinaryTreeNodeControlsPosition,
  updateTreeTraversalControlsPosition,
  updateGraphNodeControlsPosition,
}) {
  let linearItemControls = null;
  let treeNodeControls = null;
  let binaryTreeNodeControls = null;
  let binaryTreeTraversalControls = null;
  let graphNodeControls = null;

  function ensureLinearItemControls() {
    if (linearItemControls) return linearItemControls;
    const controls = document.createElement("div");
    controls.className = "linear-item-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-linear-item-action="insert-before" title="前插" aria-label="前插">+左</button>
      <button type="button" data-linear-item-action="insert-after" title="后插" aria-label="后插">+右</button>
      <button type="button" data-linear-item-action="delete" title="删除" aria-label="删除">删除</button>
    `;
    root.appendChild(controls);
    linearItemControls = controls;
    return controls;
  }

  function hideLinearItemControls() {
    if (linearItemControls) linearItemControls.hidden = true;
  }

  function ensureTreeNodeControls() {
    if (treeNodeControls) return treeNodeControls;
    const controls = document.createElement("div");
    controls.className = "tree-node-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-tree-node-action="add-child" title="添加子节点" aria-label="添加子节点">子+</button>
      <button type="button" data-tree-node-action="add-left-sibling" title="添加左兄弟" aria-label="添加左兄弟">左兄+</button>
      <button type="button" data-tree-node-action="add-right-sibling" title="添加右兄弟" aria-label="添加右兄弟">右兄+</button>
      <button type="button" data-tree-node-action="edit" title="改值" aria-label="改值">改值</button>
      <button type="button" data-tree-node-action="delete" title="删除子树" aria-label="删除子树">删除</button>
    `;
    root.appendChild(controls);
    treeNodeControls = controls;
    return controls;
  }

  function ensureBinaryTreeNodeControls() {
    if (binaryTreeNodeControls) return binaryTreeNodeControls;
    const controls = document.createElement("div");
    controls.className = "binary-tree-node-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-binary-tree-node-action="add-left" title="添加左子节点" aria-label="添加左子节点">左+</button>
      <button type="button" data-binary-tree-node-action="add-right" title="添加右子节点" aria-label="添加右子节点">右+</button>
      <button type="button" data-binary-tree-node-action="delete" title="删除子树" aria-label="删除子树">删除</button>
    `;
    root.appendChild(controls);
    binaryTreeNodeControls = controls;
    return controls;
  }

  function ensureBinaryTreeTraversalControls() {
    if (binaryTreeTraversalControls) return binaryTreeTraversalControls;
    const controls = document.createElement("div");
    controls.className = "binary-tree-traversal-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-binary-tree-traversal-action="prev" title="上一步" aria-label="上一步">‹</button>
      <button type="button" data-binary-tree-traversal-action="next" title="下一步" aria-label="下一步">›</button>
    `;
    root.appendChild(controls);
    binaryTreeTraversalControls = controls;
    return controls;
  }

  function hideBinaryTreeControls() {
    if (binaryTreeNodeControls) binaryTreeNodeControls.hidden = true;
    if (binaryTreeTraversalControls) binaryTreeTraversalControls.hidden = true;
  }

  function hideTreeControls() {
    if (treeNodeControls) treeNodeControls.hidden = true;
  }

  function ensureGraphNodeControls() {
    if (graphNodeControls) return graphNodeControls;
    const controls = document.createElement("div");
    controls.className = "graph-node-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-graph-node-action="add-connect" title="添加连接节点" aria-label="添加连接节点">添加连接节点</button>
      <button type="button" data-graph-node-action="delete" title="删除" aria-label="删除">删除</button>
    `;
    root.appendChild(controls);
    graphNodeControls = controls;
    return controls;
  }

  function hideGraphNodeControls() {
    if (graphNodeControls) graphNodeControls.hidden = true;
  }

  function renderGraphNodeControls() {
    const controls = ensureGraphNodeControls();
    const activeGraphNode = structureInteraction.getActiveGraphNode();
    const element = getElements().find((item) => item.id === activeGraphNode?.elementId);
    if (!isSelectedGraphElement(element) || element.locked || !activeGraphNode?.nodeId) {
      controls.hidden = true;
      return;
    }
    const group = contentLayer.findOne(`#${element.id}`);
    const graphNode = findGraphNodeGroup(group, activeGraphNode.nodeId);
    if (!graphNode) {
      controls.hidden = true;
      return;
    }
    controls.hidden = false;
    updateGraphNodeControlsPosition();
  }

  function renderLinearItemControls() {
    const controls = ensureLinearItemControls();
    const activeLinearItem = structureInteraction.getActiveLinearItem();
    const element = getElements().find((item) => item.id === activeLinearItem?.elementId);
    if (!isLinearStructureElement(element) || !getSelectedIds().includes(element.id) || structureInteraction.hasLinearItemDragState()) {
      controls.hidden = true;
      return;
    }
    controls.hidden = false;
    updateLinearItemControlsPosition();
  }

  function renderTreeControls() {
    renderTreeNodeControls();
    renderTreeTraversalControls();
    renderBinaryTreeControls();
  }

  function renderTreeNodeControls() {
    const controls = ensureTreeNodeControls();
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    const element = getElements().find((item) => item.id === activeTreeNode?.elementId);
    if (!isSelectedGeneralTreeElement(element) || element.locked || !activeTreeNode?.nodeId) {
      controls.hidden = true;
      return;
    }
    const group = contentLayer.findOne(`#${element.id}`);
    const treeNode = findTreeNodeGroup(group, activeTreeNode.nodeId);
    if (!treeNode) {
      controls.hidden = true;
      return;
    }
    const isRoot = isTreeRootNode(element, activeTreeNode.nodeId);
    controls.querySelector("[data-tree-node-action='add-left-sibling']").hidden = isRoot;
    controls.querySelector("[data-tree-node-action='add-right-sibling']").hidden = isRoot;
    controls.hidden = false;
    updateTreeNodeControlsPosition();
  }

  function renderBinaryTreeControls() {
    renderBinaryTreeNodeControls();
    renderTreeTraversalControls();
  }

  function renderBinaryTreeNodeControls() {
    const controls = ensureBinaryTreeNodeControls();
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    const element = getElements().find((item) => item.id === activeTreeNode?.elementId);
    if (!isSelectedBinaryTreeElement(element) || element.locked || !activeTreeNode?.nodeId) {
      controls.hidden = true;
      return;
    }
    const group = contentLayer.findOne(`#${element.id}`);
    const treeNode = findTreeNodeGroup(group, activeTreeNode.nodeId);
    if (!treeNode) {
      controls.hidden = true;
      return;
    }
    const sides = getBinaryTreeChildSides(element, activeTreeNode.nodeId);
    controls.querySelector("[data-binary-tree-node-action='add-left']").hidden = Boolean(sides.left);
    controls.querySelector("[data-binary-tree-node-action='add-right']").hidden = Boolean(sides.right);
    controls.hidden = false;
    updateBinaryTreeNodeControlsPosition();
  }

  function renderTreeTraversalControls() {
    const controls = ensureBinaryTreeTraversalControls();
    const element = getElements().find((item) => isSelectedTreeElementWithTraversal(item));
    if (!element || !element.markers?.traversalMode) {
      controls.hidden = true;
      return;
    }
    const group = contentLayer.findOne(`#${element.id}`);
    if (!group) {
      controls.hidden = true;
      return;
    }
    controls.hidden = false;
    updateTreeTraversalControlsPosition();
  }

  return {
    ensureLinearItemControls,
    ensureTreeNodeControls,
    ensureBinaryTreeNodeControls,
    ensureBinaryTreeTraversalControls,
    ensureGraphNodeControls,
    getLinearItemControls: () => linearItemControls,
    getTreeNodeControls: () => treeNodeControls,
    getBinaryTreeNodeControls: () => binaryTreeNodeControls,
    getTreeTraversalControls: () => binaryTreeTraversalControls,
    getGraphNodeControls: () => graphNodeControls,
    hideLinearItemControls,
    hideBinaryTreeControls,
    hideTreeControls,
    hideGraphNodeControls,
    renderLinearItemControls,
    renderTreeControls,
    renderTreeNodeControls,
    renderBinaryTreeControls,
    renderBinaryTreeNodeControls,
    renderTreeTraversalControls,
    renderGraphNodeControls,
  };
}
