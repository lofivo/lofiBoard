export function createLayerSnapshotQuery({ reorderElements, getElementLabel }) {
  let cachedElements = null;
  let cachedSnapshot = [];

  function getSnapshot(elements = []) {
    if (elements === cachedElements) return cachedSnapshot;

    const ordered = reorderElements(elements);
    const layerLevels = new Map(ordered.map((element, index) => [element.id, index]));
    cachedElements = elements;
    cachedSnapshot = ordered.slice().reverse().map((element) => ({
      id: element.id,
      name: getElementLabel(element),
      level: layerLevels.get(element.id) ?? 0,
      type: element.type,
      locked: element.locked ?? false,
      groupId: element.groupId,
    }));
    return cachedSnapshot;
  }

  return { getSnapshot };
}
