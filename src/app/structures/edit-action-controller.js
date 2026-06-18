import {
  addGraphEdge,
  moveGraphNode,
  updateGraphEdge,
  updateGraphNodeLabel,
} from "../../structures/graph-structure.js";
import {
  addTreeEdge,
  moveTreeNode,
} from "../../structures/tree-structure.js";

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
  syncGraphActiveVisual,
  renderTreeNodeControls,
  renderGraphNodeControls,
  hideGraphNodeControls,
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
    if (isTemporaryPanActive()) return;
    structureInteraction.clearStructureConnectState();
    const { previousActiveGraphNode } = structureInteraction.setActiveGraphNode({ elementId, nodeId });
    selectIds([elementId]);
    syncGraphActiveVisual(previousActiveGraphNode?.elementId);
    syncGraphActiveVisual(elementId);
    renderGraphNodeControls();
    setStatus("已选择图节点");
  }

  function handleGraphNodeDragStart({ elementId }) {
    const { previousActiveGraphNode } = structureInteraction.clearActiveGraphNode();
    hideGraphNodeControls();
    if (previousActiveGraphNode?.elementId) {
      syncGraphActiveVisual(previousActiveGraphNode.elementId);
    }
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
    beginGraphConnectMode: () => {},
    beginTreeConnectMode,
    connectGraphStructureNodes: () => {},
    connectTreeStructureNodes,
    editGraphEdgeData: (element) => element,
    editGraphStructureEdge: () => {},
    editGraphStructureNode: () => {},
    handleGraphNodeClick,
    handleGraphNodeDragStart,
    handleTreeNodeClick,
    moveGraphStructureNode,
    moveTreeStructureNode,
  };
}
