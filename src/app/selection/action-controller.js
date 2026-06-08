export function createSelectionActionController({
  getElements,
  setElements,
  getSelectedIds,
  createId,
  moveElementsByLayer,
  reorderElements,
  clearSelection,
  renderBoard,
  pushHistory,
}) {
  function bringSelectionToFront() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    const selected = [];
    const rest = [];
    for (const element of getElements()) {
      (selectedIds.includes(element.id) ? selected : rest).push(element);
    }
    setElements(reorderElements([...rest, ...selected]));
    renderBoard();
    pushHistory("已置顶对象");
  }

  function bringSelectionForward() {
    moveSelectionByLayer(1, "已上移对象");
  }

  function groupSelection() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length < 2) return;
    const groupId = createId("group");
    setElements(getElements().map((element) => (
      selectedIds.includes(element.id) && !element.locked ? { ...element, groupId } : element
    )));
    renderBoard();
    pushHistory("已分组对象");
  }

  function ungroupSelection() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    const groupIds = new Set(
      getElements()
        .filter((element) => selectedIds.includes(element.id) && element.groupId)
        .map((element) => element.groupId),
    );
    if (groupIds.size === 0) return;
    setElements(getElements().map((element) => (
      groupIds.has(element.groupId) && !element.locked ? { ...element, groupId: undefined } : element
    )));
    renderBoard();
    pushHistory("已取消分组");
  }

  function toggleSelectionLock() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    const selectedElements = getElements().filter((element) => selectedIds.includes(element.id));
    const shouldLock = selectedElements.some((element) => !element.locked);
    setElements(getElements().map((element) => (
      selectedIds.includes(element.id) ? { ...element, locked: shouldLock } : element
    )));
    renderBoard();
    pushHistory(shouldLock ? "已锁定对象" : "已解锁对象");
  }

  function sendSelectionToBack() {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    const selected = [];
    const rest = [];
    for (const element of getElements()) {
      (selectedIds.includes(element.id) ? selected : rest).push(element);
    }
    setElements(reorderElements([...selected, ...rest]));
    renderBoard();
    pushHistory("已置底对象");
  }

  function sendSelectionBackward() {
    moveSelectionByLayer(-1, "已下移对象");
  }

  function moveSelectionByLayer(direction, historyLabel) {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;
    const elements = getElements();
    const previousOrder = elements.map((element) => element.id).join("\n");
    const nextElements = moveElementsByLayer(elements, selectedIds, direction);
    const nextOrder = nextElements.map((element) => element.id).join("\n");
    if (previousOrder === nextOrder) return;
    setElements(nextElements);
    renderBoard();
    pushHistory(historyLabel);
  }

  function clearBoard() {
    if (getElements().length === 0) return;
    setElements([]);
    clearSelection();
    renderBoard();
    pushHistory("已清空白板");
  }

  return {
    bringSelectionForward,
    bringSelectionToFront,
    clearBoard,
    groupSelection,
    sendSelectionBackward,
    sendSelectionToBack,
    toggleSelectionLock,
    ungroupSelection,
  };
}
