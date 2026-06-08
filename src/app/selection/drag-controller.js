export function createSelectionDragController({
  contentLayer,
  enterDragging = () => {},
  getElementIdFromNode = () => null,
  getElements = () => [],
  getSelectedIds = () => [],
  getSuppressSelectionDragOnce = () => false,
  isBinaryTreeElement = () => false,
  isElementDraggable = () => false,
  isElementLocked = () => false,
  isLinearGestureElement = () => false,
  isLinearStructureElement = () => false,
  pushHistory = () => {},
  renderBoard = () => {},
  selectElementById = () => {},
  setElements = () => {},
  setHandledNodeDragEnd = () => {},
  setSuppressNextSelectionClick = () => {},
  snapNodeToAlignment = () => {},
  structureInteraction,
  suppressNextLinearItemSelect = () => {},
  syncNodeToElement = () => {},
  syncTextOverlays = () => {},
  transformer,
  updateTreeControlsPosition = () => {},
} = {}) {
  let selectionDrag = null;
  let nodeDragSelection = null;
  let suppressedNodeDragElementId = null;

  function getElement(elementId) {
    return (getElements?.() ?? []).find((item) => item.id === elementId) ?? null;
  }

  function beginSelectionDrag(worldPoint) {
    if (structureInteraction.hasLinearItemDragState()) return false;
    enterDragging();
    selectionDrag = {
      start: worldPoint,
      moved: false,
      originals: getSelectedIds()
        .filter((id) => !isElementLocked(id))
        .map((id) => {
          const element = getElement(id);
          return {
            id,
            x: Number(element?.x ?? 0),
            y: Number(element?.y ?? 0),
          };
        }),
    };
    setSelectionDragNodeDraggable(false);
    return true;
  }

  function updateSelectionDrag(worldPoint) {
    if (!selectionDrag) return false;
    const dx = worldPoint.x - selectionDrag.start.x;
    const dy = worldPoint.y - selectionDrag.start.y;
    selectionDrag.moved = selectionDrag.moved || Math.hypot(dx, dy) > 0.5;
    const originals = new Map(selectionDrag.originals.map((item) => [item.id, item]));
    setElements(getElements().map((element) => {
      const original = originals.get(element.id);
      if (!original) return element;
      return {
        ...element,
        x: original.x + dx,
        y: original.y + dy,
      };
    }));
    renderBoard();
    updateTreeControlsPosition();
    return true;
  }

  function finishSelectionDrag() {
    if (!selectionDrag) return false;
    const didMove = selectionDrag.moved;
    if (didMove) suppressBinaryTreeNodeClickAfterDrag();
    if (didMove) suppressLinearItemSelectAfterSelectionDrag();
    if (didMove) setSuppressNextSelectionClick(true);
    setSelectionDragNodeDraggable(true);
    selectionDrag = null;
    if (didMove) {
      pushHistory("已移动对象");
    }
    return didMove;
  }

  function cancelSelectionDrag() {
    setSelectionDragNodeDraggable(true);
    selectionDrag = null;
  }

  function setSelectionDragNodeDraggable(enabled) {
    selectionDrag?.originals.forEach(({ id }) => {
      const element = getElement(id);
      contentLayer.findOne(`#${id}`)?.draggable(Boolean(enabled) && isElementDraggable(element) && !isLinearGestureElement(id));
    });
  }

  function isSelectionDragElement(elementId) {
    return Boolean(selectionDrag?.originals.some((item) => item.id === elementId));
  }

  function hasSelectionDrag() {
    return Boolean(selectionDrag);
  }

  function suppressBinaryTreeNodeClickAfterDrag() {
    structureInteraction.suppressBinaryTreeNodeClicks(
      selectionDrag?.originals
        .map(({ id }) => getElement(id))
        .filter(isBinaryTreeElement)
        .map((element) => element.id) ?? [],
    );
  }

  function consumeSuppressedBinaryTreeNodeClick(elementId) {
    return structureInteraction.consumeSuppressedBinaryTreeNodeClick(elementId);
  }

  function suppressLinearItemSelectAfterSelectionDrag() {
    const draggedLinearElement = selectionDrag?.originals
      .map(({ id }) => getElement(id))
      .find(isLinearStructureElement);
    if (draggedLinearElement) suppressNextLinearItemSelect(draggedLinearElement.id);
  }

  function beginNodeDragSelection(node) {
    const id = getElementIdFromNode(node);
    if (id && (isLinearGestureElement(id) || getSuppressSelectionDragOnce())) {
      suppressedNodeDragElementId = id;
      node.stopDrag?.();
      nodeDragSelection = null;
      return false;
    }
    if (selectionDrag) {
      node.stopDrag?.();
      nodeDragSelection = null;
      return false;
    }
    if (!id) {
      nodeDragSelection = null;
      return false;
    }
    if (!getSelectedIds().includes(id)) {
      selectElementById(id);
      return beginNodeDragSelection(node);
    }

    nodeDragSelection = {
      id,
      start: {
        x: node.x(),
        y: node.y(),
      },
      moved: false,
      originals: getSelectedIds()
        .filter((selectedId) => !isElementLocked(selectedId))
        .map((selectedId) => {
          const element = getElement(selectedId);
          return {
            id: selectedId,
            x: Number(element?.x ?? 0),
            y: Number(element?.y ?? 0),
          };
        }),
    };
    return true;
  }

  function updateNodeDragSelection(node) {
    if (!nodeDragSelection) return false;
    if (isLinearGestureElement(nodeDragSelection.id)) {
      suppressedNodeDragElementId = nodeDragSelection.id;
      node.stopDrag?.();
      nodeDragSelection = null;
      return false;
    }
    const dx = node.x() - nodeDragSelection.start.x;
    const dy = node.y() - nodeDragSelection.start.y;
    nodeDragSelection.moved = nodeDragSelection.moved || Math.hypot(dx, dy) > 0.5;
    for (const original of nodeDragSelection.originals) {
      if (original.id === nodeDragSelection.id) continue;
      const selectedNode = contentLayer.findOne(`#${original.id}`);
      selectedNode?.position({
        x: original.x + dx,
        y: original.y + dy,
      });
    }
    setElements(getElements().map((element) => {
      const original = nodeDragSelection.originals.find((item) => item.id === element.id);
      if (!original) return element;
      return {
        ...element,
        x: original.x + dx,
        y: original.y + dy,
      };
    }));
    transformer.forceUpdate();
    contentLayer.batchDraw();
    updateTreeControlsPosition();
    syncTextOverlays();
    return true;
  }

  function finishNodeDragSelection(node) {
    const dragSelection = nodeDragSelection;
    nodeDragSelection = null;
    const nodeId = getElementIdFromNode(node);

    if (suppressedNodeDragElementId && suppressedNodeDragElementId === nodeId) {
      suppressedNodeDragElementId = null;
      return false;
    }

    if (!dragSelection) {
      return false;
    }

    if (dragSelection.originals.length <= 1) {
      snapNodeToAlignment(node);
      syncNodeToElement(node);
      setHandledNodeDragEnd(true);
      pushHistory("已移动对象");
      return true;
    }

    renderBoard();
    if (dragSelection.moved) {
      setHandledNodeDragEnd(true);
      pushHistory("已移动对象");
    }
    return dragSelection.moved;
  }

  function clearRootDragState(elementId) {
    suppressedNodeDragElementId = elementId;
    contentLayer.findOne(`#${elementId}`)?.stopDrag();
    nodeDragSelection = null;
    cancelSelectionDrag();
  }

  return {
    beginNodeDragSelection,
    beginSelectionDrag,
    cancelSelectionDrag,
    clearRootDragState,
    consumeSuppressedBinaryTreeNodeClick,
    finishNodeDragSelection,
    finishSelectionDrag,
    hasSelectionDrag,
    isSelectionDragElement,
    updateNodeDragSelection,
    updateSelectionDrag,
  };
}
