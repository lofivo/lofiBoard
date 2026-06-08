export function createPanelDomController({
  root,
  stylePanel,
  layerPanel,
  panelBody,
  panelStateController,
  getInspectorContext,
  getStylePanelAvailable,
  getLayerPanelAvailable,
  shouldShowPanelEdgeToggle,
}) {
  function togglePanel(panelName) {
    panelStateController.togglePanel(panelName);
    applyPanelState();
  }

  function applyPanelState() {
    const panelCollapsedState = panelStateController.getPanelCollapsedState();
    stylePanel.classList.toggle("is-collapsed", panelCollapsedState.style);
    layerPanel.classList.toggle("is-collapsed", panelCollapsedState.layers);
    root.querySelector("[data-panel-toggle='style']").textContent = panelCollapsedState.style ? "›" : "‹";
    root.querySelector("[data-panel-toggle='layers']").textContent = panelCollapsedState.layers ? "‹" : "›";
    root.querySelector("[data-panel-edge='style']").classList.toggle(
      "is-visible",
      shouldShowPanelEdgeToggle({
        collapsed: panelCollapsedState.style,
        available: getStylePanelAvailable(),
      }),
    );
    root.querySelector("[data-panel-edge='layers']").classList.toggle(
      "is-visible",
      shouldShowPanelEdgeToggle({
        collapsed: panelCollapsedState.layers,
        available: getLayerPanelAvailable(),
      }),
    );
  }

  function applyInspectorSectionState() {
    const activeInspectorContext = panelStateController.getInspectorContext();
    const visibleSections = panelStateController.getVisibleInspectorSections(activeInspectorContext);
    const inspectorSectionsState = panelStateController.getInspectorSectionsState();
    root.querySelectorAll("[data-inspector-section]").forEach((section) => {
      const key = section.dataset.inspectorSection;
      const isVisible = Boolean(visibleSections[key]);
      const expanded = isVisible && Boolean(inspectorSectionsState[key]);
      section.hidden = !isVisible;
      section.dataset.collapsed = expanded ? "false" : "true";
      const button = section.querySelector("[data-section-toggle]");
      const content = section.querySelector("[data-section-content]");
      button?.setAttribute("aria-expanded", String(expanded));
      content?.setAttribute("aria-hidden", String(!expanded));
    });
  }

  function syncInspectorPanelState({ forceReset = false } = {}) {
    const nextContext = getInspectorContext();
    const { shouldResetScroll } = panelStateController.syncInspectorContext(nextContext, { forceReset });
    applyInspectorSectionState();
    if (shouldResetScroll) {
      panelBody?.scrollTo?.(0, 0);
    }
  }

  return {
    applyInspectorSectionState,
    applyPanelState,
    syncInspectorPanelState,
    togglePanel,
  };
}
