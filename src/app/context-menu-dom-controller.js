export function createContextMenuDomController({
  root,
  contextMenu,
  contextMenuController,
  getSelectedIds,
  hasClipboard,
  getViewport,
  actions,
}) {
  function bindContextMenuActions() {
    for (const button of root.querySelectorAll("[data-context-action]")) {
      button.addEventListener("click", () => runContextAction(button.dataset.contextAction));
    }
  }

  function runContextAction(action) {
    hideContextMenu();
    actions[action]?.();
  }

  function hideContextMenu() {
    contextMenu.hidden = true;
  }

  function showContextMenu(clientX, clientY) {
    updateContextMenuActions();
    contextMenu.hidden = false;
    const box = contextMenu.getBoundingClientRect();
    const { left, top } = contextMenuController.getPosition({
      clientX,
      clientY,
      menuBox: box,
      viewport: getViewport(),
    });
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
  }

  function updateContextMenuActions() {
    root.querySelectorAll("[data-context-action]").forEach((button) => {
      button.disabled = contextMenuController.isActionDisabled(button.dataset.contextAction, {
        selectedIds: getSelectedIds(),
        hasClipboard: hasClipboard(),
      });
    });
  }

  return {
    bindContextMenuActions,
    hideContextMenu,
    runContextAction,
    showContextMenu,
    updateContextMenuActions,
  };
}
