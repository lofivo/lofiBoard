export function createUiEventsController({
  windowTarget = window,
  documentTarget = document,
  container,
  stage,
  closestElement,
  isNativeTextEditingTarget,
  shouldPreventBrowserZoom,
  isMainMenuOpen,
  isZoomMenuOpen,
  isShapePopoverHidden,
  isStructurePanelHidden,
  isContextMenuHidden,
  updateGrid,
  syncTextOverlays,
  closeMainMenu,
  setShapePopoverOpen,
  setStructurePanelOpen,
  setZoomMenuOpen,
  hideContextMenu,
  handlePaste,
  persistCurrentDraft,
  handleImageDragOver,
  handleImageDrop,
}) {
  function bindUiEvents() {
    windowTarget.addEventListener("resize", () => {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
      updateGrid();
      syncTextOverlays();
    });

    documentTarget.addEventListener("selectstart", (event) => {
      if (isNativeTextEditingTarget(event.target)) return;
      event.preventDefault();
    }, { capture: true });

    windowTarget.addEventListener("wheel", (event) => {
      if (shouldPreventBrowserZoom(event)) {
        event.preventDefault();
      }
    }, { capture: true, passive: false });

    windowTarget.addEventListener("pointerdown", (event) => {
      if (!isMainMenuOpen()) return;
      if (closestElement(event.target, "[data-main-menu], [data-menu-trigger]")) return;
      closeMainMenu();
    });

    windowTarget.addEventListener("pointerdown", (event) => {
      if (isShapePopoverHidden()) return;
      if (closestElement(event.target, "[data-shape-popover], [data-tool='shape']")) return;
      setShapePopoverOpen(false);
    });

    windowTarget.addEventListener("pointerdown", (event) => {
      if (isStructurePanelHidden()) return;
      if (closestElement(event.target, "[data-structure-panel], [data-tool='structure']")) return;
      setStructurePanelOpen(false);
    });

    windowTarget.addEventListener("pointerdown", (event) => {
      if (!isZoomMenuOpen()) return;
      if (closestElement(event.target, "[data-zoom-menu], [data-zoom-trigger]")) return;
      setZoomMenuOpen(false);
    });

    windowTarget.addEventListener("pointerdown", (event) => {
      if (isContextMenuHidden()) return;
      if (closestElement(event.target, "[data-context-menu]")) return;
      hideContextMenu();
    });

    windowTarget.addEventListener("paste", handlePaste);
    windowTarget.addEventListener("beforeunload", persistCurrentDraft);
    container.addEventListener("dragover", handleImageDragOver);
    container.addEventListener("drop", handleImageDrop);
  }

  return { bindUiEvents };
}
