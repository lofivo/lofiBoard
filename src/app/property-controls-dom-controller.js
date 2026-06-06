import { DEFAULT_PROPERTY_CONTROLS } from "./property-controls-controller.js";
import {
  hasFontStyle,
  hasTextDecoration,
} from "./text-style-tokens.js";

export function createPropertyControlsDomController({
  root,
  refs,
  propertyControlsController,
  getCurrentTool,
  getSelectedIds,
  isToolPropertyPanelAvailable,
  onApplyCoordinateStyleToSelection = () => {},
  onApplyStyleToSelection = () => {},
  onBrushCursorStyleChange,
  onToggleTextStyle = () => {},
}) {
  const {
    colorInput,
    fillInput,
    fillTransparentInput,
    widthInput,
    brushOpacityInput,
    brushSmoothingInput,
    brushCapInput,
    brushStyleInput,
    arrowDoubleEndedInput,
    coordinateUnitSizeInput,
    coordinateShowGridInput,
    coordinateShowTicksInput,
    coordinateShowLabelsInput,
    coordinateGridColorInput,
    coordinateAxisColorInput,
    coordinateLabelColorInput,
    brushCustomColorInput,
    brushWidthSlider,
    brushWidthValue,
    brushOpacityValue,
    brushPreviewPath,
    fontSizeInput,
    fontFamilyInput,
  } = refs;

  function bindPropertyControlEvents() {
    colorInput.addEventListener("input", onApplyStyleToSelection);
    colorInput.addEventListener("input", onBrushCursorStyleChange);
    colorInput.addEventListener("input", syncBrushPresetButtons);
    fillInput.addEventListener("input", onApplyStyleToSelection);
    fillTransparentInput.addEventListener("change", () => syncFillTransparentControls(fillTransparentInput.checked));
    fillTransparentInput.addEventListener("change", onApplyStyleToSelection);
    widthInput.addEventListener("input", onApplyStyleToSelection);
    widthInput.addEventListener("input", onBrushCursorStyleChange);
    widthInput.addEventListener("input", syncBrushWidthControl);
    widthInput.addEventListener("input", syncBrushPresetButtons);
    brushOpacityInput.addEventListener("input", onApplyStyleToSelection);
    brushOpacityInput.addEventListener("input", syncBrushWidthControl);
    brushOpacityInput.addEventListener("input", syncBrushPreview);
    brushSmoothingInput.addEventListener("input", onApplyStyleToSelection);
    brushSmoothingInput.addEventListener("input", syncBrushPresetButtons);
    brushSmoothingInput.addEventListener("input", syncBrushPreview);
    brushCapInput.addEventListener("change", onApplyStyleToSelection);
    brushCapInput.addEventListener("change", syncBrushPresetButtons);
    brushCapInput.addEventListener("change", syncBrushPreview);
    brushStyleInput.addEventListener("change", onApplyStyleToSelection);
    brushStyleInput.addEventListener("change", syncBrushPresetButtons);
    brushStyleInput.addEventListener("change", syncBrushPreview);
    arrowDoubleEndedInput.addEventListener("change", onApplyStyleToSelection);
    arrowDoubleEndedInput.addEventListener("change", syncShapeEndpointControls);
    [
      coordinateUnitSizeInput,
      coordinateShowGridInput,
      coordinateShowTicksInput,
      coordinateShowLabelsInput,
      coordinateGridColorInput,
      coordinateAxisColorInput,
      coordinateLabelColorInput,
    ].forEach((input) => input.addEventListener("input", onApplyCoordinateStyleToSelection));
    [
      coordinateShowGridInput,
      coordinateShowTicksInput,
      coordinateShowLabelsInput,
    ].forEach((input) => input.addEventListener("change", onApplyCoordinateStyleToSelection));
    fontSizeInput.addEventListener("input", onApplyStyleToSelection);
    fontFamilyInput.addEventListener("change", onApplyStyleToSelection);

    root.querySelectorAll("[data-ui-control]").forEach((uiInput) => {
      const controlName = uiInput.dataset.uiControl;
      let masterInput = root.querySelector(`[data-control="${controlName}"]`);

      if (controlName === "sticky-font-size") masterInput = fontSizeInput;
      if (controlName === "sticky-font-family") masterInput = fontFamilyInput;
      if (controlName === "text-color") masterInput = colorInput;

      if (!masterInput) return;

      uiInput.addEventListener("input", () => {
        if (uiInput.type === "checkbox") masterInput.checked = uiInput.checked;
        if (controlName === "fill") syncFillTransparentControls(false);
        setBrushControlValue(masterInput, uiInput.value, "input");
        if (controlName === "color" || controlName === "width") {
          onBrushCursorStyleChange();
        }
      });
      uiInput.addEventListener("change", () => {
        if (uiInput.type === "checkbox") masterInput.checked = uiInput.checked;
        if (controlName === "fill") syncFillTransparentControls(false);
        setBrushControlValue(masterInput, uiInput.value, "change");
      });
    });

    root.querySelectorAll("[data-brush-color]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = root.dataset.panelMode;
        const isSticky = mode === "sticky" || Boolean(button.closest?.(".sticky-inspector"));
        const targetInput = isSticky ? fillInput : colorInput;
        setBrushControlValue(targetInput, button.dataset.brushColor, "input");
        if (!isSticky) onBrushCursorStyleChange();
      });
    });

    root.querySelectorAll("[data-brush-text-color]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(colorInput, button.dataset.brushTextColor, "input");
      });
    });
    root.querySelectorAll("[data-shape-fill-color]").forEach((button) => {
      button.addEventListener("click", () => {
        syncFillTransparentControls(false);
        setBrushControlValue(fillInput, button.dataset.shapeFillColor, "input");
      });
    });
    brushCustomColorInput?.addEventListener("input", () => {
      setBrushControlValue(colorInput, brushCustomColorInput.value, "input");
      onBrushCursorStyleChange();
    });
    brushWidthSlider?.addEventListener("input", () => {
      setBrushControlValue(widthInput, brushWidthSlider.value, "input");
      onBrushCursorStyleChange();
    });
    root.querySelectorAll("[data-brush-width-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const step = Number(button.dataset.brushWidthStep) || 0;
        const current = Math.round(Number(widthInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.width));
        const min = Number(brushWidthSlider?.min ?? widthInput.min ?? 1);
        const max = Number(brushWidthSlider?.max ?? widthInput.max ?? 28);
        const next = Math.max(min, Math.min(max, current + step));
        setBrushControlValue(widthInput, String(next), "input");
        onBrushCursorStyleChange();
      });
    });
    root.querySelectorAll("[data-brush-style-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushStyleInput, button.dataset.brushStyleOption, "change");
      });
    });
    root.querySelectorAll("[data-brush-cap-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushCapInput, button.dataset.brushCapOption, "change");
      });
    });
    root.querySelectorAll("[data-brush-smoothing]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushSmoothingInput, button.dataset.brushSmoothing, "input");
      });
    });
    root.querySelectorAll("[data-text-style]").forEach((button) => {
      button.addEventListener("click", () => onToggleTextStyle(button.dataset.textStyle));
    });
  }

  function capturePropertyControls() {
    return {
      color: colorInput.value,
      fill: fillInput.value,
      fillTransparent: fillTransparentInput.checked,
      width: widthInput.value,
      brushOpacity: brushOpacityInput.value,
      brushSmoothing: brushSmoothingInput.value,
      brushCap: brushCapInput.value,
      brushStyle: brushStyleInput.value,
      arrowDoubleEnded: arrowDoubleEndedInput.checked,
      coordinateUnitSize: coordinateUnitSizeInput.value,
      coordinateShowGrid: coordinateShowGridInput.checked,
      coordinateShowTicks: coordinateShowTicksInput.checked,
      coordinateShowLabels: coordinateShowLabelsInput.checked,
      coordinateGridColor: coordinateGridColorInput.value,
      coordinateAxisColor: coordinateAxisColorInput.value,
      coordinateLabelColor: coordinateLabelColorInput.value,
      fontSize: fontSizeInput.value,
      fontFamily: fontFamilyInput.value,
      fontStyle: "normal",
      textDecoration: "",
    };
  }

  function applyPropertyControlsSnapshot(snapshot) {
    colorInput.value = snapshot.color;
    fillInput.value = snapshot.fill;
    fillTransparentInput.checked = snapshot.fillTransparent;
    widthInput.value = snapshot.width;
    brushOpacityInput.value = snapshot.brushOpacity;
    brushSmoothingInput.value = snapshot.brushSmoothing;
    brushCapInput.value = snapshot.brushCap;
    brushStyleInput.value = snapshot.brushStyle;
    arrowDoubleEndedInput.checked = snapshot.arrowDoubleEnded;
    coordinateUnitSizeInput.value = snapshot.coordinateUnitSize;
    coordinateShowGridInput.checked = snapshot.coordinateShowGrid;
    coordinateShowTicksInput.checked = snapshot.coordinateShowTicks;
    coordinateShowLabelsInput.checked = snapshot.coordinateShowLabels;
    coordinateGridColorInput.value = snapshot.coordinateGridColor;
    coordinateAxisColorInput.value = snapshot.coordinateAxisColor;
    coordinateLabelColorInput.value = snapshot.coordinateLabelColor;
    fontSizeInput.value = snapshot.fontSize;
    fontFamilyInput.value = snapshot.fontFamily;
    updateTextStyleButtons({
      fontStyle: snapshot.fontStyle,
      textDecoration: snapshot.textDecoration,
    });
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncTextInspectorControls();
    syncShapeEndpointControls();
    syncCoordinateControls();
    onBrushCursorStyleChange();
  }

  function saveToolPropertyControlsForCurrentTool() {
    if (getSelectedIds().length > 0) return;
    const currentTool = getCurrentTool();
    if (!isToolPropertyPanelAvailable(currentTool)) return;
    propertyControlsController.saveToolControls(currentTool, capturePropertyControls());
  }

  function restorePropertyControlsForTool(tool) {
    const snapshot = propertyControlsController.getToolControls(tool);
    if (snapshot) {
      applyPropertyControlsSnapshot(snapshot);
      return;
    }
    resetPropertyControlsForTool(tool);
  }

  function resetPropertyControlsForTool(tool) {
    applyPropertyControlsSnapshot(propertyControlsController.getDefaultControlsForTool(tool));
  }

  function hydrateBrushControlsFromElement(element) {
    brushOpacityInput.value = String(Math.round((element.opacity ?? 1) * 100));
    brushSmoothingInput.value = String(Math.round((element.smoothing ?? 0.45) * 100));
    brushCapInput.value = element.lineCap ?? "round";
    brushStyleInput.value = element.brushStyle ?? "solid";
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncShapeEndpointControls();
  }

  function hydrateControlsFromElement(element) {
    if (element.stroke) colorInput.value = element.stroke;
    if (element.textFill) colorInput.value = element.textFill;
    if (element.fill && element.fill !== "transparent") fillInput.value = element.fill;
    fillTransparentInput.checked = !element.fill || element.fill === "transparent";
    if (element.fill && element.type === "text") colorInput.value = element.fill;
    if (element.strokeWidth) widthInput.value = String(element.strokeWidth);
    if (["stroke", "line", "arrow"].includes(element.type)) hydrateBrushControlsFromElement(element);
    if (element.type === "coordinate-plane") hydrateCoordinateControlsFromElement(element);
    arrowDoubleEndedInput.checked = element.type === "arrow" && Boolean(element.pointerAtBeginning);
    if (element.fontSize) fontSizeInput.value = String(element.fontSize);
    if (element.fontFamily) fontFamilyInput.value = element.fontFamily;
    updateTextStyleButtons(element);
    syncTextInspectorControls(element);
    syncShapeEndpointControls();
  }

  function hydrateCoordinateControlsFromElement(element) {
    coordinateUnitSizeInput.value = String(Math.max(8, Number(element.unitSize) || 40));
    coordinateShowGridInput.checked = element.settings?.showGrid ?? true;
    coordinateShowTicksInput.checked = element.settings?.showTicks ?? true;
    coordinateShowLabelsInput.checked = element.settings?.showLabels ?? true;
    coordinateGridColorInput.value = element.style?.gridStroke ?? "#e5e7eb";
    coordinateAxisColorInput.value = element.style?.axisStroke ?? "#111827";
    coordinateLabelColorInput.value = element.style?.labelFill ?? "#64748b";
    syncCoordinateControls();
  }

  function setBrushControlValue(input, value, eventName) {
    if (!input || value === undefined) return;
    input.value = value;
    input.dispatchEvent(new Event(eventName, { bubbles: true }));
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncTextInspectorControls();
    syncBrushPreview();
  }

  function syncBrushWidthControl() {
    const value = String(Math.round(Number(widthInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.width)));
    if (brushWidthSlider && brushWidthSlider.value !== value) brushWidthSlider.value = value;
    if (brushWidthValue) brushWidthValue.textContent = value;
    if (brushOpacityValue) brushOpacityValue.textContent = String(Math.round(Number(brushOpacityInput.value) || 100));
    syncBrushPreview();
  }

  function syncBrushPresetButtons() {
    if (brushCustomColorInput && normalizeHexColor(brushCustomColorInput.value) !== normalizeHexColor(colorInput.value)) {
      brushCustomColorInput.value = colorInput.value;
    }
    const presetColors = Array.from(root.querySelectorAll("[data-brush-color]"))
      .map((button) => normalizeHexColor(button.dataset.brushColor));
    const customColorActive = !presetColors.includes(normalizeHexColor(colorInput.value));
    root.querySelectorAll("[data-brush-color]").forEach((button) => {
      setBrushPresetActive(button, normalizeHexColor(button.dataset.brushColor) === normalizeHexColor(colorInput.value));
    });
    root.querySelectorAll(".brush-custom-color").forEach((control) => {
      setBrushPresetActive(control, customColorActive);
    });
    root.querySelectorAll("[data-brush-style-option]").forEach((button) => {
      setBrushPresetActive(button, button.dataset.brushStyleOption === brushStyleInput.value);
    });
    root.querySelectorAll("[data-brush-cap-option]").forEach((button) => {
      setBrushPresetActive(button, button.dataset.brushCapOption === brushCapInput.value);
    });
    syncBrushPreview();
  }

  function syncShapeEndpointControls() {
    root.querySelectorAll("[data-ui-control='arrow-double-ended']").forEach((input) => {
      input.checked = arrowDoubleEndedInput.checked;
    });
  }

  function syncFillTransparentControls(checked) {
    fillTransparentInput.checked = checked;
    root.querySelectorAll("[data-ui-control='fill-transparent']").forEach((input) => {
      input.checked = checked;
    });
  }

  function syncTextInspectorControls(element = null) {
    const fontSizeValue = String(Math.round(Number(fontSizeInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.fontSize)));
    root.querySelectorAll("[data-ui-control='font-size'], [data-ui-control='sticky-font-size']").forEach((input) => {
      input.value = fontSizeValue;
    });
    root.querySelectorAll("[data-ui-control='font-family'], [data-ui-control='sticky-font-family']").forEach((input) => {
      input.value = fontFamilyInput.value;
    });
    root.querySelectorAll("[data-ui-control='text-color']").forEach((input) => {
      input.value = colorInput.value;
    });
    root.querySelectorAll("[data-ui-control='fill']").forEach((input) => {
      input.value = element?.type === "sticky" && element.fill && element.fill !== "transparent"
        ? element.fill
        : fillInput.value;
    });
  }

  function syncCoordinateControls() {
    root.querySelectorAll("[data-ui-control^='coordinate-']").forEach((input) => {
      const masterInput = root.querySelector(`[data-control="${input.dataset.uiControl}"]`);
      if (!masterInput) return;
      if (input.type === "checkbox") {
        input.checked = masterInput.checked;
      } else {
        input.value = masterInput.value;
      }
    });
  }

  function syncBrushPreview() {
    if (!brushPreviewPath) return;
    const width = Math.max(1, Math.round(Number(widthInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.width)));
    const smoothing = Number(brushSmoothingInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.brushSmoothing);
    brushPreviewPath.setAttribute("stroke", colorInput.value);
    brushPreviewPath.setAttribute("stroke-width", String(width));
    brushPreviewPath.setAttribute("stroke-opacity", String(getBrushOpacityValue()));
    brushPreviewPath.setAttribute("stroke-linecap", brushStyleInput.value === "dot" ? "round" : brushCapInput.value);
    if (brushStyleInput.value === "dash") {
      brushPreviewPath.setAttribute("stroke-dasharray", `${Math.max(8, width * 3)},${Math.max(6, width * 2)}`);
    } else if (brushStyleInput.value === "dot") {
      brushPreviewPath.setAttribute("stroke-dasharray", `0.1,${Math.max(8, width * 1.8)}`);
    } else {
      brushPreviewPath.removeAttribute("stroke-dasharray");
    }
    if (smoothing < 30) {
      brushPreviewPath.setAttribute("d", "M 14,24 L 72,10 L 132,38 L 266,24");
    } else if (smoothing < 60) {
      brushPreviewPath.setAttribute("d", "M 14,24 Q 72,10 132,24 T 266,24");
    } else {
      brushPreviewPath.setAttribute("d", "M 14,24 C 72,10 132,38 266,24");
    }
  }

  function setBrushPresetActive(button, active) {
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function normalizeHexColor(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function getStrokeStyleFromControls() {
    return {
      stroke: colorInput.value,
      strokeWidth: Number(widthInput.value),
      opacity: getBrushOpacityValue(),
      lineCap: brushCapInput.value,
      brushStyle: brushStyleInput.value,
      smoothing: getBrushSmoothingValue(),
    };
  }

  function getBrushOpacityValue() {
    return Math.max(0.1, Math.min(1, Number(brushOpacityInput.value) / 100 || 1));
  }

  function getBrushSmoothingValue() {
    return Math.max(0, Math.min(1, Number(brushSmoothingInput.value) / 100 || 0));
  }

  function getBrushInputSmoothingValue() {
    return Math.min(0.9, getBrushSmoothingValue());
  }

  function updateTextStyleButtons(element = {}) {
    root.querySelectorAll("[data-text-style]").forEach((button) => {
      const style = button.dataset.textStyle;
      const active = style === "bold" || style === "italic"
        ? hasFontStyle(element.fontStyle, style)
        : hasTextDecoration(element.textDecoration, style === "underline" ? "underline" : "line-through");
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  return {
    applyPropertyControlsSnapshot,
    bindPropertyControlEvents,
    capturePropertyControls,
    getBrushInputSmoothingValue,
    getBrushOpacityValue,
    getBrushSmoothingValue,
    getStrokeStyleFromControls,
    hydrateBrushControlsFromElement,
    hydrateControlsFromElement,
    hydrateCoordinateControlsFromElement,
    resetPropertyControlsForTool,
    restorePropertyControlsForTool,
    saveToolPropertyControlsForCurrentTool,
    setBrushControlValue,
    syncBrushPresetButtons,
    syncBrushPreview,
    syncBrushWidthControl,
    syncCoordinateControls,
    syncFillTransparentControls,
    syncShapeEndpointControls,
    syncTextInspectorControls,
    updateTextStyleButtons,
  };
}
