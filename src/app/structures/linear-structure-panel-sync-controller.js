import { isLinearStructureElement } from "../../structures/structure-templates.js";

export function createLinearStructurePanelSyncController({
  getActiveElement = () => null,
  getElements,
  getSelectedIds,
  linearFieldInputs = {},
  linearValuesInput = null,
  linearValuesTitle = null,
  structureInspectorController,
  structureInteraction,
}) {
  function getSelectedLinearStructure() {
    const selected = new Set(getSelectedIds?.() ?? []);
    return (getElements?.() ?? []).find((element) => selected.has(element.id) && isLinearStructureElement(element)) ?? null;
  }

  function getLinearStructureDisplayName(type) {
    return {
      "array-structure": "数组",
      "stack-structure": "栈",
      "queue-structure": "队列",
      "deque-structure": "双端队列",
    }[type] ?? "线性";
  }

  function readLinearFieldNumber(fieldName, fallback = 0) {
    const raw = structureInspectorController.getLinearPanelState()[fieldName];
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : Math.max(0, fallback);
  }

  function getLinearIndexBase(element) {
    return Number(element?.settings?.indexBase) === 1 ? 1 : 0;
  }

  function toLinearDisplayIndex(element, index) {
    return Math.max(0, Number(index) || 0) + getLinearIndexBase(element);
  }

  function fromLinearDisplayIndex(element, index) {
    return Math.max(0, (Number(index) || 0) - getLinearIndexBase(element));
  }

  function readLinearDisplayIndexField(fieldName, element, fallback = 0) {
    return fromLinearDisplayIndex(element, readLinearFieldNumber(fieldName, toLinearDisplayIndex(element, fallback)));
  }

  function getActiveLinearIndex(element, fallback = 0) {
    return structureInteraction.getActiveLinearIndex(element, fallback);
  }

  function syncLinearPanelState() {
    const element = getSelectedLinearStructure();
    if (!element) {
      if (linearValuesTitle) {
        linearValuesTitle.textContent = "当前结构";
      }
      if (linearValuesInput && getActiveElement() !== linearValuesInput) {
        linearValuesInput.value = "";
        structureInspectorController.setLinearValuesDraft("");
      }
      applyLinearPanelState(structureInspectorController.getLinearPanelState());
      return;
    }

    if (linearValuesTitle) {
      linearValuesTitle.textContent = `当前${getLinearStructureDisplayName(element.type)}结构`;
    }
    if (linearValuesInput && getActiveElement() !== linearValuesInput) {
      linearValuesInput.value = (element.items ?? []).map((item) => item.value ?? "").join(",");
      structureInspectorController.setLinearValuesDraft(linearValuesInput.value);
    }

    const itemCount = element.items?.length ?? 0;
    const maxIndex = Math.max(0, itemCount - 1);
    const currentIndex = getActiveLinearIndex(element, 0);
    const markers = element.markers ?? {};
    const highlight = Array.isArray(markers.highlight) ? markers.highlight : [];
    const firstHighlight = highlight[0] ?? currentIndex;
    const lastHighlight = highlight.at(-1) ?? currentIndex;
    const pointer = Number.isInteger(markers.pointer)
      ? Math.min(maxIndex, Math.max(0, markers.pointer))
      : currentIndex;
    const linearPanelState = structureInspectorController.setLinearPanelState({
      highlightStart: String(toLinearDisplayIndex(element, Math.min(maxIndex, Math.max(0, firstHighlight)))),
      highlightEnd: String(toLinearDisplayIndex(element, Math.min(maxIndex, Math.max(0, lastHighlight)))),
      highlightPointer: String(toLinearDisplayIndex(element, pointer)),
    });
    applyLinearPanelState(linearPanelState);
  }

  function applyLinearPanelState(nextState) {
    Object.entries(linearFieldInputs).forEach(([key, input]) => {
      if (!input) return;
      const value = String(nextState[key] ?? "");
      if (input.value !== value) {
        input.value = value;
      }
    });
  }

  return {
    applyLinearPanelState,
    getActiveLinearIndex,
    getLinearStructureDisplayName,
    getSelectedLinearStructure,
    readLinearDisplayIndexField,
    syncLinearPanelState,
  };
}
