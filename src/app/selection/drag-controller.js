export function createSelectionDragController({
  contentLayer,
  clearAlignmentGuides = () => {},
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
  snapBoxToAlignment = () => ({ dx: 0, dy: 0, snapX: null, snapY: null }),
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

  function getSelectionDragUnionBox(originals, dx, dy) {
    const boxes = [];
    for (const original of originals) {
      const node = contentLayer.findOne(`#${original.id}`);
      if (!node?.getClientRect) continue;
      const box = node.getClientRect({ relativeTo: contentLayer });
      if (!Number.isFinite(box?.x) || !Number.isFinite(box?.y)) continue;
      const shiftX = (original.x + dx) - node.x();
      const shiftY = (original.y + dy) - node.y();
      boxes.push({
        x: box.x + shiftX,
        y: box.y + shiftY,
        width: box.width,
        height: box.height,
      });
    }
    if (boxes.length === 0) return null;

    const minX = Math.min(...boxes.map((box) => box.x));
    const minY = Math.min(...boxes.map((box) => box.y));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    const maxY = Math.max(...boxes.map((box) => box.y + box.height));
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  function updateSelectionDrag(worldPoint) {
    if (!selectionDrag) return false;
    let dx = worldPoint.x - selectionDrag.start.x;
    let dy = worldPoint.y - selectionDrag.start.y;
    selectionDrag.moved = selectionDrag.moved || Math.hypot(dx, dy) > 0.5;
    const originals = selectionDrag.originals;
    const excludeIds = originals.map((item) => item.id);
    const movingBox = getSelectionDragUnionBox(originals, dx, dy);
    if (movingBox) {
      const snap = snapBoxToAlignment(movingBox, {
        excludeIds,
        showGuides: true,
      });
      dx += snap.dx;
      dy += snap.dy;
    } else {
      clearAlignmentGuides();
    }

    const originalMap = new Map(originals.map((item) => [item.id, item]));
    setElements(getElements().map((element) => {
      const original = originalMap.get(element.id);
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
    clearAlignmentGuides();
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
    clearAlignmentGuides();
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
    // 吸附目标排除随拖拽移动的元素;锁定元素不在 originals 中,保持为静止参照
    snapNodeToAlignment(node, {
      excludeIds: nodeDragSelection.originals.map((item) => item.id),
      showGuides: true,
    });
    const snappedDx = node.x() - nodeDragSelection.start.x;
    const snappedDy = node.y() - nodeDragSelection.start.y;
    for (const original of nodeDragSelection.originals) {
      if (original.id === nodeDragSelection.id) continue;
      const selectedNode = contentLayer.findOne(`#${original.id}`);
      selectedNode?.position({
        x: original.x + snappedDx,
        y: original.y + snappedDy,
      });
    }
    setElements(getElements().map((element) => {
      const original = nodeDragSelection.originals.find((item) => item.id === element.id);
      if (!original) return element;
      return {
        ...element,
        x: original.x + snappedDx,
        y: original.y + snappedDy,
      };
    }));
    transformer.forceUpdate();
    contentLayer.batchDraw();
    updateTreeControlsPosition();
    syncTextOverlays();
    return true;
  }

  function finishNodeDragSelection(node) {
    clearAlignmentGuides();
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
      snapNodeToAlignment(node, {
        excludeIds: dragSelection.originals.map((item) => item.id),
      });
      syncNodeToElement(node, { positionOnly: true });
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
    clearAlignmentGuides();
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
