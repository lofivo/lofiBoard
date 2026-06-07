import Konva from "konva";
import { renderShell } from "./shell/app-shell.js";
import { createBoardSessionController } from "./shell/board-session-controller.js";
import { createClipboardController } from "./clipboard/clipboard-controller.js";
import { createContextMenuDomController } from "./context-menu/context-menu-dom-controller.js";
import { createContextMenuController } from "./context-menu/context-menu-controller.js";
import { createControlsBindingController } from "./shell/controls-binding-controller.js";
import { createEditController } from "./editing/edit-controller.js";
import { createMenuStateController } from "./panels/menu-state-controller.js";
import { createPanelStateController } from "./panels/panel-state-controller.js";
import { createPropertyControlsController } from "./inspector/property-controls-controller.js";
import { createPropertyControlsDomController } from "./inspector/property-controls-dom-controller.js";
import { createContentBoundsQuery } from "./selection/content-bounds-query.js";
import {
  createSelectionController,
  expandGroupedIds as expandSelectionGroupIds,
} from "./selection/selection-controller.js";
import { createSelectionHitQuery } from "./selection/selection-hit-query.js";
import { createShapeRenderAdapter } from "./rendering/shape-render-adapter.js";
import { createShapeRenderController } from "./rendering/shape-render-controller.js";
import { createStructureActiveVisualController } from "./structures/structure-active-visual-controller.js";
import { createStructureControlsController } from "./structures/structure-controls-controller.js";
import { createStructureControlsPositionController } from "./structures/structure-controls-position-controller.js";
import { createStructureInspectorController } from "./structures/structure-inspector-controller.js";
import {
  findLinearItemNode,
  findLinearItemValueGroup,
  findTreeNodeGroup,
} from "./structures/structure-node-query.js";
import { createStructurePanelController } from "./structures/structure-panel-controller.js";
import { createToolController, getToolStatus as getToolStatusText } from "./tools/tool-controller.js";
import { createViewportActionController } from "./viewport/viewport-action-controller.js";
import { createViewportController } from "./viewport/viewport-controller.js";
import { createInteractionStateMachine, SM } from "../tools/interaction-state-machine.js";
import { queryWhiteboardRefs } from "./shell/dom-refs.js";
import { isToolPropertyPanelAvailable } from "./inspector/inspector-model.js";
import { renderLayerItemsMarkup } from "./panels/layer-panel.js";
import {
  DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  clearArrayAlgorithmRuntimeMarkers,
} from "./algorithms/array-algorithm-model.js";
import { createAppActionController } from "./shell/app-action-controller.js";
import { createAppChromeController } from "./shell/app-chrome-controller.js";
import { createAppPanelController } from "./shell/app-panel-controller.js";
import { createArrayAlgorithmPanelController } from "./algorithms/array-algorithm-panel-controller.js";
import { createArrayAlgorithmSessionController } from "./algorithms/array-algorithm-session-controller.js";
import { createExportPngController } from "./import-export/export-png-controller.js";
import { createImportWorkflowController } from "./import-export/import-workflow-controller.js";
import { createInspectorPanelDomController } from "./inspector/inspector-panel-dom-controller.js";
import { createSelectionStyleController } from "./inspector/selection-style-controller.js";
import { createKeyboardController } from "./shell/keyboard-controller.js";
import { createLayerPanelController } from "./panels/layer-panel-controller.js";
import { createPanelDomController } from "./panels/panel-dom-controller.js";
import { createAlignmentSnapController } from "./selection/alignment-snap-controller.js";
import { createSelectionActionController } from "./selection/selection-action-controller.js";
import { createSelectionClipboardController } from "./selection/selection-clipboard-controller.js";
import { createSelectionDragController } from "./selection/selection-drag-controller.js";
import { createSelectionTransformCommitController } from "./selection/selection-transform-commit-controller.js";
import { createSelectionTransformPreviewController } from "./selection/selection-transform-preview-controller.js";
import { createSelectionTransformerController } from "./selection/selection-transformer-controller.js";
import { createStructureCellEditorController } from "./structures/structure-cell-editor-controller.js";
import { createStructureEditActionController } from "./structures/structure-edit-action-controller.js";
import { createStructureExportController } from "./structures/structure-export-controller.js";
import { createStructureInspectorSyncController } from "./structures/structure-inspector-sync-controller.js";
import { createLinearStructureGestureController } from "./structures/linear-structure-gesture-controller.js";
import { createLinearStructureItemDragController } from "./structures/linear-structure-item-drag-controller.js";
import { createLinearStructurePanelSyncController } from "./structures/linear-structure-panel-sync-controller.js";
import { createLinearStructurePointerDragController } from "./structures/linear-structure-pointer-drag-controller.js";
import { createStructureNodeActionController } from "./structures/structure-node-action-controller.js";
import { createStatusController } from "./shell/status-controller.js";
import { createTextElementMeasurer } from "./editing/text-element-measure.js";
import { createDrawingInteractionController } from "./tools/drawing-interaction-controller.js";
import { createDraftInteractionController } from "./tools/draft-interaction-controller.js";
import { createToolCursorController } from "./tools/tool-cursor-controller.js";
import { createUiEventsController } from "./shell/ui-events-controller.js";
import { removeElementsById } from "../services/clipboard-service.js";
import {
  createEmptyBoard,
  moveElementsByLayer,
  normalizeBoard,
  reorderElements,
  serializeBoard,
} from "../board/board-model.js";
import {
  createImageElement as buildImageElement,
  createStickyElement as buildStickyElement,
  createTextElement as buildTextElement,
} from "../board/element-factory.js";
import {
  chooseWhiteboardSaveFile,
  openWhiteboardFile,
  supportsFileSystemAccess,
  writeWhiteboardFile,
} from "../services/file-service.js";
import {
  LOCAL_DRAFT_FILE_NAME,
  clearLocalDraft,
  loadLocalDraft,
  saveLocalDraft,
} from "../services/draft-storage-service.js";
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
} from "../services/image-import-service.js";
import {
  clampResizeAnchorPosition,
  getTextEditorStyle,
  getStickyEditorCommitBox,
  getStickyTextInsets,
  getUniformScaledBoxForResize,
  getSelectionHitRadius,
  getSingleLineTextEditorHeight,
  getMinimumTextResizeWidth,
  isNativeTextEditingTarget,
  isTransformerAnchorTarget,
  isTransformerTarget,
  measureTextareaContentHeight,
  nextToolAfterTextPlacement,
  pickElementIdAtPoint,
  pointHitsSelectionBounds,
  shouldPreventBrowserZoom,
  shouldEditTextOnTransformerDoubleClick,
  shouldIgnoreCanvasPointerDown,
  shouldPreserveTextEditorOnPointerDown,
  shouldSelectAll,
  shouldUseBrowserSelectAll,
} from "../tools/interaction-rules.js";
import {
  isShapeTool,
  resolveActiveDrawingTool,
} from "../tools/tool-behavior.js";
import {
  captureDrawingPointer,
  preventDrawingPointerDefault,
  releaseDrawingPointer,
  shouldHandlePointerEvent,
} from "../tools/stroke-engine.js";
import {
  DEFAULT_SHAPE_TOOL,
  TOOLS,
} from "../ui/ui-config.js";
import {
  TREE_STRUCTURE_STYLE,
  LINEAR_STRUCTURE_TYPES,
  createStructureElements,
  isLinearStructureElement,
  moveArrayItem,
  exportGraph,
  exportTree,
  getBinaryTreeChildSides,
} from "../structures/structure-templates.js";
import { createLinearStructureEventAdapter } from "../structures/structure-event-adapter.js";
import { createStructureInteraction } from "../structures/structure-interaction.js";
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
  let isPanning = false;
  let panStart = null;
  let activeDrawingPointerCapture = null;
  let isEditingText = false;
  let lastPointerWorldPoint = null;
  let initialStatusMessage = null;
  let lastTransformAnchor = null;
  let handledNodeDragEnd = false;
  let drawingInteractionController = null;
  let draftInteractionController = null;
  let selectionDragController = null;
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
    pushHistory,
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

  const transformer = new Konva.Transformer({
    rotateEnabled: true,
    rotateLineVisible: false,
    rotateAnchorOffset: 28,
    flipEnabled: false,
    borderStroke: "#2563eb",
    borderStrokeWidth: 1.5,
    anchorStroke: "#2563eb",
    anchorFill: "#ffffff",
    anchorSize: 10,
    anchorCornerRadius: 3,
    padding: 6,
    ignoreStroke: true,
    anchorStyleFunc: (anchor) => {
      if (anchor.hasName("top-center") || anchor.hasName("bottom-center")) {
        const width = Math.max(36, transformer.width() - 28);
        anchor.width(width);
        anchor.height(14);
        anchor.offsetX(width / 2);
        anchor.offsetY(anchor.hasName("top-center") ? 20 : -6);
        anchor.fill("rgba(0,0,0,0)");
        anchor.stroke("rgba(0,0,0,0)");
        anchor.cornerRadius(7);
      } else if (anchor.hasName("middle-left") || anchor.hasName("middle-right")) {
        const height = Math.max(36, transformer.height() - 28);
        anchor.width(28);
        anchor.height(height);
        anchor.offsetX(anchor.hasName("middle-left") ? 34 : -6);
        anchor.offsetY(height / 2);
        anchor.fill("rgba(0,0,0,0)");
        anchor.stroke("rgba(0,0,0,0)");
        anchor.cornerRadius(7);
      } else if (!anchor.hasName("rotater")) {
        anchor.cornerRadius(3);
      }
    },
    anchorDragBoundFunc: (oldAbsPos, newAbsPos) => selectionTransformerController.clampAnchorDrag(oldAbsPos, newAbsPos),
    boundBoxFunc: (oldBox, newBox) => {
      if (!Number.isFinite(newBox.width) || !Number.isFinite(newBox.height)) return oldBox;
      const anchor = transformer.getActiveAnchor?.();
      const minWidth = selectionTransformerController.getActiveMinWidth();
      const minHeight = selectionTransformerController.getActiveMinHeight();
      const nextBox = getUniformScaledBoxForResize({
        elements: selectionTransformerController.getActiveElements(),
        anchor,
        oldBox,
        newBox,
        minWidth,
        minHeight,
      });
      if (nextBox.width < minWidth) {
        if (anchor?.includes("left")) nextBox.x = oldBox.x + oldBox.width - minWidth;
        nextBox.width = minWidth;
      }
      if (nextBox.height < minHeight) {
        if (anchor?.includes("top")) nextBox.y = oldBox.y + oldBox.height - minHeight;
        nextBox.height = minHeight;
      }
      return nextBox;
    },
  });
  overlayLayer.add(transformer);

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
    pushHistory,
    renderBoard,
    selectElementById,
    setElements: (elements) => { board.elements = elements; },
    setHandledNodeDragEnd: (value) => { handledNodeDragEnd = value; },
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
    getLastTransformAnchor: () => lastTransformAnchor,
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
    ensureSelectionVisible,
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
    fitContent,
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
    resetView,
    saveBoardFile,
    saveBoardFileAs,
    sendSelectionBackward,
    sendSelectionToBack,
    setBackgroundMode,
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
    setBackgroundMode,
    setZoomAtCenter,
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
    zoomBy,
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
    stage.on("wheel", handleWheel);
    stage.on("pointerdown", handlePointerDown);
    stage.on("pointermove", handlePointerMove);
    stage.on("pointerup pointercancel", handlePointerUp);
    stage.container().addEventListener("pointerleave", hideToolCursors);
    stage.container().addEventListener("contextmenu", handleContextMenu);

    transformer.on("transform", selectionTransformPreviewController.syncTextWidthResize);
    transformer.on("transform", selectionTransformPreviewController.syncTextTransformPreview);
    transformer.on("transform", selectionTransformPreviewController.syncCoordinatePlaneTransformPreview);
    transformer.on("transformstart transform", () => {
      lastTransformAnchor = transformer.getActiveAnchor?.() ?? lastTransformAnchor;
    });
    transformer.on("dblclick dbltap", handleTransformerDoubleClick);
    transformer.on("dragend transformend", () => {
      if (editController.isEditing) return;
      if (handledNodeDragEnd) {
        handledNodeDragEnd = false;
        return;
      }
      syncSelectedNodes();
      pushHistory("已更新选择对象");
      lastTransformAnchor = null;
    });
  }

  function hydrateLocalDraft() {
    const result = boardSession.hydrateLocalDraft();
    if (result.message) initialStatusMessage = result.message;
  }

  function handleWheel(event) {
    viewportController.handleWheel(event);
  }

  function zoomBy(multiplier) {
    viewportController.zoomBy(multiplier);
  }

  function setZoomAtCenter(requestedScale) {
    viewportController.setZoomAtCenter(requestedScale);
  }

  function beginDrawingPointerSession(event) {
    const nativeEvent = event?.evt;
    preventDrawingPointerDefault(nativeEvent);
    activeDrawingPointerCapture = captureDrawingPointer(nativeEvent);
  }

  function endDrawingPointerSession() {
    releaseDrawingPointer(activeDrawingPointerCapture);
    activeDrawingPointerCapture = null;
  }

  function handlePointerDown(event) {
    hideContextMenu();
    setZoomMenuOpen(false);

    if (shouldIgnoreCanvasPointerDown({ target: event.target, isEditingText: editController.isEditing })) {
      return;
    }

    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;
    lastPointerWorldPoint = worldPoint;

    if (isSpaceDown || currentTool === TOOLS.PAN || event.evt.button === 1) {
      isPanning = true;
      interactionSM.enter(SM.PANNING);
      stage.container().classList.add("is-panning");
      panStart = {
        pointer: stage.getPointerPosition(),
        stage: stage.position(),
      };
      return;
    }

    if (currentTool === TOOLS.SELECT) {
      if (isTransformerTarget(event.target) && !isTransformerAnchorTarget(event.target)) {
        const passThroughId = getSelectableElementIdAtWorldPoint(worldPoint, {
          preferUnselected: true,
        });
        if (passThroughId) {
          selectElementById(passThroughId, event.evt.shiftKey);
          if (!event.evt.shiftKey) {
            selectionDragController.beginSelectionDrag(worldPoint);
          }
          return;
        }
        selectionDragController.beginSelectionDrag(worldPoint);
        return;
      }
      handleSelectPointerDown(event, worldPoint);
      return;
    }

    clearSelection();

    if (currentTool === TOOLS.PEN) {
      showBrushCursor(worldPoint);
      beginDrawingPointerSession(event);
      drawingInteractionController.startStroke(worldPoint, event.evt.pressure);
      interactionSM.enter(SM.DRAWING);
      return;
    }

    if (currentTool === TOOLS.ERASER_STROKE) {
      beginDrawingPointerSession(event);
      const radius = drawingInteractionController.beginEraser(worldPoint);
      interactionSM.enter(SM.ERASING);
      stage.container().classList.add("is-erasing");
      drawingInteractionController.eraseStrokeAt(worldPoint, radius);
      showStrokeEraser(worldPoint, radius);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT) {
      beginDrawingPointerSession(event);
      drawingInteractionController.beginEraser(worldPoint);
      interactionSM.enter(SM.ERASING);
      stage.container().classList.add("is-erasing");
      drawingInteractionController.eraseObjectAt(event.target);
      showObjectEraser(worldPoint);
      return;
    }

    if (currentTool === TOOLS.TEXT) {
      const element = buildTextElement({
        point: worldPoint,
        zIndex: board.elements.length,
      });
      addElement(element, "已添加文字");
      selectIds([element.id]);
      setTool(nextToolAfterTextPlacement(currentTool));
      requestAnimationFrame(() => editController.editElement(element.id));
      return;
    }

    if (currentTool === TOOLS.STICKY) {
      const element = buildStickyElement({
        point: worldPoint,
        zIndex: board.elements.length,
      });
      addElement(element, "已添加便签");
      selectIds([element.id]);
      setTool(TOOLS.SELECT);
      requestAnimationFrame(() => editController.editElement(element.id));
      return;
    }

    if (currentTool === TOOLS.STRUCTURE) {
      setStructurePanelOpen(true);
      return;
    }

    const drawingTool = resolveActiveDrawingTool(currentTool, activeShapeTool);
    if (isShapeTool(drawingTool)) {
      beginDrawingPointerSession(event);
      draftInteractionController.startShapeDraft(worldPoint);
      interactionSM.enter(SM.DRAWING);
    }
  }

  function handlePointerMove(event) {
    if (!shouldHandlePointerEvent(event?.evt, activeDrawingPointerCapture?.pointerId)) return;
    if (activeDrawingPointerCapture) preventDrawingPointerDefault(event?.evt);

    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;
    lastPointerWorldPoint = worldPoint;

    if (isTemporaryPanActive() && !isPanning) {
      hideToolCursors();
      return;
    }

    if (linearGestureController.handlePointerMove(worldPoint)) return;

    if (isPanning && panStart) {
      hideToolCursors();
      const pointer = stage.getPointerPosition();
      stage.position({
        x: panStart.stage.x + pointer.x - panStart.pointer.x,
        y: panStart.stage.y + pointer.y - panStart.pointer.y,
      });
      updateGrid();
      updateViewportChrome();
      return;
    }

    if (drawingInteractionController.hasStrokeDraft()) {
      drawingInteractionController.appendStroke(worldPoint, event.evt.pressure);
      showBrushCursor(worldPoint);
      return;
    }

    if (draftInteractionController.hasShapeDraft()) {
      draftInteractionController.updateShapeDraft(worldPoint);
      return;
    }

    if (draftInteractionController.hasSelectionDraft()) {
      draftInteractionController.updateSelectionDraft(worldPoint);
      return;
    }

    if (selectionDragController.hasSelectionDrag()) {
      selectionDragController.updateSelectionDrag(worldPoint);
      return;
    }

    if (currentTool === TOOLS.PEN) {
      showBrushCursor(worldPoint);
      return;
    }

    if ((currentTool === TOOLS.ERASER_STROKE || currentTool === TOOLS.ERASER_OBJECT) && !drawingInteractionController.hasActiveEraserSnapshot()) {
      if (currentTool === TOOLS.ERASER_OBJECT) {
        showObjectEraser(worldPoint);
      } else {
        showStrokeEraser(worldPoint, getBaseEraserRadius());
      }
      return;
    }

    if (currentTool === TOOLS.ERASER_STROKE && drawingInteractionController.hasActiveEraserSnapshot()) {
      const radius = drawingInteractionController.updateStrokeEraser(worldPoint);
      showStrokeEraser(worldPoint, radius);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT && drawingInteractionController.hasActiveEraserSnapshot()) {
      drawingInteractionController.updateObjectEraser(worldPoint, event.target);
      showObjectEraser(worldPoint);
    }
  }

  function handlePointerUp(event) {
    if (!shouldHandlePointerEvent(event?.evt, activeDrawingPointerCapture?.pointerId)) return;
    if (activeDrawingPointerCapture) preventDrawingPointerDefault(event?.evt);

    if (linearGestureController.handlePointerUp()) return;

    if (isPanning) {
      isPanning = false;
      panStart = null;
      interactionSM.exitToIdle();
      stage.container().classList.remove("is-panning");
      persistCurrentDraft();
      return;
    }

    if (drawingInteractionController.hasStrokeDraft()) {
      endDrawingPointerSession();
      drawingInteractionController.finishStroke();
      interactionSM.exitToIdle();
      return;
    }

    if (draftInteractionController.hasShapeDraft()) {
      endDrawingPointerSession();
      draftInteractionController.finishShapeDraft();
      interactionSM.exitToIdle();
      return;
    }

    if (draftInteractionController.hasSelectionDraft()) {
      draftInteractionController.finishSelectionDraft();
      interactionSM.exitToIdle();
      return;
    }

    if (selectionDragController.hasSelectionDrag()) {
      selectionDragController.finishSelectionDrag();
      interactionSM.exitToIdle();
      return;
    }


    if (drawingInteractionController.hasActiveEraserSnapshot()) {
      endDrawingPointerSession();
      hideEraser();
      stage.container().classList.remove("is-erasing");
      drawingInteractionController.finishEraser();
      interactionSM.exitToIdle();
    }
  }

  function handleContextMenu(event) {
    event.preventDefault();
    stage.setPointersPositions(event);
    const pointer = stage.getPointerPosition();
    const worldPoint = getWorldPointer(stage);
    if (worldPoint) {
      lastPointerWorldPoint = worldPoint;
    }
    const targetId = pointer ? getElementIdFromNode(stage.getIntersection(pointer)) : null;

    if (targetId && !selectedIds.includes(targetId)) {
      selectIds([targetId]);
    }

    if (!contextMenuController.shouldShow({
      targetId,
      selectedIds,
      hasClipboard: clipboardController.hasSnapshot(),
    })) {
      return;
    }

    showContextMenu(event.clientX, event.clientY);
  }

  function handleTransformerDoubleClick(event) {
    if (isTemporaryPanActive() || currentTool !== TOOLS.SELECT || isTransformerAnchorTarget(event.target)) return;
    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;
    const id = getSelectableElementIdAtWorldPoint(worldPoint);
    const editable = board.elements.find((item) => item.id === id);
    if (!shouldEditTextOnTransformerDoubleClick({
      target: event.target,
      currentTool,
      isTemporaryPanActive: isTemporaryPanActive(),
      element: editable,
      selectedIds,
    })) return;
    event.cancelBubble = true;
    selectIds([id]);
    requestAnimationFrame(() => editController.editElement(id));
  }

  function handleSelectPointerDown(event, worldPoint) {
    if (suppressNextCanvasSelection) {
      suppressNextCanvasSelection = false;
      return;
    }
    if (suppressSelectionDragOnce) {
      suppressSelectionDragOnce = false;
      return;
    }
    const rawTargetElement = getElementIdFromNode(event.target);
    const targetElement = getSelectableElementIdAtWorldPoint(worldPoint, {
      fallbackNode: event.target,
    });
    if (targetElement) {
      const element = board.elements.find((item) => item.id === targetElement);
      const targetIds = expandGroupedIds([targetElement]);
      const activeTreeNode = structureInteraction.getActiveTreeNode();
      if (isBinaryTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement) {
        const shouldDragBinaryTreeBlank = !event.evt.shiftKey && targetIds.some((id) => selectedIds.includes(id));
        const previousActiveTreeElementId = activeTreeNode.elementId;
        structureInteraction.clearActiveTreeNode();
        structureControlsController.hideBinaryTreeControls();
        syncBinaryTreeActiveVisual(previousActiveTreeElementId);
        if (shouldDragBinaryTreeBlank) {
          selectionDragController.beginSelectionDrag(worldPoint);
        }
        return;
      }
      if (isGeneralTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement) {
        const shouldDragTreeBlank = !event.evt.shiftKey && targetIds.some((id) => selectedIds.includes(id));
        const previousActiveTreeElementId = activeTreeNode.elementId;
        structureInteraction.clearActiveTreeNode();
        structureControlsController.hideTreeControls();
        syncGeneralTreeActiveVisual(previousActiveTreeElementId);
        if (shouldDragTreeBlank) {
          selectionDragController.beginSelectionDrag(worldPoint);
        }
        return;
      }
      if (isGeneralTreeElement(element) && isTreeNodeHitTarget(event.target)) {
        return;
      }
      if (!event.evt.shiftKey && targetIds.some((id) => selectedIds.includes(id))) {
        selectionDragController.beginSelectionDrag(worldPoint);
        return;
      }
      selectElementById(targetElement, event.evt.shiftKey);
      if (!event.evt.shiftKey && element && (["text", "sticky"].includes(element.type) || targetElement !== rawTargetElement)) {
        selectionDragController.beginSelectionDrag(worldPoint);
      }
      return;
    }

    const nearbySelectedId = getNearbySelectedElementId(worldPoint);
    if (nearbySelectedId && selectedIds.some((id) => !isElementLocked(id))) {
      selectionDragController.beginSelectionDrag(worldPoint);
      return;
    }

    clearSelection();
    interactionSM.enter(SM.SELECTING);
    draftInteractionController.startSelectionDraft(worldPoint);
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

  function syncSelectedNodes() {
    selectionTransformCommitController.syncSelectedNodes(transformer.nodes());
    renderBoard();
  }

  function applyStyleToSelection() {
    if (selectedIds.length === 0) {
      saveToolPropertyControlsForCurrentTool();
      updateContextPanel();
      return;
    }

    const didApply = selectionStyleController.applyStyleToSelection({
      arrowDoubleEnded: arrowDoubleEndedInput.checked,
      color: colorInput.value,
      fillColor: fillInput.value,
      fillTransparent: fillTransparentInput.checked,
      fontFamily: fontFamilyInput.value,
      fontSize: fontSizeInput.value,
      strokeStyle: getStrokeStyleFromControls(),
      width: widthInput.value,
    });
    if (!didApply) return;

    renderBoard();
    pushHistory("已更新样式");
  }

  function applyCoordinateStyleToSelection() {
    const didApply = selectionStyleController.applyCoordinateStyleToSelection({
      axisStroke: coordinateAxisColorInput.value,
      gridStroke: coordinateGridColorInput.value,
      labelFill: coordinateLabelColorInput.value,
      showGrid: coordinateShowGridInput.checked,
      showLabels: coordinateShowLabelsInput.checked,
      showTicks: coordinateShowTicksInput.checked,
      unitSize: coordinateUnitSizeInput.value,
    });
    if (!didApply) return;

    renderBoard();
    pushHistory("已更新坐标系");
  }

  function toggleTextStyle(style) {
    const didToggle = selectionStyleController.toggleTextStyle(style);
    if (!didToggle) return;

    renderBoard();
    pushHistory("已更新文字样式");
  }

  function selectAllElements() {
    const selectableIds = board.elements.filter((el) => !el.locked).map((el) => el.id);
    if (selectableIds.length === 0) return;

    selectIds(selectableIds);
    setStatus(`已选择全部对象 (${selectableIds.length})`);
  }

  function insertStructureFromPanel() {
    const activeStructureType = structurePanelController.getActiveStructureType();
    const activeArrayInitMode = structurePanelController.getActiveArrayInitMode();
    const activeStructureItem = structurePanelController.getActiveStructureItem();
    const elements = createStructureElements({
      type: activeStructureType,
      input: structureInput.value,
      initMode: isRandomStructureInitSupported(activeStructureType) ? activeArrayInitMode : "manual",
      randomCount: arrayRandomCountInput.value,
      point: getViewportCenterPoint(),
      zIndexStart: board.elements.length,
    });
    if (elements.length === 0) return;

    board.elements = reorderElements([...board.elements, ...elements]);
    setStructurePanelOpen(false);
    setTool(TOOLS.SELECT);
    renderBoard();
    selectIds(elements.map((element) => element.id));
    pushHistory(`已添加${activeStructureItem.label}`);
  }

  function isRandomStructureInitSupported(type) {
    return structurePanelController.isRandomStructureInitSupported(type);
  }

  function getViewportCenterPoint() {
    return {
      x: (stage.width() / 2 - stage.x()) / stage.scaleX(),
      y: (stage.height() / 2 - stage.y()) / stage.scaleX(),
    };
  }

  function editSelectedArrayStructure(edit) {
    const targetId = selectedIds.find((id) => {
      const element = board.elements.find((item) => item.id === id);
      return isLinearStructureElement(element) && !element.locked;
    });
    if (!targetId) return;
    if (isArrayAlgorithmLocked(targetId)) return;

    board.elements = board.elements.map((element) => (
      element.id === targetId ? edit(element) : element
    ));
    syncActiveLinearItemAfterEdit(targetId);
    renderBoard();
    selectIds([targetId]);
    pushHistory("已更新线性结构");
  }

  function getSelectedLinearStructure() {
    return board.elements.find((element) => selectedIds.includes(element.id) && isLinearStructureElement(element));
  }

  function setActiveLinearItem(elementId, index, { syncPanel = true, rerender = true } = {}) {
    const { previousActiveLinearItem, activeLinearItem } = structureInteraction.setActiveLinearItem({
      elements: board.elements,
      elementId,
      index,
    });
    if (!activeLinearItem) {
      if (syncPanel) syncLinearPanelState();
      syncLinearItemActiveVisual(previousActiveLinearItem?.elementId);
      return;
    }
    if (syncPanel) syncLinearPanelState();
    if (rerender) {
      renderBoard();
    } else {
      syncLinearItemActiveVisual(previousActiveLinearItem?.elementId);
      syncLinearItemActiveVisual(elementId);
      structureControlsController.renderLinearItemControls();
      structureControlsController.renderBinaryTreeControls();
      contentLayer.batchDraw();
    }
  }

  function syncActiveLinearItemAfterEdit(elementId, preferredIndex = null) {
    structureInteraction.syncActiveLinearItemAfterEdit({
      elements: board.elements,
      elementId,
      preferredIndex,
    });
  }

  function isBinaryTreeElement(element) {
    return element?.type === "tree-structure" && element.settings?.treeKind === "binary";
  }

  function isGeneralTreeElement(element) {
    return element?.type === "tree-structure" && element.settings?.treeKind !== "binary";
  }

  function isTreeElementWithTraversal(element) {
    return element?.type === "tree-structure";
  }

  function isInteractiveStructureElement(element) {
    return isLinearStructureElement(element) || element?.type === "tree-structure";
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

  function editSelectedStructure(type, edit, message) {
    const targetId = selectedIds.find((id) => {
      const element = board.elements.find((item) => item.id === id);
      return element?.type === type && !element.locked;
    });
    if (!targetId) return;

    board.elements = board.elements.map((element) => (
      element.id === targetId ? edit(element) : element
    ));
    const updated = board.elements.find((element) => element.id === targetId);
    if (isLinearStructureElement(updated)) {
      syncActiveLinearItemAfterEdit(targetId);
    }
    renderBoard();
    selectIds([targetId]);
    syncTreeStructurePanelState();
    pushHistory(message);
  }

  function promptIndex(label, fallback = 0) {
    const input = window.prompt(label, String(Math.max(0, Number(fallback) || 0)));
    if (input === null) return fallback;
    const parsed = Number.parseInt(input, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function promptValue(label, fallback = "") {
    const input = window.prompt(label, String(fallback ?? ""));
    return input === null ? fallback : input;
  }

  function promptMultiline(label, fallback = "") {
    return promptValue(label, fallback);
  }

  function promptBoolean(label, fallback = false) {
    const input = window.prompt(label, fallback ? "y" : "n");
    if (input === null) return fallback;
    return /^(y|yes|true|1|是|有向)$/i.test(input.trim());
  }

  function handleTreeStructureNodePress(event, group) {
    if (isTemporaryPanActive() || currentTool !== TOOLS.SELECT) return;
    const elementId = getElementIdFromNode(group);
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "tree-structure" || element.settings?.treeKind !== "binary" || element.locked) return;
    if (!selectedIds.includes(elementId)) selectIds([elementId]);
    const worldPoint = getWorldPointer(stage);
    if (!event.evt?.shiftKey && worldPoint) selectionDragController.beginSelectionDrag(worldPoint);
  }

  function moveArrayStructureItem({ elementId, fromIndex, toIndex }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    if (fromIndex === toIndex) {
      structureInteraction.clearActiveLinearItem();
      renderBoard();
      selectIds([]);
      return;
    }
    board.elements = board.elements.map((item) => (
      item.id === elementId ? moveArrayItem(item, fromIndex, toIndex) : item
    ));
    structureInteraction.clearActiveLinearItem();
    renderBoard();
    selectIds([]);
    pushHistory("已移动数组元素");
  }

  function getTreeRootNodeId(element) {
    if (!element || element.type !== "tree-structure") return null;
    const nodeIds = (element.nodes ?? []).map((node) => node.id);
    const childIds = new Set((element.edges ?? []).map((edge) => edge.to));
    return element.settings?.rootId ?? nodeIds.find((id) => !childIds.has(id)) ?? nodeIds[0] ?? null;
  }

  function getTreeParentNodeId(element, nodeId) {
    if (!element || element.type !== "tree-structure" || !nodeId) return null;
    return (element.edges ?? []).find((edge) => edge.to === nodeId)?.from ?? null;
  }

  function isTreeRootNode(element, nodeId) {
    return Boolean(nodeId && nodeId === getTreeRootNodeId(element));
  }

  function isTreeNodeHitTarget(target) {
    return Boolean(target?.hasName?.("tree-node") || target?.findAncestor?.(".tree-node"));
  }

  function getActiveTreeNodeId(element) {
    const activeTreeNode = structureInteraction.getActiveTreeNode();
    if (activeTreeNode?.elementId === element.id) return activeTreeNode.nodeId;
    return element.settings?.rootId ?? element.nodes?.[0]?.id ?? null;
  }

  function undoHistory() {
    restoreFromHistory(boardSession.getHistory().undo(), "已撤销");
  }

  function redoHistory() {
    restoreFromHistory(boardSession.getHistory().redo(), "已重做");
  }

  function fitContent() {
    viewportActions.fitContent();
  }

  function ensureSelectionVisible() {
    viewportActions.ensureSelectionVisible();
  }

  function newBoard() {
    cancelArrayAlgorithmPlayback();
    cancelArrayAlgorithmSwapAnimation({ commitStableState: false });
    clearArrayAlgorithmSessions();
    boardSession.newBoard();
  }

  function resetView() {
    viewportActions.resetView();
  }

  function setBackgroundMode(backgroundMode) {
    viewportActions.setBackgroundMode(backgroundMode);
  }

  function setTool(tool) {
    const { previousTool, toolChanged } = toolController.setTool(tool);
    if (toolChanged) saveToolPropertyControlsForCurrentTool();
    currentTool = toolController.currentTool;
    if (tool !== TOOLS.SELECT) {
      linearGestureController.resetLinearItemPressState();
      linearGestureController.resetLinearPointerPressState();
      selectionDragController.cancelSelectionDrag();
    }
    root.querySelectorAll("[data-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === tool);
    });
    if (tool !== TOOLS.SHAPE) setShapePopoverOpen(false);
    if (tool !== TOOLS.STRUCTURE) setStructurePanelOpen(false);
    if (tool === TOOLS.STRUCTURE) setStructurePanelOpen(true);
    hideToolCursors();
    stage.container().classList.remove("is-erasing");
    if (![TOOLS.SELECT, TOOLS.PAN].includes(tool)) {
      clearSelection();
    }
    updateDraggableState();
    syncSelectionNodes();
    stage.container().dataset.tool = tool;
    if (toolChanged) {
      restorePropertyControlsForTool(tool);
      syncInspectorPanelState({ forceReset: true });
    }
    updateChrome();
    setStatus(getToolStatus(tool));
    if (toolChanged && (tool === TOOLS.SELECT || previousTool === TOOLS.SELECT)) {
      renderBoard();
    }
  }

  function setActiveShapeTool(shapeTool) {
    activeShapeTool = toolController.setActiveShapeTool(shapeTool);
  }

  function getToolStatus(tool) {
    return getToolStatusText(tool);
  }

  async function openBoardFile() {
    await boardSession.openBoardFile();
  }

  async function saveBoardFile() {
    await boardSession.saveBoardFile();
  }

  async function saveBoardFileAs() {
    await boardSession.saveBoardFileAs();
  }

  async function writeToHandle(handle) {
    await boardSession.writeToHandle(handle);
  }

  function serializeCurrentBoard() {
    boardSession.setBoard(board);
    return boardSession.serializeCurrentBoard();
  }

  function snapshotBoard() {
    return serializeCurrentBoard();
  }

  function pushHistory(message) {
    boardSession.setBoard(board);
    boardSession.pushHistory(message);
  }

  function restoreFromHistory(nextBoard, message) {
    if (!nextBoard) return;
    cancelArrayAlgorithmPlayback();
    cancelArrayAlgorithmSwapAnimation({ commitStableState: false });
    clearArrayAlgorithmSessions();
    boardSession.restoreFromHistory(nextBoard, message);
  }

  function persistCurrentDraft() {
    boardSession.setBoard(board);
    return boardSession.persistCurrentDraft();
  }

  function schedulePersistCurrentDraft() {
    boardSession.setBoard(board);
    boardSession.schedulePersistCurrentDraft();
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
