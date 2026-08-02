import { getOrderedElements } from "../rendering/layer-order.js";

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

  function getElementIdAtPointer(fallbackNode) {
    const fallbackId = getElementIdFromNode(fallbackNode);
    if (fallbackId) return fallbackId;

    const stage = getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return getElementIdFromNode(stage.getIntersection(pointer));
  }

  function getCanvasInteractionAtWorldPoint(worldPoint) {
    const stage = getStage();
    if (!stage?.getIntersection || !worldPoint) return null;
    const scale = Math.max(0.01, Number(stage.scaleX?.()) || 1);
    const x = Number(worldPoint.x);
    const y = Number(worldPoint.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const hit = stage.getIntersection({
      x: x * scale + (Number(stage.x?.()) || 0),
      y: y * scale + (Number(stage.y?.()) || 0),
    });
    if (!hit) return null;

    const elementId = getElementIdFromNode(hit);
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

  function getSelectableElementIdAtWorldPoint(worldPoint, {
    fallbackNode = null,
    preferUnselected = false,
    excludeTypes = [],
  } = {}) {
    const contentLayer = getContentLayer();
    const stage = getStage();
    const excludedTypes = new Set(excludeTypes);
    const fallbackId = getElementIdFromNode(fallbackNode);
    const fallbackElement = getElements().find((element) => element.id === fallbackId);
    const selectableFallbackId = !fallbackElement || !excludedTypes.has(fallbackElement.type)
      ? fallbackId
      : null;
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
    getElementIdAtPointer,
    getElementIdFromNode,
    getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint,
    getWebpageInteractionAtWorldPoint,
    isElementLocked,
  };
}
