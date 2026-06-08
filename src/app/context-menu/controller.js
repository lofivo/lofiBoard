const SELECTION_ACTIONS = new Set([
  "copy",
  "cut",
  "delete",
  "group",
  "ungroup",
  "toggle-lock",
  "bring-front",
  "bring-forward",
  "send-backward",
  "send-back",
]);

export function createContextMenuController() {
  return {
    shouldShow: shouldShowContextMenu,
    isActionDisabled,
    getPosition: getContextMenuPosition,
  };
}

export function shouldShowContextMenu({ targetId, selectedIds = [], hasClipboard = false }) {
  return Boolean(targetId) || selectedIds.length > 0 || hasClipboard;
}

export function isActionDisabled(action, { selectedIds = [], hasClipboard = false } = {}) {
  const needsSelection = SELECTION_ACTIONS.has(action);
  const needsClipboard = action === "paste";
  const needsMultiple = action === "group";
  return (needsSelection && selectedIds.length === 0)
    || (needsMultiple && selectedIds.length < 2)
    || (needsClipboard && !hasClipboard);
}

export function getContextMenuPosition({
  clientX,
  clientY,
  menuBox,
  viewport,
  padding = 8,
}) {
  return {
    left: clamp(clientX, padding, viewport.width - menuBox.width - padding),
    top: clamp(clientY, padding, viewport.height - menuBox.height - padding),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
