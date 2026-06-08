import { SHAPE_TOOLS, TOOLS } from "../ui/config.js";

export function computeEraserRadius({ baseRadius, speed }) {
  const speedDeadZone = 0.75;
  const effectiveSpeed = Math.max(0, Number(speed) - speedDeadZone);
  const speedBoost = Math.min(baseRadius * 2, effectiveSpeed * 18);
  return Math.round(baseRadius + speedBoost);
}

export function getBaseEraserRadiusForWidth(width) {
  return Math.max(18, Number(width) * 1.7) * 0.7;
}

export function getScaledEraserRadius(radius, scale = 1) {
  const safeRadius = Math.max(1, Number(radius) || 1);
  const safeScale = Math.max(0.01, Number(scale) || 1);
  return safeScale <= 1 ? safeRadius / safeScale : safeRadius;
}

export function getSquareEraserPreviewAttrs(center, radius, scale = 1) {
  const safeRadius = Math.max(1, Number(radius) || 1);
  const safeScale = Math.max(0.01, Number(scale) || 1);
  const screenRadius = safeRadius * safeScale;
  const densityProgress = Math.min(1, Math.max(0, (screenRadius - 18) / 72));
  const dashSize = 2.5 + densityProgress * 2.5;
  const gapSize = 1.8 + densityProgress * 1.8;
  const dashScale = safeScale <= 1 ? 1 : safeScale;
  return {
    x: center.x - safeRadius,
    y: center.y - safeRadius,
    width: safeRadius * 2,
    height: safeRadius * 2,
    dash: [
      Number((dashSize / dashScale).toFixed(2)),
      Number((gapSize / dashScale).toFixed(2)),
    ],
  };
}

export function getObjectEraserIconAttrs(center, scale = 1, screenSize = 24) {
  const safeScale = Math.max(0.01, Number(scale) || 1);
  const size = Math.max(12, Number(screenSize) || 24) / safeScale;
  const width = size * 1.08;
  const height = size * 0.62;
  const sleeveWidth = width * 0.34;
  const strokeWidth = 1.5 / safeScale;
  const cornerRadius = Math.max(2 / safeScale, height * 0.22);
  const left = -width / 2;
  const top = -height / 2;
  const bottom = top + height;
  const dividerX = left + sleeveWidth;

  return {
    group: {
      x: center.x,
      y: center.y,
      rotation: 24,
    },
    body: {
      x: left,
      y: top,
      width,
      height,
      cornerRadius,
      fill: "#f8fafc",
      stroke: "#0f172a",
      strokeWidth,
    },
    sleeve: {
      x: left,
      y: top,
      width: sleeveWidth,
      height,
      cornerRadius: [cornerRadius, 0, 0, cornerRadius],
      fill: "#cbd5e1",
      stroke: "#0f172a",
      strokeWidth,
    },
    divider: {
      points: [dividerX, top, dividerX, bottom],
      stroke: "#0f172a",
      strokeWidth: Math.max(1 / safeScale, strokeWidth * 0.8),
    },
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
