import { describe, expect, it, vi } from "vitest";
import { createArrayAlgorithmPanelController } from "../../src/app/algorithms/array-algorithm-panel-controller.js";
import { DEFAULT_ARRAY_ALGORITHM_PANEL_STATE } from "../../src/app/algorithms/array-algorithm-model.js";

function createButton(action) {
  return {
    dataset: { action },
    disabled: false,
    textContent: "",
  };
}

function createInput(value = "") {
  const listeners = new Map();
  return {
    value,
    disabled: false,
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}

function createController(overrides = {}) {
  const buttons = {
    start: createButton("array-algorithm-start"),
    prev: createButton("array-algorithm-prev"),
    next: createButton("array-algorithm-next"),
    play: createButton("array-algorithm-play"),
    reset: createButton("array-algorithm-reset"),
    stop: createButton("array-algorithm-stop"),
  };
  const root = {
    dataset: {},
    querySelector: vi.fn((selector) => {
      const action = selector.match(/\[data-action='(.+)'\]/)?.[1];
      return Object.values(buttons).find((button) => button.dataset.action === action) ?? null;
    }),
  };
  const arrayAlgorithmSelect = createInput("selection-sort");
  const arrayAlgorithmSpeed = createInput("2");
  const arrayAlgorithmStatus = { textContent: "", dataset: {} };
  const state = {
    selected: overrides.selected ?? null,
    session: overrides.session ?? null,
    panelState: overrides.panelState ?? DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  };
  const setArrayAlgorithmPanelState = vi.fn((elementId, patch) => {
    state.panelState = { ...state.panelState, ...patch };
  });
  const setArrayAlgorithmSession = vi.fn((session) => {
    state.session = session;
  });
  const controller = createArrayAlgorithmPanelController({
    root,
    arrayAlgorithmSelect,
    arrayAlgorithmSpeed,
    arrayAlgorithmStatus,
    getSelectedLinearStructure: () => state.selected,
    getSelectedArrayAlgorithmSession: () => state.session,
    getArrayAlgorithmPanelState: () => state.panelState,
    setArrayAlgorithmPanelState,
    setArrayAlgorithmSession,
    getArrayAlgorithmLastStepIndex: (session) => Math.max(0, (session?.steps?.length ?? 1) - 1),
    defaultPanelState: DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  });

  return {
    arrayAlgorithmSelect,
    arrayAlgorithmSpeed,
    arrayAlgorithmStatus,
    buttons,
    controller,
    root,
    setArrayAlgorithmPanelState,
    setArrayAlgorithmSession,
    state,
  };
}

describe("array-algorithm-panel-controller", () => {
  it("clamps the panel speed input", () => {
    const { arrayAlgorithmSpeed, controller } = createController();

    arrayAlgorithmSpeed.value = "99";
    expect(controller.getArrayAlgorithmSpeed()).toBe(3);

    arrayAlgorithmSpeed.value = "0.1";
    expect(controller.getArrayAlgorithmSpeed()).toBe(0.5);

    arrayAlgorithmSpeed.value = "bad";
    expect(controller.getArrayAlgorithmSpeed()).toBe(1);
  });

  it("binds algorithm panel inputs to per-element panel state", () => {
    const { arrayAlgorithmSelect, arrayAlgorithmSpeed, controller, setArrayAlgorithmPanelState, setArrayAlgorithmSession, state } = createController({
      selected: { id: "array_1", type: "array-structure" },
      session: { elementId: "array_1", speed: 1, steps: [{}, {}] },
    });

    controller.bindArrayAlgorithmPanelEvents();
    arrayAlgorithmSpeed.value = "2.5";
    arrayAlgorithmSpeed.dispatch("input");
    expect(setArrayAlgorithmPanelState).toHaveBeenCalledWith("array_1", { speed: 2.5 });
    expect(setArrayAlgorithmSession).toHaveBeenCalledWith(expect.objectContaining({ speed: 2.5 }));

    arrayAlgorithmSelect.value = "insertion-sort";
    arrayAlgorithmSelect.dispatch("change");
    expect(setArrayAlgorithmPanelState).toHaveBeenCalledWith("array_1", { algorithm: "insertion-sort" });
    expect(state.panelState.algorithm).toBe("insertion-sort");
  });

  it("shows an empty-selection status and disables controls", () => {
    const { arrayAlgorithmStatus, buttons, controller, root } = createController();

    controller.syncArrayAlgorithmPanelState();

    expect(root.dataset.arrayAlgorithmActive).toBe("false");
    expect(arrayAlgorithmStatus.textContent).toBe("选择数组后开始演示");
    expect(Object.values(buttons).every((button) => button.disabled)).toBe(true);
  });

  it("syncs selected array controls from panel state before a session starts", () => {
    const { arrayAlgorithmSelect, arrayAlgorithmSpeed, arrayAlgorithmStatus, buttons, controller } = createController({
      selected: { id: "array_1", type: "array-structure" },
      panelState: { algorithm: "selection-sort", speed: 2 },
    });

    controller.syncArrayAlgorithmPanelState();

    expect(arrayAlgorithmSelect.value).toBe("selection-sort");
    expect(arrayAlgorithmSelect.disabled).toBe(false);
    expect(arrayAlgorithmSpeed.value).toBe("2");
    expect(arrayAlgorithmStatus.textContent).toBe("选择排序算法后点击开始");
    expect(buttons.start.disabled).toBe(false);
    expect(buttons.prev.disabled).toBe(true);
    expect(buttons.stop.disabled).toBe(true);
  });

  it("syncs active session progress and play button state", () => {
    const { arrayAlgorithmStatus, buttons, controller, root } = createController({
      selected: { id: "array_1", type: "array-structure" },
      session: {
        elementId: "array_1",
        stepIndex: 1,
        speed: 1,
        isPlaying: true,
        steps: [{ message: "开始" }, { message: "比较" }, { message: "完成" }],
      },
    });

    controller.syncArrayAlgorithmPanelState();

    expect(root.dataset.arrayAlgorithmActive).toBe("true");
    expect(arrayAlgorithmStatus.textContent).toBe("2 / 3：比较");
    expect(buttons.play.textContent).toBe("暂停");
    expect(buttons.prev.disabled).toBe(false);
    expect(buttons.next.disabled).toBe(false);
  });
});
