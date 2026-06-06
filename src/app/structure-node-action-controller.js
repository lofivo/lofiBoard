import {
  addBinaryTreeChild,
  addTreeChild,
  addTreeSibling,
  deleteArrayItem,
  deleteTreeSubtree,
  insertArrayItem,
  stepTreeTraversalHighlight,
} from "../structures/structure-templates.js";
import { removeElementsById } from "../services/clipboard-service.js";

export function createStructureNodeActionController({
  getElements,
  setElements,
  getSelectedIds,
  setSelectedIds,
  structureInteraction,
  isLinearStructureElement,
  isArrayAlgorithmLocked,
  isSelectedGeneralTreeElement,
  isSelectedBinaryTreeElement,
  isTreeElementWithTraversal,
  isTreeRootNode,
  getTreeParentNodeId,
  renderBoard,
  selectIds,
  setActiveLinearItem,
  editTreeStructureNode,
  hideTreeControls,
  hideBinaryTreeControls,
  updateChrome,
  syncTreeStructurePanelState,
  pushHistory,
  editSelectedStructure,
}) {
  function findElement(elementId) {
    return getElements().find((item) => item.id === elementId);
  }

  function replaceElement(elementId, nextElement) {
    setElements(getElements().map((item) => (item.id === elementId ? nextElement : item)));
  }

  function runLinearItemAction(action) {
    const activeLinearItem = structureInteraction.getActiveLinearItem();
    const elementId = activeLinearItem?.elementId;
    const index = activeLinearItem?.index;
    const element = findElement(elementId);
    if (!isLinearStructureElement(element) || element.locked || !Number.isInteger(index) || isArrayAlgorithmLocked(elementId)) return;

    if (action === "insert-before" || action === "insert-after") {
      const insertIndex = action === "insert-before" ? index : index + 1;
      const nextActiveIndex = action === "insert-before" ? index + 1 : index;
      setElements(getElements().map((item) => (
        item.id === elementId ? insertArrayItem(item, insertIndex, "0") : item
      )));
      renderBoard();
      selectIds([elementId]);
      setActiveLinearItem(elementId, nextActiveIndex);
      pushHistory("已插入数组项");
      return;
    }

    if (action === "delete") {
      setElements(getElements().map((item) => (
        item.id === elementId ? deleteArrayItem(item, index) : item
      )));
      const updated = findElement(elementId);
      renderBoard();
      selectIds([elementId]);
      if ((updated?.items?.length ?? 0) > 0) {
        setActiveLinearItem(elementId, Math.min(index, updated.items.length - 1));
      }
      pushHistory("已删除数组项");
    }
  }

  function runTreeNodeAction(action) {
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    const elementId = activeTreeNode?.elementId;
    const nodeId = activeTreeNode?.nodeId;
    const element = findElement(elementId);
    if (!isSelectedGeneralTreeElement(element) || element.locked || !nodeId) return;

    if (action === "add-child") {
      const nextElement = addTreeChild(element, nodeId, "0");
      if (nextElement === element) return;
      replaceElement(elementId, nextElement);
      structureInteraction.setActiveTreeNode({ elementId, nodeId });
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已添加子节点");
      return;
    }

    if (action === "add-left-sibling" || action === "add-right-sibling") {
      const side = action === "add-left-sibling" ? "left" : "right";
      const nextElement = addTreeSibling(element, nodeId, side, "0");
      if (nextElement === element) return;
      replaceElement(elementId, nextElement);
      structureInteraction.setActiveTreeNode({ elementId, nodeId });
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory(side === "left" ? "已添加左兄弟节点" : "已添加右兄弟节点");
      return;
    }

    if (action === "edit") {
      const node = element.nodes?.find((item) => item.id === nodeId);
      editTreeStructureNode({ elementId, nodeId, label: String(node?.label ?? node?.value ?? "") });
      return;
    }

    if (action === "delete") {
      if (isTreeRootNode(element, nodeId)) {
        setElements(removeElementsById(getElements(), [elementId]));
        structureInteraction.clearActiveTreeNode();
        setSelectedIds(getSelectedIds().filter((id) => id !== elementId));
        hideTreeControls();
        renderBoard();
        updateChrome();
        pushHistory("已删除树");
        return;
      }
      const nextElement = deleteTreeSubtree(element, nodeId);
      replaceElement(elementId, nextElement);
      structureInteraction.setActiveTreeNode({
        elementId,
        nodeId: getTreeParentNodeId(element, nodeId) ?? nextElement.settings?.rootId ?? nextElement.nodes?.[0]?.id ?? null,
      });
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已删除子树");
    }
  }

  function runBinaryTreeNodeAction(action) {
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    const elementId = activeTreeNode?.elementId;
    const nodeId = activeTreeNode?.nodeId;
    const element = findElement(elementId);
    if (!isSelectedBinaryTreeElement(element) || element.locked || !nodeId) return;
    if (action === "add-left" || action === "add-right") {
      const side = action === "add-right" ? "right" : "left";
      const nextElement = addBinaryTreeChild(element, nodeId, side, "0");
      if (nextElement === element) return;
      replaceElement(elementId, nextElement);
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory(side === "left" ? "已添加左子节点" : "已添加右子节点");
      return;
    }
    if (action === "delete") {
      if (nodeId === element.settings?.rootId) {
        setElements(removeElementsById(getElements(), [elementId]));
        structureInteraction.clearActiveTreeNode();
        setSelectedIds(getSelectedIds().filter((id) => id !== elementId));
        hideBinaryTreeControls();
        renderBoard();
        updateChrome();
        pushHistory("已删除二叉树");
        return;
      }
      const nextElement = deleteTreeSubtree(element, nodeId);
      replaceElement(elementId, nextElement);
      structureInteraction.setActiveTreeNode({
        elementId,
        nodeId: nextElement.settings?.rootId ?? nextElement.nodes?.[0]?.id ?? null,
      });
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已删除子树");
    }
  }

  function runTreeTraversalAction(action) {
    const direction = action === "prev" ? -1 : 1;
    editSelectedStructure("tree-structure", (element) => (
      isTreeElementWithTraversal(element) ? stepTreeTraversalHighlight(element, direction) : element
    ), direction > 0 ? "已推进遍历" : "已回退遍历");
  }

  function runBinaryTreeTraversalAction(action) {
    runTreeTraversalAction(action);
  }

  return {
    runBinaryTreeNodeAction,
    runBinaryTreeTraversalAction,
    runLinearItemAction,
    runTreeNodeAction,
    runTreeTraversalAction,
  };
}
