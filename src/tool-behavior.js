import { SHAPE_TOOLS, TOOLS } from "./ui-config.js";

export function computeEraserRadius({ baseRadius, speed }) {
  const speedBoost = Math.min(baseRadius * 2, Math.max(0, speed) * 18);
  return Math.round(baseRadius + speedBoost);
}

export function isShapeTool(tool) {
  return SHAPE_TOOLS.has(tool);
}

export function resolveActiveDrawingTool(tool, activeShapeTool) {
  return tool === TOOLS.SHAPE ? activeShapeTool : tool;
}

export function getFillValue({ transparent, color }) {
  return transparent ? "transparent" : color;
}
