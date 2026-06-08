import { beforeEach, describe, expect, it, vi } from "vitest";
import { createArrayAlgorithmSessionController } from "../../../../src/app/algorithms/array/session-controller.js";
import { DEFAULT_ARRAY_ALGORITHM_PANEL_STATE } from "../../../../src/app/algorithms/array/model.js";
import { createStructureInteraction } from "../../../../src/structures/interaction.js";

function createController(overrides = {}) {
  let elements = overrides.elements ?? [
    {
      id: "array_1",
      type: "array-structure",
      items: [
        { id: "item_1", value: "2" },
        { id: "item_2", value: "1" },
      ],
    },
  ];
  let selectedIds = overrides.selectedIds ?? ["array_1"];
  const structureInteraction = createStructureInteraction();
  const callbacks = {
    hideLinearItemControls: vi.fn(),
    pushHistory: vi.fn(),
    renderBoard: vi.fn(),
    selectIds: vi.fn((ids) => { selectedIds = ids; }),
    setStatus: vi.fn(),
    syncLinearItemActiveVisual: vi.fn(),
    updateChrome: vi.fn(),
  };
  const controller = createArrayAlgorithmSessionController({
    contentLayer: { findOne: vi.fn(() => null) },
    getElements: () => elements,
    setElements: (nextElements) => { elements = nextElements; },
    getSelectedIds: () => selectedIds,
    getSelectedLinearStructure: () => elements.find((element) => selectedIds.includes(element.id)),
    structureInteraction,
    findLinearItemNode: vi.fn(),
    konva: {
      Group: vi.fn(),
      Rect: vi.fn(),
      Text: vi.fn(),
      Tween: vi.fn(),
      Easings: { EaseInOut: vi.fn(), EaseOut: vi.fn(), EaseIn: vi.fn() },
    },
    windowRef: {
      setTimeout: vi.fn((callback) => {
        callback();
        return 1;
      }),
      clearTimeout: vi.fn(),
    },
    ...callbacks,
  });
  controller.setPanelBindings({
    getArrayAlgorithmSpeed: () => 1,
    syncArrayAlgorithmPanelState: vi.fn(),
  });
  return {
    callbacks,
    controller,
    getElements: () => elements,
    getSelectedIds: () => selectedIds,
    structureInteraction,
  };
}

describe("app algorithms array session-controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a selected array algorithm session and applies the first step", () => {
    const { callbacks, controller, structureInteraction } = createController();

    controller.startSelectedArrayAlgorithm();

    const session = structureInteraction.getArrayAlgorithmSession("array_1");
    expect(session.algorithmLabel).toBe("冒泡排序");
    expect(session.stepIndex).toBe(0);
    expect(callbacks.renderBoard).toHaveBeenCalled();
    expect(callbacks.selectIds).toHaveBeenLastCalledWith(["array_1"]);
  });

  it("keeps the selected algorithm label when stopping an unfinished session", () => {
    const { callbacks, controller, structureInteraction } = createController();

    controller.startSelectedArrayAlgorithm();
    controller.stopArrayAlgorithmSession();

    expect(structureInteraction.getArrayAlgorithmSession("array_1")).toBeNull();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已执行冒泡排序");
  });

  it("clears per-element session and panel state for removed arrays", () => {
    const { controller, structureInteraction } = createController();
    structureInteraction.setArrayAlgorithmPanelState("array_1", { speed: 2 }, DEFAULT_ARRAY_ALGORITHM_PANEL_STATE);

    controller.startSelectedArrayAlgorithm();
    controller.clearArrayAlgorithmSessionForRemovedIds(["array_1"]);

    expect(structureInteraction.getArrayAlgorithmSession("array_1")).toBeNull();
    expect(structureInteraction.getArrayAlgorithmPanelState("array_1", DEFAULT_ARRAY_ALGORITHM_PANEL_STATE))
      .toEqual(DEFAULT_ARRAY_ALGORITHM_PANEL_STATE);
  });
});
