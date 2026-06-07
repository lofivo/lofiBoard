import { TOOLS } from "../../ui/ui-config.js";

export function createSelectionClipboardController({
  clipboardController,
  getElements,
  setElements,
  getSelectedIds,
  getLastPointerWorldPoint,
  isElementLocked,
  removeElementsById,
  reorderElements,
  clearArrayAlgorithmSessionForRemovedIds,
  clearSelection,
  renderBoard,
  updateContextMenuActions,
  pushHistory,
  setStatus,
  setTool,
  selectIds,
}) {
  function copySelection() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    clipboardController.copy(getElements(), selectedIds);
    updateContextMenuActions();
    setStatus("已复制对象");
  }

  function cutSelection() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    const editableIds = selectedIds.filter((id) => !isElementLocked(id));
    if (editableIds.length === 0) return;
    clearArrayAlgorithmSessionForRemovedIds(editableIds);
    clipboardController.copy(getElements(), editableIds);
    setElements(removeElementsById(getElements(), editableIds));
    clearSelection();
    renderBoard();
    updateContextMenuActions();
    pushHistory("已剪切对象");
  }

  function pasteClipboard() {
    if (!clipboardController.hasSnapshot()) return;
    const elements = getElements();
    const pasted = clipboardController.createPastedElements({
      offset: 24,
      targetPoint: getLastPointerWorldPoint(),
      zIndexStart: elements.length,
    });
    setElements(reorderElements([...elements, ...pasted]));
    clipboardController.replaceWithElements(pasted);
    renderBoard();
    setTool(TOOLS.SELECT);
    selectIds(pasted.map((element) => element.id));
    pushHistory("已粘贴对象");
  }

  function deleteSelection() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    const editableIds = selectedIds.filter((id) => !isElementLocked(id));
    if (editableIds.length === 0) return;
    clearArrayAlgorithmSessionForRemovedIds(editableIds);
    setElements(removeElementsById(getElements(), editableIds));
    clearSelection();
    renderBoard();
    pushHistory("已删除对象");
  }

  return {
    copySelection,
    cutSelection,
    deleteSelection,
    pasteClipboard,
  };
}
