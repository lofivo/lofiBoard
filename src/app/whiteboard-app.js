import Konva from "konva";
import { renderShell } from "./shell/shell.js";
import { createBoardSessionActionController } from "./shell/board-session/action-controller.js";
import { createBoardSessionController } from "./shell/board-session/controller.js";
import { createClipboardController } from "./clipboard/controller.js";
import { createContextMenuDomController } from "./context-menu/dom-controller.js";
import { createContextMenuController } from "./context-menu/controller.js";
import { createControlsBindingController } from "./shell/controls-binding-controller.js";
import { createEditController } from "./editing/controller.js";
import { createMenuStateController } from "./panels/menu-state-controller.js";
import { createPanelStateController } from "./panels/state-controller.js";
import { createPropertyControlsController } from "./inspector/property-controls/controller.js";
import { createPropertyControlsDomController } from "./inspector/property-controls/dom-controller.js";
import { createContentBoundsQuery } from "./selection/content-bounds-query.js";
import {
  createSelectionController,
  expandGroupedIds as expandSelectionGroupIds,
} from "./selection/controller.js";
import { createSelectionHitQuery } from "./selection/hit-query.js";
import { createShapeRenderAdapter } from "./rendering/adapter.js";
import { createShapeRenderController } from "./rendering/controller.js";
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
  isInteractiveStructureElement,
  isTreeElementWithTraversal,
  isTreeNodeHitTarget,
  isTreeRootNode,
} from "./structures/node-query.js";
import { createStructurePanelController } from "./structures/panel-controller.js";
import { createToolActivationController } from "./tools/activation-controller.js";
import { createToolController, getToolStatus as getToolStatusText } from "./tools/controller.js";
import { createViewportActionController } from "./viewport/action-controller.js";
import { createViewportController } from "./viewport/controller.js";
import { createInteractionStateMachine, SM } from "../tools/interaction-state-machine.js";
import { queryWhiteboardRefs } from "./shell/dom-refs.js";
import { isToolPropertyPanelAvailable } from "./inspector/model.js";
import { renderLayerItemsMarkup } from "./panels/layer/markup.js";
import {
  DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  clearArrayAlgorithmRuntimeMarkers,
} from "./algorithms/array/model.js";
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
import { createPanelDomController } from "./panels/dom-controller.js";
import { createAlignmentSnapController } from "./selection/alignment-snap-controller.js";
import { createSelectionActionController } from "./selection/action-controller.js";
import { createSelectionClipboardController } from "./selection/clipboard-controller.js";
import { createSelectionDragController } from "./selection/drag-controller.js";
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
import { createTextElementMeasurer } from "./editing/text-element-measure.js";
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
  exportGraph,
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
    graphStructureInput,
    treeStructureInput,
    contextMenu,
    layerPanel,
    panelBody,
    colorInput,
    fillInput,
    fillTransparentInput,
    widthInput,
    brushOpacityInput,
    brushSmoothingInput,
    brushCapInput,
    brushStyleInput,
    arrowDoubleEndedInput,
    coordinateUnitSizeInput,
    coordinateShowGridInput,
    coordinateShowTicksInput,
    coordinateShowLabelsInput,
    coordinateGridColorInput,
    coordinateAxisColorInput,
    coordinateLabelColorInput,
    brushCustomColorInput,
    brushWidthSlider,
    brushWidthValue,
    brushOpacityValue,
    brushPreviewPath,
    fontSizeInput,
    fontFamilyInput,
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
  } = queryWhiteboardRefs(root);

  let board = createEmptyBoard();
  let currentTool = TOOLS.PEN;
  let activeShapeTool = DEFAULT_SHAPE_TOOL;
  let selectedIds = [];
  let isSpaceDown = false;
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
  let linearGestureController = null;
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

  const contentLayer = new Konva.Layer();
  const overlayLayer = new Konva.Layer();
  stage.add(contentLayer);
  stage.add(overlayLayer);

  const {
    expandGroupedIds,
    getElementIdAtPointer,
    getElementIdFromNode,
    getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint,
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
    treeStructureStyle: TREE_STRUCTURE_STYLE,
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
    findTreeNodeGroup,
    isTreeRootNode,
    getBinaryTreeChildSides,
    updateLinearItemControlsPosition: () => structureControlsPositionController.updateLinearItemControlsPosition(),
    updateTreeNodeControlsPosition: () => structureControlsPositionController.updateTreeNodeControlsPosition(),
    updateBinaryTreeNodeControlsPosition: () => structureControlsPositionController.updateBinaryTreeNodeControlsPosition(),
    updateTreeTraversalControlsPosition: () => structureControlsPositionController.updateTreeTraversalControlsPosition(),
  });

  const structureControlsPositionController = createStructureControlsPositionController({
    contentLayer,
    getStageContainerRect: () => stage.container().getBoundingClientRect(),
    getElements: () => board.elements,
    structureInteraction,
    findLinearItemNode,
    findTreeNodeGroup,
    isSelectedGeneralTreeElement,
    isSelectedBinaryTreeElement,
    isSelectedTreeElementWithTraversal,
    getLinearItemControls: structureControlsController.getLinearItemControls,
    getTreeNodeControls: structureControlsController.getTreeNodeControls,
    getBinaryTreeNodeControls: structureControlsController.getBinaryTreeNodeControls,
    getTreeTraversalControls: structureControlsController.getTreeTraversalControls,
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
    getCurrentTool: () => currentTool,
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

  const transformer = createSelectionTransformerNode({
    Konva,
    overlayLayer,
    getSelectionTransformerController: () => selectionTransformerController,
  });

  const alignmentSnapController = createAlignmentSnapController({
    contentLayer,
    getStageScale: () => stage.scaleX(),
  });
  selectionDragController = createSelectionDragController({
    contentLayer,
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
    snapNodeToAlignment: alignmentSnapController.snapNodeToAlignment,
    structureInteraction,
    suppressNextLinearItemSelect: (elementId) => linearGestureController.suppressNextLinearItemSelect(elementId),
    syncNodeToElement: (node) => selectionTransformCommitController.syncNodeToElement(node),
    syncTextOverlays,
    transformer,
    updateTreeControlsPosition: () => structureControlsPositionController.updateTreeControlsPosition(),
  });

  const {
    measureTextElementValue,
    getTextElementWrappedHeight,
    getMinimumTextElementWidth,
    getPreferredTextElementWidth,
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
    controls: {
      arrowDoubleEndedInput,
      colorInput,
      coordinateAxisColorInput,
      coordinateGridColorInput,
      coordinateLabelColorInput,
      coordinateShowGridInput,
      coordinateShowLabelsInput,
      coordinateShowTicksInput,
      coordinateUnitSizeInput,
      fillInput,
      fillTransparentInput,
      fontFamilyInput,
      fontSizeInput,
      widthInput,
    },
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
    measureTextValue: (element, value, fontSize) => measureTextElementValue(element, value, fontSize),
  });

  const interactionSM = createInteractionStateMachine();
  const { setStatus } = createStatusController({ status });
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
    getBrushColor: () => colorInput.value,
    getCurrentTool: () => currentTool,
    getScale: () => stage.scaleX(),
    getStrokeWidth: () => widthInput.value,
    isTemporaryPanActive,
    getActiveEraserRadius: () => drawingInteractionController?.getActiveEraserRadius() ?? 24,
    hasActiveEraserSnapshot: () => drawingInteractionController?.hasActiveEraserSnapshot() ?? false,
  });
  const {
    bindPropertyControlEvents,
    getBrushInputSmoothingValue,
    getBrushOpacityValue,
    getBrushSmoothingValue,
    getStrokeStyleFromControls,
    hydrateControlsFromElement,
    restorePropertyControlsForTool,
    saveToolPropertyControlsForCurrentTool,
    setBrushControlValue,
    syncBrushPresetButtons,
    syncBrushPreview,
    syncBrushWidthControl,
    syncFillTransparentControls,
  } = createPropertyControlsDomController({
    root,
    refs: {
      colorInput,
      fillInput,
      fillTransparentInput,
      widthInput,
      brushOpacityInput,
      brushSmoothingInput,
      brushCapInput,
      brushStyleInput,
      arrowDoubleEndedInput,
      coordinateUnitSizeInput,
      coordinateShowGridInput,
      coordinateShowTicksInput,
      coordinateShowLabelsInput,
      coordinateGridColorInput,
      coordinateAxisColorInput,
      coordinateLabelColorInput,
      brushCustomColorInput,
      brushWidthSlider,
      brushWidthValue,
      brushOpacityValue,
      brushPreviewPath,
      fontSizeInput,
      fontFamilyInput,
    },
    propertyControlsController,
    getCurrentTool: () => currentTool,
    getSelectedIds: () => selectedIds,
    isToolPropertyPanelAvailable,
    onApplyCoordinateStyleToSelection: applyCoordinateStyleToSelection,
    onApplyStyleToSelection: applyStyleToSelection,
    onBrushCursorStyleChange: updateBrushCursorStyle,
    onToggleTextStyle: toggleTextStyle,
  });
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
    updateChrome: () => updateChrome(),
    updateDraggableState,
  });
  draftInteractionController = createDraftInteractionController({
    Konva,
    contentLayer,
    createNode,
    applyElementToNode,
    getElementIdFromNode,
    expandGroupedIds,
    getCurrentTool: () => currentTool,
    getActiveShapeTool: () => activeShapeTool,
    getBoardElementCount: () => board.elements.length,
    getBrushColor: () => colorInput.value,
    getStrokeWidth: () => widthInput.value,
    getFillColor: () => fillInput.value,
    isFillTransparent: () => fillTransparentInput.checked,
    getBrushOpacityValue,
    getBrushCap: () => brushCapInput.value,
    getBrushStyle: () => brushStyleInput.value,
    isDoubleArrow: () => arrowDoubleEndedInput.checked,
    addElement,
    selectIds,
    setTool,
  });
  drawingInteractionController = createDrawingInteractionController({
    contentLayer,
    createNode,
    getBoardElements: () => board.elements,
    setBoardElements: (elements) => { board.elements = elements; },
    getSelectedIds: () => selectedIds,
    setSelectedIds: (ids) => { selectedIds = ids; },
    getElementIdAtPointer,
    getBrushColor: () => colorInput.value,
    getStrokeWidth: () => widthInput.value,
    getBrushOpacityValue,
    getBrushCap: () => brushCapInput.value,
    getBrushStyle: () => brushStyleInput.value,
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
    hideContextMenu,
    showContextMenu,
    updateContextMenuActions,
  } = createContextMenuDomController({
    root,
    contextMenu,
    contextMenuController,
    getSelectedIds: () => selectedIds,
    hasClipboard: () => clipboardController.hasSnapshot(),
    getViewport: () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }),
    actions: {
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
    treeStructureInput,
    getElements: () => board.elements,
    getSelectedIds: () => selectedIds,
    structureInspectorController,
    exportGraph,
    exportTree,
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
    syncBrushPresetButtons,
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
    editGraphStructureEdge,
    editGraphStructureNode,
    handleGraphNodeClick,
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
    renderTreeNodeControls: structureControlsController.renderTreeNodeControls,
    renderBoard,
    selectIds,
    setStatus,
    pushHistory,
    syncTreeStructurePanelState,
  });
  const {
    editArrayStructureItem,
    editTreeStructureNode,
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
    structureInteraction,
    renderBoard,
    selectIds,
    setActiveLinearItem,
    syncTreeStructurePanelState,
    pushHistory,
    setSuppressNextCanvasSelection: (value) => { suppressNextCanvasSelection = value; },
  });
  const { runAction, runToolAction } = createAppActionController({
    beginGraphConnectMode,
    beginTreeConnectMode,
    bringSelectionForward,
    bringSelectionToFront,
    clearBoard,
    closeMainMenu,
    copySelectedGraphExport,
    copySelectedTreeSubtree,
    deleteSelection,
    editGraphEdgeData,
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
    toggleSelectionLock,
    undoHistory,
    ungroupSelection,
  });
  const {
    runBinaryTreeNodeAction,
    runBinaryTreeTraversalAction,
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
    updateChrome,
    syncTreeStructurePanelState,
    pushHistory,
    editSelectedStructure,
  });
  const { bindControls } = createControlsBindingController({
    root,
    refs: {
      graphStructureInput,
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
    runTreeTraversalAction,
    setTool,
    setShapePopoverOpen,
    setStructurePanelOpen,
    setBackgroundMode: (backgroundMode) => viewportActions.setBackgroundMode(backgroundMode),
    setZoomAtCenter: (requestedScale) => viewportController.setZoomAtCenter(requestedScale),
    setActiveShapeTool,
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
    setLinearPanelField: (key, value) => structureInspectorController.setLinearPanelField(key, value),
  });
  const { bindKeyboard } = createKeyboardController({
    getCurrentTool: () => currentTool,
    getSelectedIds: () => selectedIds,
    getIsSpaceDown: () => isSpaceDown,
    setIsSpaceDown: (nextValue) => { isSpaceDown = nextValue; },
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
    updateContextPanel,
    schedulePersistCurrentDraft,
    closeZoomMenu: () => setZoomMenuOpen(false),
  });
  stagePointerController = createStagePointerController({
    stage,
    drawingInteractionController,
    draftInteractionController,
    selectionDragController,
    structureInteraction,
    addElement,
    clearSelection,
    editElement: (id) => editController.editElement(id),
    enterInteraction: (state) => interactionSM.enter(state),
    exitInteractionToIdle: () => interactionSM.exitToIdle(),
    expandGroupedIds,
    getActiveShapeTool: () => activeShapeTool,
    getBaseEraserRadius,
    getBoardElementCount: () => board.elements.length,
    getCurrentTool: () => currentTool,
    getElementIdFromNode,
    getElements: () => board.elements,
    getIsSpaceDown: () => isSpaceDown,
    getNearbySelectedElementId,
    getSelectableElementIdAtWorldPoint,
    getSelectedIds: () => selectedIds,
    handleLinearPointerMove: (worldPoint) => linearGestureController.handlePointerMove(worldPoint),
    handleLinearPointerUp: () => linearGestureController.handlePointerUp(),
    hideBinaryTreeControls: () => structureControlsController.hideBinaryTreeControls(),
    hideContextMenu,
    hideEraser,
    hideToolCursors,
    hideTreeControls: () => structureControlsController.hideTreeControls(),
    isBinaryTreeElement,
    isElementLocked,
    isEditingText: () => editController.isEditing,
    isGeneralTreeElement,
    isTemporaryPanActive,
    isTreeNodeHitTarget,
    persistCurrentDraft,
    selectElementById,
    selectIds,
    setLastPointerWorldPoint: (worldPoint) => { lastPointerWorldPoint = worldPoint; },
    setStructurePanelOpen,
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
  bindUiEvents();
  bindKeyboard();

  return {
    getBoard: () => serializeCurrentBoard(),
    __debug: {
      getSelectedIds: () => [...selectedIds],
      getActiveLinearItem: () => structureInteraction.getActiveLinearItem(),
    },
    destroy: () => {
      boardSession.destroy();
      destroyArrayAlgorithmSessionController();
      textOverlayController.clear();
      shapeRenderController.clear();
      stage.destroy();
    },
  };

  function bindStageEvents() {
    stage.on("wheel", (event) => viewportController.handleWheel(event));
    stage.on("pointerdown", stagePointerController.handlePointerDown);
    stage.on("pointermove", stagePointerController.handlePointerMove);
    stage.on("pointerup pointercancel", stagePointerController.handlePointerUp);
    stage.container().addEventListener("pointerleave", hideToolCursors);
    stage.container().addEventListener("contextmenu", stagePointerController.handleContextMenu);

    selectionTransformEventsController.bindTransformerEvents({
      transformer,
      editController,
      selectionTransformPreviewController,
      handleTransformerDoubleClick: stagePointerController.handleTransformerDoubleClick,
      syncSelectedNodes,
      pushHistory,
    });
  }

  function isTemporaryPanActive() {
    return isSpaceDown || currentTool === TOOLS.PAN;
  }

  function isArrayAlgorithmLocked(elementId) {
    return isArrayAlgorithmLockedDelegate(elementId);
  }

  function addElement(element, message) {
    board.elements = reorderElements([...board.elements, element]);
    renderBoard();
    pushHistory(message);
  }

  function createNode(element) {
    return createElementNode(element, getElementNodeHandlers(element));
  }

  function getElementNodeHandlers(element) {
    return {
      draggable: shouldElementBeDraggable(element) && !isLinearPointerGestureElement(element.id),
      onDragStart: (node) => selectionDragController.beginNodeDragSelection(node),
      onDragMove: (node) => selectionDragController.updateNodeDragSelection(node),
      onMove: (node) => {
        if (isElementLocked(getElementIdFromNode(node))) return;
        selectionDragController.finishNodeDragSelection(node);
      },
      canEditArrayItems: currentTool === TOOLS.SELECT && !isTemporaryPanActive() && !isArrayAlgorithmLocked(element.id),
      onSelect: (event, node) => {
        if (isTemporaryPanActive() || currentTool !== TOOLS.SELECT) return;
        event.cancelBubble = true;
        if (suppressNextSelectionClick) {
          suppressNextSelectionClick = false;
          return;
        }
        const id = getElementIdFromNode(node);
        selectElementById(id, event.evt.shiftKey);
      },
      onEdit: (event, node) => {
        if (isTemporaryPanActive() || currentTool !== TOOLS.SELECT) return;
        event.cancelBubble = true;
        const id = getElementIdFromNode(node);
        const editable = board.elements.find((item) => item.id === id && ["text", "sticky"].includes(item.type));
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
      onGraphNodeMove: moveGraphStructureNode,
      onGraphNodeClick: handleGraphNodeClick,
      onGraphNodeConnect: connectGraphStructureNodes,
      onGraphNodeEdit: editGraphStructureNode,
      onGraphEdgeEdit: editGraphStructureEdge,
      getGraphEdgeState: (elementId) => structureInteraction.getStructureConnectState({ kind: "graph", elementId }),
      onTreeNodeEdit: editTreeStructureNode,
      onTreeNodeClick: handleTreeNodeClick,
      onTreeNodePress: handleTreeStructureNodePress,
      onTreeNodeMove: moveTreeStructureNode,
      onTreeNodeConnect: connectTreeStructureNodes,
      getTreeConnectState: (elementId) => structureInteraction.getStructureConnectState({ kind: "tree", elementId }),
    };
  }

  function applyElementToNode(element, node) {
    node.setAttrs(createNodeAttrs(element));
    if (["text", "sticky"].includes(element.type)) {
      syncTextNodeContent(node, element);
    }
    if (element.type === "coordinate-plane") {
      rerenderCoordinatePlaneNode(element, node);
    }
  }

  function rerenderCoordinatePlaneNode(element, node) {
    syncCoordinatePlaneNodeContent(node, element);
  }

  function syncTextOverlays({ hiddenIds = editController.isEditing ? selectedIds : [], elements = board.elements } = {}) {
    textOverlayController.setHiddenIds(hiddenIds);
    textOverlayController.sync(elements);
  }

  function renderBoard() {
    shapeRenderController.syncElementNodes(reorderElements(board.elements));
    draftInteractionController.moveSelectionRectToTop();
    syncSelectionNodes();
    structureControlsController.renderLinearItemControls();
    structureControlsController.renderTreeControls();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
    syncTextOverlays({ hiddenIds: editController.isEditing ? selectedIds : [] });
  }

  function selectIds(ids) {
    selectedIds = selectionController.setSelectedIds(ids);
    pauseUnselectedArrayAlgorithmSessions();
    const { previousActiveLinearItem, activeLinearItem } = structureInteraction.syncSelection({
      elements: board.elements,
      selectedIds,
    });
    syncSelectionNodes();
    syncLinearItemActiveVisual(previousActiveLinearItem?.elementId);
    syncLinearItemActiveVisual(activeLinearItem?.elementId);
    structureControlsController.renderLinearItemControls();
    structureControlsController.renderTreeControls();
    contentLayer.batchDraw();
    updateChrome();
  }

  function selectElementById(id, additive = false) {
    const ids = selectionController.selectElementById(id, { additive, elements: board.elements });
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

  function syncSelectionNodes() {
    selectionTransformerController.syncSelectionNodes();
  }

  function updateDraggableState() {
    contentLayer.find(".element").forEach((node) => {
      const id = getElementIdFromNode(node);
      const element = board.elements.find((item) => item.id === id);
      node.draggable(shouldElementBeDraggable(element) && !isLinearPointerGestureElement(id) && !isSelectionDragElement(id));
    });
  }

  function syncSelectedNodes(nodes = transformer.nodes()) {
    selectionTransformCommitController.syncSelectedNodes(nodes);
    renderBoard();
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

  function isSelectedTreeElementWithTraversal(element) {
    return isTreeElementWithTraversal(element) && selectedIds.includes(element.id);
  }

  function syncLinearItemActiveVisual(elementId) {
    structureActiveVisualController.syncLinearItemActiveVisual(elementId);
  }

  function syncBinaryTreeActiveVisual(elementId) {
    structureActiveVisualController.syncBinaryTreeActiveVisual(elementId);
  }

  function syncGeneralTreeActiveVisual(elementId) {
    structureActiveVisualController.syncGeneralTreeActiveVisual(elementId);
  }

  function shouldElementBeDraggable(element) {
    if (!element) return false;
    return currentTool === TOOLS.SELECT
      && !isTemporaryPanActive()
      && !element.locked
      && !["text", "sticky"].includes(element.type);
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
