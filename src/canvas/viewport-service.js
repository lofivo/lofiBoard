export function computeFitViewport({ bounds, stageSize, padding = 96, minScale = 0.12, maxScale = 4 }) {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0 || stageSize.width <= 0 || stageSize.height <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  const availableWidth = Math.max(1, stageSize.width - padding * 2);
  const availableHeight = Math.max(1, stageSize.height - padding * 2);
  const scale = clamp(
    Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
    minScale,
    maxScale,
  );

  return {
    x: stageSize.width / 2 - (bounds.x + bounds.width / 2) * scale,
    y: stageSize.height / 2 - (bounds.y + bounds.height / 2) * scale,
    scale,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
