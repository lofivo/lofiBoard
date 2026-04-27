export function getNextPanelCollapsedState(state, panelName) {
  return {
    ...state,
    [panelName]: !state[panelName],
  };
}

export function shouldShowPanelEdgeToggle({ collapsed, available }) {
  return Boolean(collapsed && available);
}
