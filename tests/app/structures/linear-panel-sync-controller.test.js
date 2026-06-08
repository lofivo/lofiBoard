import { describe, expect, it, vi } from "vitest";
import { createStructureInteraction } from "../../../src/structures/structure-interaction.js";
import { createStructureInspectorController } from "../../../src/app/structures/inspector-controller.js";
import { createLinearStructurePanelSyncController } from "../../../src/app/structures/linear-panel-sync-controller.js";

function linearElement(overrides = {}) {
  return {
    id: "array_1",
    type: "array-structure",
    items: [
      { value: "A", index: 0 },
      { value: "B", index: 1 },
      { value: "C", index: 2 },
    ],
    settings: { indexBase: 0, showIndexes: true },
    ...overrides,
  };
}

function createInput(value = "") {
  return { value };
}

function createController({
  activeElement = null,
  elements = [linearElement()],
  selectedIds = ["array_1"],
  structureInteraction = createStructureInteraction(),
  structureInspectorController = createStructureInspectorController(),
} = {}) {
  const linearFieldInputs = {
    highlightStart: createInput(),
    highlightEnd: createInput(),
    highlightPointer: createInput(),
  };
  const linearValuesInput = createInput("stale");
  const linearValuesTitle = { textContent: "" };
  const controller = createLinearStructurePanelSyncController({
    getActiveElement: () => activeElement,
    getElements: () => elements,
    getSelectedIds: () => selectedIds,
    linearFieldInputs,
    linearValuesInput,
    linearValuesTitle,
    structureInspectorController,
    structureInteraction,
  });

  return {
    controller,
    linearFieldInputs,
    linearValuesInput,
    linearValuesTitle,
    structureInspectorController,
    structureInteraction,
  };
}

describe("linear-panel-sync-controller", () => {
  it("clears linear values when no linear structure is selected", () => {
    const { controller, linearFieldInputs, linearValuesInput, linearValuesTitle, structureInspectorController } = createController({
      elements: [],
      selectedIds: [],
    });

    controller.syncLinearPanelState();

    expect(linearValuesTitle.textContent).toBe("当前结构");
    expect(linearValuesInput.value).toBe("");
    expect(structureInspectorController.getLinearValuesDraft()).toBe("");
    expect(linearFieldInputs.highlightStart.value).toBe("0");
    expect(linearFieldInputs.highlightEnd.value).toBe("0");
    expect(linearFieldInputs.highlightPointer.value).toBe("0");
  });

  it("syncs selected linear structure values, display title, highlight fields and pointer", () => {
    const element = linearElement({
      markers: {
        highlight: [0, 2],
        pointer: 1,
      },
    });
    const { controller, linearFieldInputs, linearValuesInput, linearValuesTitle, structureInspectorController } = createController({
      elements: [element],
      selectedIds: [element.id],
    });

    controller.syncLinearPanelState();

    expect(linearValuesTitle.textContent).toBe("当前数组结构");
    expect(linearValuesInput.value).toBe("A,B,C");
    expect(structureInspectorController.getLinearValuesDraft()).toBe("A,B,C");
    expect(linearFieldInputs.highlightStart.value).toBe("0");
    expect(linearFieldInputs.highlightEnd.value).toBe("2");
    expect(linearFieldInputs.highlightPointer.value).toBe("1");
  });

  it("preserves a focused values input while still syncing numeric panel fields", () => {
    const linearValuesInput = createInput("user draft");
    const linearFieldInputs = {
      highlightStart: createInput(),
      highlightEnd: createInput(),
      highlightPointer: createInput(),
    };
    const structureInspectorController = createStructureInspectorController({ initialLinearValuesDraft: "user draft" });
    const controller = createLinearStructurePanelSyncController({
      getActiveElement: () => linearValuesInput,
      getElements: () => [linearElement({ items: [{ value: "A", index: 0 }] })],
      getSelectedIds: () => ["array_1"],
      linearFieldInputs,
      linearValuesInput,
      linearValuesTitle: { textContent: "" },
      structureInspectorController,
      structureInteraction: createStructureInteraction(),
    });

    controller.syncLinearPanelState();

    expect(linearValuesInput.value).toBe("user draft");
    expect(structureInspectorController.getLinearValuesDraft()).toBe("user draft");
    expect(linearFieldInputs.highlightPointer.value).toBe("0");
  });

  it("reads display indexes according to zero-based or one-based linear settings", () => {
    const element = linearElement({ settings: { indexBase: 1 } });
    const { controller, structureInspectorController, structureInteraction } = createController({
      elements: [element],
      selectedIds: [element.id],
      structureInteraction: createStructureInteraction(),
    });
    structureInteraction.setActiveLinearItem({ elements: [element], elementId: element.id, index: 1 });

    expect(controller.getActiveLinearIndex(element, 0)).toBe(1);

    structureInspectorController.setLinearPanelState({
      highlightStart: "2",
      highlightEnd: "3",
      highlightPointer: "bad",
    });

    expect(controller.readLinearDisplayIndexField("highlightStart", element, 0)).toBe(1);
    expect(controller.readLinearDisplayIndexField("highlightEnd", element, 0)).toBe(2);
    expect(controller.readLinearDisplayIndexField("highlightPointer", element, 1)).toBe(1);
  });

  it("applies linear panel fields without rewriting matching input values", () => {
    const { controller, linearFieldInputs } = createController();
    const setter = vi.fn();
    let highlightStartValue = "1";
    linearFieldInputs.highlightStart = {
      get value() {
        return highlightStartValue;
      },
      set value(nextValue) {
        setter(nextValue);
        highlightStartValue = nextValue;
      },
    };

    controller.applyLinearPanelState({
      highlightStart: "1",
      highlightEnd: "2",
      highlightPointer: "3",
    });

    expect(setter).not.toHaveBeenCalled();
    expect(linearFieldInputs.highlightEnd.value).toBe("2");
    expect(linearFieldInputs.highlightPointer.value).toBe("3");
  });
});
