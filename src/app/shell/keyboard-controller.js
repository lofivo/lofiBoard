import { TOOLS } from "../../ui/config.js";

export function createKeyboardController({
  windowTarget = window,
  getCurrentTool,
  getSelectedIds,
  getIsSpaceDown,
  setIsSpaceDown,
  getStageContainer,
  isTypingInEditableControl,
  shouldSelectAll,
  shouldUseBrowserSelectAll,
  clearNativeSelection,
  selectAllElements,
  updateDraggableState,
  hideToolCursors,
  copySelection,
  cutSelection,
  saveBoardFile,
  saveBoardFileAs,
  openBoardFile,
  undoHistory,
  redoHistory,
  deleteSelection,
  closeMainMenu,
  setShapePopoverOpen,
  setStructurePanelOpen,
  setZoomMenuOpen,
  hideContextMenu,
  setTool,
  clearSelection,
  setActiveShapeTool,
}) {
  function bindKeyboard() {
    windowTarget.addEventListener("keydown", handleKeyDown, { capture: true });
    windowTarget.addEventListener("keyup", handleKeyUp, { capture: true });
  }

  function handleKeyDown(event) {
    if (shouldSelectAll(event)) {
      if (shouldUseBrowserSelectAll(event)) return;
      event.preventDefault();
      event.stopPropagation();
      clearNativeSelection();
      selectAllElements();
      clearNativeSelection();
      return;
    }

    if (isTypingInEditableControl(event.target)) return;

    if (event.code === "Space") {
      setIsSpaceDown(true);
      getStageContainer().classList.add("is-pan-ready");
      updateDraggableState();
      hideToolCursors();
      event.preventDefault();
    }

    const key = event.key.toLowerCase();
    const isModifierShortcut = event.ctrlKey || event.metaKey;

    if (isModifierShortcut && key === "c") {
      event.preventDefault();
      event.stopPropagation();
      copySelection();
      return;
    }

    if (isModifierShortcut && key === "x") {
      event.preventDefault();
      event.stopPropagation();
      cutSelection();
      return;
    }

    if (isModifierShortcut && key === "v") {
      event.stopPropagation();
      return;
    }

    if (isModifierShortcut && key === "s") {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        saveBoardFileAs();
      } else {
        saveBoardFile();
      }
      return;
    }

    if (isModifierShortcut && key === "o") {
      event.preventDefault();
      event.stopPropagation();
      openBoardFile();
      return;
    }

    if (isModifierShortcut && key === "z") {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        redoHistory();
      } else {
        undoHistory();
      }
      return;
    }

    if (isModifierShortcut && key === "y") {
      event.preventDefault();
      event.stopPropagation();
      redoHistory();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      if (getSelectedIds().length > 0) {
        event.preventDefault();
        event.stopPropagation();
      }
      deleteSelection();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMainMenu();
      setShapePopoverOpen(false);
      setStructurePanelOpen(false);
      setZoomMenuOpen(false);
      hideContextMenu();
      if (getCurrentTool() !== TOOLS.SELECT) {
        setTool(TOOLS.SELECT);
      } else {
        clearSelection();
      }
      return;
    }

    const shortcutMap = {
      v: TOOLS.SELECT,
      b: TOOLS.PEN,
      e: TOOLS.ERASER_STROKE,
      o: TOOLS.ERASER_OBJECT,
      t: TOOLS.TEXT,
      n: TOOLS.STICKY,
      h: TOOLS.PAN,
      s: TOOLS.STRUCTURE,
      r: TOOLS.SHAPE,
      l: TOOLS.SHAPE,
      a: TOOLS.SHAPE,
    };

    if (!event.ctrlKey && !event.metaKey && shortcutMap[key]) {
      if (key === "r") setActiveShapeTool(TOOLS.RECT);
      if (key === "l") setActiveShapeTool(TOOLS.LINE);
      if (key === "a") setActiveShapeTool(TOOLS.ARROW);
      setTool(shortcutMap[key]);
    }
  }

  function handleKeyUp(event) {
    if (event.code === "Space") {
      setIsSpaceDown(false);
      getStageContainer().classList.remove("is-pan-ready", "is-panning");
      updateDraggableState();
    }
  }

  return {
    bindKeyboard,
    handleKeyDown,
    handleKeyUp,
  };
}
