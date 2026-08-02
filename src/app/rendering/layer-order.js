export function getElementLayerValue(element, fallbackIndex = 0) {
  const value = Number(element?.zIndex);
  return Number.isFinite(value) ? value : fallbackIndex;
}

export function getOrderedElements(elements = []) {
  return elements
    .map((element, index) => ({ element, index }))
    .sort((left, right) => (
      getElementLayerValue(left.element, left.index) - getElementLayerValue(right.element, right.index)
      || left.index - right.index
    ))
    .map(({ element }) => element);
}

export function getCanvasBandCount(elements = []) {
  return elements.filter((element) => element?.type === "webpage").length + 1;
}

export function getCanvasBandIndex(elements = [], elementId) {
  const ordered = getOrderedElements(elements);
  const elementIndex = ordered.findIndex((element) => element?.id === elementId);
  if (elementIndex < 0) return 0;
  return ordered
    .slice(0, elementIndex)
    .filter((element) => element?.type === "webpage")
    .length;
}

export function getWebpageStackIndex(elements = [], elementId) {
  const ordered = getOrderedElements(elements);
  const elementIndex = ordered.findIndex((element) => element?.id === elementId);
  if (elementIndex < 0) return 0;
  return ordered
    .slice(0, elementIndex)
    .filter((element) => element?.type === "webpage")
    .length;
}

export function getCanvasStackZIndex(bandIndex) {
  return Math.max(0, Number(bandIndex) || 0) * 2;
}

export function getWebpageStackZIndex(pageIndex) {
  return getCanvasStackZIndex(pageIndex) + 1;
}
