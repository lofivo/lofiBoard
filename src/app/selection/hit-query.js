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
    getElementIdAtPointer,
    getElementIdFromNode,
    getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint,
    isElementLocked,
  };
}
