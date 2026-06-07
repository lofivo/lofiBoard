const DEFAULT_LINEAR_PANEL_STATE = Object.freeze({
  highlightStart: "0",
  highlightEnd: "0",
  highlightPointer: "0",
});

export function createStructureInspectorController({
  initialLinearPanelState = DEFAULT_LINEAR_PANEL_STATE,
  initialLinearValuesDraft = "",
  initialGraphStructureDraft = "",
} = {}) {
  let linearPanelState = { ...initialLinearPanelState };
  let linearValuesDraft = initialLinearValuesDraft;
  let graphStructureDraft = initialGraphStructureDraft;

  function getLinearPanelState() {
    return { ...linearPanelState };
  }

  function setLinearPanelState(patch) {
    linearPanelState = {
      ...linearPanelState,
      ...patch,
    };
    return getLinearPanelState();
  }

  function setLinearPanelField(fieldName, value) {
    return setLinearPanelState({ [fieldName]: value });
  }

  function getLinearValuesDraft() {
    return linearValuesDraft;
  }

  function setLinearValuesDraft(value) {
    linearValuesDraft = value;
    return linearValuesDraft;
  }

  function getGraphStructureDraft() {
    return graphStructureDraft;
  }

  function setGraphStructureDraft(value) {
    graphStructureDraft = value;
    return graphStructureDraft;
  }

  return {
    getLinearPanelState,
    setLinearPanelState,
    setLinearPanelField,
    getLinearValuesDraft,
    setLinearValuesDraft,
    getGraphStructureDraft,
    setGraphStructureDraft,
  };
}
