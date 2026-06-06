export function createMenuStateController({
  initialMainMenuOpen = false,
  initialZoomMenuOpen = false,
} = {}) {
  let mainMenuOpen = initialMainMenuOpen;
  let zoomMenuOpen = initialZoomMenuOpen;

  function isMainMenuOpen() {
    return mainMenuOpen;
  }

  function setMainMenuOpen(nextOpen) {
    mainMenuOpen = Boolean(nextOpen);
    return mainMenuOpen;
  }

  function toggleMainMenu() {
    return setMainMenuOpen(!mainMenuOpen);
  }

  function isZoomMenuOpen() {
    return zoomMenuOpen;
  }

  function setZoomMenuOpen(nextOpen) {
    zoomMenuOpen = Boolean(nextOpen);
    return zoomMenuOpen;
  }

  function toggleZoomMenu() {
    return setZoomMenuOpen(!zoomMenuOpen);
  }

  return {
    isMainMenuOpen,
    setMainMenuOpen,
    toggleMainMenu,
    isZoomMenuOpen,
    setZoomMenuOpen,
    toggleZoomMenu,
  };
}
