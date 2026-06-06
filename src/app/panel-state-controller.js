import { getNextPanelCollapsedState, getPanelStateForLayerContent } from "../ui/panel-state.js";

const DEFAULT_INSPECTOR_CONTEXT = "appearance";
const INSPECTOR_SECTIONS = Object.freeze(["appearance", "linear", "graph", "tree"]);

export function createPanelStateController({
  initialPanelCollapsedState = { style: false, layers: true },
  initialInspectorContext = DEFAULT_INSPECTOR_CONTEXT,
} = {}) {
  let panelCollapsedState = { ...initialPanelCollapsedState };
  let activeInspectorContext = initialInspectorContext;
  let inspectorSectionsState = getDefaultInspectorSections(activeInspectorContext);

  function getPanelCollapsedState() {
    return { ...panelCollapsedState };
  }

  function togglePanel(panelName) {
    panelCollapsedState = getNextPanelCollapsedState(panelCollapsedState, panelName);
    return getPanelCollapsedState();
  }

  function setPanelCollapsedStateForLayerContent(hasLayerContent) {
    panelCollapsedState = getPanelStateForLayerContent(panelCollapsedState, hasLayerContent);
    return getPanelCollapsedState();
  }

  function getInspectorContext() {
    return activeInspectorContext;
  }

  function getInspectorSectionsState() {
    return { ...inspectorSectionsState };
  }

  function getVisibleInspectorSections(context = activeInspectorContext) {
    return getDefaultInspectorSections(context);
  }

  function syncInspectorContext(nextContext, { forceReset = false } = {}) {
    const shouldResetScroll = forceReset || nextContext !== activeInspectorContext;
    if (shouldResetScroll) {
      activeInspectorContext = nextContext;
      inspectorSectionsState = getDefaultInspectorSections(nextContext);
    }
    return {
      context: activeInspectorContext,
      sections: getInspectorSectionsState(),
      shouldResetScroll,
    };
  }

  function toggleInspectorSection(sectionName) {
    inspectorSectionsState = {
      ...inspectorSectionsState,
      [sectionName]: !inspectorSectionsState[sectionName],
    };
    return getInspectorSectionsState();
  }

  return {
    getPanelCollapsedState,
    togglePanel,
    setPanelCollapsedStateForLayerContent,
    getInspectorContext,
    getInspectorSectionsState,
    getVisibleInspectorSections,
    syncInspectorContext,
    toggleInspectorSection,
  };
}

export function getDefaultInspectorSections(context) {
  return Object.fromEntries(
    INSPECTOR_SECTIONS.map((section) => [section, section === context]),
  );
}
