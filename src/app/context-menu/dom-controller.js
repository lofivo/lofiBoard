export function createContextMenuDomController({
  root,
  contextMenu,
  contextMenuController,
  getSelectedIds,
  hasClipboard,
  canUndo = () => false,
  canRedo = () => false,
  getViewport,
  actions,
}) {
  let lastContextMenuTargetId;

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

  function showContextMenu(clientX, clientY, options = {}) {
    if (Object.hasOwn(options, "targetId")) {
      lastContextMenuTargetId = options.targetId;
    }
    updateContextMenuActions({ targetId: lastContextMenuTargetId });
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

  function updateContextMenuActions({ targetId = lastContextMenuTargetId } = {}) {
    root.querySelectorAll("[data-context-action]").forEach((button) => {
      button.disabled = contextMenuController.isActionDisabled(button.dataset.contextAction, {
        targetId,
        selectedIds: getSelectedIds(),
        hasClipboard: hasClipboard(),
        canUndo: canUndo(),
        canRedo: canRedo(),
      });
    });
  }

  function getLastContextMenuTargetId() {
    return lastContextMenuTargetId;
  }

  return {
    bindContextMenuActions,
    getLastContextMenuTargetId,
    hideContextMenu,
    runContextAction,
    showContextMenu,
    updateContextMenuActions,
  };
}
