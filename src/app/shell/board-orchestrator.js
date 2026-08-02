import {
  createElementNode,
  createNodeAttrs,
  syncCoordinatePlaneNodeContent,
  syncTextNodeContent,
  syncTextNodeSize,
  syncWebpageNodeContent,
} from "../../canvas/konva-elements.js";
import { applyMeasuredTextHeights } from "../editing/text-element-measure.js";
import { reorderElements } from "../../board/model.js";
import { TOOLS } from "../../ui/config.js";

/**
 * 画板编排模块（Board Orchestrator）
 *
 * 从 createWhiteboardApp 中提取的跨切面编排逻辑，协调选区、形状渲染、
 * 结构控件和文本 overlay 之间的调用顺序。通过依赖注入接收所有协作者，
 * 使编排逻辑可隔离测试（mock controller 验证调用序列）。
 */
export function createBoardOrchestrator({
  contentLayer,
  overlayLayer,
  syncContentLayers = () => {},
  syncCanvasInteractionShield = () => {},
  transformer,
  shapeRenderController,
  selectionTransformerController,
  selectionTransformCommitController,
  structureControlsController,
  structureActiveVisualController,
  textOverlayController,
  webpageOverlayController = { sync() {} },
  draftInteractionController,
  editController,
  selectionController,
  selectionDragController,
  linearGestureController,
  structureInteraction,
  linearStructureEventAdapter,
  getElements,
  setElements,
  getSelectedIds,
  setSelectedIds,
  getCurrentTool,
  getSuppressNextSelectionClick,
  setSuppressNextSelectionClick,
  shouldElementBeDraggable,
  isTemporaryPanActive,
  isLinearPointerGestureElement,
  isSelectionDragElement,
  isArrayAlgorithmLocked,
  getElementIdFromNode,
  isElementLocked,
  pauseUnselectedArrayAlgorithmSessions,
  updateChrome,
  pushHistory,
  cancelLinearItemDragPreview,
  moveArrayStructureItem,
  editArrayStructureItem,
  editMatrixStructureItem,
  moveGraphStructureNode,
  handleGraphNodeClick,
  handleGraphNodeDragStart,
  editGraphStructureNode,
  editGraphStructureEdge,
  editTreeStructureNode,
  handleTreeNodeClick,
  handleTreeStructureNodePress,
  moveTreeStructureNode,
  connectTreeStructureNodes,
}) {
  function shouldUseNativeDrag(element) {
    return element?.type !== "webpage" && shouldElementBeDraggable(element);
  }

  // ── Group C: 结构视觉同步（薄委托） ──

  function syncLinearItemActiveVisual(elementId) {
    structureActiveVisualController.syncLinearItemActiveVisual(elementId);
  }

  function syncBinaryTreeActiveVisual(elementId) {
    structureActiveVisualController.syncBinaryTreeActiveVisual(elementId);
  }

  function syncGeneralTreeActiveVisual(elementId) {
    structureActiveVisualController.syncGeneralTreeActiveVisual(elementId);
  }

  function syncGraphActiveVisual(elementId) {
    structureActiveVisualController.syncGraphActiveVisual(elementId);
  }

  // ── Group A: 核心编排 ──

  function syncSelectionNodes() {
    selectionTransformerController.syncSelectionNodes();
  }

  function syncTextOverlays({ hiddenIds = editController.isEditing ? getSelectedIds() : [], elements = getElements() } = {}) {
    const measuredElements = elements;
    textOverlayController.setHiddenIds(hiddenIds);
    const syncPromise = textOverlayController.sync(elements);
    void syncPromise.then((measurements) => {
      if (measuredElements !== getElements()) return;
      const result = applyMeasuredTextHeights(getElements(), measurements);
      if (!result.changed) return;
      setElements(result.elements);
      for (const element of getElements()) {
        const measuredHeight = result.heightById.get(element.id);
        if (element.type !== "text" || !measuredHeight) continue;
        syncTextNodeSize(contentLayer.findOne(`#${element.id}`), {
          width: element.width,
          height: element.height,
          padding: element.padding ?? 0,
        });
      }
      transformer.forceUpdate();
      contentLayer.batchDraw();
      overlayLayer.batchDraw();
    });
    return syncPromise;
  }

  function renderBoard() {
    const orderedElements = reorderElements(getElements());
    syncContentLayers(orderedElements);
    shapeRenderController.syncElementNodes(orderedElements);
    draftInteractionController.moveSelectionRectToTop();
    syncSelectionNodes();
    structureControlsController.renderLinearItemControls();
    structureControlsController.renderTreeControls();
    structureControlsController.renderGraphNodeControls();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
    syncCanvasInteractionShield();
    webpageOverlayController.sync(getElements());
    syncTextOverlays({ hiddenIds: editController.isEditing ? getSelectedIds() : [] });
  }

  function selectIds(ids) {
    setSelectedIds(selectionController.setSelectedIds(ids));
    pauseUnselectedArrayAlgorithmSessions();
    const { previousActiveLinearItem, activeLinearItem } = structureInteraction.syncSelection({
      elements: getElements(),
      selectedIds: getSelectedIds(),
    });
    syncSelectionNodes();
    syncLinearItemActiveVisual(previousActiveLinearItem?.elementId);
    syncLinearItemActiveVisual(activeLinearItem?.elementId);
    structureControlsController.renderLinearItemControls();
    structureControlsController.renderTreeControls();
    contentLayer.batchDraw();
    syncCanvasInteractionShield();
    webpageOverlayController.sync(getElements());
    updateChrome();
  }

  function selectElementById(id, additive = false) {
    const ids = selectionController.selectElementById(id, { additive, elements: getElements() });
    selectIds(ids);
  }

  function toggleSelection(id) {
    selectIds(selectionController.toggleSelection(id));
  }

  function clearSelection() {
    cancelLinearItemDragPreview();
    linearGestureController.cancelLinearPointerGesture();
    linearGestureController.resetLinearItemPressState();
    structureControlsController.hideLinearItemControls();
    linearGestureController.clearLinearItemSelectSuppression();
    structureInteraction.clearActiveTreeNode();
    structureControlsController.hideTreeControls();
    structureControlsController.hideBinaryTreeControls();
    selectIds([]);
  }

  function updateDraggableState() {
    contentLayer.find(".element").forEach((node) => {
      const id = getElementIdFromNode(node);
      const element = getElements().find((item) => item.id === id);
      node.draggable(shouldUseNativeDrag(element) && !isLinearPointerGestureElement(id) && !isSelectionDragElement(id));
    });
  }

  function syncSelectedNodes(nodes = transformer.nodes()) {
    selectionTransformCommitController.syncSelectedNodes(nodes);
    renderBoard();
  }

  function addElement(element, message) {
    setElements(reorderElements([...getElements(), element]));
    renderBoard();
    pushHistory(message);
  }

  // ── Group B: 节点处理器 ──

  function getElementNodeHandlers(element) {
    return {
      draggable: shouldUseNativeDrag(element) && !isLinearPointerGestureElement(element.id),
      onDragStart: (node) => selectionDragController.beginNodeDragSelection(node),
      onDragMove: (node) => selectionDragController.updateNodeDragSelection(node),
      onMove: (node) => {
        if (isElementLocked(getElementIdFromNode(node))) return;
        selectionDragController.finishNodeDragSelection(node);
      },
      canEditArrayItems: getCurrentTool() === TOOLS.SELECT && !isTemporaryPanActive() && !isArrayAlgorithmLocked(element.id),
      canEditMatrixItems: getCurrentTool() === TOOLS.SELECT && !isTemporaryPanActive(),
      onSelect: (event, node) => {
        if (isTemporaryPanActive() || getCurrentTool() !== TOOLS.SELECT) return;
        event.cancelBubble = true;
        if (getSuppressNextSelectionClick()) {
          setSuppressNextSelectionClick(false);
          return;
        }
        const id = getElementIdFromNode(node);
        selectElementById(id, event.evt.shiftKey);
      },
      onEdit: (event, node) => {
        if (isTemporaryPanActive() || getCurrentTool() !== TOOLS.SELECT) return;
        event.cancelBubble = true;
        const id = getElementIdFromNode(node);
        const editable = getElements().find((item) => item.id === id && ["text", "sticky"].includes(item.type));
        if (!editable || editable.locked) return;
        selectIds([id]);
        requestAnimationFrame(() => editController.editElement(id));
      },
      onArrayItemMove: moveArrayStructureItem,
      onArrayItemEdit: editArrayStructureItem,
      onArrayItemSelect: linearStructureEventAdapter.onArrayItemSelect,
      onArrayItemPress: linearStructureEventAdapter.onArrayItemPress,
      onArrayItemRelease: linearStructureEventAdapter.onArrayItemRelease,
      onArrayPointerPress: (event) => linearGestureController.handleArrayPointerPress(event),
      onMatrixItemEdit: editMatrixStructureItem,
      onGraphNodeMove: moveGraphStructureNode,
      onGraphNodeClick: handleGraphNodeClick,
      onGraphNodeDragStart: handleGraphNodeDragStart,
      onGraphNodeEdit: editGraphStructureNode,
      onGraphEdgeEdit: editGraphStructureEdge,
      onTreeNodeEdit: editTreeStructureNode,
      onTreeNodeClick: handleTreeNodeClick,
      onTreeNodePress: handleTreeStructureNodePress,
      onTreeNodeMove: moveTreeStructureNode,
      onTreeNodeConnect: connectTreeStructureNodes,
      getTreeConnectState: (elementId) => structureInteraction.getStructureConnectState({ kind: "tree", elementId }),
    };
  }

  function createNode(element) {
    return createElementNode(element, getElementNodeHandlers(element));
  }

  function applyElementToNode(element, node) {
    node.setAttrs(createNodeAttrs(element));
    if (["text", "sticky"].includes(element.type)) {
      syncTextNodeContent(node, element);
    }
    if (element.type === "coordinate-plane") {
      rerenderCoordinatePlaneNode(element, node);
    }
    if (element.type === "webpage") {
      syncWebpageNodeContent(node, element);
    }
  }

  function rerenderCoordinatePlaneNode(element, node) {
    syncCoordinatePlaneNodeContent(node, element);
  }

  return {
    addElement,
    applyElementToNode,
    clearSelection,
    createNode,
    getElementNodeHandlers,
    renderBoard,
    rerenderCoordinatePlaneNode,
    selectElementById,
    selectIds,
    syncBinaryTreeActiveVisual,
    syncGeneralTreeActiveVisual,
    syncGraphActiveVisual,
    syncLinearItemActiveVisual,
    syncSelectedNodes,
    syncSelectionNodes,
    syncTextOverlays,
    toggleSelection,
    updateDraggableState,
  };
}
