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
  return true;
}

export function isActionDisabled(action, {
  selectedIds = [],
  hasClipboard = false,
  canUndo = false,
  canRedo = false,
} = {}) {
  const needsSelection = SELECTION_ACTIONS.has(action);
  const needsClipboard = action === "paste";
  const needsMultiple = action === "group";
  if (action === "undo") return !canUndo;
  if (action === "redo") return !canRedo;
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

export function getWhiteboardContextMenuRequest({
  target,
  appRoot,
  legacyRoot,
  stageContainer,
  isNativeTextEditingTarget = () => false,
} = {}) {
  if (!isNode(target)) return { type: "outside" };

  const customMenu = closestElement(target, "[data-react-context-menu], [data-context-menu]");
  if (customMenu) return { type: "menu" };

  const textEditorFrame = closestElement(target, ".text-editor-frame");
  const inAppRoot = containsNode(appRoot, target);
  const inLegacyRoot = containsNode(legacyRoot, target);
  if (!inAppRoot && !inLegacyRoot && !textEditorFrame) return { type: "outside" };

  const editableTarget = getEditableContextTarget(target, isNativeTextEditingTarget);
  if (editableTarget) return { type: "input", target: editableTarget };

  if (containsNode(stageContainer, target)) return { type: "canvas" };

  return { type: "ui" };
}

function getEditableContextTarget(target, isNativeTextEditingTarget) {
  if (isNativeTextEditingTarget(target)) return target;
  if (typeof Element !== "undefined" && target instanceof Element) {
    const editable = target.closest("input, textarea, [contenteditable='true']");
    if (editable && isNativeTextEditingTarget(editable)) return editable;
  }
  return null;
}

function isNode(value) {
  return typeof Node !== "undefined" && value instanceof Node;
}

function containsNode(parent, child) {
  return Boolean(parent && child && (parent === child || parent.contains?.(child)));
}

function closestElement(target, selector) {
  if (typeof Element !== "undefined" && target instanceof Element) return target.closest(selector);
  return target?.parentElement?.closest?.(selector) ?? null;
}
