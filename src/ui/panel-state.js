export function getNextPanelCollapsedState(state, panelName) {
  return {
    ...state,
    [panelName]: !state[panelName],
  };
}

export function shouldShowPanelEdgeToggle({ collapsed, available }) {
  return Boolean(collapsed && available);
}

export function getPanelStateForLayerContent(state, hasLayers) {
  if (hasLayers || state.layers) return state;
  return {
    ...state,
    layers: true,
  };
}

export function isLayerPanelAvailable() {
  return true;
}
