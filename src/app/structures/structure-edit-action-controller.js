import {
  addGraphEdge,
  addTreeEdge,
  moveGraphNode,
  moveTreeNode,
  updateGraphEdge,
  updateGraphNodeLabel,
} from "../../structures/structure-templates.js";

export function createStructureEditActionController({
  getElements,
  setElements,
  getSelectedIds,
  structureInteraction,
  promptValue,
  promptBoolean,
  isTemporaryPanActive,
  isBinaryTreeElement,
  consumeSuppressedBinaryTreeNodeClick,
  syncBinaryTreeActiveVisual,
  syncGeneralTreeActiveVisual,
  renderTreeNodeControls,
  renderBoard,
  selectIds,
  setStatus,
  pushHistory,
  syncTreeStructurePanelState,
}) {
  function findElement(elementId) {
    return getElements().find((item) => item.id === elementId);
  }

  function replaceElement(elementId, edit) {
    setElements(getElements().map((item) => (
      item.id === elementId ? edit(item) : item
    )));
  }

  function beginGraphConnectMode() {
    const graphId = getSelectedIds().find((id) => {
      const element = findElement(id);
      return element?.type === "graph-structure" && !element.locked;
    });
    if (!graphId) return;
    structureInteraction.beginStructureConnect({ kind: "graph", elementId: graphId });
    renderBoard();
    selectIds([graphId]);
    setStatus("连边模式：点击源节点，再点击目标节点");
  }

  function beginTreeConnectMode() {
    const treeId = getSelectedIds().find((id) => {
      const element = findElement(id);
      return element?.type === "tree-structure" && !element.locked;
    });
    if (!treeId) return;
    structureInteraction.beginStructureConnect({ kind: "tree", elementId: treeId });
    renderBoard();
    selectIds([treeId]);
    setStatus("连接父子：点击父节点，再点击子节点");
  }

  function handleGraphNodeClick({ elementId, nodeId }) {
    const connectState = structureInteraction.getStructureConnectState({ kind: "graph", elementId });
    if (!connectState) {
      selectIds([elementId]);
      return;
    }
    if (!connectState.sourceNodeId) {
      structureInteraction.setStructureConnectSource({ kind: "graph", elementId, sourceNodeId: nodeId });
      renderBoard();
      selectIds([elementId]);
      setStatus("连边模式：点击目标节点");
      return;
    }
    const { connection } = structureInteraction.finishStructureConnect({
      kind: "graph",
      elementId,
      targetNodeId: nodeId,
    });
    if (!connection) return;
    replaceElement(elementId, (item) => addGraphEdge(
      item,
      connection.sourceNodeId,
      connection.targetNodeId,
      { directed: item.settings?.directedDefault ?? false },
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已添加图边");
  }

  function handleTreeNodeClick({ elementId, nodeId }) {
    if (isTemporaryPanActive()) return;
    const clickedElement = findElement(elementId);
    if (isBinaryTreeElement(clickedElement)) {
      if (consumeSuppressedBinaryTreeNodeClick(elementId)) return;
      structureInteraction.clearStructureConnectState();
      const { previousActiveTreeNode } = structureInteraction.setActiveTreeNode({ elementId, nodeId });
      selectIds([elementId]);
      syncBinaryTreeActiveVisual(previousActiveTreeNode?.elementId);
      syncBinaryTreeActiveVisual(elementId);
      setStatus("已选择二叉树节点");
      return;
    }
    const connectState = structureInteraction.getStructureConnectState({ kind: "tree", elementId });
    if (!connectState) {
      const { previousActiveTreeNode } = structureInteraction.setActiveTreeNode({ elementId, nodeId });
      selectIds([elementId]);
      syncGeneralTreeActiveVisual(previousActiveTreeNode?.elementId);
      syncGeneralTreeActiveVisual(elementId);
      renderTreeNodeControls();
      setStatus("已选择树节点");
      return;
    }
    if (!connectState.sourceNodeId) {
      structureInteraction.setStructureConnectSource({ kind: "tree", elementId, sourceNodeId: nodeId });
      renderBoard();
      selectIds([elementId]);
      setStatus("连接父子：点击子节点");
      return;
    }
    const { connection } = structureInteraction.finishStructureConnect({
      kind: "tree",
      elementId,
      targetNodeId: nodeId,
    });
    if (!connection) return;
    const element = findElement(elementId);
    const nextElement = addTreeEdge(element, connection.sourceNodeId, connection.targetNodeId);
    if (nextElement === element) {
      renderBoard();
      selectIds([elementId]);
      setStatus(element.settings?.treeKind === "binary" ? "二叉树父节点最多 2 个孩子" : "无法连接树节点");
      return;
    }
    replaceElement(elementId, () => nextElement);
    renderBoard();
    selectIds([elementId]);
    syncTreeStructurePanelState();
    pushHistory("已连接树节点");
  }

  function connectGraphStructureNodes({ elementId, sourceNodeId, targetNodeId }) {
    const element = findElement(elementId);
    if (!element || element.type !== "graph-structure" || element.locked || !sourceNodeId || !targetNodeId) return;
    structureInteraction.clearStructureConnectState();
    replaceElement(elementId, (item) => addGraphEdge(
      item,
      sourceNodeId,
      targetNodeId,
      { directed: item.settings?.directedDefault ?? false },
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已添加图边");
  }

  function connectTreeStructureNodes({ elementId, sourceNodeId, targetNodeId }) {
    const element = findElement(elementId);
    if (!element || element.type !== "tree-structure" || element.locked || !sourceNodeId || !targetNodeId) return;
    structureInteraction.clearStructureConnectState();
    const nextElement = addTreeEdge(element, sourceNodeId, targetNodeId);
    if (nextElement === element) {
      renderBoard();
      selectIds([elementId]);
      setStatus(element.settings?.treeKind === "binary" ? "二叉树父节点最多 2 个孩子" : "无法连接树节点");
      return;
    }
    replaceElement(elementId, () => nextElement);
    renderBoard();
    selectIds([elementId]);
    syncTreeStructurePanelState();
    pushHistory("已连接树节点");
  }

  function editGraphStructureEdge({ elementId, edgeId, directed, weight }) {
    const element = findElement(elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    const nextWeight = promptValue("边权，留空表示无权", weight);
    const nextDirected = promptBoolean("是否有向？y/n", directed);
    replaceElement(elementId, (item) => updateGraphEdge(item, edgeId, { weight: nextWeight, directed: nextDirected }));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已更新图边");
  }

  function editGraphStructureNode({ elementId, nodeId, label }) {
    const element = findElement(elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    const nextLabel = promptValue("节点名称", label);
    replaceElement(elementId, (item) => updateGraphNodeLabel(item, nodeId, nextLabel));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已更新图节点");
  }

  function editGraphEdgeData(element) {
    const edge = element.edges?.at(-1);
    if (!edge) return element;
    return updateGraphEdge(element, edge.id, {
      weight: promptValue("边权，留空表示无权", edge.weight ?? ""),
      directed: promptBoolean("是否有向？y/n", edge.directed),
    });
  }

  function moveGraphStructureNode({ elementId, nodeId, x, y }) {
    const element = findElement(elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    replaceElement(elementId, (item) => moveGraphNode(item, nodeId, x, y));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已移动图节点");
  }

  function moveTreeStructureNode({ elementId, nodeId, x, y }) {
    const element = findElement(elementId);
    if (!element || element.type !== "tree-structure" || element.locked) return;
    if (element.settings?.treeKind === "binary") return;
    replaceElement(elementId, (item) => moveTreeNode(item, nodeId, x, y));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已移动树节点");
  }

  return {
    beginGraphConnectMode,
    beginTreeConnectMode,
    connectGraphStructureNodes,
    connectTreeStructureNodes,
    editGraphEdgeData,
    editGraphStructureEdge,
    editGraphStructureNode,
    handleGraphNodeClick,
    handleTreeNodeClick,
    moveGraphStructureNode,
    moveTreeStructureNode,
  };
}
