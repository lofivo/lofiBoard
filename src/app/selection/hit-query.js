import { getOrderedElements } from "../rendering/layer-order.js";

const NON_CONTENT_LAYER_NAMES = new Set([
  "selection-overlay-layer",
  "canvas-interaction-layer",
]);

export function createSelectionHitQuery({
  getStage,
  getContentLayer,
  getElements,
  getSelectedIds,
  getSelectionHitRadius,
  pickElementIdAtPoint,
  pointHitsSelectionBounds,
  expandGroupedIds: expandSelectionGroupIds,
}) {
  function getElementIdFromNode(node) {
    const stage = getStage();
    if (!node || node === stage) return null;
    const elementNode = node.hasName?.("element") ? node : node.findAncestor?.(".element");
    return elementNode?.id() ?? null;
  }

  function getStagePointerFromWorldPoint(worldPoint) {
    const stage = getStage();
    if (!stage || !worldPoint) return null;
    const scale = Math.max(0.01, Number(stage.scaleX?.()) || 1);
    const x = Number(worldPoint.x);
    const y = Number(worldPoint.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      x: x * scale + (Number(stage.x?.()) || 0),
      y: y * scale + (Number(stage.y?.()) || 0),
    };
  }

  function getStageLayers(stage) {
    if (!stage) return [];
    if (typeof stage.getLayers === "function") {
      const layers = stage.getLayers();
      if (Array.isArray(layers)) return layers;
    }
    return Array.isArray(stage.children) ? stage.children : [];
  }

  function getLayerName(layer) {
    if (!layer) return "";
    if (typeof layer.name === "function") return layer.name() || "";
    return layer.attrs?.name || layer.name || "";
  }

  // 只在内容带上做像素命中，跳过 Transformer / 交互护罩层，
  // 这样已选中元素的背板不会吞掉内部矩形、椭圆等真实图形。
  function getContentElementIdAtWorldPoint(worldPoint) {
    const stage = getStage();
    const pointer = getStagePointerFromWorldPoint(worldPoint);
    if (!stage || !pointer) return null;

    const layers = getStageLayers(stage);
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const layer = layers[index];
      if (!layer || typeof layer.getIntersection !== "function") continue;
      if (layer.isVisible?.() === false) continue;
      if (NON_CONTENT_LAYER_NAMES.has(getLayerName(layer))) continue;

      const elementId = getElementIdFromNode(layer.getIntersection(pointer));
      if (elementId) return elementId;
    }

    return null;
  }

  function getElementIdAtPointer(fallbackNode) {
    const fallbackId = getElementIdFromNode(fallbackNode);
    if (fallbackId) return fallbackId;

    const stage = getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return getElementIdFromNode(stage.getIntersection(pointer));
  }

  function getCanvasInteractionAtWorldPoint(worldPoint) {
    const elementId = getContentElementIdAtWorldPoint(worldPoint);
    if (!elementId) return null;

    const element = getElements().find((candidate) => candidate.id === elementId);
    if (element?.type === "webpage") return null;

    return {
      blocksWebpage: true,
      elementId,
    };
  }

  function getWebpageInteractionAtWorldPoint(worldPoint) {
    if (!worldPoint) return null;

    const elements = getElements();
    const orderedElements = getOrderedElements(elements);
    const canvasInteraction = getCanvasInteractionAtWorldPoint(worldPoint);
    const canvasElement = elements.find((element) => element.id === canvasInteraction?.elementId);
    const canvasIndex = canvasElement ? orderedElements.indexOf(canvasElement) : -1;
    const contentLayer = getContentLayer();

    for (const webpageElement of [...orderedElements].reverse()) {
      if (webpageElement?.type !== "webpage") continue;
      const node = contentLayer.findOne(`#${webpageElement.id}`);
      const box = node?.getClientRect?.({ relativeTo: contentLayer });
      if (!box || !pointHitsSelectionBounds(worldPoint, [box], 0)) continue;

      const webpageIndex = orderedElements.indexOf(webpageElement);
      const canvasIsAboveWebpage = canvasElement && webpageIndex >= 0
        ? canvasIndex > webpageIndex
        : Boolean(canvasInteraction?.blocksWebpage);
      return {
        blocksWebpage: Boolean(canvasInteraction?.blocksWebpage && canvasIsAboveWebpage),
        canvasElementId: canvasInteraction?.elementId ?? null,
        elementId: webpageElement.id,
      };
    }

    return null;
  }

  function resolveSelectableFallbackId(worldPoint, fallbackNode, excludedTypes) {
    // 内容层真实命中优先：覆盖 Transformer 背板点击、未填充外框内部点到内层图形等场景。
    const geometryId = getContentElementIdAtWorldPoint(worldPoint);
    const nodeId = getElementIdFromNode(fallbackNode);
    const rawId = geometryId ?? nodeId;
    if (!rawId) return null;

    const element = getElements().find((candidate) => candidate.id === rawId);
    // 与旧逻辑一致：找不到元素时仍保留 fallbackId；仅在类型被显式排除时丢弃。
    if (element && excludedTypes.has(element.type)) return null;
    return rawId;
  }

  function getSelectableElementIdAtWorldPoint(worldPoint, {
    fallbackNode = null,
    preferUnselected = false,
    excludeTypes = [],
  } = {}) {
    const contentLayer = getContentLayer();
    const stage = getStage();
    const excludedTypes = new Set(excludeTypes);
    const selectableFallbackId = resolveSelectableFallbackId(worldPoint, fallbackNode, excludedTypes);
    const candidates = getElements().filter((element) => !excludedTypes.has(element?.type)).map((element) => {
      const node = contentLayer.findOne(`#${element.id}`);
      if (!node) return null;
      return {
        id: element.id,
        zIndex: element.zIndex,
        box: node.getClientRect({ relativeTo: contentLayer }),
      };
    }).filter(Boolean);

    return pickElementIdAtPoint({
      point: worldPoint,
      candidates,
      padding: getSelectionHitRadius(stage.scaleX()),
      fallbackId: selectableFallbackId,
      selectedIds: getSelectedIds(),
      preferUnselected,
    });
  }

  function getNearbySelectedElementId(worldPoint) {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return null;

    const contentLayer = getContentLayer();
    const stage = getStage();
    const padding = getSelectionHitRadius(stage.scaleX());
    const boxes = selectedIds
      .map((id) => contentLayer.findOne(`#${id}`))
      .filter(Boolean)
      .map((node) => node.getClientRect({ relativeTo: contentLayer }));

    return pointHitsSelectionBounds(worldPoint, boxes, padding) ? selectedIds[0] : null;
  }

  function expandGroupedIds(ids) {
    return expandSelectionGroupIds(ids, getElements());
  }

  function isElementLocked(id) {
    return Boolean(getElements().find((element) => element.id === id)?.locked);
  }

  return {
    expandGroupedIds,
    getCanvasInteractionAtWorldPoint,
    getContentElementIdAtWorldPoint,
    getElementIdAtPointer,
    getElementIdFromNode,
    getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint,
    getWebpageInteractionAtWorldPoint,
    isElementLocked,
  };
}
