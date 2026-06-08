import { TOOLS } from "../../../ui/config.js";

export const DEFAULT_PROPERTY_CONTROLS = Object.freeze({
  color: "#111827",
  fill: "#ffffff",
  fillTransparent: true,
  width: "6",
  brushOpacity: "100",
  brushSmoothing: "45",
  brushCap: "round",
  brushStyle: "solid",
  arrowDoubleEnded: false,
  coordinateUnitSize: "40",
  coordinateShowGrid: true,
  coordinateShowTicks: true,
  coordinateShowLabels: true,
  coordinateGridColor: "#e5e7eb",
  coordinateAxisColor: "#111827",
  coordinateLabelColor: "#64748b",
  fontSize: "28",
  fontFamily: "Inter, system-ui, sans-serif",
  fontStyle: "normal",
  textDecoration: "",
});

export function createPropertyControlsController() {
  const toolPropertyControlSnapshots = new Map();

  function getDefaultControls() {
    return cloneControls(DEFAULT_PROPERTY_CONTROLS);
  }

  function getDefaultControlsForTool(tool) {
    const controls = getDefaultControls();
    if (tool === TOOLS.STICKY) {
      controls.fill = "#fef08a";
      controls.fillTransparent = false;
    }
    return controls;
  }

  function saveToolControls(tool, snapshot) {
    toolPropertyControlSnapshots.set(tool, cloneControls(snapshot));
  }

  function getToolControls(tool) {
    const snapshot = toolPropertyControlSnapshots.get(tool);
    return snapshot ? cloneControls(snapshot) : null;
  }

  return {
    getDefaultControls,
    getDefaultControlsForTool,
    saveToolControls,
    getToolControls,
  };
}

function cloneControls(controls) {
  return { ...controls };
}
