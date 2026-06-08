export function splitCommaValues(input) {
  return String(input ?? "")
    .split(/[,\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeStructureBounds(element, defaultStyle) {
  const style = { ...defaultStyle, ...(element.style ?? {}) };
  const radius = Number(style.nodeRadius) || 24;
  const nodes = element.nodes ?? [];
  if (nodes.length === 0) {
    return {
      ...element,
      width: Math.max(radius * 2, Number(element.width) || radius * 2),
      height: Math.max(radius * 2, Number(element.height) || radius * 2),
      style,
    };
  }
  const minX = Math.min(...nodes.map((node) => Number(node.x) || 0)) - radius;
  const minY = Math.min(...nodes.map((node) => Number(node.y) || 0)) - radius;
  const maxX = Math.max(...nodes.map((node) => Number(node.x) || 0)) + radius;
  const maxY = Math.max(...nodes.map((node) => Number(node.y) || 0)) + radius;
  const shiftX = Math.min(0, minX);
  const shiftY = Math.min(0, minY);
  const nextNodes = nodes.map((node) => ({
    ...node,
    x: (Number(node.x) || 0) - shiftX,
    y: (Number(node.y) || 0) - shiftY,
  }));
  return {
    ...element,
    x: (Number(element.x) || 0) + shiftX,
    y: (Number(element.y) || 0) + shiftY,
    width: Math.max(Number(element.width) || 0, maxX - shiftX),
    height: Math.max(Number(element.height) || 0, maxY - shiftY),
    nodes: nextNodes,
    style,
  };
}
