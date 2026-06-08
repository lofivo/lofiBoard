import { LINEAR_STRUCTURE_EVENT_TYPES } from "./structure-event-adapter.js";
import { STRUCTURE_ELEMENT_TYPES } from "./types.js";
import { isLinearStructureElement } from "./linear-structure.js";

const SELECT_TOOL = "select";

export function createStructureInteraction() {
  let activeLinearItem = null;
  let activeTreeNode = null;
  let linearItemDragState = null;
  let linearPointerDragState = null;
  let structureConnectState = null;
  let arrayAlgorithmSessions = new Map();
  let arrayAlgorithmPanelStateByElement = new Map();
  let suppressLinearItemSelect = null;
  let suppressedBinaryTreeNodeClickElementIds = new Set();

  function getActiveLinearItem() {
    return activeLinearItem ? { ...activeLinearItem } : null;
  }

  function getLinearItemDragState() {
    return linearItemDragState ? { ...linearItemDragState } : null;
  }

  function getLinearPointerDragState() {
    return linearPointerDragState ? { ...linearPointerDragState } : null;
  }

  function getActiveTreeNode() {
    return activeTreeNode ? { ...activeTreeNode } : null;
  }

  function getStructureConnectState({ kind = null, elementId = null } = {}) {
    if (!structureConnectState) return null;
    if (kind && structureConnectState.kind !== kind) return null;
    if (elementId && structureConnectState.elementId !== elementId) return null;
    return { ...structureConnectState };
  }

  function getArrayAlgorithmPanelState(elementId, defaults = {}) {
    return {
      ...defaults,
      ...(elementId ? arrayAlgorithmPanelStateByElement.get(elementId) ?? {} : {}),
    };
  }

  function setArrayAlgorithmPanelState(elementId, patch = {}, defaults = {}) {
    if (!elementId) return { arrayAlgorithmPanelState: null };
    const nextState = {
      ...getArrayAlgorithmPanelState(elementId, defaults),
      ...patch,
    };
    arrayAlgorithmPanelStateByElement.set(elementId, nextState);
    return { arrayAlgorithmPanelState: { ...nextState } };
  }

  function getArrayAlgorithmSession(elementId) {
    if (!elementId) return null;
    const session = arrayAlgorithmSessions.get(elementId);
    return session ? { ...session } : null;
  }

  function setArrayAlgorithmSession(session) {
    if (!session?.elementId) return { arrayAlgorithmSession: null };
    const nextSession = { ...session };
    arrayAlgorithmSessions.set(session.elementId, nextSession);
    return { arrayAlgorithmSession: { ...nextSession } };
  }

  function deleteArrayAlgorithmSession(elementId) {
    if (!elementId) return { deleted: false };
    return { deleted: arrayAlgorithmSessions.delete(elementId) };
  }

  function deleteArrayAlgorithmState(elementId) {
    if (!elementId) return { deletedSession: false, deletedPanelState: false };
    return {
      deletedSession: arrayAlgorithmSessions.delete(elementId),
      deletedPanelState: arrayAlgorithmPanelStateByElement.delete(elementId),
    };
  }

  function clearArrayAlgorithmSessions() {
    arrayAlgorithmSessions.clear();
    arrayAlgorithmPanelStateByElement.clear();
    return { cleared: true };
  }

  function pauseUnselectedArrayAlgorithmSessions(selectedIds = []) {
    const selected = new Set(selectedIds);
    const pausedElementIds = [];
    for (const [elementId, session] of arrayAlgorithmSessions) {
      if (selected.has(elementId) || !session.isPlaying) continue;
      pausedElementIds.push(elementId);
      arrayAlgorithmSessions.set(elementId, { ...session, isPlaying: false });
    }
    return pausedElementIds;
  }

  function isArrayAlgorithmLocked(elementId) {
    return Boolean(elementId && arrayAlgorithmSessions.has(elementId));
  }

  function suppressNextLinearItemSelect(elementId) {
    suppressLinearItemSelect = elementId ? { elementId } : null;
    return { suppressLinearItemSelect: suppressLinearItemSelect ? { ...suppressLinearItemSelect } : null };
  }

  function clearLinearItemSelectSuppression() {
    suppressLinearItemSelect = null;
    return { suppressLinearItemSelect: null };
  }

  function isLinearItemSelectSuppressed(elementId) {
    return Boolean(elementId && suppressLinearItemSelect?.elementId === elementId);
  }

  function consumeLinearItemSelectSuppression(elementId) {
    if (!isLinearItemSelectSuppressed(elementId)) return false;
    suppressLinearItemSelect = null;
    return true;
  }

  function suppressBinaryTreeNodeClicks(elementIds = []) {
    suppressedBinaryTreeNodeClickElementIds = new Set((elementIds ?? []).filter(Boolean));
    return { suppressedElementIds: [...suppressedBinaryTreeNodeClickElementIds] };
  }

  function consumeSuppressedBinaryTreeNodeClick(elementId) {
    if (!suppressedBinaryTreeNodeClickElementIds.has(elementId)) return false;
    suppressedBinaryTreeNodeClickElementIds.delete(elementId);
    return true;
  }

  function findElement(elements, elementId) {
    return (elements ?? []).find((element) => element.id === elementId) ?? null;
  }

  function isTreeStructureElement(element) {
    return element?.type === STRUCTURE_ELEMENT_TYPES.TREE;
  }

  function normalizeLinearIndex(element, index, fallback = 0) {
    const maxIndex = Math.max(0, (element?.items?.length ?? 1) - 1);
    const numericIndex = Number.isFinite(Number(index)) ? Number(index) : fallback;
    return Math.min(maxIndex, Math.max(0, Math.trunc(numericIndex)));
  }

  function setActiveLinearItem({ elements = [], elementId, index } = {}) {
    const previousActiveLinearItem = getActiveLinearItem();
    const element = findElement(elements, elementId);
    if (!isLinearStructureElement(element)) {
      activeLinearItem = null;
      return {
        previousActiveLinearItem,
        activeLinearItem: null,
      };
    }

    activeLinearItem = {
      elementId,
      index: normalizeLinearIndex(element, index),
    };
    return {
      previousActiveLinearItem,
      activeLinearItem: getActiveLinearItem(),
    };
  }

  function clearActiveLinearItem() {
    const previousActiveLinearItem = getActiveLinearItem();
    activeLinearItem = null;
    return {
      previousActiveLinearItem,
      activeLinearItem: null,
    };
  }

  function syncActiveLinearItemAfterEdit({ elements = [], elementId, preferredIndex = null } = {}) {
    const previousActiveLinearItem = getActiveLinearItem();
    const element = findElement(elements, elementId);
    if (!isLinearStructureElement(element) || activeLinearItem?.elementId !== elementId || (element.items?.length ?? 0) === 0) {
      activeLinearItem = null;
      return {
        previousActiveLinearItem,
        activeLinearItem: null,
      };
    }

    const fallbackIndex = activeLinearItem.index;
    activeLinearItem = {
      elementId,
      index: normalizeLinearIndex(element, preferredIndex ?? fallbackIndex, fallbackIndex),
    };
    return {
      previousActiveLinearItem,
      activeLinearItem: getActiveLinearItem(),
    };
  }

  function syncSelection({ elements = [], selectedIds = [] } = {}) {
    const previousActiveLinearItem = getActiveLinearItem();
    const selected = new Set(selectedIds);
    const selectedLinear = (elements ?? []).find((element) => selected.has(element.id) && isLinearStructureElement(element));
    if (!selectedLinear) {
      activeLinearItem = null;
      return {
        previousActiveLinearItem,
        activeLinearItem: null,
      };
    }
    if (activeLinearItem?.elementId === selectedLinear.id) {
      syncActiveLinearItemAfterEdit({ elements, elementId: selectedLinear.id });
    }
    return {
      previousActiveLinearItem,
      activeLinearItem: getActiveLinearItem(),
    };
  }

  function getActiveLinearIndex(element, fallback = 0) {
    if (activeLinearItem?.elementId === element?.id) {
      return normalizeLinearIndex(element, activeLinearItem.index, fallback);
    }
    return normalizeLinearIndex(element, fallback, fallback);
  }

  function getRuntimeProjection(element) {
    const runtime = {};
    if (isLinearStructureElement(element) && activeLinearItem?.elementId === element.id) {
      runtime.activeIndex = getActiveLinearIndex(element, activeLinearItem.index);
    }
    if (isLinearStructureElement(element) && linearItemDragState?.elementId === element.id) {
      Object.assign(runtime, {
        dragIndex: linearItemDragState.fromIndex,
        dragGap: linearItemDragState.previewGap,
        dragX: linearItemDragState.dragX,
        dragY: linearItemDragState.dragY,
        dragLift: linearItemDragState.longPressTriggered,
      });
    }
    if (isTreeStructureElement(element) && activeTreeNode?.elementId === element.id) {
      runtime.activeNodeId = activeTreeNode.nodeId;
    }
    return runtime;
  }

  function projectRuntime(element) {
    const runtime = getRuntimeProjection(element);
    if (Object.keys(runtime).length === 0) return element;
    return {
      ...element,
      runtime: {
        ...(element.runtime ?? {}),
        ...runtime,
      },
    };
  }

  function handleEvent(event, context = {}) {
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT) {
      return handleLinearItemSelectEvent(event, context);
    }
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS) {
      return handleLinearItemPressEvent(event, context);
    }
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_RELEASE) {
      return handleLinearItemReleaseEvent();
    }
    return { handled: false };
  }

  function beginLinearItemDrag({
    elementId,
    fromIndex,
    pointerOffsetX,
    pointerOffsetY,
    dragX,
    dragY,
    previewGap,
  } = {}) {
    linearItemDragState = {
      elementId,
      fromIndex: Math.max(0, Math.trunc(Number(fromIndex) || 0)),
      pointerOffsetX: Number(pointerOffsetX) || 0,
      pointerOffsetY: Number(pointerOffsetY) || 0,
      dragX: Number(dragX) || 0,
      dragY: Number(dragY) || 0,
      previewGap: Math.max(0, Math.trunc(Number(previewGap) || 0)),
      lastAnimatedGap: Math.max(0, Math.trunc(Number(previewGap) || 0)),
      longPressTriggered: false,
      cancelled: false,
    };
    return { linearItemDragState: getLinearItemDragState() };
  }

  function updateLinearItemDrag(patch = {}) {
    if (!linearItemDragState) return { linearItemDragState: null };
    linearItemDragState = {
      ...linearItemDragState,
      ...patch,
    };
    return { linearItemDragState: getLinearItemDragState() };
  }

  function markLinearItemDragLifted() {
    return updateLinearItemDrag({ longPressTriggered: true });
  }

  function finishLinearItemDrag() {
    const previousState = getLinearItemDragState();
    linearItemDragState = null;
    return { linearItemDragState: previousState };
  }

  function clearLinearItemDrag() {
    linearItemDragState = null;
    return { linearItemDragState: null };
  }

  function hasLinearItemDragState() {
    return Boolean(linearItemDragState);
  }

  function beginLinearPointerDrag({
    elementId,
    fromIndex,
    nextIndex,
    hadPointer = true,
  } = {}) {
    const normalizedFromIndex = Math.max(0, Math.trunc(Number(fromIndex) || 0));
    const normalizedNextIndex = Math.max(0, Math.trunc(Number(nextIndex) || 0));
    linearPointerDragState = {
      elementId,
      fromIndex: normalizedFromIndex,
      nextIndex: normalizedNextIndex,
      didMove: normalizedNextIndex !== normalizedFromIndex || !hadPointer,
    };
    return { linearPointerDragState: getLinearPointerDragState() };
  }

  function updateLinearPointerDrag({ nextIndex } = {}) {
    if (!linearPointerDragState) return { linearPointerDragState: null };
    const normalizedNextIndex = Math.max(0, Math.trunc(Number(nextIndex) || 0));
    linearPointerDragState = {
      ...linearPointerDragState,
      nextIndex: normalizedNextIndex,
      didMove: linearPointerDragState.didMove || normalizedNextIndex !== linearPointerDragState.fromIndex,
    };
    return { linearPointerDragState: getLinearPointerDragState() };
  }

  function finishLinearPointerDrag() {
    const previousState = getLinearPointerDragState();
    linearPointerDragState = null;
    return { linearPointerDragState: previousState };
  }

  function clearLinearPointerDrag() {
    linearPointerDragState = null;
    return { linearPointerDragState: null };
  }

  function hasLinearPointerDragState() {
    return Boolean(linearPointerDragState);
  }

  function setActiveTreeNode({ elementId, nodeId } = {}) {
    const previousActiveTreeNode = getActiveTreeNode();
    activeTreeNode = elementId && nodeId ? { elementId, nodeId } : null;
    return {
      previousActiveTreeNode,
      activeTreeNode: getActiveTreeNode(),
    };
  }

  function clearActiveTreeNode() {
    const previousActiveTreeNode = getActiveTreeNode();
    activeTreeNode = null;
    return {
      previousActiveTreeNode,
      activeTreeNode: null,
    };
  }

  function beginStructureConnect({ kind, elementId } = {}) {
    structureConnectState = kind && elementId
      ? { kind, elementId, sourceNodeId: null }
      : null;
    return { structureConnectState: getStructureConnectState() };
  }

  function setStructureConnectSource({ kind, elementId, sourceNodeId } = {}) {
    const state = getStructureConnectState({ kind, elementId });
    if (!state || !sourceNodeId) {
      return { structureConnectState: state };
    }
    structureConnectState = {
      kind: state.kind,
      elementId: state.elementId,
      sourceNodeId,
    };
    return { structureConnectState: getStructureConnectState() };
  }

  function finishStructureConnect({ kind, elementId, targetNodeId } = {}) {
    const state = getStructureConnectState({ kind, elementId });
    if (!state?.sourceNodeId || !targetNodeId) {
      return {
        structureConnectState: state,
        connection: null,
      };
    }
    structureConnectState = null;
    return {
      structureConnectState: null,
      connection: {
        kind: state.kind,
        elementId: state.elementId,
        sourceNodeId: state.sourceNodeId,
        targetNodeId,
      },
    };
  }

  function clearStructureConnectState() {
    const previousStructureConnectState = getStructureConnectState();
    structureConnectState = null;
    return {
      previousStructureConnectState,
      structureConnectState: null,
    };
  }

  function handleLinearItemSelectEvent(event, {
    elements = [],
    currentTool = SELECT_TOOL,
    isTemporaryPanActive = false,
    isLinearItemSelectSuppressed = false,
  } = {}) {
    if (isTemporaryPanActive || currentTool !== SELECT_TOOL) return { handled: false };
    const element = findElement(elements, event.elementId);
    if (!isLinearStructureElement(element) || element.locked) return { handled: false };
    if (isLinearItemSelectSuppressed || consumeLinearItemSelectSuppression(event.elementId)) {
      return { handled: true, clearSuppression: true };
    }

    const result = setActiveLinearItem({
      elements,
      elementId: event.elementId,
      index: event.index,
    });
    return {
      handled: true,
      selectedIds: [event.elementId],
      render: false,
      clearSuppression: false,
      ...result,
    };
  }

  function handleLinearItemPressEvent(event, {
    elements = [],
    currentTool = SELECT_TOOL,
    isTemporaryPanActive = false,
  } = {}) {
    if (isTemporaryPanActive || currentTool !== SELECT_TOOL) return { handled: false };
    const element = findElement(elements, event.elementId);
    if (!isLinearStructureElement(element) || element.locked) return { handled: false };
    return {
      handled: true,
      clearSuppression: true,
      suppressSelectionDragOnce: false,
      stopElementDrag: true,
      pressState: {
        elementId: event.elementId,
        index: normalizeLinearIndex(element, event.index),
        phase: "start",
      },
    };
  }

  function handleLinearItemReleaseEvent() {
    return {
      handled: true,
      resetLinearItemPressState: !linearItemDragState,
    };
  }

  return {
    getActiveLinearItem,
    getActiveTreeNode,
    getStructureConnectState,
    getLinearItemDragState,
    getLinearPointerDragState,
    getArrayAlgorithmPanelState,
    setArrayAlgorithmPanelState,
    getArrayAlgorithmSession,
    setArrayAlgorithmSession,
    deleteArrayAlgorithmSession,
    deleteArrayAlgorithmState,
    clearArrayAlgorithmSessions,
    pauseUnselectedArrayAlgorithmSessions,
    isArrayAlgorithmLocked,
    suppressNextLinearItemSelect,
    clearLinearItemSelectSuppression,
    isLinearItemSelectSuppressed,
    consumeSuppressedBinaryTreeNodeClick,
    suppressBinaryTreeNodeClicks,
    setActiveLinearItem,
    clearActiveLinearItem,
    syncActiveLinearItemAfterEdit,
    syncSelection,
    getActiveLinearIndex,
    getRuntimeProjection,
    projectRuntime,
    beginLinearItemDrag,
    updateLinearItemDrag,
    markLinearItemDragLifted,
    finishLinearItemDrag,
    clearLinearItemDrag,
    hasLinearItemDragState,
    beginLinearPointerDrag,
    updateLinearPointerDrag,
    finishLinearPointerDrag,
    clearLinearPointerDrag,
    hasLinearPointerDragState,
    setActiveTreeNode,
    clearActiveTreeNode,
    beginStructureConnect,
    setStructureConnectSource,
    finishStructureConnect,
    clearStructureConnectState,
    handleEvent,
  };
}
