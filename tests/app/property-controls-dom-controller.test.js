import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROPERTY_CONTROLS,
  createPropertyControlsController,
} from "../../src/app/inspector/property-controls-controller.js";
import { createPropertyControlsDomController } from "../../src/app/inspector/property-controls-dom-controller.js";
import { TOOLS } from "../../src/ui/ui-config.js";

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
  return {
    dataset,
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    classList: { toggle: vi.fn() },
    click() {
      listeners.get("click")?.();
    },
    setAttribute: vi.fn(),
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
    isToolPropertyPanelAvailable: overrides.isToolPropertyPanelAvailable ?? (() => true),
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

describe("property-controls-dom-controller", () => {
  it("captures and reapplies property control snapshots", () => {
    const { controller, refs } = createController();
    refs.colorInput.value = "#ef4444";
    refs.widthInput.value = "12";
    refs.fillTransparentInput.checked = false;

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
    expect(refs.colorInput.value).toBe("#2563eb");
    expect(refs.widthInput.value).toBe("10");
    expect(refs.brushOpacityValue.textContent).toBe("80");
  });

  it("saves and restores tool property controls only without active selection", () => {
    const { controller, propertyControlsController, refs } = createController();
    refs.colorInput.value = "#ef4444";
    controller.saveToolPropertyControlsForCurrentTool();

    refs.colorInput.value = "#111827";
    controller.restorePropertyControlsForTool(TOOLS.PEN);
    expect(refs.colorInput.value).toBe("#ef4444");
    expect(propertyControlsController.getToolControls(TOOLS.PEN).color).toBe("#ef4444");

    const blocked = createController({ getSelectedIds: () => ["element_1"] });
    blocked.refs.colorInput.value = "#22c55e";
    blocked.controller.saveToolPropertyControlsForCurrentTool();
    expect(blocked.propertyControlsController.getToolControls(TOOLS.PEN)).toBeNull();
  });

  it("syncs brush preview, preset buttons, and numeric display values", () => {
    const { brushPreviewPath, controller, nodes, refs } = createController();
    refs.colorInput.value = "#ef4444";
    refs.widthInput.value = "9";
    refs.brushOpacityInput.value = "70";
    refs.brushStyleInput.value = "dash";

    controller.syncBrushWidthControl();
    controller.syncBrushPresetButtons();

    expect(refs.brushWidthValue.textContent).toBe("9");
    expect(refs.brushOpacityValue.textContent).toBe("70");
    expect(brushPreviewPath.setAttribute).toHaveBeenCalledWith("stroke", "#ef4444");
    expect(brushPreviewPath.setAttribute).toHaveBeenCalledWith("stroke-opacity", "0.7");
    expect(brushPreviewPath.setAttribute).toHaveBeenCalledWith("stroke-dasharray", "27,18");
    expect(nodes.brushColors[1].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(nodes.styleOptions[1].classList.toggle).toHaveBeenCalledWith("active", true);
  });

  it("syncs visible inspector controls from master controls", () => {
    const { controller, masters, nodes, refs } = createController();
    refs.arrowDoubleEndedInput.checked = true;
    refs.fillInput.value = "#fef08a";
    refs.fontSizeInput.value = "32";
    refs.fontFamilyInput.value = "Inter";
    refs.colorInput.value = "#111827";

    controller.syncShapeEndpointControls();
    controller.syncFillTransparentControls(false);
    controller.syncTextInspectorControls({ type: "sticky", fill: "#fef08a" });
    controller.syncCoordinateControls();

    expect(nodes.arrowInputs[0].checked).toBe(true);
    expect(nodes.fillTransparentInputs[0].checked).toBe(false);
    expect(nodes.fontSizeInputs[0].value).toBe("32");
    expect(nodes.fontFamilyInputs[0].value).toBe("Inter");
    expect(nodes.textColorInputs[0].value).toBe("#111827");
    expect(nodes.fillInputs[0].value).toBe("#fef08a");
    expect(nodes.coordinateInputs[0].value).toBe(masters["coordinate-unit-size"].value);
    expect(nodes.coordinateInputs[1].checked).toBe(true);
  });

  it("hydrates brush controls and exposes stroke style values", () => {
    const { controller, refs } = createController();

    controller.hydrateBrushControlsFromElement({
      opacity: 0.42,
      smoothing: 0.2,
      lineCap: "square",
      brushStyle: "dot",
    });

    expect(refs.brushOpacityInput.value).toBe("42");
    expect(refs.brushSmoothingInput.value).toBe("20");
    expect(refs.brushCapInput.value).toBe("square");
    expect(refs.brushStyleInput.value).toBe("dot");
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
    const { controller, nodes, refs } = createController();

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

    expect(refs.colorInput.value).toBe("#2563eb");
    expect(refs.fillTransparentInput.checked).toBe(true);
    expect(refs.widthInput.value).toBe("5");
    expect(refs.brushOpacityInput.value).toBe("65");
    expect(refs.brushSmoothingInput.value).toBe("30");
    expect(refs.brushCapInput.value).toBe("square");
    expect(refs.brushStyleInput.value).toBe("dash");
    expect(refs.arrowDoubleEndedInput.checked).toBe(true);
    expect(refs.fontSizeInput.value).toBe("24");
    expect(refs.fontFamilyInput.value).toBe("Inter");
    expect(nodes.arrowInputs[0].checked).toBe(true);
    expect(nodes.fontSizeInputs[0].value).toBe("24");
  });

  it("hydrates coordinate controls from the selected coordinate plane", () => {
    const { controller, refs } = createController();

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
    });

    expect(refs.coordinateUnitSizeInput.value).toBe("8");
    expect(refs.coordinateShowGridInput.checked).toBe(false);
    expect(refs.coordinateShowTicksInput.checked).toBe(true);
    expect(refs.coordinateShowLabelsInput.checked).toBe(false);
    expect(refs.coordinateGridColorInput.value).toBe("#94a3b8");
    expect(refs.coordinateAxisColorInput.value).toBe("#0f172a");
    expect(refs.coordinateLabelColorInput.value).toBe("#475569");
  });

  it("binds property control events to master controls and app callbacks", () => {
    const { callbacks, controller, nodes, refs, root } = createController();
    root.dataset.panelMode = "brush";

    controller.bindPropertyControlEvents();
    refs.colorInput.dispatch("input");
    refs.widthInput.dispatch("input");
    refs.fillTransparentInput.checked = false;
    refs.fillTransparentInput.dispatch("change");
    nodes.uiControls[0].dispatch("input");
    nodes.uiControls[1].dispatch("input");
    nodes.brushColors[1].click();
    nodes.shapeFillButtons[0].click();
    nodes.widthStepButtons[0].click();
    nodes.textStyleButtons[0].click();

    expect(callbacks.onApplyStyleToSelection).toHaveBeenCalled();
    expect(callbacks.onBrushCursorStyleChange).toHaveBeenCalled();
    expect(refs.fillTransparentInput.checked).toBe(false);
    expect(refs.fillInput.value).toBe("#fef08a");
    expect(refs.colorInput.value).toBe("#ef4444");
    expect(refs.widthInput.value).toBe("20");
    expect(callbacks.onToggleTextStyle).toHaveBeenCalledWith("bold");
  });
});
