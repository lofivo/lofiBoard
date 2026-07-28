import { TOOLS } from "../../ui/config.js";

const SIZE_CONTROLS_BY_PANEL_MODE = Object.freeze({
  brush: { name: "width", key: "width", min: 1, max: 28, step: 1 },
  stroke: { name: "width", key: "width", min: 1, max: 28, step: 1 },
  tool: { name: "width", key: "width", min: 1, max: 28, step: 1 },
  "linear-tool": { name: "width", key: "width", min: 1, max: 28, step: 1 },
  element: { name: "width", key: "width", min: 1, max: 28, step: 1 },
  linear: { name: "width", key: "width", min: 1, max: 28, step: 1 },
  text: { name: "font-size", key: "fontSize", min: 12, max: 96, step: 1 },
  sticky: { name: "font-size", key: "fontSize", min: 12, max: 64, step: 1 },
  "coordinate-tool": { name: "coordinate-unit-size", key: "coordinateUnitSize", min: 16, max: 120, step: 1 },
  coordinate: { name: "coordinate-unit-size", key: "coordinateUnitSize", min: 16, max: 120, step: 1 },
});

export function createSizeShortcutController({
  getPanelMode,
  getCurrentTool,
  getStructureSelection,
  getControlValues,
  setControl,
  adjustGraphNodeSize = () => false,
}) {
  function adjustActiveSize(direction) {
    const stepDirection = Math.sign(Number(direction));
    if (!stepDirection) return false;

    const panelMode = getPanelMode();
    if (panelMode === "structure" && getStructureSelection() === "graph-structure") {
      return Boolean(adjustGraphNodeSize(stepDirection));
    }

    const config = resolveSizeControl(panelMode, getCurrentTool());
    if (!config) return false;

    const current = Number(getControlValues()[config.key]);
    if (!Number.isFinite(current)) return false;
    const next = Math.max(config.min, Math.min(config.max, current + config.step * stepDirection));
    if (next === current) return true;
    setControl(config.name, next);
    return true;
  }

  return { adjustActiveSize };
}

function resolveSizeControl(panelMode, currentTool) {
  if (panelMode === "hidden") {
    if (currentTool === TOOLS.TEXT) return SIZE_CONTROLS_BY_PANEL_MODE.text;
    if (currentTool === TOOLS.STICKY) return SIZE_CONTROLS_BY_PANEL_MODE.sticky;
  }
  return SIZE_CONTROLS_BY_PANEL_MODE[panelMode] ?? null;
}
