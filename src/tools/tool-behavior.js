import { SHAPE_TOOLS, TOOLS } from "../ui/ui-config.js";

export function computeEraserRadius({ baseRadius, speed }) {
  const speedBoost = Math.min(baseRadius * 2, Math.max(0, speed) * 18);
  return Math.round(baseRadius + speedBoost);
}

export function getMinimumEraserRadius(scale = 1, minimumScreenSize = 44) {
  const safeScale = Math.max(0.01, Number(scale) || 1);
  return minimumScreenSize / 2 / safeScale;
}

export function getSquareEraserPreviewAttrs(center, radius) {
  const safeRadius = Math.max(1, Number(radius) || 1);
  const densityProgress = Math.min(1, Math.max(0, (safeRadius - 18) / 72));
  const dashSize = 2.5 + densityProgress * 2.5;
  const gapSize = 1.8 + densityProgress * 1.8;
  return {
    x: center.x - safeRadius,
    y: center.y - safeRadius,
    width: safeRadius * 2,
    height: safeRadius * 2,
    dash: [Number(dashSize.toFixed(2)), Number(gapSize.toFixed(2))],
  };
}

export function getBrushPreviewAttrs(center, strokeWidth, color, scale = 1) {
  const diameter = Math.max(1, Number(strokeWidth) || 1);
  const dotRadius = diameter / 2;
  const safeScale = Math.max(0.01, Number(scale) || 1);
  return {
    dot: {
      x: center.x,
      y: center.y,
      radius: dotRadius,
      fill: color,
    },
    ring: {
      x: center.x,
      y: center.y,
      radius: dotRadius + 3 / safeScale,
    },
    gap: {
      x: center.x,
      y: center.y,
      radius: dotRadius + 3 / safeScale,
      fill: "#ffffff",
    },
  };
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
