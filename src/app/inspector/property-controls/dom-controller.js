import { DEFAULT_PROPERTY_CONTROLS } from "./controller.js";
import {
  hasFontStyle,
  hasTextDecoration,
} from "../text-style-tokens.js";

export function createPropertyControlsDomController({
  propertyControlsController,
  getCurrentTool,
  getSelectedIds,
  canPersistToolPropertyControls,
  onApplyCoordinateStyleToSelection = () => {},
  onApplyStyleToSelection = () => {},
  onBrushCursorStyleChange,
  onToggleTextStyle = () => {},
}) {
  // 属性值的唯一真相。以前存在隐藏的 [data-control] input 上,那批 input 已随
  // 遗留属性面板一起删掉,这里不再碰 DOM。
  const values = { ...DEFAULT_PROPERTY_CONTROLS };

  // 每个属性写入后要跑的副作用。以前这张表还要负责给隐藏 input 绑事件,
  // 现在 React 是唯一写入方,只剩“写完做什么”。
  const APPLY_STYLE = [onApplyStyleToSelection];
  const APPLY_COORDINATE = [onApplyCoordinateStyleToSelection];
  const MASTER_CONTROLS = [
    { name: "color", key: "color", effects: [onApplyStyleToSelection, onBrushCursorStyleChange] },
    { name: "fill", key: "fill", effects: APPLY_STYLE },
    { name: "fill-transparent", key: "fillTransparent", checkbox: true, effects: APPLY_STYLE },
    { name: "width", key: "width", effects: [onApplyStyleToSelection, onBrushCursorStyleChange] },
    { name: "brush-opacity", key: "brushOpacity", effects: APPLY_STYLE },
    { name: "brush-smoothing", key: "brushSmoothing", effects: APPLY_STYLE },
    { name: "brush-cap", key: "brushCap", effects: APPLY_STYLE },
    { name: "brush-style", key: "brushStyle", effects: APPLY_STYLE },
    { name: "arrow-double-ended", key: "arrowDoubleEnded", checkbox: true, effects: APPLY_STYLE },
    { name: "coordinate-unit-size", key: "coordinateUnitSize", effects: APPLY_COORDINATE },
    { name: "coordinate-show-grid", key: "coordinateShowGrid", checkbox: true, effects: APPLY_COORDINATE },
    { name: "coordinate-show-ticks", key: "coordinateShowTicks", checkbox: true, effects: APPLY_COORDINATE },
    { name: "coordinate-show-labels", key: "coordinateShowLabels", checkbox: true, effects: APPLY_COORDINATE },
    { name: "coordinate-grid-color", key: "coordinateGridColor", effects: APPLY_COORDINATE },
    { name: "coordinate-axis-color", key: "coordinateAxisColor", effects: APPLY_COORDINATE },
    { name: "coordinate-label-color", key: "coordinateLabelColor", effects: APPLY_COORDINATE },
    { name: "coordinate-functions", key: "coordinateFunctions", effects: APPLY_COORDINATE },
    { name: "font-size", key: "fontSize", effects: APPLY_STYLE },
    { name: "font-family", key: "fontFamily", effects: APPLY_STYLE },
  ];
  const MASTER_CONTROLS_BY_NAME = new Map(MASTER_CONTROLS.map((control) => [control.name, control]));
  const MASTER_CONTROLS_BY_KEY = new Map(MASTER_CONTROLS.map((control) => [control.key, control]));

  function writeValue(key, value) {
    const control = MASTER_CONTROLS_BY_KEY.get(key);
    values[key] = control && !control.checkbox ? String(value) : Boolean(value);
    if (!control) values[key] = value;
  }

  // React 侧写属性的入口:直接写 store 并跑副作用,不合成 input/change 事件。
  function setControl(name, value, { checked, silent = false } = {}) {
    const control = MASTER_CONTROLS_BY_NAME.get(name);
    if (!control) return;
    writeValue(control.key, control.checkbox ? (checked ?? value) : value);
    if (silent) return;
    control.effects.forEach((effect) => effect());
  }

  // 遗留可见控件已被 React 取代,主控件的隐藏 input 也随模板删掉了,
  // 现在没有 DOM 事件可绑。保留空实现是为了不改 shell 的接线顺序。
  function bindPropertyControlEvents() {}

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
    };
  }

  function applyPropertyControlsSnapshot(snapshot) {
    for (const { key } of MASTER_CONTROLS) {
      if (snapshot[key] !== undefined) writeValue(key, snapshot[key]);
    }
    updateTextStyleValues({
      fontStyle: snapshot.fontStyle,
      textDecoration: snapshot.textDecoration,
    });
    onBrushCursorStyleChange();
  }

  function saveToolPropertyControlsForCurrentTool() {
    if (getSelectedIds().length > 0) return;
    const currentTool = getCurrentTool();
    if (!canPersistToolPropertyControls(currentTool)) return;
    propertyControlsController.saveToolControls(currentTool, capturePropertyControls());
  }

  // 文字样式同样以 store 为准。原先真相在按钮的 class/aria-pressed 上,
  // 那批按钮已被 React 取代,读 DOM 会在模板删掉后拿到空集。
  function toggleToolTextStyle(style) {
    const active = isTextStyleActive(style);
    if (style === "bold" || style === "italic") {
      const next = ["bold", "italic"].filter((token) => (token === style ? !active : hasFontStyle(values.fontStyle, token)));
      values.fontStyle = next.join(" ") || "normal";
    } else {
      const next = ["underline", "line-through"].filter((token) => {
        const matches = token === (style === "strike" ? "line-through" : style);
        return matches ? !active : hasTextDecoration(values.textDecoration, token);
      });
      values.textDecoration = next.join(" ");
    }
  }

  function isTextStyleActive(style) {
    return style === "bold" || style === "italic"
      ? hasFontStyle(values.fontStyle, style)
      : hasTextDecoration(values.textDecoration, style === "underline" ? "underline" : "line-through");
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
    updateTextStyleValues(element);
  }

  function hydrateCoordinateControlsFromElement(element) {
    writeValue("coordinateUnitSize", Math.max(8, Number(element.unitSize) || 40));
    writeValue("coordinateShowGrid", element.settings?.showGrid ?? true);
    writeValue("coordinateShowTicks", element.settings?.showTicks ?? true);
    writeValue("coordinateShowLabels", element.settings?.showLabels ?? true);
    writeValue("coordinateGridColor", element.style?.gridStroke ?? "#e5e7eb");
    writeValue("coordinateAxisColor", element.style?.axisStroke ?? "#111827");
    writeValue("coordinateLabelColor", element.style?.labelFill ?? "#64748b");
    writeValue("coordinateFunctions", Array.isArray(element.functions) ? element.functions.join("\n") : "");
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

  function updateTextStyleValues(element = {}) {
    values.fontStyle = element.fontStyle ?? "normal";
    values.textDecoration = element.textDecoration ?? "";
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
    setControl,
    toggleTextStyle,
    updateTextStyleValues,
  };
}
