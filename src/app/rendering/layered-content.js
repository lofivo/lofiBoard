import {
  getCanvasBandCount,
  getCanvasBandIndex,
  getCanvasStackZIndex,
  getOrderedElements,
} from "./layer-order.js";

export function createLayeredContentController({
  Konva,
  stage,
  interactionLayer,
  overlayLayer,
} = {}) {
  const canvasLayers = [];
  const elementBandIndexes = new Map();
  let currentElements = [];

  function createCanvasLayer() {
    const layer = new Konva.Layer({ name: "canvas-content-band" });
    stage.add(layer);
    canvasLayers.push(layer);
    return layer;
  }

  function ensureCanvasLayers(count) {
    while (canvasLayers.length < count) createCanvasLayer();
  }

  function setLayerStackIndex(layer, index) {
    if (typeof layer.setZIndex === "function") {
      layer.setZIndex(index);
      return;
    }
    const children = stage?.children;
    if (!Array.isArray(children)) return;
    const currentIndex = children.indexOf(layer);
    if (currentIndex >= 0) children.splice(currentIndex, 1);
    children.splice(index, 0, layer);
    children.forEach((child, childIndex) => {
      child.index = childIndex;
      child.parent = stage;
    });
  }

  function sync(elements = []) {
    currentElements = getOrderedElements(elements);
    const activeCount = getCanvasBandCount(currentElements);
    ensureCanvasLayers(activeCount);

    const occupiedCanvasBands = new Set([0]);
    elementBandIndexes.clear();
    for (const element of currentElements) {
      const bandIndex = getCanvasBandIndex(currentElements, element.id);
      elementBandIndexes.set(element.id, bandIndex);
      if (element?.type !== "webpage") occupiedCanvasBands.add(bandIndex);
    }

    const orderedStageLayers = [...canvasLayers, interactionLayer, overlayLayer];
    orderedStageLayers.forEach((layer, index) => {
      if (!layer) return;
      if (layer.getParent?.() !== stage) stage.add(layer);
      setLayerStackIndex(layer, index);
    });

    canvasLayers.forEach((layer, index) => {
      const active = index < activeCount && occupiedCanvasBands.has(index);
      layer.visible(active);
      layer.listening(active);
      const canvas = layer.getNativeCanvasElement?.();
      canvas?.style?.setProperty("z-index", String(getCanvasStackZIndex(index)));
      canvas?.style?.setProperty("pointer-events", active ? "auto" : "none");
    });

    const interactionZIndex = getCanvasStackZIndex(canvasLayers.length) + 1;
    const interactionCanvas = interactionLayer?.getNativeCanvasElement?.();
    interactionCanvas?.style?.setProperty("z-index", String(interactionZIndex));
    const overlayCanvas = overlayLayer?.getNativeCanvasElement?.();
    overlayCanvas?.style?.setProperty("z-index", String(interactionZIndex + 1));
  }

  function getLayerForElement(element) {
    const bandIndex = elementBandIndexes.get(element?.id)
      ?? getCanvasBandIndex(currentElements, element?.id);
    ensureCanvasLayers(bandIndex + 1);
    return canvasLayers[bandIndex] ?? canvasLayers[0];
  }

  function destroy() {
    canvasLayers.forEach((layer) => layer.destroy());
    canvasLayers.length = 0;
    elementBandIndexes.clear();
    currentElements = [];
  }

  ensureCanvasLayers(1);
  sync([]);

  return {
    destroy,
    getLayerForElement,
    getLayers: () => [...canvasLayers],
    sync,
  };
}
