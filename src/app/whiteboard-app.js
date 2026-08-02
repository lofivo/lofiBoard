import Konva from "konva";
import { renderShell } from "./shell/shell.js";
import { createBoardOrchestrator } from "./shell/board-orchestrator.js";
import { createBoardSessionActionController } from "./shell/board-session/action-controller.js";
import { createBoardSessionController } from "./shell/board-session/controller.js";
import { createClipboardController } from "./clipboard/controller.js";
import { createContextMenuDomController } from "./context-menu/dom-controller.js";
import { createContextMenuController } from "./context-menu/controller.js";
import { createControlsBindingController } from "./shell/controls-binding-controller.js";
import { createEditController } from "./editing/controller.js";
import { createMenuStateController } from "./panels/menu-state-controller.js";
import { createPanelStateController } from "./panels/state-controller.js";
import { DEFAULT_PROPERTY_CONTROLS, createPropertyControlsController } from "./inspector/property-controls/controller.js";
import { createPropertyControlsDomController } from "./inspector/property-controls/dom-controller.js";
import { createSizeShortcutController } from "./inspector/size-shortcut-controller.js";
import { createContentBoundsQuery } from "./selection/content-bounds-query.js";
import {
  createSelectionController,
  expandGroupedIds as expandSelectionGroupIds,
} from "./selection/controller.js";
import { createSelectionHitQuery } from "./selection/hit-query.js";
import { createShapeRenderAdapter } from "./rendering/adapter.js";
import { createShapeRenderController } from "./rendering/controller.js";
import { createLayeredContentController } from "./rendering/layered-content.js";
import { createStructureActiveVisualController } from "./structures/active-visual-controller.js";
import { createStructureControlsController } from "./structures/controls-controller.js";
import { createStructureControlsPositionController } from "./structures/controls-position-controller.js";
import { createStructureInspectorController } from "./structures/inspector-controller.js";
import {
  findLinearItemNode,
  findLinearItemValueGroup,
  findTreeNodeGroup,
  getTreeParentNodeId,
  getTreeRootNodeId,
  isBinaryTreeElement,
  isGeneralTreeElement,
  isGraphStructureElement,
  isGraphNodeHitTarget,
  isInteractiveStructureElement,
  isTreeElementWithTraversal,
  isTreeNodeHitTarget,
  isTreeRootNode,
  findGraphNodeGroup,
} from "./structures/node-query.js";
import { createStructurePanelController } from "./structures/panel-controller.js";
import { createToolActivationController } from "./tools/activation-controller.js";
import { createToolController, getToolStatus as getToolStatusText } from "./tools/controller.js";
import { createViewportActionController } from "./viewport/action-controller.js";
import { createViewportController } from "./viewport/controller.js";
import { createInteractionStateMachine, SM } from "../tools/interaction-state-machine.js";
import { queryWhiteboardRefs } from "./shell/dom-refs.js";
import { canPersistToolPropertyControls } from "./inspector/model.js";
import { renderLayerItemsMarkup, getElementLabel } from "./panels/layer/markup.js";
import {
  DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  clearArrayAlgorithmRuntimeMarkers,
} from "./algorithms/array/model.js";
import { hasFontStyle, hasTextDecoration } from "./inspector/text-style-tokens.js";
import { createAppActionController } from "./shell/action-controller.js";
import { createAppChromeController } from "./shell/chrome-controller.js";
import { createAppPanelController } from "./shell/panel-controller.js";
import { createArrayAlgorithmPanelController } from "./algorithms/array/panel-controller.js";
import { createArrayAlgorithmSessionController } from "./algorithms/array/session-controller.js";
import { createExportPngController } from "./import-export/export-png-controller.js";
import { createImportWorkflowController } from "./import-export/import-workflow-controller.js";
import { createInspectorPanelDomController } from "./inspector/panel-dom-controller.js";
import { createSelectionStyleActionController } from "./inspector/selection-style/action-controller.js";
import { createSelectionStyleController } from "./inspector/selection-style/controller.js";
import { createKeyboardController } from "./shell/keyboard-controller.js";
import { createPromptController } from "./shell/prompt-controller.js";
import { createLayerPanelController } from "./panels/layer/controller.js";
import { createLayerSnapshotQuery } from "./panels/layer/snapshot-query.js";
import { createPanelDomController } from "./panels/dom-controller.js";
import { createAlignmentSnapController } from "./selection/alignment-snap-controller.js";
import { createSelectionActionController } from "./selection/action-controller.js";
import { createSelectionClipboardController } from "./selection/clipboard-controller.js";
import { createSelectionDragController } from "./selection/drag-controller.js";
import { createCanvasInteractionShieldController } from "./selection/canvas-interaction-shield.js";
import { createSelectionTransformCommitController } from "./selection/transform-commit-controller.js";
import { createSelectionTransformEventsController } from "./selection/transform-events-controller.js";
import { createSelectionTransformPreviewController } from "./selection/transform-preview-controller.js";
import { createSelectionTransformerController } from "./selection/transformer-controller.js";
import { createSelectionTransformerNode } from "./selection/transformer-node.js";
import { createStructureBoardActionController } from "./structures/board-action-controller.js";
import { createStructureCellEditorController } from "./structures/cell-editor-controller.js";
import { createStructureEditActionController } from "./structures/edit-action-controller.js";
import { createStructureExportController } from "./structures/export-controller.js";
import { createStructureInspectorSyncController } from "./structures/inspector-sync-controller.js";
import { createLinearStructureGestureController } from "./structures/linear-gesture-controller.js";
import { createLinearStructureItemDragController } from "./structures/linear-item-drag-controller.js";
import { createLinearStructurePanelSyncController } from "./structures/linear-panel-sync-controller.js";
import { createLinearStructurePointerDragController } from "./structures/linear-pointer-drag-controller.js";
import { createStructureNodeActionController } from "./structures/node-action-controller.js";
import { createStagePointerController } from "./shell/stage-pointer-controller.js";
import { createStatusController } from "./shell/status-controller.js";
import {
  applyMeasuredTextHeights,
  createTextElementMeasurer,
} from "./editing/text-element-measure.js";
import { createDrawingInteractionController } from "./tools/drawing-interaction-controller.js";
import { createDraftInteractionController } from "./tools/draft-interaction-controller.js";
import { createToolCursorController } from "./tools/cursor-controller.js";
import { createUiEventsController } from "./shell/ui-events-controller.js";
import { removeElementsById } from "../services/clipboard.js";
import {
  createEmptyBoard,
  moveElementsByLayer,
  normalizeBoard,
  reorderElements,
  serializeBoard,
} from "../board/model.js";
import { createId } from "../board/ids.js";
import {
  createImageElement as buildImageElement,
  createTextElement as buildTextElement,
  createWebpageElement as buildWebpageElement,
} from "../board/element-factory.js";
import {
  chooseWhiteboardSaveFile,
  openWhiteboardFile,
  supportsFileSystemAccess,
  writeWhiteboardFile,
} from "../services/file.js";
import {
  LOCAL_DRAFT_FILE_NAME,
  clearLocalDraft,
  loadLocalDraft,
  saveLocalDraft,
} from "../services/draft-storage.js";
import { createTextOverlayController } from "../services/text-overlay-controller.js";
import { createWebpageOverlayController } from "../services/webpage-overlay-controller.js";
import { getWorldPointer } from "../canvas/geometry.js";
import { createHistory } from "../board/history.js";
import {
  createElementNode,
  createNodeAttrs,
  getStickyBorderColor,
  syncCoordinatePlaneNodeContent,
  syncElementNode,
  syncLinearStructureNodeContent,
  syncTextNodeContent,
  syncTextNodeSize,
  syncWebpageNodeContent,
} from "../canvas/konva-elements.js";
import {
  getImageFileFromDropEvent,
  getImageFileFromPasteEvent,
  getImageInsertPoint,
  getTextFromDropEvent,
  getTextFromPasteEvent,
  readFileAsDataUrl,
  readImageSize,
} from "../services/image-import.js";
import {
  clampResizeAnchorPosition,
  getTextEditorStyle,
  getStickyEditorCommitBox,
  getStickyTextInsets,
  getSelectionHitRadius,
  getSingleLineTextEditorHeight,
  getMinimumTextResizeWidth,
  isNativeTextEditingTarget,
  measureTextareaContentHeight,
  pickElementIdAtPoint,
  pointHitsSelectionBounds,
  shouldPreventBrowserZoom,
  shouldPreserveTextEditorOnPointerDown,
  shouldSelectAll,
  shouldUseBrowserSelectAll,
} from "../tools/interaction-rules.js";
import {
  DEFAULT_SHAPE_TOOL,
  TOOLS,
} from "../ui/config.js";
import {
  isLinearStructureElement,
} from "../structures/linear-structure.js";
import { LINEAR_STRUCTURE_TYPES } from "../structures/types.js";
import {
  exportMatrix,
  resizeMatrix,
  setMatrixIndexOptions,
  updateMatrixFromInput,
} from "../structures/matrix-structure.js";
import {
  GRAPH_STRUCTURE_STYLE,
  exportGraph,
  setGraphNodeRadius,
} from "../structures/graph-structure.js";
import {
  TREE_STRUCTURE_STYLE,
  exportTree,
  getBinaryTreeChildSides,
} from "../structures/tree-structure.js";
import { createLinearStructureEventAdapter } from "../structures/event-adapter.js";
import { createStructureInteraction } from "../structures/interaction.js";
import {
  isLayerPanelAvailable,
  shouldShowPanelEdgeToggle,
} from "../ui/panel-state.js";

export function createWhiteboardApp(root) {
  if (!root) return null;

  root.innerHTML = renderShell();

 const refs = queryWhiteboardRefs(root);

  // 硬件加速:把渲染分辨率上限锁定到 2。HiDPI 屏幕(尤其 dpr=3 的手机/高分屏)
  // 默认会让画布缓冲区放大 9 倍,每帧 batchDraw 的光栅化/填充成本随之倍增,
  // 而白板主体是矢量形状与文字,dpr 2 与 3 视觉差异极小。封顶后直接降低 GPU
  // 填充率与显存占用。PNG 导出走 stage.toDataURL({pixelRatio:2}) 不受此影响。
  if (typeof window !== "undefined" && Konva.pixelRatio !== 1) {
    Konva.pixelRatio = Math.min(Number(window.devicePixelRatio) || 1, 2);
  }

 const {
   container,
    status,
    activeFileLabel,
    menuButton,
    mainMenu,
    stylePanel,
    stylePanelTitle,
    shapePopover,
    structurePanel,
    structureInputLabel,
    structureInput,
    linearInitPanel,
    arrayRandomFields,
    arrayRandomCountInput,
    matrixRandomFields,
    matrixRandomRowsInput,
    matrixRandomColumnsInput,
    graphStructureInput,
    graphNodeScale,
    treeStructureInput,
    contextMenu,
    layerPanel,
    panelBody,
    zoomLabel,
    zoomButton,
    zoomMenu,
    zoomOutButton,
    zoomInButton,
    imageInput,
    layerList,
    inspectorSectionButtons,
    linearFieldInputs,
    linearValuesTitle,
    linearValuesInput,
    arrayAlgorithmSelect,
    arrayAlgorithmStatus,
    arrayAlgorithmSpeed,
  } = refs;

  let board = createEmptyBoard();
  let currentTool = TOOLS.PEN;
  let activeShapeTool = DEFAULT_SHAPE_TOOL;
  let selectedIds = [];
  let isSpaceDown = false;
  let isAltDown = false;
  let isEditingText = false;
  let lastPointerWorldPoint = null;
  let initialStatusMessage = null;
  let drawingInteractionController = null;
  let draftInteractionController = null;
  let selectionDragController = null;
  let stagePointerController = null;
  let selectionTransformCommitController = null;
  let selectionTransformPreviewController = null;
  let selectionTransformerController = null;
  let previewTextFontSize = () => {};
  const uiStateListeners = new Set();
  let linearGestureController = null;
let boardOrchestrator = null;
let suppressSelectionDragOnce = false;
  let suppressNextCanvasSelection = false;
  let suppressNextSelectionClick = false;
  const structureInteraction = createStructureInteraction();
  const linearStructureEventAdapter = createLinearStructureEventAdapter((event) => {
    linearGestureController?.dispatchLinearStructureEvent(event);
  });
  const toolController = createToolController({
    initialTool: currentTool,
    initialShapeTool: activeShapeTool,
  });
  const selectionController = createSelectionController({
    initialSelectedIds: selectedIds,
  });
  const selectionTransformEventsController = createSelectionTransformEventsController();
  const clipboardController = createClipboardController();
  const contextMenuController = createContextMenuController();
  const menuStateController = createMenuStateController();
  const panelStateController = createPanelStateController();
  const layerSnapshotQuery = createLayerSnapshotQuery({ reorderElements, getElementLabel });
  const propertyControlsController = createPropertyControlsController();
  const structureInspectorController = createStructureInspectorController();
  const structurePanelController = createStructurePanelController();
  let isArrayAlgorithmLockedDelegate = () => false;
  let viewportActions = null;

  const stage = new Konva.Stage({
    container,
    width: container.clientWidth,
    height: container.clientHeight,
  });

  const contentLayer = stage;
  const interactionLayer = new Konva.Layer({ name: "canvas-interaction-layer" });
  const overlayLayer = new Konva.Layer({ name: "selection-overlay-layer" });
  const layeredContentController = createLayeredContentController({
    Konva,
    stage,
    interactionLayer,
    overlayLayer,
  });
  const canvasInteractionShieldController = createCanvasInteractionShieldController({
    Konva,
    layer: interactionLayer,
    getStage: () => stage,
    getContentLayer: () => contentLayer,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    isElementLocked: (id) => Boolean(board.elements.find((element) => element.id === id)?.locked),
    getCurrentTool: () => currentTool,
    isCanvasInteractionActive: () => selectionDragController?.hasActiveDrag?.() ?? false,
  });

  const {
    expandGroupedIds,
    getCanvasInteractionAtWorldPoint,
    getElementIdAtPointer,
    getElementIdFromNode,
    getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint,
    getWebpageInteractionAtWorldPoint,
    isElementLocked,
  } = createSelectionHitQuery({
    getStage: () => stage,
    getContentLayer: () => contentLayer,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getSelectionHitRadius,
    pickElementIdAtPoint,
    pointHitsSelectionBounds,
    expandGroupedIds: expandSelectionGroupIds,
  });
  const {
    getContentBounds,
    getSelectedContentBounds,
  } = createContentBoundsQuery({
    getContentLayer: () => contentLayer,
    getSelectedIds: () => selectedIds,
  });

  const shapeRenderAdapter = createShapeRenderAdapter({
    getCurrentTool: () => currentTool,
    isTemporaryPanActive,
    isArrayAlgorithmLocked,
    structureInteraction,
  });

  const shapeRenderController = createShapeRenderController({
    contentLayer,
    getRenderLayer: (element) => layeredContentController.getLayerForElement(element),
    createNode,
    syncNode: syncElementNode,
    getHandlers: getElementNodeHandlers,
    getHandlerSnapshot: shapeRenderAdapter.getElementRenderHandlerSnapshot,
    projectRuntimeElement: shapeRenderAdapter.projectRuntimeElement,
    isNodeDraggable: (element) => shouldElementBeDraggable(element)
      && !isLinearPointerGestureElement(element.id)
      && !isSelectionDragElement(element.id),
  });

  const structureActiveVisualController = createStructureActiveVisualController({
    contentLayer,
    getElements: () => board.elements,
    structureInteraction,
    projectRuntimeElement: shapeRenderAdapter.projectRuntimeElement,
    getElementNodeHandlers,
    syncLinearStructureNodeContent,
    isLinearStructureElement,
    isBinaryTreeElement,
    isGeneralTreeElement,
    isGraphStructureElement,
    treeStructureStyle: TREE_STRUCTURE_STYLE,
    graphStructureStyle: GRAPH_STRUCTURE_STYLE,
    renderBinaryTreeControls: () => structureControlsController.renderBinaryTreeControls(),
    renderTreeNodeControls: () => structureControlsController.renderTreeNodeControls(),
  });

  const structureControlsController = createStructureControlsController({
    root,
    contentLayer,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    structureInteraction,
    isLinearStructureElement,
    isSelectedGeneralTreeElement,
    isSelectedBinaryTreeElement,
    isSelectedTreeElementWithTraversal,
    isSelectedGraphElement,
    findTreeNodeGroup,
    findGraphNodeGroup,
    isTreeRootNode,
    getBinaryTreeChildSides,
    updateLinearItemControlsPosition: () => structureControlsPositionController.updateLinearItemControlsPosition(),
    updateTreeNodeControlsPosition: () => structureControlsPositionController.updateTreeNodeControlsPosition(),
    updateBinaryTreeNodeControlsPosition: () => structureControlsPositionController.updateBinaryTreeNodeControlsPosition(),
    updateTreeTraversalControlsPosition: () => structureControlsPositionController.updateTreeTraversalControlsPosition(),
    updateGraphNodeControlsPosition: () => structureControlsPositionController.updateGraphNodeControlsPosition(),
  });

  const structureControlsPositionController = createStructureControlsPositionController({
    contentLayer,
    getStageContainerRect: () => stage.container().getBoundingClientRect(),
    getElements: () => board.elements,
    structureInteraction,
    findLinearItemNode,
    findTreeNodeGroup,
    findGraphNodeGroup,
    isSelectedGeneralTreeElement,
    isSelectedBinaryTreeElement,
    isSelectedTreeElementWithTraversal,
    isSelectedGraphElement,
    getLinearItemControls: structureControlsController.getLinearItemControls,
    getTreeNodeControls: structureControlsController.getTreeNodeControls,
    getBinaryTreeNodeControls: structureControlsController.getBinaryTreeNodeControls,
    getTreeTraversalControls: structureControlsController.getTreeTraversalControls,
    getGraphNodeControls: structureControlsController.getGraphNodeControls,
  });

  const {
    applyLinearPanelState,
    getActiveLinearIndex,
    readLinearDisplayIndexField,
    syncLinearPanelState,
  } = createLinearStructurePanelSyncController({
    getActiveElement: () => document.activeElement,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    linearFieldInputs,
    linearValuesInput,
    linearValuesTitle,
    structureInspectorController,
    structureInteraction,
  });
  const {
    editSelectedArrayStructure,
    editSelectedStructure,
    getSelectedLinearStructure,
    handleTreeStructureNodePress,
    insertStructureFromPanel,
    moveArrayStructureItem,
    setActiveLinearItem,
  } = createStructureBoardActionController({
    getArrayRandomCountValue: () => arrayRandomCountInput.value,
    getMatrixRandomRowsValue: () => matrixRandomRowsInput.value,
    getMatrixRandomColumnsValue: () => matrixRandomColumnsInput.value,
    getCurrentTool: () => currentTool,
    getKeepToolActive: () => toolController.keepToolActive,
    getElementIdFromNode,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getStructureInputValue: () => structureInput.value,
    getTreeNodePressWorldPoint: () => getWorldPointer(stage),
    getViewportCenterPoint,
    isArrayAlgorithmLocked,
    isBinaryTreeElement,
    isLinearStructureElement,
    isTemporaryPanActive,
    selectTool: TOOLS.SELECT,
    setElements: (elements) => { board.elements = elements; },
    structureInteraction,
    structurePanelController,
    batchDraw: () => contentLayer.batchDraw(),
    beginSelectionDrag: (worldPoint) => selectionDragController.beginSelectionDrag(worldPoint),
    pushHistory: (message) => pushHistory(message),
    renderBinaryTreeControls: () => structureControlsController.renderBinaryTreeControls(),
    renderBoard,
    renderLinearItemControls: () => structureControlsController.renderLinearItemControls(),
    selectIds,
    setStructurePanelOpen: (open) => setStructurePanelOpen(open),
    setTool: (tool) => setTool(tool),
    syncLinearItemActiveVisual,
    syncLinearPanelState,
    syncTreeStructurePanelState: () => syncTreeStructurePanelState(),
  });

  const {
    beginLinearItemDrag,
    cancelLinearItemDragPreview,
    commitLinearItemDrag,
    updateLinearItemDrag,
  } = createLinearStructureItemDragController({
    contentLayer,
    getElements: () => board.elements,
    structureInteraction,
    setElementDraggableState,
    setActiveLinearItem,
    renderBoard,
    moveLinearItem: moveArrayStructureItem,
    suppressNextLinearItemSelect: (elementId) => linearGestureController?.suppressNextLinearItemSelect(elementId),
    setSuppressSelectionDragOnce: (value) => { suppressSelectionDragOnce = value; },
    clearRootDragState: (elementId) => selectionDragController.clearRootDragState(elementId),
  });

  const {
    beginLinearPointerDrag,
    cancelLinearPointerDrag: cancelLinearPointerDragState,
    commitLinearPointerDrag,
    updateLinearPointerDrag,
  } = createLinearStructurePointerDragController({
    contentLayer,
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    structureInteraction,
    setElementDraggableState,
    isElementDraggable: shouldElementBeDraggable,
    selectIds,
    renderBoard,
    pushHistory: (message) => pushHistory(message),
    setLinearPanelState: (patch) => structureInspectorController.setLinearPanelState(patch),
    applyLinearPanelState,
    clearRootDragState: (elementId) => selectionDragController.clearRootDragState(elementId),
  });

  linearGestureController = createLinearStructureGestureController({
    batchDraw: () => contentLayer.batchDraw(),
    beginLinearItemDrag,
    beginLinearPointerDrag,
    beginSelectionDrag: (worldPoint) => selectionDragController.beginSelectionDrag(worldPoint),
    cancelLinearPointerDrag: cancelLinearPointerDragState,
    clearRootDragState: (elementId) => selectionDragController.clearRootDragState(elementId),
    commitLinearItemDrag,
    commitLinearPointerDrag,
    expandGroupedIds,
    getCurrentTool: () => currentTool,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getWorldPoint: () => getWorldPointer(stage),
    isElementDraggable: shouldElementBeDraggable,
    isLinearStructureElement,
    isTemporaryPanActive,
    renderBinaryTreeControls: structureControlsController.renderBinaryTreeControls,
    renderLinearItemControls: structureControlsController.renderLinearItemControls,
    selectIds,
    selectTool: TOOLS.SELECT,
    setElementDraggableState,
    setSuppressSelectionDragOnce: (value) => { suppressSelectionDragOnce = value; },
    stopElementDrag: (elementId) => contentLayer.findOne(`#${elementId}`)?.stopDrag(),
    structureInteraction,
    syncLinearItemActiveVisual,
    updateLinearItemDrag,
    updateLinearPointerDrag,
    updateSelectionDrag: (worldPoint) => selectionDragController.updateSelectionDrag(worldPoint),
  });

  const textOverlayController = createTextOverlayController({
    container,
    contentLayer,
    getContainerRect: () => container.getBoundingClientRect(),
    getStageState: () => ({ x: stage.x(), y: stage.y(), scale: stage.scaleX() }),
  });
  const webpageOverlayController = createWebpageOverlayController({
    container,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getCurrentTool: () => currentTool,
    isCanvasInteractionActive: () => selectionDragController?.hasActiveDrag?.() ?? false,
    syncCanvasInteractionShield: canvasInteractionShieldController.sync,
    getCanvasInteractionAtClientPoint: (clientX, clientY) => {
      const x = Number(clientX);
      const y = Number(clientY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

      const containerRect = container.getBoundingClientRect?.() ?? { left: 0, top: 0 };
      const scale = Math.max(0.01, Number(stage.scaleX()) || 1);
      const worldPoint = {
        x: (x - (Number(containerRect.left) || 0) - stage.x()) / scale,
        y: (y - (Number(containerRect.top) || 0) - stage.y()) / scale,
      };
      return getCanvasInteractionAtWorldPoint(worldPoint);
    },
    getViewport: () => ({ x: stage.x(), y: stage.y(), scale: stage.scaleX() }),
    isElementLocked,
    setElements: (elements) => { board.elements = elements; },
    syncWebpageNode: (element) => {
      if (!element) return;
      const node = contentLayer.findOne(`#${element.id}`);
      if (!node) return;
      node.setAttrs({
        x: Number(element.x) || 0,
        y: Number(element.y) || 0,
        rotation: Number(element.rotation) || 0,
        scaleX: Number(element.scaleX) || 1,
        scaleY: Number(element.scaleY) || 1,
      });
      syncWebpageNodeContent(node, element);
      contentLayer.batchDraw();
    },
    setWebpageNodeVisible: (elementId, visible) => {
      const node = contentLayer.findOne(`#${elementId}`);
      if (!node) return;

      const nextVisible = Boolean(visible);
      if (node.getAttr("webpageCanvasVisible") === nextVisible) return;

      node.setAttrs({
        opacity: nextVisible ? 1 : 0,
        webpageCanvasVisible: nextVisible,
      });
      contentLayer.batchDraw();
    },
    selectIds,
    promptValue: (...args) => promptValue(...args),
    renderBoard: () => renderBoard(),
    pushHistory: (message) => pushHistory(message),
    schedulePersistCurrentDraft: () => schedulePersistCurrentDraft(),
    setStatus: (message) => setStatus(message),
  });

  const transformer = createSelectionTransformerNode({
    Konva,
    overlayLayer,
    getSelectionTransformerController: () => selectionTransformerController,
  });

  const alignmentSnapController = createAlignmentSnapController({
    Konva,
    contentLayer,
    guideLayer: overlayLayer,
    getStageScale: () => stage.scaleX(),
    getViewportWorldRect: () => {
      const scale = stage.scaleX() || 1;
      return {
        x: -stage.x() / scale,
        y: -stage.y() / scale,
        width: stage.width() / scale,
        height: stage.height() / scale,
      };
    },
    // 按住 Alt 临时禁用对齐吸附,便于精细移动
    isSnapDisabled: () => isAltDown,
  });
  selectionDragController = createSelectionDragController({
    contentLayer,
    overlayLayer,
    clearAlignmentGuides: alignmentSnapController.clearAlignmentGuides,
    enterDragging: () => interactionSM.enter(SM.DRAGGING),
    getElementIdFromNode,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getSuppressSelectionDragOnce: () => suppressSelectionDragOnce,
    isBinaryTreeElement,
    isElementDraggable: shouldElementBeDraggable,
    isElementLocked,
    isLinearGestureElement: isLinearPointerGestureElement,
    isLinearStructureElement,
    pushHistory: (message) => pushHistory(message),
    renderBoard,
    selectElementById,
    setElements: (elements) => { board.elements = elements; },
    setHandledNodeDragEnd: selectionTransformEventsController.setHandledNodeDragEnd,
    setSuppressNextSelectionClick: (value) => { suppressNextSelectionClick = value; },
    snapBoxToAlignment: alignmentSnapController.snapBoxToAlignment,
    snapNodeToAlignment: alignmentSnapController.snapNodeToAlignment,
    structureInteraction,
    suppressNextLinearItemSelect: (elementId) => linearGestureController.suppressNextLinearItemSelect(elementId),
    syncNodeToElement: (node) => selectionTransformCommitController.syncNodeToElement(node),
    syncTextOverlays,
    syncWebpageOverlays: () => webpageOverlayController.sync(),
    transformer,
    updateTreeControlsPosition: () => structureControlsPositionController.updateTreeControlsPosition(),
  });

  const {
    measureTextElementValue,
    getTextElementWrappedHeight,
    getMinimumTextElementWidth,
    getPreferredTextElementWidth,
    getAutoFitTextElementWidth,
    getNormalizedTextElementBox,
    normalizeTextElementBox,
  } = createTextElementMeasurer();
  selectionTransformCommitController = createSelectionTransformCommitController({
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getElementIdFromNode,
    getLastTransformAnchor: selectionTransformEventsController.getLastTransformAnchor,
    normalizeTextElementBox,
  });
  selectionTransformerController = createSelectionTransformerController({
    contentLayer,
    transformer,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getCurrentTool: () => currentTool,
    getInteractionState: () => interactionSM.state,
    getStageScale: () => stage.scaleX(),
    getElementIdFromNode,
    measureTextValue: (element, value) => measureTextElementValue(element, value),
    structureInteraction,
  });
  selectionTransformPreviewController = createSelectionTransformPreviewController({
    contentLayer,
    overlayLayer,
    transformer,
    getElements: () => board.elements,
    getElementIdFromNode,
    getMinimumTextElementWidth,
    getTextElementWrappedHeight,
    onTextFontSizePreview: (fontSize) => previewTextFontSize(fontSize),
    rerenderCoordinatePlaneNode,
    syncTextOverlays,
  });
  const selectionStyleController = createSelectionStyleController({
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    normalizeTextElementBox,
  });
  const {
    applyCoordinateStyleToSelection,
    applyStyleToSelection,
    selectAllElements,
    toggleTextStyle,
  } = createSelectionStyleActionController({
    getControlValues: () => getControlValues(),
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getStrokeStyleFromControls: () => getStrokeStyleFromControls(),
    selectionStyleController,
    pushHistory: (message) => pushHistory(message),
    renderBoard,
    saveToolPropertyControlsForCurrentTool: () => saveToolPropertyControlsForCurrentTool(),
    selectIds,
    setStatus: (message) => setStatus(message),
    updateContextPanel: () => updateContextPanel(),
  });

  const editController = createEditController({
    findElement: (id) => board.elements.find((item) => item.id === id),
    getBoardElements: () => board.elements,
    setBoardElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    setSelectedIds: (ids) => { selectedIds = ids; },
    contentLayer,
    overlayLayer,
    transformer,
    stage,
    textOverlayController,
    onStateChange: (editing) => {
      isEditingText = editing;
      if (editing) {
        interactionSM.enter(SM.EDITING);
      } else {
        interactionSM.exitToIdle();
      }
    },
    onRender: () => renderBoard(),
    onHistory: (msg) => pushHistory(msg),
    getAutoFitTextElementWidth,
    measureTextValue: (element, value, fontSize) => measureTextElementValue(element, value, fontSize),
  });

  const interactionSM = createInteractionStateMachine();
  const { setStatus } = createStatusController({ status });
  syncKeepToolActiveState();
  const {
    promptBoolean,
    promptMultiline,
    promptValue,
  } = createPromptController({
    prompt: (label, fallback) => window.prompt(label, fallback),
  });
  const boardSession = createBoardSessionController({
    createInitialBoard: createEmptyBoard,
    createHistory,
    normalizeBoard,
    serializeBoard,
    getViewport: () => ({
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX(),
    }),
    sanitizeElementsForPersistence: (elements) => elements.map((element) => (
      isLinearStructureElement(element) && getArrayAlgorithmSession(element.id)
        ? clearArrayAlgorithmRuntimeMarkers(element)
        : element
    )),
    saveLocalDraft,
    loadLocalDraft,
    clearLocalDraft,
    supportsFileSystemAccess,
    openWhiteboardFile,
    chooseWhiteboardSaveFile,
    writeWhiteboardFile,
    localDraftFileName: LOCAL_DRAFT_FILE_NAME,
    commitActiveEdit: () => {
      if (!editController.commit) return false;
      editController.commit();
      return true;
    },
    onBoardReplaced: (nextBoard) => {
      board = nextBoard;
      applyViewport(board.viewport);
      applyBackground();
      renderBoard();
      updateChrome();
    },
    onSelectionCleared: () => {
      selectedIds = [];
    },
    onSessionChanged: () => {
      updateChrome();
    },
    onStatus: (message) => setStatus(message),
  });
  board = boardSession.getBoard();
  const {
    hydrateLocalDraft,
    newBoard,
    openBoardFile,
    persistCurrentDraft,
    pushHistory,
    redoHistory,
    saveBoardFile,
    saveBoardFileAs,
    schedulePersistCurrentDraft,
    serializeCurrentBoard,
    snapshotBoard,
    undoHistory,
  } = createBoardSessionActionController({
    boardSession,
    getBoard: () => board,
    cancelArrayAlgorithmPlayback: () => cancelArrayAlgorithmPlayback(),
    cancelArrayAlgorithmSwapAnimation: (options) => cancelArrayAlgorithmSwapAnimation(options),
    clearArrayAlgorithmSessions: () => clearArrayAlgorithmSessions(),
    setInitialStatusMessage: (message) => { initialStatusMessage = message; },
  });
  // 属性 store 在下面才创建,而 cursor controller 构造时就会读一次颜色/粗细。
  // 先给个默认值,store 就绪后再指过去。
  let readControlValues = () => DEFAULT_PROPERTY_CONTROLS;
  const {
    getBaseEraserRadius,
    getVisibleEraserRadius,
    hideEraser,
    hideToolCursors,
    showBrushCursor,
    showObjectEraser,
    showStrokeEraser,
    updateBrushCursorStyle,
    updateEraserCursorStyle,
  } = createToolCursorController({
    Konva,
    overlayLayer,
    getBrushColor: () => readControlValues().color,
    getCurrentTool: () => currentTool,
    getScale: () => stage.scaleX(),
    getStrokeWidth: () => readControlValues().width,
    isTemporaryPanActive,
    getActiveEraserRadius: () => drawingInteractionController?.getActiveEraserRadius() ?? 24,
    hasActiveEraserSnapshot: () => drawingInteractionController?.hasActiveEraserSnapshot() ?? false,
  });
  const {
    bindPropertyControlEvents,
    capturePropertyControls,
    getBrushInputSmoothingValue,
    getBrushOpacityValue,
    getControlValues,
    getBrushSmoothingValue,
    getStrokeStyleFromControls,
    hydrateControlsFromElement,
    restorePropertyControlsForTool,
    saveToolPropertyControlsForCurrentTool,
    setControl,
    toggleTextStyle: toggleTextStyleControl,
  } = createPropertyControlsDomController({
    propertyControlsController,
    getCurrentTool: () => currentTool,
    getSelectedIds: () => selectedIds,
    canPersistToolPropertyControls,
    onApplyCoordinateStyleToSelection: applyCoordinateStyleToSelection,
    onApplyStyleToSelection: applyStyleToSelection,
    onBrushCursorStyleChange: updateBrushCursorStyle,
    onToggleTextStyle: toggleTextStyle,
  });
  readControlValues = getControlValues;
  previewTextFontSize = (fontSize) => {
    setControl("font-size", fontSize, { silent: true });
    uiStateListeners.forEach((listener) => listener());
  };
  const {
    setActiveShapeTool,
    setTool,
  } = createToolActivationController({
    root,
    toolController,
    tools: TOOLS,
    getStageContainer: () => stage.container(),
    getToolStatus: getToolStatusText,
    setActiveShapeToolState: (shapeTool) => { activeShapeTool = shapeTool; },
    setCurrentTool: (tool) => { currentTool = tool; },
    cancelSelectionDrag: () => selectionDragController.cancelSelectionDrag(),
    clearSelection,
    hideToolCursors,
    renderBoard,
    resetLinearItemPressState: () => linearGestureController.resetLinearItemPressState(),
    resetLinearPointerPressState: () => linearGestureController.resetLinearPointerPressState(),
    restorePropertyControlsForTool,
    saveToolPropertyControlsForCurrentTool,
    setShapePopoverOpen: (open) => setShapePopoverOpen(open),
    setStatus,
    setStructurePanelOpen: (open) => setStructurePanelOpen(open),
    syncInspectorPanelState: (options) => syncInspectorPanelState(options),
    syncSelectionNodes,
    syncWebpageOverlays: () => webpageOverlayController.sync(),
    updateChrome: () => updateChrome(),
    updateDraggableState,
  });
  draftInteractionController = createDraftInteractionController({
    Konva,
    contentLayer,
    draftLayer: interactionLayer,
    createNode,
    applyElementToNode,
    getElementIdFromNode,
    expandGroupedIds,
    getCurrentTool: () => currentTool,
    getKeepToolActive: () => toolController.keepToolActive,
    getActiveShapeTool: () => activeShapeTool,
    getBoardElementCount: () => board.elements.length,
    getBrushColor: () => readControlValues().color,
    getStrokeWidth: () => readControlValues().width,
    getFillColor: () => readControlValues().fill,
    isFillTransparent: () => readControlValues().fillTransparent,
    getBrushOpacityValue,
    getBrushCap: () => readControlValues().brushCap,
    getBrushStyle: () => readControlValues().brushStyle,
    isDoubleArrow: () => readControlValues().arrowDoubleEnded,
    addElement,
    selectIds,
    setTool,
  });
  drawingInteractionController = createDrawingInteractionController({
    contentLayer: interactionLayer,
    createNode,
    getBoardElements: () => board.elements,
    setBoardElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    setSelectedIds: (ids) => { selectedIds = ids; },
    getElementIdAtPointer,
    getBrushColor: () => readControlValues().color,
    getStrokeWidth: () => readControlValues().width,
    getBrushOpacityValue,
    getBrushCap: () => readControlValues().brushCap,
    getBrushStyle: () => readControlValues().brushStyle,
    getIsLaser: () => currentTool === TOOLS.LASER,
    getBrushSmoothingValue,
    getBrushInputSmoothingValue,
    getScale: () => stage.scaleX(),
    getBaseEraserRadius,
    getVisibleEraserRadius,
    addElement,
    snapshotBoard,
    pushHistory,
    renderBoard,
  });
  const {
    setPanelBindings: setArrayAlgorithmPanelBindings,
    getArrayAlgorithmPanelState,
    setArrayAlgorithmPanelState,
    getSelectedArrayAlgorithmSession,
    getArrayAlgorithmSession,
    setArrayAlgorithmSession,
    clearArrayAlgorithmSessions,
    pauseUnselectedArrayAlgorithmSessions,
    startSelectedArrayAlgorithm,
    stepArrayAlgorithmPrevious,
    stepArrayAlgorithmNext,
    toggleArrayAlgorithmPlayback,
    resetArrayAlgorithmSession,
    stopArrayAlgorithmSession,
    cancelArrayAlgorithmPlayback,
    cancelArrayAlgorithmSwapAnimation,
    getArrayAlgorithmLastStepIndex,
    isArrayAlgorithmLocked: isArrayAlgorithmLockedFromController,
    clearArrayAlgorithmSessionForRemovedIds,
    destroy: destroyArrayAlgorithmSessionController,
  } = createArrayAlgorithmSessionController({
    contentLayer,
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    getSelectedLinearStructure,
    structureInteraction,
    findLinearItemNode,
    hideLinearItemControls: structureControlsController.hideLinearItemControls,
    syncLinearItemActiveVisual,
    renderBoard,
    selectIds,
    setStatus,
    pushHistory,
    updateChrome: () => updateChrome(),
  });
  isArrayAlgorithmLockedDelegate = isArrayAlgorithmLockedFromController;
  const {
    bindArrayAlgorithmPanelEvents,
    getArrayAlgorithmSpeed,
    syncArrayAlgorithmPanelState,
  } = createArrayAlgorithmPanelController({
    root,
    arrayAlgorithmSelect,
    arrayAlgorithmSpeed,
    arrayAlgorithmStatus,
    getSelectedLinearStructure,
    getSelectedArrayAlgorithmSession,
    getArrayAlgorithmPanelState,
    setArrayAlgorithmPanelState,
    setArrayAlgorithmSession,
    getArrayAlgorithmLastStepIndex,
    defaultPanelState: DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  });
  setArrayAlgorithmPanelBindings({
    getArrayAlgorithmSpeed,
    syncArrayAlgorithmPanelState,
  });
  const {
    bindContextMenuActions,
    getLastContextMenuTargetId,
    hideContextMenu,
    runContextAction,
    showContextMenu,
    updateContextMenuActions,
  } = createContextMenuDomController({
    root,
    contextMenu,
    contextMenuController,
    getSelectedIds: () => selectedIds,
    hasClipboard: () => clipboardController.hasSnapshot(),
    canUndo: () => boardSession.getHistory().canUndo?.() ?? false,
    canRedo: () => boardSession.getHistory().canRedo?.() ?? false,
    getViewport: () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }),
    actions: {
      undo: () => undoHistory(),
      redo: () => redoHistory(),
      copy: () => copySelection(),
      cut: () => cutSelection(),
      paste: () => pasteClipboard(),
      group: () => groupSelection(),
      ungroup: () => ungroupSelection(),
      "toggle-lock": () => toggleSelectionLock(),
      "bring-front": () => bringSelectionToFront(),
      "bring-forward": () => bringSelectionForward(),
      "send-backward": () => sendSelectionBackward(),
      "send-back": () => sendSelectionToBack(),
      delete: () => deleteSelection(),
    },
  });
  const {
    copySelection,
    cutSelection,
    deleteSelection,
    pasteClipboard,
  } = createSelectionClipboardController({
    clipboardController,
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    getLastPointerWorldPoint: () => lastPointerWorldPoint,
    isElementLocked,
    removeElementsById,
    reorderElements,
    clearArrayAlgorithmSessionForRemovedIds,
    clearSelection,
    renderBoard,
    updateContextMenuActions,
    pushHistory,
    setStatus,
    setTool,
    selectIds,
  });
  const {
    handleImageDragOver,
    handleImageDrop,
    handlePaste,
    importSelectedImage,
    insertImageFile,
  } = createImportWorkflowController({
    imageInput,
    stage,
    clipboardController,
    getLastPointerWorldPoint: () => lastPointerWorldPoint,
    setLastPointerWorldPoint: (point) => { lastPointerWorldPoint = point; },
    getBoardElementCount: () => board.elements.length,
    measureTextElementValue,
    isTypingInEditableControl,
    addElement,
    selectIds,
    setTool,
    pasteClipboard,
    setStatus,
    createImageElement: buildImageElement,
    createTextElement: buildTextElement,
    getImageFileFromPasteEvent,
    getImageFileFromDropEvent,
    getImageInsertPoint,
    getTextFromPasteEvent,
    getTextFromDropEvent,
    getWorldPointer,
    readFileAsDataUrl,
    readImageSize,
  });
  const { exportPng } = createExportPngController({
    stage,
    contentLayer,
    overlayLayer,
    selectionRect: draftInteractionController.getSelectionRect(),
    transformer,
    getBackgroundMode: () => board.canvas.backgroundMode,
    getActiveFileName: () => boardSession.getActiveFileName(),
    syncSelectionNodes,
    setStatus,
  });
  const {
    bringSelectionForward,
    bringSelectionToFront,
    clearBoard,
    groupSelection,
    sendSelectionBackward,
    sendSelectionToBack,
    toggleSelectionLock,
    ungroupSelection,
  } = createSelectionActionController({
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    createId,
    moveElementsByLayer,
    reorderElements,
    clearSelection,
    renderBoard,
    pushHistory,
  });
  const {
    getInspectorContext,
    syncGraphStructurePanelState,
    syncTreeStructurePanelState,
  } = createStructureInspectorSyncController({
    root,
    graphStructureInput,
    graphNodeScale,
    treeStructureInput,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    structureInspectorController,
    exportGraph,
    exportTree,
    graphStructureStyle: GRAPH_STRUCTURE_STYLE,
    isLinearStructureElement,
  });
  const {
    applyInspectorSectionState,
    applyPanelState,
    syncInspectorPanelState,
    togglePanel,
  } = createPanelDomController({
    root,
    stylePanel,
    layerPanel,
    panelBody,
    panelStateController,
    getInspectorContext,
    getStylePanelAvailable: () => inspectorPanelController.getStylePanelAvailable(),
    getLayerPanelAvailable: () => layerPanelController.getLayerPanelAvailable(),
    shouldShowPanelEdgeToggle,
  });
  const inspectorPanelController = createInspectorPanelDomController({
    root,
    stylePanel,
    stylePanelTitle,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getCurrentTool: () => currentTool,
    getActiveShapeTool: () => activeShapeTool,
    hydrateControlsFromElement,
    applyPanelState,
  });
  const {
    updateContextPanel,
  } = inspectorPanelController;
  const layerPanelController = createLayerPanelController({
    layerPanel,
    layerList,
    closestElement,
    renderLayerItemsMarkup,
    isLayerPanelAvailable,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    selectTool: TOOLS.SELECT,
    setTool,
    selectElementById,
    ensureSelectionVisible: () => viewportActions.ensureSelectionVisible(),
    applyPanelState,
  });
  const {
    bindLayerPanelEvents,
    renderLayerPanel,
    updateLayerPanelAvailability,
  } = layerPanelController;
  const { updateChrome } = createAppChromeController({
    root,
    activeFileLabel,
    zoomLabel,
    panelStateController,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    getActiveFileName: () => boardSession.getActiveFileName(),
    isDirty: () => boardSession.isDirty(),
    getScale: () => stage.scaleX(),
    getBackgroundMode: () => board.canvas.backgroundMode,
    getActiveShapeTool: () => activeShapeTool,
    getActiveStructureType: () => structurePanelController.getActiveStructureType(),
    syncLinearPanelState,
    syncArrayAlgorithmPanelState,
    syncGraphStructurePanelState,
    syncTreeStructurePanelState,
    syncInspectorPanelState,
    updateLayerPanelAvailability,
    renderLayerPanel,
    updateContextPanel,
  });
  const {
    closeMainMenu,
    hydrateStructurePanel,
    setActiveStructureType,
    setMainMenuOpen,
    setShapePopoverOpen,
    setStructurePanelOpen,
    setZoomMenuOpen,
    toggleMainMenu,
    toggleZoomMenu,
  } = createAppPanelController({
    root,
    refs: {
      mainMenu,
      menuButton,
      shapePopover,
      structurePanel,
      structureInput,
      linearInitPanel,
      structureInputLabel,
      arrayRandomFields,
      matrixRandomFields,
      zoomMenu,
      zoomButton,
    },
    menuStateController,
    structurePanelController,
    requestAnimationFrame,
  });
  viewportActions = createViewportActionController({
    getElementCount: () => board.elements.length,
    getContentBounds,
    getSelectedContentBounds,
    getViewport: () => ({
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX(),
    }),
    getStageSize: () => ({
      width: stage.width(),
      height: stage.height(),
    }),
    applyViewport,
    serializeCurrentBoard,
    setBoard: (nextBoard) => {
      board = nextBoard;
      boardSession.setBoard(board);
    },
    pushBoardHistory: (nextBoard) => boardSession.getHistory().push(nextBoard),
    setDirty: (dirty) => boardSession.setDirty(dirty),
    persistCurrentDraft,
    updateChrome,
    setStatus,
    getBackgroundMode: () => board.canvas.backgroundMode,
    setBackgroundModeValue: (backgroundMode) => {
      board.canvas.backgroundMode = backgroundMode;
    },
    applyBackground,
    pushHistory,
    closeMainMenu,
  });
  const {
    copySelectedGraphExport,
    copySelectedTreeSubtree,
  } = createStructureExportController({
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    structureInput,
    setStatus,
    exportGraph,
    exportTree,
  });
  const {
    beginGraphConnectMode,
    beginTreeConnectMode,
    connectGraphStructureNodes,
    connectTreeStructureNodes,
    editGraphEdgeData,
    editGraphStructureEdge: _deprecatedGraphEdgeEdit,
    editGraphStructureNode: _deprecatedGraphNodeEdit,
    handleGraphNodeClick,
    handleGraphNodeDragStart,
    handleTreeNodeClick,
    moveGraphStructureNode,
    moveTreeStructureNode,
  } = createStructureEditActionController({
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    structureInteraction,
    promptValue,
    promptBoolean,
    isTemporaryPanActive,
    isBinaryTreeElement,
    consumeSuppressedBinaryTreeNodeClick: (elementId) => selectionDragController.consumeSuppressedBinaryTreeNodeClick(elementId),
    syncBinaryTreeActiveVisual,
    syncGeneralTreeActiveVisual,
    syncGraphActiveVisual,
    renderTreeNodeControls: structureControlsController.renderTreeNodeControls,
    renderGraphNodeControls: structureControlsController.renderGraphNodeControls,
    hideGraphNodeControls: structureControlsController.hideGraphNodeControls,
    renderBoard,
    selectIds,
    setStatus,
    pushHistory,
    syncTreeStructurePanelState,
  });
  const {
    editArrayStructureItem,
    editMatrixStructureItem,
    editTreeStructureNode,
    editGraphStructureNode,
    editGraphStructureEdge,
    syncActiveCellEditor,
  } = createStructureCellEditorController({
    container,
    contentLayer,
    stage,
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getCurrentTool: () => currentTool,
    selectTool: TOOLS.SELECT,
    isTemporaryPanActive,
    isLinearStructureElement,
    findLinearItemNode,
    findTreeNodeGroup,
    findGraphNodeGroup,
    structureInteraction,
    renderBoard,
    selectIds,
    setActiveLinearItem,
    syncTreeStructurePanelState,
    syncGraphStructurePanelState,
    pushHistory,
    setSuppressNextCanvasSelection: (value) => { suppressNextCanvasSelection = value; },
  });
  const { runAction, runToolAction } = createAppActionController({
    beginTreeConnectMode,
    bringSelectionForward,
    bringSelectionToFront,
    clearBoard,
    closeMainMenu,
    copySelectedTreeSubtree,
    deleteSelection,
    editSelectedArrayStructure,
    editSelectedStructure,
    exportPng,
    fitContent: () => viewportActions.fitContent(),
    getActiveLinearIndex,
    getActiveTreeNodeId,
    getGraphStructureDraft: () => structureInspectorController.getGraphStructureDraft(),
    getLinearValuesDraft: () => structureInspectorController.getLinearValuesDraft(),
    getStructureInputValue: () => structureInput.value,
    getTreeStructureInputValue: () => treeStructureInput.value,
    groupSelection,
    newBoard,
    openBoardFile,
    openImagePicker: () => imageInput.click(),
    promptMultiline,
    promptValue,
    readLinearDisplayIndexField,
    redoHistory,
    resetArrayAlgorithmSession,
    resetView: () => viewportActions.resetView(),
    saveBoardFile,
    saveBoardFileAs,
    sendSelectionBackward,
    sendSelectionToBack,
    setBackgroundMode: (backgroundMode) => viewportActions.setBackgroundMode(backgroundMode),
    startSelectedArrayAlgorithm,
    stepArrayAlgorithmNext,
    stepArrayAlgorithmPrevious,
    stopArrayAlgorithmSession,
    toggleArrayAlgorithmPlayback,
    toggleKeepToolActive,
    toggleSelectionLock,
    undoHistory,
    ungroupSelection,
  });
  const {
    runBinaryTreeNodeAction,
    runBinaryTreeTraversalAction,
    runGraphNodeAction,
    runLinearItemAction,
    runTreeNodeAction,
    runTreeTraversalAction,
  } = createStructureNodeActionController({
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    setSelectedIds: (ids) => { selectedIds = ids; },
    structureInteraction,
    isLinearStructureElement,
    isArrayAlgorithmLocked,
    isSelectedGeneralTreeElement,
    isSelectedBinaryTreeElement,
    isTreeElementWithTraversal,
    isTreeRootNode,
    getTreeParentNodeId,
    renderBoard,
    selectIds,
    setActiveLinearItem,
    editTreeStructureNode,
    hideTreeControls: structureControlsController.hideTreeControls,
    hideBinaryTreeControls: structureControlsController.hideBinaryTreeControls,
    hideGraphNodeControls: structureControlsController.hideGraphNodeControls,
    updateChrome,
    syncTreeStructurePanelState,
    syncGraphStructurePanelState,
    pushHistory,
    editSelectedStructure,
  });
  const { bindControls } = createControlsBindingController({
    root,
    refs: {
      graphStructureInput,
      graphNodeScale,
      imageInput,
      inspectorSectionButtons,
      linearFieldInputs,
      linearValuesInput,
      menuButton,
      zoomButton,
      zoomInButton,
      zoomOutButton,
    },
    closestElement,
    runToolAction,
    runAction,
    runLinearItemAction,
    runTreeNodeAction,
    runBinaryTreeNodeAction,
    runGraphNodeAction,
    runTreeTraversalAction,
    setTool,
    setShapePopoverOpen,
    setStructurePanelOpen,
    setBackgroundMode: (backgroundMode) => viewportActions.setBackgroundMode(backgroundMode),
    setZoomAtCenter: (requestedScale) => viewportController.setZoomAtCenter(requestedScale),
    selectShapeTool,
    setActiveStructureType,
    setArrayInitMode: (mode) => structurePanelController.setActiveArrayInitMode(mode),
    hydrateStructurePanel,
    insertStructureFromPanel,
    bindPropertyControlEvents,
    bindArrayAlgorithmPanelEvents,
    bindContextMenuActions,
    bindLayerPanelEvents,
    toggleMainMenu,
    toggleZoomMenu,
    zoomBy: (multiplier) => viewportController.zoomBy(multiplier),
    importSelectedImage,
    togglePanel,
    toggleInspectorSection: (section) => panelStateController.toggleInspectorSection(section),
    applyInspectorSectionState,
    setLinearValuesDraft: (value) => structureInspectorController.setLinearValuesDraft(value),
    setGraphStructureDraft: (value) => structureInspectorController.setGraphStructureDraft(value),
    setGraphNodeScale: (percent) => {
      const radius = GRAPH_STRUCTURE_STYLE.nodeRadius * (Number(percent) || 100) / 100;
      // 拖动中实时预览,不逐步写历史,避免一次拖拽产生大量撤销点
      editSelectedStructure("graph-structure", (element) => setGraphNodeRadius(element, radius), "已调整节点大小", { history: false });
    },
    setLinearPanelField: (key, value) => structureInspectorController.setLinearPanelField(key, value),
  });
  const { adjustActiveSize } = createSizeShortcutController({
    getPanelMode: () => root.dataset.panelMode || "hidden",
    getCurrentTool: () => currentTool,
    getStructureSelection: () => root.dataset.structureSelection || "none",
    getControlValues,
    setControl,
    adjustGraphNodeSize: (direction) => {
      const element = board.elements.find((item) => selectedIds.includes(item.id) && item.type === "graph-structure" && !item.locked);
      if (!element) return false;
      const baseRadius = GRAPH_STRUCTURE_STYLE.nodeRadius;
      const currentPercent = (Number(element.style?.nodeRadius) || baseRadius) / baseRadius * 100;
      const nextPercent = Math.max(50, Math.min(200, currentPercent + direction * 10));
      if (nextPercent === currentPercent) return true;
      const radius = baseRadius * nextPercent / 100;
      editSelectedStructure("graph-structure", (item) => setGraphNodeRadius(item, radius), "已调整节点大小");
      syncGraphStructurePanelState();
      return true;
    },
  });
  const { bindKeyboard } = createKeyboardController({
    getCurrentTool: () => currentTool,
    getSelectedIds: () => selectedIds,
    getIsSpaceDown: () => isSpaceDown,
    setIsSpaceDown: (nextValue) => { isSpaceDown = nextValue; },
    setIsAltDown: (nextValue) => { isAltDown = nextValue; },
    getStageContainer: () => stage.container(),
    isTypingInEditableControl,
    shouldSelectAll,
    shouldUseBrowserSelectAll,
    clearNativeSelection,
    selectAllElements,
    updateDraggableState,
    hideToolCursors,
    copySelection,
    cutSelection,
    hasClipboardSnapshot: () => clipboardController.hasSnapshot(),
    pasteClipboard,
    saveBoardFile,
    saveBoardFileAs,
    openBoardFile,
    undoHistory,
    redoHistory,
    deleteSelection,
    closeMainMenu,
    setShapePopoverOpen,
    setStructurePanelOpen,
    setZoomMenuOpen,
    hideContextMenu,
    setTool,
    clearSelection,
    setActiveShapeTool,
    toggleKeepToolActive,
    adjustActiveSize,
  });
  const { bindUiEvents } = createUiEventsController({
    container,
    stage,
    closestElement,
    isNativeTextEditingTarget,
    shouldPreventBrowserZoom,
    isMainMenuOpen: () => menuStateController.isMainMenuOpen(),
    isZoomMenuOpen: () => menuStateController.isZoomMenuOpen(),
    isShapePopoverHidden: () => shapePopover.hidden,
    isStructurePanelHidden: () => structurePanel.hidden,
    isContextMenuHidden: () => contextMenu.hidden,
    updateGrid,
    syncTextOverlays,
    closeMainMenu,
    setShapePopoverOpen,
    setStructurePanelOpen,
    setZoomMenuOpen,
    hideContextMenu,
    handlePaste,
    persistCurrentDraft,
    handleImageDragOver,
    handleImageDrop,
  });
  const viewportController = createViewportController({
    stage,
    container,
    zoomLabel,
    getZoomLevelButtons: () => root.querySelectorAll("[data-zoom-level]"),
    updateBrushCursorStyle,
    updateEraserCursorStyle,
    updateLinearItemControlsPosition: structureControlsPositionController.updateLinearItemControlsPosition,
    syncActiveCellEditor,
    syncTextOverlays,
    syncWebpageOverlays: () => webpageOverlayController.sync(),
    updateContextPanel,
    schedulePersistCurrentDraft,
    closeZoomMenu: () => setZoomMenuOpen(false),
  });
  const textFontSet = document.fonts;
  let shouldMeasureAfterFontLoad = true;
  const measureTextAfterFontLoad = () => {
    if (shouldMeasureAfterFontLoad) syncTextOverlays();
  };
  textFontSet?.addEventListener?.("loadingdone", measureTextAfterFontLoad);
  void textFontSet?.ready?.then(measureTextAfterFontLoad);
  stagePointerController = createStagePointerController({
    stage,
    drawingInteractionController,
    draftInteractionController,
    selectionDragController,
    structureInteraction,
    addElement,
    clearSelection,
    createWebpageElement: buildWebpageElement,
    editElement: (id) => editController.editElement(id),
    enterInteraction: (state) => interactionSM.enter(state),
    exitInteractionToIdle: () => interactionSM.exitToIdle(),
    expandGroupedIds,
    getActiveShapeTool: () => activeShapeTool,
    getBaseEraserRadius,
    getBoardElementCount: () => board.elements.length,
    getCurrentTool: () => currentTool,
    getKeepToolActive: () => toolController.keepToolActive,
    getElementIdFromNode,
    getElements: () => board.elements,
    getIsSpaceDown: () => isSpaceDown,
    getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint,
    getSelectedIds: () => selectedIds,
    getWebpageInteractionAtWorldPoint,
    handleLinearPointerMove: (worldPoint) => linearGestureController.handlePointerMove(worldPoint),
    handleLinearPointerUp: () => linearGestureController.handlePointerUp(),
    hideBinaryTreeControls: () => structureControlsController.hideBinaryTreeControls(),
    hideContextMenu,
    hideEraser,
    hideGraphNodeControls: () => structureControlsController.hideGraphNodeControls(),
    hideToolCursors,
    hideTreeControls: () => structureControlsController.hideTreeControls(),
    isBinaryTreeElement,
    isCanvasSelectionShieldTarget: canvasInteractionShieldController.isSelectionShieldTarget,
    isElementLocked,
    isEditingText: () => editController.isEditing,
    isGeneralTreeElement,
    isGraphNodeHitTarget,
    isGraphStructureElement,
    isTemporaryPanActive,
    isTreeNodeHitTarget,
    persistCurrentDraft,
    promptValue,
    selectElementById,
    selectIds,
    setLastPointerWorldPoint: (worldPoint) => { lastPointerWorldPoint = worldPoint; },
    setStructurePanelOpen,
    setStatus,
    setTool,
    setZoomMenuOpen,
    shouldShowContextMenu: ({ targetId, selectedIds: nextSelectedIds }) => contextMenuController.shouldShow({
      targetId,
      selectedIds: nextSelectedIds,
      hasClipboard: clipboardController.hasSnapshot(),
    }),
    showBrushCursor,
    showContextMenu,
    showObjectEraser,
    showStrokeEraser,
    syncBinaryTreeActiveVisual,
    syncGeneralTreeActiveVisual,
    syncGraphActiveVisual,
    updateGrid,
    updateViewportChrome,
    consumeSuppressNextCanvasSelection: () => {
      if (!suppressNextCanvasSelection) return false;
      suppressNextCanvasSelection = false;
      return true;
    },
    consumeSuppressSelectionDragOnce: () => {
      if (!suppressSelectionDragOnce) return false;
      suppressSelectionDragOnce = false;
      return true;
    },
    commitTextEditing: () => editController.commit?.(),
  });

  boardOrchestrator = createBoardOrchestrator({
    contentLayer,
    overlayLayer,
    syncContentLayers: layeredContentController.sync,
    syncCanvasInteractionShield: canvasInteractionShieldController.sync,
    transformer,
    shapeRenderController,
    selectionTransformerController,
    selectionTransformCommitController,
    structureControlsController,
    structureActiveVisualController,
    textOverlayController,
    webpageOverlayController,
    draftInteractionController,
    editController,
    selectionController,
    selectionDragController,
    linearGestureController,
    structureInteraction,
    linearStructureEventAdapter,
    getElements: () => board.elements,
    setElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    setSelectedIds: (ids) => { selectedIds = ids; },
    getCurrentTool: () => currentTool,
    getSuppressNextSelectionClick: () => suppressNextSelectionClick,
    setSuppressNextSelectionClick: (value) => { suppressNextSelectionClick = value; },
    shouldElementBeDraggable,
    isTemporaryPanActive,
    isLinearPointerGestureElement,
    isSelectionDragElement,
    isArrayAlgorithmLocked,
    getElementIdFromNode,
    isElementLocked,
    pauseUnselectedArrayAlgorithmSessions,
    updateChrome: () => updateChrome(),
    pushHistory: (message) => pushHistory(message),
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
  });

  hydrateLocalDraft();
  bindControls();
  applyViewport(board.viewport);
  applyBackground();
  renderBoard();
  setTool(TOOLS.PEN);
  renderBoard();
  if (initialStatusMessage) setStatus(initialStatusMessage);
  applyPanelState();
  updateChrome();
  bindStageEvents();
  const unbindUiEvents = bindUiEvents();
  const unbindKeyboard = bindKeyboard();

  root._getLayersData = () => layerSnapshotQuery.getSnapshot(board.elements);

  root._getSelectedIds = () => [...selectedIds];

  root._getContextMenuActionStates = (options = {}) => {
    updateContextMenuActions(options);
    return Object.fromEntries(
      [...root.querySelectorAll("[data-context-action]")].map((button) => [
        button.dataset.contextAction,
        Boolean(button.disabled),
      ]),
    );
  };

  root._getLastContextMenuTargetId = () => getLastContextMenuTargetId();

  root._commitActiveTextEditor = () => {
    if (!editController.commit) return false;
    editController.commit();
    return true;
  };

  root._selectLayerItemById = (id, modifier) => {
    setTool(TOOLS.SELECT);
    if (modifier === 'shift') {
      const ordered = reorderElements(board.elements);
      const clickedIndex = ordered.findIndex((el) => el.id === id);
      if (clickedIndex === -1) {
        selectElementById(id, false);
      } else {
        const current = [...selectedIds];
        if (current.length === 0) {
          selectElementById(id, false);
        } else {
          const lastIndex = ordered.findIndex((el) => el.id === current[current.length - 1]);
          const start = Math.min(clickedIndex, lastIndex);
          const end = Math.max(clickedIndex, lastIndex);
          const rangeIds = ordered.slice(start, end + 1).map((el) => el.id);
          const merged = [...new Set([...current, ...rangeIds])];
          selectIds(merged);
        }
      }
    } else if (modifier === 'ctrl') {
      selectIds(selectionController.toggleSelection(id));
    } else {
      selectElementById(id, false);
    }
    updateChrome();
    viewportActions.ensureSelectionVisible();
  };

  root._showShapePopover = () => setShapePopoverOpen(true);

  function getSelectedMatrixStructureState() {
    const element = board.elements.find((item) => (
      selectedIds.includes(item.id) && item.type === "matrix-structure"
    ));
    if (!element) return null;
    return {
      elementId: element.id,
      input: exportMatrix(element),
      rows: element.rows,
      columns: element.columns,
      indexBase: Number(element.settings?.indexBase) === 1 ? 1 : 0,
      showIndexes: element.settings?.showIndexes ?? true,
    };
  }

  function updateSelectedMatrixStructure(patch = {}) {
    editSelectedStructure("matrix-structure", (element) => {
      let nextElement = Object.prototype.hasOwnProperty.call(patch, "input")
        ? updateMatrixFromInput(element, patch.input)
        : element;
      if (Object.prototype.hasOwnProperty.call(patch, "rows")
        || Object.prototype.hasOwnProperty.call(patch, "columns")) {
        nextElement = resizeMatrix(nextElement, {
          rows: patch.rows ?? nextElement.rows,
          columns: patch.columns ?? nextElement.columns,
        });
      }
      if (Object.prototype.hasOwnProperty.call(patch, "indexBase")
        || Object.prototype.hasOwnProperty.call(patch, "showIndexes")) {
        nextElement = setMatrixIndexOptions(nextElement, {
          indexBase: patch.indexBase ?? nextElement.settings?.indexBase,
          showIndexes: patch.showIndexes ?? nextElement.settings?.showIndexes,
        });
      }
      return nextElement;
    }, "已更新二维数组");
  }

  // React 侧驱动引擎的唯一入口:直接调命令,不再 querySelector 隐藏 DOM 再 .click()
  const commands = {
    runAction,
    runContextAction,
    runToolAction,
    selectShapeTool,
    setBackgroundMode: (backgroundMode) => viewportActions.setBackgroundMode(backgroundMode),
    setProperty: setControl,
    setTool,
    setZoomAtCenter: (requestedScale) => viewportController.setZoomAtCenter(requestedScale),
    toggleTextStyle: toggleTextStyleControl,
    updateMatrixStructure: updateSelectedMatrixStructure,
    zoomBy: (multiplier) => viewportController.zoomBy(multiplier),
  };

  // React 读状态的唯一入口。此前是每 100ms 扫一遍遗留 DOM 取二十多个字段。
  function getUiState() {
    const controls = capturePropertyControls();
    return {
      tool: currentTool,
      keepToolActive: toolController.keepToolActive,
      zoom: stage.scaleX(),
      backgroundMode: board.canvas.backgroundMode,
      fileName: activeFileLabel.textContent,
      status: status.textContent,
      stylePanelTitle: stylePanelTitle.textContent,
      panelMode: root.dataset.panelMode || "hidden",
      activeShape: root.dataset.activeShape || "rect",
      structureSelection: root.dataset.structureSelection || "none",
      graphDirected: root.dataset.graphDirected === "true",
      treeKind: root.dataset.treeKind || "general",
      matrixStructure: getSelectedMatrixStructureState(),
      selectionCaps: {
        text: root.dataset.selectionHasText === "true",
        sticky: root.dataset.selectionHasSticky === "true",
        drawing: root.dataset.selectionHasDrawing === "true",
        stroke: root.dataset.selectionHasStroke === "true",
        fillShape: root.dataset.selectionHasFillShape === "true",
        arrow: root.dataset.selectionHasArrow === "true",
        coordinate: root.dataset.selectionHasCoordinate === "true",
      },
      properties: {
        ...controls,
        textBold: hasFontStyle(controls.fontStyle, "bold"),
        textItalic: hasFontStyle(controls.fontStyle, "italic"),
        textUnderline: hasTextDecoration(controls.textDecoration, "underline"),
        textStrike: hasTextDecoration(controls.textDecoration, "line-through"),
      },
      layers: root._getLayersData(),
      selectedIds: [...selectedIds],
    };
  }

  return {
    getBoard: () => serializeCurrentBoard(),
    getUiState,
    subscribeUiState: (listener) => {
      uiStateListeners.add(listener);
      return () => uiStateListeners.delete(listener);
    },
    commands,
    __debug: {
      getSelectedIds: () => [...selectedIds],
      getActiveLinearItem: () => structureInteraction.getActiveLinearItem(),
    },
    destroy: () => {
      uiStateListeners.clear();
      shouldMeasureAfterFontLoad = false;
      textFontSet?.removeEventListener?.("loadingdone", measureTextAfterFontLoad);
      unbindUiEvents?.();
      unbindKeyboard?.();
      boardSession.destroy();
      destroyArrayAlgorithmSessionController();
      drawingInteractionController.destroy();
      viewportController.destroy();
      webpageOverlayController.destroy();
      canvasInteractionShieldController.destroy();
      textOverlayController.clear();
      shapeRenderController.clear();
      layeredContentController.destroy();
      stage.destroy();
    },
  };

  function bindStageEvents() {
    stage.on("wheel", (event) => viewportController.handleWheel(event));
    stage.on("pointerdown", stagePointerController.handlePointerDown);
    stage.on("pointermove", stagePointerController.handlePointerMove);
    stage.on("pointerup pointercancel", stagePointerController.handlePointerUp);
    stage.container().addEventListener("pointerleave", () => {
      if (!stagePointerController.hasActiveDrawingPointerCapture() && !drawingInteractionController.hasActiveEraserSnapshot()) {
        hideToolCursors();
      }
    });
    stage.container().addEventListener("contextmenu", stagePointerController.handleContextMenu);

    selectionTransformEventsController.bindTransformerEvents({
      transformer,
      editController,
      selectionTransformPreviewController,
      handleTransformerDoubleClick: stagePointerController.handleTransformerDoubleClick,
      syncSelectedNodes,
      syncWebpageOverlays: () => webpageOverlayController.sync(),
      pushHistory,
    });
  }

  function isTemporaryPanActive() {
    return isSpaceDown || currentTool === TOOLS.PAN;
  }

  function syncKeepToolActiveState() {
    const keepToolActive = toolController.keepToolActive;
    root.dataset.keepToolActive = String(keepToolActive);
    const button = root.querySelector('[data-tool-action="toggle-tool-lock"]');
    button?.classList.toggle("active", keepToolActive);
    button?.setAttribute("aria-pressed", String(keepToolActive));
    return keepToolActive;
  }

  function toggleKeepToolActive() {
    toolController.toggleKeepToolActive();
    const keepToolActive = syncKeepToolActiveState();
    setStatus(keepToolActive ? "已开启绘制后保持工具" : "已关闭绘制后保持工具");
    return keepToolActive;
  }

  function isArrayAlgorithmLocked(elementId) {
    return isArrayAlgorithmLockedDelegate(elementId);
  }

  function addElement(element, message) {
    return boardOrchestrator.addElement(element, message);
  }

  function createNode(element) {
    return boardOrchestrator.createNode(element);
  }

  function getElementNodeHandlers(element) {
    return boardOrchestrator.getElementNodeHandlers(element);
  }

  function applyElementToNode(element, node) {
    return boardOrchestrator.applyElementToNode(element, node);
  }

  function rerenderCoordinatePlaneNode(element, node) {
    return boardOrchestrator.rerenderCoordinatePlaneNode(element, node);
  }

  function syncTextOverlays({ hiddenIds = editController.isEditing ? selectedIds : [], elements = board.elements } = {}) {
    return boardOrchestrator.syncTextOverlays(...arguments);
  }

  function renderBoard() {
    return boardOrchestrator.renderBoard();
  }

  function selectIds(ids) {
    return boardOrchestrator.selectIds(ids);
  }

  function selectElementById(id, additive = false) {
    return boardOrchestrator.selectElementById(id, additive);
  }

  function toggleSelection(id) {
    return boardOrchestrator.toggleSelection(id);
  }

  function clearSelection() {
    return boardOrchestrator.clearSelection();
  }

  function syncSelectionNodes() {
    return boardOrchestrator.syncSelectionNodes();
  }

  function updateDraggableState() {
    return boardOrchestrator.updateDraggableState();
  }

  function syncSelectedNodes(nodes = transformer.nodes()) {
    return boardOrchestrator.syncSelectedNodes(nodes);
  }

  function getViewportCenterPoint() {
    return {
      x: (stage.width() / 2 - stage.x()) / stage.scaleX(),
      y: (stage.height() / 2 - stage.y()) / stage.scaleX(),
    };
  }

  function isSelectedBinaryTreeElement(element) {
    return isBinaryTreeElement(element) && selectedIds.includes(element.id);
  }

  function isSelectedGeneralTreeElement(element) {
    return isGeneralTreeElement(element) && selectedIds.includes(element.id);
  }

  function isSelectedGraphElement(element) {
    return isGraphStructureElement(element) && selectedIds.includes(element.id);
  }

  function isSelectedTreeElementWithTraversal(element) {
    return isTreeElementWithTraversal(element) && selectedIds.includes(element.id);
  }

  function syncLinearItemActiveVisual(elementId) {
    return boardOrchestrator.syncLinearItemActiveVisual(elementId);
  }

  function syncBinaryTreeActiveVisual(elementId) {
    return boardOrchestrator.syncBinaryTreeActiveVisual(elementId);
  }

  function syncGeneralTreeActiveVisual(elementId) {
    return boardOrchestrator.syncGeneralTreeActiveVisual(elementId);
  }

  function syncGraphActiveVisual(elementId) {
    return boardOrchestrator.syncGraphActiveVisual(elementId);
  }

  function shouldElementBeDraggable(element) {
    if (!element) return false;
    return currentTool === TOOLS.SELECT
      && !isTemporaryPanActive()
      && !element.locked
      && !["text", "sticky", "webpage"].includes(element.type);
  }

  function isLinearPointerGestureElement(elementId) {
    return Boolean(linearGestureController?.isLinearGestureElement(elementId));
  }

  function isSelectionDragElement(elementId) {
    return Boolean(selectionDragController?.isSelectionDragElement(elementId));
  }

  function setElementDraggableState(elementId, enabled) {
    contentLayer.findOne(`#${elementId}`)?.draggable(Boolean(enabled));
  }

  function getActiveTreeNodeId(element) {
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    if (activeTreeNode?.elementId === element.id) return activeTreeNode.nodeId;
    return element.settings?.rootId ?? element.nodes?.[0]?.id ?? null;
  }

  function selectShapeTool(shapeTool) {
    setActiveShapeTool(shapeTool);
    setTool(TOOLS.SHAPE);
    setShapePopoverOpen(false);
  }

  function applyViewport(viewport) {
    viewportController.applyViewport(viewport);
  }

  function applyBackground() {
    container.dataset.background = board.canvas.backgroundMode;
    updateGrid();
  }

  function updateGrid() {
    viewportController.updateGrid();
  }

  function updateViewportChrome() {
    viewportController.updateViewportChrome();
  }

  function isTypingInEditableControl(target) {
    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || Boolean(target?.isContentEditable);
  }

  function clearNativeSelection() {
    window.getSelection?.()?.removeAllRanges?.();
    document.getSelection?.()?.removeAllRanges?.();
  }

  function closestElement(target, selector) {
    if (target instanceof Element) return target.closest(selector);
    return target?.parentElement?.closest?.(selector) ?? null;
  }

}
