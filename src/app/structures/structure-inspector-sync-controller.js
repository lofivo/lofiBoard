export function createStructureInspectorSyncController({
  root,
  graphStructureInput,
  treeStructureInput,
  getElements,
  getSelectedIds,
  getActiveElement = () => document.activeElement,
  structureInspectorController,
  exportGraph,
  exportTree,
  isLinearStructureElement,
}) {
  function getSelectedElements() {
    const selectedIds = getSelectedIds();
    return getElements().filter((element) => selectedIds.includes(element.id));
  }

  function getInspectorContext() {
    const selectedElements = getSelectedElements();
    if (selectedElements.length === 0) return "appearance";
    if (selectedElements.every((element) => isLinearStructureElement(element))) return "linear";
    if (selectedElements.every((element) => element.type === "graph-structure")) return "graph";
    if (selectedElements.every((element) => element.type === "tree-structure")) return "tree";
    return "appearance";
  }

  function syncTreeStructurePanelState() {
    if (!treeStructureInput) return;
    const element = getSelectedElements().find((item) => item.type === "tree-structure");
    if (getActiveElement() !== treeStructureInput) {
      treeStructureInput.value = element ? exportTree(element) : "";
    }
    root.dataset.treeKind = element?.settings?.treeKind === "binary" ? "binary" : "general";
  }

  function syncGraphStructurePanelState() {
    if (!graphStructureInput) return;
    const element = getSelectedElements().find((item) => item.type === "graph-structure");
    if (getActiveElement() !== graphStructureInput) {
      graphStructureInput.value = element ? exportGraph(element, "edge-list") : "";
      structureInspectorController.setGraphStructureDraft(graphStructureInput.value);
    }
  }

  return {
    getInspectorContext,
    syncGraphStructurePanelState,
    syncTreeStructurePanelState,
  };
}
