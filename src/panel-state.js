export function getNextPanelCollapsedState(state, panelName) {
  return {
    ...state,
    [panelName]: !state[panelName],
  };
}
