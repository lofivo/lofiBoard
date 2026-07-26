import { DEFAULT_PROPERTY_CONTROLS } from "./controller.js";
import {
  hasFontStyle,
  hasTextDecoration,
} from "../text-style-tokens.js";

export function createPropertyControlsDomController({
  root,
  refs,
  propertyControlsController,
  getCurrentTool,
  getSelectedIds,
  canPersistToolPropertyControls,
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

  // 属性值的唯一真相。隐藏的 [data-control] input 只是被同步的镜像,读一律走这里,
  // 这样那批 input 才能从模板里删掉。
  const values = { ...DEFAULT_PROPERTY_CONTROLS };

  // 每个主控件的事件类型和副作用只写一遍:bindPropertyControlEvents 从这里生成
  // 监听器,setControl 从这里直接跑副作用。两条路径共用一张表才不会行为漂移。
  const MASTER_CONTROLS = [
    { name: "color", key: "color", input: colorInput, events: ["input"], effects: [onApplyStyleToSelection, onBrushCursorStyleChange, syncBrushPresetButtons] },
    { name: "fill", key: "fill", input: fillInput, events: ["input"], effects: [onApplyStyleToSelection] },
    { name: "fill-transparent", key: "fillTransparent", checkbox: true, input: fillTransparentInput, events: ["change"], effects: [() => syncFillTransparentControls(values.fillTransparent), onApplyStyleToSelection] },
    { name: "width", key: "width", input: widthInput, events: ["input"], effects: [onApplyStyleToSelection, onBrushCursorStyleChange, syncBrushWidthControl, syncBrushPresetButtons] },
    { name: "brush-opacity", key: "brushOpacity", input: brushOpacityInput, events: ["input"], effects: [onApplyStyleToSelection, syncBrushWidthControl, syncBrushPreview] },
    { name: "brush-smoothing", key: "brushSmoothing", input: brushSmoothingInput, events: ["input"], effects: [onApplyStyleToSelection, syncBrushPresetButtons, syncBrushPreview] },
    { name: "brush-cap", key: "brushCap", input: brushCapInput, events: ["change"], effects: [onApplyStyleToSelection, syncBrushPresetButtons, syncBrushPreview] },
    { name: "brush-style", key: "brushStyle", input: brushStyleInput, events: ["change"], effects: [onApplyStyleToSelection, syncBrushPresetButtons, syncBrushPreview] },
    { name: "arrow-double-ended", key: "arrowDoubleEnded", checkbox: true, input: arrowDoubleEndedInput, events: ["change"], effects: [onApplyStyleToSelection, syncShapeEndpointControls] },
    { name: "coordinate-unit-size", key: "coordinateUnitSize", input: coordinateUnitSizeInput, events: ["input"], effects: [onApplyCoordinateStyleToSelection] },
    { name: "coordinate-show-grid", key: "coordinateShowGrid", checkbox: true, input: coordinateShowGridInput, events: ["input", "change"], effects: [onApplyCoordinateStyleToSelection] },
    { name: "coordinate-show-ticks", key: "coordinateShowTicks", checkbox: true, input: coordinateShowTicksInput, events: ["input", "change"], effects: [onApplyCoordinateStyleToSelection] },
    { name: "coordinate-show-labels", key: "coordinateShowLabels", checkbox: true, input: coordinateShowLabelsInput, events: ["input", "change"], effects: [onApplyCoordinateStyleToSelection] },
    { name: "coordinate-grid-color", key: "coordinateGridColor", input: coordinateGridColorInput, events: ["input"], effects: [onApplyCoordinateStyleToSelection] },
    { name: "coordinate-axis-color", key: "coordinateAxisColor", input: coordinateAxisColorInput, events: ["input"], effects: [onApplyCoordinateStyleToSelection] },
    { name: "coordinate-label-color", key: "coordinateLabelColor", input: coordinateLabelColorInput, events: ["input"], effects: [onApplyCoordinateStyleToSelection] },
    { name: "font-size", key: "fontSize", input: fontSizeInput, events: ["input"], effects: [onApplyStyleToSelection] },
    { name: "font-family", key: "fontFamily", input: fontFamilyInput, events: ["change"], effects: [onApplyStyleToSelection] },
  ];
  const MASTER_CONTROLS_BY_NAME = new Map(MASTER_CONTROLS.map((control) => [control.name, control]));
  const MASTER_CONTROLS_BY_KEY = new Map(MASTER_CONTROLS.map((control) => [control.key, control]));

  // 写 store,顺带把镜像 input 同步过去(遗留可见控件和 React 轮询还在读它)。
  function writeValue(key, value) {
    const control = MASTER_CONTROLS_BY_KEY.get(key);
    if (!control) {
      values[key] = value;
      return;
    }
    if (control.checkbox) {
      values[key] = Boolean(value);
      if (control.input) control.input.checked = values[key];
      return;
    }
    values[key] = String(value);
    if (control.input) control.input.value = values[key];
  }

  // React 侧写属性的入口:直接写 store 并跑副作用,不合成 input/change 事件。
  function setControl(name, value, { checked, silent = false } = {}) {
    const control = MASTER_CONTROLS_BY_NAME.get(name);
    if (!control) return;
    writeValue(control.key, control.checkbox ? (checked ?? value) : value);
    if (silent) return;
    control.effects.forEach((effect) => effect());
  }

  // 遗留可见控件改动时先把值同步进 store,再让 DOM 事件跑既有副作用。
  function adoptInputValue(input) {
    const control = MASTER_CONTROLS.find((candidate) => candidate.input === input);
    if (!control) return;
    values[control.key] = control.checkbox ? Boolean(input.checked) : String(input.value);
  }

  function bindPropertyControlEvents() {
    for (const { input, events, effects } of MASTER_CONTROLS) {
      for (const event of events) {
        // 先把 DOM 上的新值收进 store,再跑副作用 —— 副作用一律读 store
        input.addEventListener(event, () => adoptInputValue(input));
        effects.forEach((effect) => input.addEventListener(event, effect));
      }
    }

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
        setBrushControlValue(masterInput, uiInput.value);
        if (controlName === "color" || controlName === "width") {
          onBrushCursorStyleChange();
        }
      });
      uiInput.addEventListener("change", () => {
        if (uiInput.type === "checkbox") masterInput.checked = uiInput.checked;
        if (controlName === "fill") syncFillTransparentControls(false);
        setBrushControlValue(masterInput, uiInput.value);
      });
    });

    root.querySelectorAll("[data-brush-color]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = root.dataset.panelMode;
        const isSticky = mode === "sticky" || Boolean(button.closest?.(".sticky-inspector"));
        const targetInput = isSticky ? fillInput : colorInput;
        setBrushControlValue(targetInput, button.dataset.brushColor);
        if (!isSticky) onBrushCursorStyleChange();
      });
    });

    root.querySelectorAll("[data-brush-text-color]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(colorInput, button.dataset.brushTextColor);
      });
    });
    root.querySelectorAll("[data-shape-fill-color]").forEach((button) => {
      button.addEventListener("click", () => {
        syncFillTransparentControls(false);
        setBrushControlValue(fillInput, button.dataset.shapeFillColor);
      });
    });
    brushCustomColorInput?.addEventListener("input", () => {
      setBrushControlValue(colorInput, brushCustomColorInput.value);
      onBrushCursorStyleChange();
    });
    brushWidthSlider?.addEventListener("input", () => {
      setBrushControlValue(widthInput, brushWidthSlider.value);
      onBrushCursorStyleChange();
    });
    root.querySelectorAll("[data-brush-width-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const step = Number(button.dataset.brushWidthStep) || 0;
        const current = Math.round(Number(values.width) || Number(DEFAULT_PROPERTY_CONTROLS.width));
        const min = Number(brushWidthSlider?.min ?? widthInput.min ?? 1);
        const max = Number(brushWidthSlider?.max ?? widthInput.max ?? 28);
        const next = Math.max(min, Math.min(max, current + step));
        setBrushControlValue(widthInput, String(next));
        onBrushCursorStyleChange();
      });
    });
    root.querySelectorAll("[data-brush-style-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushStyleInput, button.dataset.brushStyleOption);
      });
    });
    root.querySelectorAll("[data-brush-cap-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushCapInput, button.dataset.brushCapOption);
      });
    });
    root.querySelectorAll("[data-brush-smoothing]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushSmoothingInput, button.dataset.brushSmoothing);
      });
    });
    root.querySelectorAll("[data-text-style]").forEach((button) => {
      button.addEventListener("click", () => toggleTextStyle(button.dataset.textStyle));
    });
  }

  // 无选中时改的是当前工具的默认文字样式,有选中时交给 onToggleTextStyle 改元素。
  function toggleTextStyle(style) {
    onToggleTextStyle(style);
    if (getSelectedIds().length > 0) return;
    toggleToolTextStyle(style);
    saveToolPropertyControlsForCurrentTool();
  }

  function getControlValues() {
    return { ...values };
  }

  function capturePropertyControls() {
    return {
      ...values,
      ...getToolTextStyleSnapshot(),
    };
  }

  function applyPropertyControlsSnapshot(snapshot) {
    for (const { key } of MASTER_CONTROLS) {
      if (snapshot[key] !== undefined) writeValue(key, snapshot[key]);
    }
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
    if (!canPersistToolPropertyControls(currentTool)) return;
    propertyControlsController.saveToolControls(currentTool, capturePropertyControls());
  }

  function toggleToolTextStyle(style) {
    const buttons = Array.from(root.querySelectorAll("[data-text-style]"))
      .filter((button) => button.dataset.textStyle === style);
    if (buttons.length === 0) return;
    const active = buttons.some((button) => isTextStyleButtonActive(button));
    buttons.forEach((button) => setTextStyleButtonActive(button, !active));
  }

  function getToolTextStyleSnapshot() {
    const isActive = (style) => Array.from(root.querySelectorAll(`[data-text-style="${style}"]`))
      .some((button) => isTextStyleButtonActive(button));
    return {
      fontStyle: ["bold", "italic"].filter(isActive).join(" ") || "normal",
      textDecoration: ["underline", "strike"].filter(isActive)
        .map((style) => style === "strike" ? "line-through" : style)
        .join(" "),
    };
  }

  function isTextStyleButtonActive(button) {
    return Boolean(button.classList?.contains?.("active") || button.getAttribute?.("aria-pressed") === "true");
  }

  function setTextStyleButtonActive(button, active) {
    button.classList?.toggle?.("active", active);
    button.setAttribute?.("aria-pressed", active ? "true" : "false");
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
    writeValue("brushOpacity", Math.round((element.opacity ?? 1) * 100));
    writeValue("brushSmoothing", Math.round((element.smoothing ?? 0.45) * 100));
    writeValue("brushCap", element.lineCap ?? "round");
    writeValue("brushStyle", element.brushStyle ?? "solid");
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncShapeEndpointControls();
  }

  function hydrateControlsFromElement(element) {
    if (element.stroke) writeValue("color", element.stroke);
    if (element.textFill) writeValue("color", element.textFill);
    if (element.fill && element.fill !== "transparent") writeValue("fill", element.fill);
    writeValue("fillTransparent", !element.fill || element.fill === "transparent");
    if (element.fill && element.type === "text") writeValue("color", element.fill);
    if (element.strokeWidth) writeValue("width", element.strokeWidth);
    if (["stroke", "line", "arrow"].includes(element.type)) hydrateBrushControlsFromElement(element);
    if (element.type === "coordinate-plane") hydrateCoordinateControlsFromElement(element);
    writeValue("arrowDoubleEnded", element.type === "arrow" && Boolean(element.pointerAtBeginning));
    if (element.fontSize) writeValue("fontSize", element.fontSize);
    if (element.fontFamily) writeValue("fontFamily", element.fontFamily);
    updateTextStyleButtons(element);
    syncTextInspectorControls(element);
    syncShapeEndpointControls();
  }

  function hydrateCoordinateControlsFromElement(element) {
    writeValue("coordinateUnitSize", Math.max(8, Number(element.unitSize) || 40));
    writeValue("coordinateShowGrid", element.settings?.showGrid ?? true);
    writeValue("coordinateShowTicks", element.settings?.showTicks ?? true);
    writeValue("coordinateShowLabels", element.settings?.showLabels ?? true);
    writeValue("coordinateGridColor", element.style?.gridStroke ?? "#e5e7eb");
    writeValue("coordinateAxisColor", element.style?.axisStroke ?? "#111827");
    writeValue("coordinateLabelColor", element.style?.labelFill ?? "#64748b");
    syncCoordinateControls();
  }

  // 遗留可见控件改主控件的入口。走 setControl 而不是派发合成事件,
  // 否则 store 只能靠事件冒泡回填,少一次冒泡值就丢了。
  function setBrushControlValue(input, value) {
    if (!input || value === undefined) return;
    const control = MASTER_CONTROLS.find((candidate) => candidate.input === input);
    if (control) setControl(control.name, value);
    else input.value = value;
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncTextInspectorControls();
    syncBrushPreview();
  }

  function syncBrushWidthControl() {
    const value = String(Math.round(Number(values.width) || Number(DEFAULT_PROPERTY_CONTROLS.width)));
    if (brushWidthSlider && brushWidthSlider.value !== value) brushWidthSlider.value = value;
    if (brushWidthValue) brushWidthValue.textContent = value;
    if (brushOpacityValue) brushOpacityValue.textContent = String(Math.round(Number(values.brushOpacity) || 100));
    syncBrushPreview();
  }

  function syncBrushPresetButtons() {
    if (brushCustomColorInput && normalizeHexColor(brushCustomColorInput.value) !== normalizeHexColor(values.color)) {
      brushCustomColorInput.value = values.color;
    }
    const presetColors = Array.from(root.querySelectorAll("[data-brush-color]"))
      .map((button) => normalizeHexColor(button.dataset.brushColor));
    const customColorActive = !presetColors.includes(normalizeHexColor(values.color));
    root.querySelectorAll("[data-brush-color]").forEach((button) => {
      setBrushPresetActive(button, normalizeHexColor(button.dataset.brushColor) === normalizeHexColor(values.color));
    });
    root.querySelectorAll(".brush-custom-color").forEach((control) => {
      setBrushPresetActive(control, customColorActive);
    });
    root.querySelectorAll("[data-brush-style-option]").forEach((button) => {
      setBrushPresetActive(button, button.dataset.brushStyleOption === values.brushStyle);
    });
    root.querySelectorAll("[data-brush-cap-option]").forEach((button) => {
      setBrushPresetActive(button, button.dataset.brushCapOption === values.brushCap);
    });
    syncBrushPreview();
  }

  function syncShapeEndpointControls() {
    root.querySelectorAll("[data-ui-control='arrow-double-ended']").forEach((input) => {
      input.checked = values.arrowDoubleEnded;
    });
  }

  function syncFillTransparentControls(checked) {
    writeValue("fillTransparent", checked);
    root.querySelectorAll("[data-ui-control='fill-transparent']").forEach((input) => {
      input.checked = checked;
    });
  }

  function syncTextInspectorControls(element = null) {
    const fontSizeValue = String(Math.round(Number(values.fontSize) || Number(DEFAULT_PROPERTY_CONTROLS.fontSize)));
    root.querySelectorAll("[data-ui-control='font-size'], [data-ui-control='sticky-font-size']").forEach((input) => {
      input.value = fontSizeValue;
    });
    root.querySelectorAll("[data-ui-control='font-family'], [data-ui-control='sticky-font-family']").forEach((input) => {
      input.value = values.fontFamily;
    });
    root.querySelectorAll("[data-ui-control='text-color']").forEach((input) => {
      input.value = values.color;
    });
    root.querySelectorAll("[data-ui-control='fill']").forEach((input) => {
      input.value = element?.type === "sticky" && element.fill && element.fill !== "transparent"
        ? element.fill
        : values.fill;
    });
  }

  function syncCoordinateControls() {
    root.querySelectorAll("[data-ui-control^='coordinate-']").forEach((input) => {
      const control = MASTER_CONTROLS_BY_NAME.get(input.dataset.uiControl);
      if (!control) return;
      if (control.checkbox) input.checked = values[control.key];
      else input.value = values[control.key];
    });
  }

  function syncBrushPreview() {
    if (!brushPreviewPath) return;
    const width = Math.max(1, Math.round(Number(values.width) || Number(DEFAULT_PROPERTY_CONTROLS.width)));
    const smoothing = Number(values.brushSmoothing) || Number(DEFAULT_PROPERTY_CONTROLS.brushSmoothing);
    brushPreviewPath.setAttribute("stroke", values.color);
    brushPreviewPath.setAttribute("stroke-width", String(width));
    brushPreviewPath.setAttribute("stroke-opacity", String(getBrushOpacityValue()));
    brushPreviewPath.setAttribute("stroke-linecap", values.brushStyle === "dot" ? "round" : values.brushCap);
    if (values.brushStyle === "dash") {
      brushPreviewPath.setAttribute("stroke-dasharray", `${Math.max(8, width * 3)},${Math.max(6, width * 2)}`);
    } else if (values.brushStyle === "dot") {
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
      stroke: values.color,
      strokeWidth: Number(values.width),
      opacity: getBrushOpacityValue(),
      lineCap: values.brushCap,
      brushStyle: values.brushStyle,
      smoothing: getBrushSmoothingValue(),
    };
  }

  function getBrushOpacityValue() {
    return Math.max(0.1, Math.min(1, Number(values.brushOpacity) / 100 || 1));
  }

  function getBrushSmoothingValue() {
    return Math.max(0, Math.min(1, Number(values.brushSmoothing) / 100 || 0));
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
    getControlValues,
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
    setControl,
    syncBrushPresetButtons,
    syncBrushPreview,
    syncBrushWidthControl,
    syncCoordinateControls,
    syncFillTransparentControls,
    syncShapeEndpointControls,
    syncTextInspectorControls,
    toggleTextStyle,
    updateTextStyleButtons,
  };
}
