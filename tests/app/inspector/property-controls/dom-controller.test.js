import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROPERTY_CONTROLS,
  createPropertyControlsController,
} from "../../../../src/app/inspector/property-controls/controller.js";
import { createPropertyControlsDomController } from "../../../../src/app/inspector/property-controls/dom-controller.js";
import { canPersistToolPropertyControls } from "../../../../src/app/inspector/model.js";
import { TOOLS } from "../../../../src/ui/config.js";

function createInput(value = "", checked = false) {
  const listeners = new Map();
  return {
    value,
    checked,
    type: "text",
    dataset: {},
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    dispatchEvent: vi.fn(),
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}

function createButton(dataset = {}) {
  const listeners = new Map();
  const activeClasses = new Set();
  const attributes = {};
  return {
    dataset,
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    classList: {
      toggle: vi.fn((name, active) => {
        if (active) activeClasses.add(name);
        else activeClasses.delete(name);
      }),
      contains: vi.fn((name) => activeClasses.has(name)),
    },
    click() {
      listeners.get("click")?.();
    },
    getAttribute: vi.fn((name) => attributes[name] ?? null),
    setAttribute: vi.fn((name, value) => { attributes[name] = String(value); }),
  };
}

function createRoot() {
  const nodes = {
    brushColors: [
      createButton({ brushColor: "#111827" }),
      createButton({ brushColor: "#ef4444" }),
    ],
    customColorControls: [createButton()],
    styleOptions: [
      createButton({ brushStyleOption: "solid" }),
      createButton({ brushStyleOption: "dash" }),
    ],
    capOptions: [
      createButton({ brushCapOption: "round" }),
      createButton({ brushCapOption: "square" }),
    ],
    arrowInputs: [createInput("", false)],
    fillTransparentInputs: [createInput("", false)],
    fontSizeInputs: [createInput()],
    fontFamilyInputs: [createInput()],
    textColorInputs: [createInput()],
    fillInputs: [createInput()],
    coordinateInputs: [
      { ...createInput(), dataset: { uiControl: "coordinate-unit-size" } },
      { ...createInput("", false), type: "checkbox", dataset: { uiControl: "coordinate-show-grid" } },
    ],
    textStyleButtons: [
      createButton({ textStyle: "bold" }),
      createButton({ textStyle: "underline" }),
    ],
    uiControls: [
      { ...createInput("#f97316"), dataset: { uiControl: "fill" } },
      { ...createInput("18"), dataset: { uiControl: "width" } },
    ],
    textColorButtons: [createButton({ brushTextColor: "#0ea5e9" })],
    shapeFillButtons: [createButton({ shapeFillColor: "#fef08a" })],
    widthStepButtons: [createButton({ brushWidthStep: "2" })],
    smoothingButtons: [createButton({ brushSmoothing: "80" })],
  };
  const masters = {
    "coordinate-unit-size": createInput("48"),
    "coordinate-show-grid": { ...createInput("", true), type: "checkbox" },
  };
  const root = {
    dataset: {},
    nodes,
    querySelector: vi.fn((selector) => {
      const match = selector.match(/\[data-control="(.+)"\]/);
      return match ? masters[match[1]] ?? null : null;
    }),
    querySelectorAll: vi.fn((selector) => {
      if (selector === "[data-brush-color]") return nodes.brushColors;
      if (selector === ".brush-custom-color") return nodes.customColorControls;
      if (selector === "[data-brush-style-option]") return nodes.styleOptions;
      if (selector === "[data-brush-cap-option]") return nodes.capOptions;
      if (selector === "[data-ui-control='arrow-double-ended']") return nodes.arrowInputs;
      if (selector === "[data-ui-control='fill-transparent']") return nodes.fillTransparentInputs;
      if (selector === "[data-ui-control='font-size'], [data-ui-control='sticky-font-size']") return nodes.fontSizeInputs;
      if (selector === "[data-ui-control='font-family'], [data-ui-control='sticky-font-family']") return nodes.fontFamilyInputs;
      if (selector === "[data-ui-control='text-color']") return nodes.textColorInputs;
      if (selector === "[data-ui-control='fill']") return nodes.fillInputs;
      if (selector === "[data-ui-control^='coordinate-']") return nodes.coordinateInputs;
      if (selector === "[data-text-style]") return nodes.textStyleButtons;
      const textStyleMatch = selector.match(/^\[data-text-style="(.+)"\]$/);
      if (textStyleMatch) return nodes.textStyleButtons.filter((button) => button.dataset.textStyle === textStyleMatch[1]);
      if (selector === "[data-ui-control]") return nodes.uiControls;
      if (selector === "[data-brush-text-color]") return nodes.textColorButtons;
      if (selector === "[data-shape-fill-color]") return nodes.shapeFillButtons;
      if (selector === "[data-brush-width-step]") return nodes.widthStepButtons;
      if (selector === "[data-brush-smoothing]") return nodes.smoothingButtons;
      return [];
    }),
  };
  return { root, nodes, masters };
}

function createController(overrides = {}) {
  const { root, nodes, masters } = createRoot();
  const brushPreviewPath = {
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  };
  const refs = {
    colorInput: createInput("#111827"),
    fillInput: createInput("#ffffff"),
    fillTransparentInput: createInput("", true),
    widthInput: createInput("6"),
    brushOpacityInput: createInput("100"),
    brushSmoothingInput: createInput("45"),
    brushCapInput: createInput("round"),
    brushStyleInput: createInput("solid"),
    arrowDoubleEndedInput: createInput("", false),
    coordinateUnitSizeInput: createInput("40"),
    coordinateShowGridInput: createInput("", true),
    coordinateShowTicksInput: createInput("", true),
    coordinateShowLabelsInput: createInput("", true),
    coordinateGridColorInput: createInput("#e5e7eb"),
    coordinateAxisColorInput: createInput("#111827"),
    coordinateLabelColorInput: createInput("#64748b"),
    brushCustomColorInput: createInput("#111827"),
    brushWidthSlider: createInput("6"),
    brushWidthValue: { textContent: "" },
    brushOpacityValue: { textContent: "" },
    brushPreviewPath,
    fontSizeInput: createInput("28"),
    fontFamilyInput: createInput("Inter"),
  };
  masters.color = refs.colorInput;
  masters.fill = refs.fillInput;
  masters.width = refs.widthInput;
  const propertyControlsController = createPropertyControlsController();
  const callbacks = {
    onApplyCoordinateStyleToSelection: overrides.onApplyCoordinateStyleToSelection ?? vi.fn(),
    onApplyStyleToSelection: overrides.onApplyStyleToSelection ?? vi.fn(),
    onBrushCursorStyleChange: overrides.onBrushCursorStyleChange ?? vi.fn(),
    onToggleTextStyle: overrides.onToggleTextStyle ?? vi.fn(),
  };
  const controller = createPropertyControlsDomController({
    root,
    refs,
    propertyControlsController,
    getCurrentTool: overrides.getCurrentTool ?? (() => TOOLS.PEN),
    getSelectedIds: overrides.getSelectedIds ?? (() => []),
    canPersistToolPropertyControls: overrides.canPersistToolPropertyControls ?? (() => true),
    ...callbacks,
  });
  return {
    brushPreviewPath,
    callbacks,
    controller,
    nodes,
    propertyControlsController,
    refs,
    root,
    masters,
  };
}

describe("app inspector property-controls dom-controller", () => {
  it("captures and reapplies property control snapshots", () => {
    const { controller, refs } = createController();
    controller.setControl("color", "#ef4444", { silent: true });
    controller.setControl("width", "12", { silent: true });
    controller.setControl("fill-transparent", null, { checked: false, silent: true });

    const snapshot = controller.capturePropertyControls();
    expect(snapshot).toMatchObject({
      color: "#ef4444",
      width: "12",
      fillTransparent: false,
      fontStyle: "normal",
      textDecoration: "",
    });

    controller.applyPropertyControlsSnapshot({
      ...DEFAULT_PROPERTY_CONTROLS,
      color: "#2563eb",
      width: "10",
      brushOpacity: "80",
    });
    expect(controller.getControlValues()).toMatchObject({
      color: "#2563eb",
      width: "10",
      brushOpacity: "80",
    });
  });

  it("saves and restores tool property controls only without active selection", () => {
    const { controller, propertyControlsController, refs } = createController();
    controller.setControl("color", "#ef4444", { silent: true });
    controller.saveToolPropertyControlsForCurrentTool();

    controller.setControl("color", "#111827", { silent: true });
    controller.restorePropertyControlsForTool(TOOLS.PEN);
    expect(controller.getControlValues().color).toBe("#ef4444");
    expect(propertyControlsController.getToolControls(TOOLS.PEN).color).toBe("#ef4444");

    const blocked = createController({ getSelectedIds: () => ["element_1"] });
    blocked.controller.setControl("color", "#22c55e", { silent: true });
    blocked.controller.saveToolPropertyControlsForCurrentTool();
    expect(blocked.propertyControlsController.getToolControls(TOOLS.PEN)).toBeNull();
  });

  it("preserves text tool controls when switching away and back", () => {
    let currentTool = TOOLS.TEXT;
    const { controller, refs } = createController({
      getCurrentTool: () => currentTool,
      canPersistToolPropertyControls,
    });

    controller.setControl("color", "#2563eb", { silent: true });
    controller.setControl("font-size", "42", { silent: true });
    controller.setControl("font-family", "Georgia, serif", { silent: true });
    controller.saveToolPropertyControlsForCurrentTool();

    currentTool = TOOLS.PEN;
    controller.restorePropertyControlsForTool(currentTool);
    currentTool = TOOLS.TEXT;
    controller.restorePropertyControlsForTool(currentTool);

    expect(controller.getControlValues()).toMatchObject({
      color: "#2563eb",
      fontSize: "42",
      fontFamily: "Georgia, serif",
    });
  });

  it("preserves text style presets when switching away and back", () => {
    let currentTool = TOOLS.TEXT;
    const { controller } = createController({
      getCurrentTool: () => currentTool,
      canPersistToolPropertyControls,
    });

    controller.toggleTextStyle("bold");
    expect(controller.capturePropertyControls().fontStyle).toBe("bold");

    currentTool = TOOLS.PEN;
    controller.restorePropertyControlsForTool(currentTool);
    expect(controller.capturePropertyControls().fontStyle).toBe("normal");

    currentTool = TOOLS.TEXT;
    controller.restorePropertyControlsForTool(currentTool);

    expect(controller.capturePropertyControls().fontStyle).toBe("bold");
  });

  it("hydrates brush controls and exposes stroke style values", () => {
    const { controller, refs } = createController();

    controller.hydrateBrushControlsFromElement({
      opacity: 0.42,
      smoothing: 0.2,
      lineCap: "square",
      brushStyle: "dot",
    });

    expect(controller.getControlValues()).toMatchObject({
      brushOpacity: "42",
      brushSmoothing: "20",
      brushCap: "square",
      brushStyle: "dot",
    });
    expect(controller.getStrokeStyleFromControls()).toMatchObject({
      stroke: "#111827",
      strokeWidth: 6,
      opacity: 0.42,
      lineCap: "square",
      brushStyle: "dot",
      smoothing: 0.2,
    });
    expect(controller.getBrushInputSmoothingValue()).toBe(0.2);
  });

  it("hydrates shared controls from the selected element", () => {
    const { controller } = createController();

    controller.hydrateControlsFromElement({
      type: "arrow",
      stroke: "#2563eb",
      fill: "transparent",
      strokeWidth: 5,
      opacity: 0.65,
      smoothing: 0.3,
      lineCap: "square",
      brushStyle: "dash",
      pointerAtBeginning: true,
      fontSize: 24,
      fontFamily: "Inter",
      fontStyle: "bold",
      textDecoration: "underline",
    });

    expect(controller.getControlValues()).toMatchObject({
      color: "#2563eb",
      fillTransparent: true,
      width: "5",
      brushOpacity: "65",
      brushSmoothing: "30",
      brushCap: "square",
      brushStyle: "dash",
      arrowDoubleEnded: true,
      fontSize: "24",
      fontFamily: "Inter",
    });
    expect(controller.capturePropertyControls()).toMatchObject({
      fontStyle: "bold",
      textDecoration: "underline",
    });
  });

  it("hydrates coordinate controls from the selected coordinate plane", () => {
    const { controller } = createController();

    controller.hydrateControlsFromElement({
      type: "coordinate-plane",
      unitSize: 4,
      settings: {
        showGrid: false,
        showTicks: true,
        showLabels: false,
      },
      style: {
        gridStroke: "#94a3b8",
        axisStroke: "#0f172a",
        labelFill: "#475569",
      },
      functions: ["sin(x)", "x^2"],
    });

    expect(controller.getControlValues()).toMatchObject({
      coordinateUnitSize: "8",
      coordinateShowGrid: false,
      coordinateShowTicks: true,
      coordinateShowLabels: false,
      coordinateGridColor: "#94a3b8",
      coordinateAxisColor: "#0f172a",
      coordinateLabelColor: "#475569",
      coordinateFunctions: "sin(x)\nx^2",
    });
  });

  // 属性值的真相在 JS store 里,不在隐藏 input 上。绕过 setControl 直接改 DOM
  // 不应影响引擎读到的值 —— 这条守住以后才能把那批 input 从模板里删掉。
  // setControl 是 React 写属性的入口。它和 bindPropertyControlEvents 共用同一张
  // 副作用表,所以两条路径行为必须一致,不能靠 React 侧再合成 input/change 事件。
  it("setControl 写主控件并跑与 DOM 事件相同的副作用", () => {
    const { callbacks, controller, refs } = createController();
    controller.bindPropertyControlEvents();

    controller.setControl("color", "#ef4444");

    expect(controller.getControlValues().color).toBe("#ef4444");
    expect(callbacks.onApplyStyleToSelection).toHaveBeenCalled();
    expect(callbacks.onBrushCursorStyleChange).toHaveBeenCalled();
  });

  it("setControl 写 checkbox 主控件并同步镜像控件", () => {
    const { callbacks, controller, nodes, refs } = createController();
    controller.bindPropertyControlEvents();

    controller.setControl("fill-transparent", null, { checked: false });

    expect(controller.getControlValues().fillTransparent).toBe(false);
    expect(callbacks.onApplyStyleToSelection).toHaveBeenCalled();
  });

  it("setControl 的 silent 只写值不跑副作用", () => {
    const { callbacks, controller, refs } = createController();
    controller.bindPropertyControlEvents();

    controller.setControl("fill", "#22c55e", { silent: true });

    expect(controller.getControlValues().fill).toBe("#22c55e");
    expect(callbacks.onApplyStyleToSelection).not.toHaveBeenCalled();
  });

  it("setControl 忽略未知控件名", () => {
    const { controller } = createController();
    controller.bindPropertyControlEvents();

    expect(() => controller.setControl("not-a-control", "x")).not.toThrow();
  });

});
