export function createAppPanelController({
  root,
  refs,
  menuStateController,
  structurePanelController,
  requestAnimationFrame: scheduleFrame = globalThis.requestAnimationFrame?.bind(globalThis) ?? ((callback) => callback()),
}) {
  const {
    mainMenu,
    menuButton,
    shapePopover,
    structurePanel,
    structureInput,
    linearInitPanel,
    structureInputLabel,
    arrayRandomFields,
    matrixRandomFields,
    zoomMenu,
    zoomButton,
  } = refs;

  function toggleMainMenu() {
    setMainMenuOpen(menuStateController.toggleMainMenu());
  }

  function closeMainMenu() {
    setMainMenuOpen(false);
  }

  function setMainMenuOpen(nextOpen) {
    const isOpen = menuStateController.setMainMenuOpen(nextOpen);
    mainMenu.hidden = !isOpen;
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.classList.toggle("active", isOpen);
  }

  function setShapePopoverOpen(nextOpen) {
    shapePopover.hidden = !nextOpen;
  }

  function setStructurePanelOpen(nextOpen) {
    structurePanel.hidden = !nextOpen;
    if (!nextOpen) return;
    hydrateStructurePanel({ resetInput: true });
    scheduleFrame(() => structureInput.focus());
  }

  function hydrateStructurePanel({ resetInput = false } = {}) {
    const {
      item,
      activeStructureType,
      activeArrayInitMode,
      showLinearInitPanel,
      showStructureInputLabel,
      showArrayRandomFields,
      showMatrixRandomFields,
    } = structurePanelController.getHydrateState();
    structureInput.placeholder = item.placeholder;
    if (resetInput) {
      structureInput.value = item.defaultInput;
    }
    linearInitPanel.hidden = !showLinearInitPanel;
    structureInputLabel.hidden = !showStructureInputLabel;
    arrayRandomFields.hidden = !showArrayRandomFields;
    matrixRandomFields.hidden = !showMatrixRandomFields;
    root.querySelectorAll("[data-structure-type]").forEach((button) => {
      button.classList.toggle("active", button.dataset.structureType === activeStructureType);
    });
    root.querySelectorAll("[data-array-init-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.arrayInitMode === activeArrayInitMode);
    });
  }

  function setActiveStructureType(type) {
    structurePanelController.setActiveStructureType(type);
    hydrateStructurePanel({ resetInput: true });
    structureInput.focus();
  }

  function toggleZoomMenu() {
    setZoomMenuOpen(menuStateController.toggleZoomMenu());
  }

  function setZoomMenuOpen(nextOpen) {
    const isOpen = menuStateController.setZoomMenuOpen(nextOpen);
    zoomMenu.hidden = !isOpen;
    zoomButton.setAttribute("aria-expanded", String(isOpen));
    zoomButton.classList.toggle("active", isOpen);
  }

  return {
    closeMainMenu,
    hydrateStructurePanel,
    setActiveStructureType,
    setMainMenuOpen,
    setShapePopoverOpen,
    setStructurePanelOpen,
    setZoomMenuOpen,
    toggleMainMenu,
    toggleZoomMenu,
  };
}
