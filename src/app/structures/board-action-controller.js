import { reorderElements } from "../../board/model.js";
import { createStructureElements } from "../../structures/factory.js";
import { nextToolAfterPlacement } from "../../tools/interaction-rules.js";
import {
  isLinearStructureElement as defaultIsLinearStructureElement,
  moveArrayItem,
} from "../../structures/linear-structure.js";

export function createStructureBoardActionController({
  getArrayRandomCountValue,
  getCurrentTool,
  getKeepToolActive = () => false,
  getElementIdFromNode,
  getElements,
  getSelectedIds,
  getStructureInputValue,
  getTreeNodePressWorldPoint,
  getViewportCenterPoint,
  isArrayAlgorithmLocked,
  isBinaryTreeElement = defaultIsBinaryTreeElement,
  isLinearStructureElement = defaultIsLinearStructureElement,
  isTemporaryPanActive,
  selectTool,
  setElements,
  structureInteraction,
  structurePanelController,
  batchDraw,
  beginSelectionDrag,
  pushHistory,
  renderBinaryTreeControls,
  renderBoard,
  renderLinearItemControls,
  selectIds,
  setStructurePanelOpen,
  setTool,
  syncLinearItemActiveVisual,
  syncLinearPanelState,
  syncTreeStructurePanelState,
}) {
  function readElements() {
    return getElements?.() ?? [];
  }

  function readSelectedIds() {
    return getSelectedIds?.() ?? [];
  }

  function replaceElement(targetId, edit) {
    setElements(readElements().map((element) => (
      element.id === targetId ? edit(element) : element
    )));
  }

  function insertStructureFromPanel() {
    const activeStructureType = structurePanelController.getActiveStructureType();
    const activeArrayInitMode = structurePanelController.getActiveArrayInitMode();
    const activeStructureItem = structurePanelController.getActiveStructureItem();
    const elements = createStructureElements({
      type: activeStructureType,
      input: getStructureInputValue(),
      initMode: structurePanelController.isRandomStructureInitSupported(activeStructureType)
        ? activeArrayInitMode
        : "manual",
      randomCount: getArrayRandomCountValue(),
      point: getViewportCenterPoint(),
      zIndexStart: readElements().length,
    });
    if (elements.length === 0) return;

    setElements(reorderElements([...readElements(), ...elements]));
    setStructurePanelOpen(false);
    const currentTool = getCurrentTool();
    const nextTool = nextToolAfterPlacement(currentTool, getKeepToolActive());
    if (nextTool !== currentTool) setTool(nextTool);
    renderBoard();
    selectIds(elements.map((element) => element.id));
    pushHistory(`已添加${activeStructureItem?.label ?? "结构"}`);
  }

  function editSelectedArrayStructure(edit) {
    const targetId = readSelectedIds().find((id) => {
      const element = readElements().find((item) => item.id === id);
      return isLinearStructureElement(element) && !element.locked;
    });
    if (!targetId) return;
    if (isArrayAlgorithmLocked(targetId)) return;

    replaceElement(targetId, edit);
    syncActiveLinearItemAfterEdit(targetId);
    renderBoard();
    selectIds([targetId]);
    pushHistory("已更新线性结构");
  }

  function getSelectedLinearStructure() {
    const selectedIds = new Set(readSelectedIds());
    return readElements().find((element) => (
      selectedIds.has(element.id) && isLinearStructureElement(element)
    )) ?? null;
  }

  function setActiveLinearItem(elementId, index, { syncPanel = true, rerender = true } = {}) {
    const { previousActiveLinearItem, activeLinearItem } = structureInteraction.setActiveLinearItem({
      elements: readElements(),
      elementId,
      index,
    });
    if (!activeLinearItem) {
      if (syncPanel) syncLinearPanelState();
      syncLinearItemActiveVisual(previousActiveLinearItem?.elementId);
      return;
    }
    if (syncPanel) syncLinearPanelState();
    if (rerender) {
      renderBoard();
    } else {
      syncLinearItemActiveVisual(previousActiveLinearItem?.elementId);
      syncLinearItemActiveVisual(elementId);
      renderLinearItemControls();
      renderBinaryTreeControls();
      batchDraw();
    }
  }

  function syncActiveLinearItemAfterEdit(elementId, preferredIndex = null) {
    structureInteraction.syncActiveLinearItemAfterEdit({
      elements: readElements(),
      elementId,
      preferredIndex,
    });
  }

  function editSelectedStructure(type, edit, message, { history = true } = {}) {
    const targetId = readSelectedIds().find((id) => {
      const element = readElements().find((item) => item.id === id);
      return element?.type === type && !element.locked;
    });
    if (!targetId) return;

    replaceElement(targetId, edit);
    const updated = readElements().find((element) => element.id === targetId);
    if (isLinearStructureElement(updated)) {
      syncActiveLinearItemAfterEdit(targetId);
    }
    renderBoard();
    selectIds([targetId]);
    syncTreeStructurePanelState();
    if (history) pushHistory(message);
  }

  function handleTreeStructureNodePress(event, group) {
    if (isTemporaryPanActive() || getCurrentTool() !== selectTool) return;
    const elementId = getElementIdFromNode(group);
    const element = readElements().find((item) => item.id === elementId);
    if (!element || !isBinaryTreeElement(element) || element.locked) return;
    if (!readSelectedIds().includes(elementId)) selectIds([elementId]);
    const worldPoint = getTreeNodePressWorldPoint();
    if (!event.evt?.shiftKey && worldPoint) beginSelectionDrag(worldPoint);
  }

  function moveArrayStructureItem({ elementId, fromIndex, toIndex }) {
    const element = readElements().find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    if (fromIndex === toIndex) {
      structureInteraction.clearActiveLinearItem();
      renderBoard();
      selectIds([]);
      return;
    }
    replaceElement(elementId, (item) => moveArrayItem(item, fromIndex, toIndex));
    structureInteraction.clearActiveLinearItem();
    renderBoard();
    selectIds([]);
    pushHistory("已移动数组元素");
  }

  return {
    editSelectedArrayStructure,
    editSelectedStructure,
    getSelectedLinearStructure,
    handleTreeStructureNodePress,
    insertStructureFromPanel,
    moveArrayStructureItem,
    setActiveLinearItem,
  };
}

function defaultIsBinaryTreeElement(element) {
  return element?.type === "tree-structure" && element.settings?.treeKind === "binary";
}
