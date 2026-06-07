export function createSelectionController({ initialSelectedIds = [] } = {}) {
  let selectedIds = uniqueIds(initialSelectedIds);

  function getSelectedIds() {
    return [...selectedIds];
  }

  function setSelectedIds(ids) {
    selectedIds = uniqueIds(ids);
    return getSelectedIds();
  }

  function selectElementById(id, { additive = false, elements = [] } = {}) {
    const ids = expandGroupedIds([id], elements);
    if (!additive) return setSelectedIds(ids);

    const next = selectedIds.some((selectedId) => ids.includes(selectedId))
      ? selectedIds.filter((selectedId) => !ids.includes(selectedId))
      : [...selectedIds, ...ids];
    return setSelectedIds(next);
  }

  function toggleSelection(id) {
    if (selectedIds.includes(id)) {
      return setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
    return setSelectedIds([...selectedIds, id]);
  }

  function clearSelectionIds() {
    return setSelectedIds([]);
  }

  return {
    getSelectedIds,
    setSelectedIds,
    selectElementById,
    toggleSelection,
    clearSelectionIds,
  };
}

export function expandGroupedIds(ids, elements = []) {
  const requested = new Set(ids.filter(Boolean));
  const groupIds = new Set(
    elements
      .filter((element) => requested.has(element.id) && element.groupId)
      .map((element) => element.groupId),
  );
  if (groupIds.size === 0) return [...requested];
  return elements
    .filter((element) => requested.has(element.id) || groupIds.has(element.groupId))
    .map((element) => element.id);
}

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}
