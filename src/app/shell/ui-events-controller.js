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
    const disposers = [];
    const bind = (target, type, listener, options) => {
      target.addEventListener(type, listener, options);
      disposers.push(() => target.removeEventListener(type, listener, options));
    };

    bind(windowTarget, "resize", () => {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
      updateGrid();
      syncTextOverlays();
    });

    bind(documentTarget, "selectstart", (event) => {
      if (isNativeTextEditingTarget(event.target)) return;
      event.preventDefault();
    }, { capture: true });

    bind(windowTarget, "wheel", (event) => {
      if (shouldPreventBrowserZoom(event)) {
        event.preventDefault();
      }
    }, { capture: true, passive: false });

    bind(windowTarget, "pointerdown", (event) => {
      if (!isMainMenuOpen()) return;
      if (closestElement(event.target, "[data-main-menu], [data-menu-trigger]")) return;
      closeMainMenu();
    });

    bind(windowTarget, "pointerdown", (event) => {
      if (isShapePopoverHidden()) return;
      if (closestElement(event.target, "[data-shape-popover], [data-tool='shape']")) return;
      setShapePopoverOpen(false);
    });

    bind(windowTarget, "pointerdown", (event) => {
      if (isStructurePanelHidden()) return;
      if (closestElement(event.target, "[data-structure-panel], [data-tool='structure']")) return;
      setStructurePanelOpen(false);
    });

    bind(windowTarget, "pointerdown", (event) => {
      if (!isZoomMenuOpen()) return;
      if (closestElement(event.target, "[data-zoom-menu], [data-zoom-trigger]")) return;
      setZoomMenuOpen(false);
    });

    bind(windowTarget, "pointerdown", (event) => {
      if (isContextMenuHidden()) return;
      if (closestElement(event.target, "[data-context-menu]")) return;
      hideContextMenu();
    });

    bind(windowTarget, "paste", handlePaste);
    bind(windowTarget, "beforeunload", persistCurrentDraft);
    bind(container, "dragover", handleImageDragOver);
    bind(container, "drop", handleImageDrop);

    return () => {
      while (disposers.length > 0) disposers.pop()();
    };
  }

  return { bindUiEvents };
}
