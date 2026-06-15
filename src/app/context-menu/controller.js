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

const INPUT_ACTIONS = new Set(["select-all", "copy", "cut", "paste"]);
const defaultLocalClipboard = { text: "", hasText: false };

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
  activeElement,
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
  if (editableTarget && editableTarget === activeElement) {
    return { type: "input", target: editableTarget };
  }

  if (containsNode(stageContainer, target)) return { type: "canvas" };

  return { type: "ui" };
}

export function getInputContextMenuState(target) {
  const value = getEditableValue(target);
  const selectedText = getSelectedEditableText(target);
  const hasSelection = selectedText.length > 0;
  return {
    "select-all": value.length === 0,
    copy: !hasSelection,
    cut: !hasSelection,
    paste: false,
  };
}

export async function runInputContextAction(action, target, {
  clipboard = globalThis.navigator?.clipboard,
  documentTarget = globalThis.document,
  localClipboard = defaultLocalClipboard,
} = {}) {
  if (!INPUT_ACTIONS.has(action) || !target) return false;

  target.focus?.({ preventScroll: true });

  if (action === "select-all") {
    selectEditableText(target);
    return true;
  }

  if (action === "copy") {
    const selectedText = getSelectedEditableText(target);
    if (!selectedText) return false;
    return writeClipboardText(selectedText, clipboard, documentTarget, "copy", localClipboard);
  }

  if (action === "cut") {
    const selectedText = getSelectedEditableText(target);
    if (!selectedText) return false;
    const copied = await writeClipboardText(selectedText, clipboard, documentTarget, "copy", localClipboard);
    if (!copied) return false;
    replaceEditableSelection(target, "");
    dispatchInputEvent(target);
    return true;
  }

  if (action === "paste") {
    const text = await readClipboardText(clipboard, localClipboard);
    if (text == null) return false;
    replaceEditableSelection(target, text);
    dispatchInputEvent(target);
    return true;
  }

  return false;
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

function getEditableValue(target) {
  if (typeof target?.value === "string") return target.value;
  return target?.textContent ?? "";
}

function hasTextSelectionRange(target) {
  return typeof target?.selectionStart === "number" && typeof target?.selectionEnd === "number";
}

function getSelectedEditableText(target) {
  if (hasTextSelectionRange(target)) {
    const start = Math.min(target.selectionStart, target.selectionEnd);
    const end = Math.max(target.selectionStart, target.selectionEnd);
    return getEditableValue(target).slice(start, end);
  }
  const selection = target?.ownerDocument?.getSelection?.();
  return selection?.toString?.() ?? "";
}

function selectEditableText(target) {
  const value = getEditableValue(target);
  if (typeof target?.select === "function") {
    try {
      target.select();
    } catch {
      // Some browser/editor states reject select(); explicit ranges below are the fallback.
    }
  }
  if (hasTextSelectionRange(target)) {
    target.setSelectionRange?.(0, value.length);
    return;
  }
  target?.ownerDocument?.execCommand?.("selectAll");
}

function replaceEditableSelection(target, text) {
  if (hasTextSelectionRange(target)) {
    const start = Math.min(target.selectionStart, target.selectionEnd);
    const end = Math.max(target.selectionStart, target.selectionEnd);
    const value = getEditableValue(target);
    setEditableValue(target, `${value.slice(0, start)}${text}${value.slice(end)}`);
    const cursor = start + text.length;
    target.setSelectionRange?.(cursor, cursor);
    return;
  }
  target?.ownerDocument?.execCommand?.("insertText", false, text);
}

function setEditableValue(target, value) {
  if (typeof target?.value === "string") {
    target.value = value;
    return;
  }
  if (target) target.textContent = value;
}

function dispatchInputEvent(target) {
  const EventCtor = target?.ownerDocument?.defaultView?.Event ?? globalThis.Event;
  if (!EventCtor) return;
  target.dispatchEvent(new EventCtor("input", { bubbles: true }));
}

async function writeClipboardText(text, clipboard, documentTarget, fallbackCommand, localClipboard) {
  const localCopied = writeLocalClipboardText(localClipboard, text);
  try {
    if (clipboard?.writeText) {
      await clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard permission failures fall through to the browser command fallback.
  }
  try {
    return Boolean(documentTarget?.execCommand?.(fallbackCommand)) || localCopied;
  } catch {
    return localCopied;
  }
}

async function readClipboardText(clipboard, localClipboard) {
  try {
    if (clipboard?.readText) {
      const text = await clipboard.readText();
      if (text || !hasLocalClipboardText(localClipboard)) return text;
    }
  } catch {
    // Clipboard permission failures fall through to the local text fallback.
  }
  return readLocalClipboardText(localClipboard);
}

function writeLocalClipboardText(localClipboard, text) {
  if (!localClipboard || typeof text !== "string") return false;
  localClipboard.text = text;
  localClipboard.hasText = true;
  return true;
}

function hasLocalClipboardText(localClipboard) {
  return Boolean(localClipboard?.hasText || localClipboard?.text);
}

function readLocalClipboardText(localClipboard) {
  return hasLocalClipboardText(localClipboard) ? localClipboard.text : null;
}
