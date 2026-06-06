import Konva from "konva";
import { renderShell } from "./app-shell.js";
import { createBoardSessionController } from "./board-session-controller.js";
import { createClipboardController } from "./clipboard-controller.js";
import { createContextMenuDomController } from "./context-menu-dom-controller.js";
import { createContextMenuController } from "./context-menu-controller.js";
import { createControlsBindingController } from "./controls-binding-controller.js";
import { createEditController } from "./edit-controller.js";
import { createMenuStateController } from "./menu-state-controller.js";
import { createPanelStateController } from "./panel-state-controller.js";
import { createPropertyControlsController } from "./property-controls-controller.js";
import { createPropertyControlsDomController } from "./property-controls-dom-controller.js";
import { createContentBoundsQuery } from "./content-bounds-query.js";
import {
  createSelectionController,
  expandGroupedIds as expandSelectionGroupIds,
} from "./selection-controller.js";
import { createSelectionHitQuery } from "./selection-hit-query.js";
import { createShapeRenderAdapter } from "./shape-render-adapter.js";
import { createShapeRenderController } from "./shape-render-controller.js";
import { createStructureActiveVisualController } from "./structure-active-visual-controller.js";
import { createStructureControlsController } from "./structure-controls-controller.js";
import { createStructureControlsPositionController } from "./structure-controls-position-controller.js";
import { createStructureInspectorController } from "./structure-inspector-controller.js";
import {
  findLinearItemNode,
  findLinearItemValueGroup,
  findTreeNodeGroup,
  getLinearItemNodeIndex,
} from "./structure-node-query.js";
import { createStructurePanelController } from "./structure-panel-controller.js";
import { createToolController, getToolStatus as getToolStatusText } from "./tool-controller.js";
import { createViewportActionController } from "./viewport-action-controller.js";
import { createViewportController } from "./viewport-controller.js";
import { createInteractionStateMachine, SM, getTransformerOverdrawForState } from "../tools/interaction-state-machine.js";
import { queryWhiteboardRefs } from "./dom-refs.js";
import { isToolPropertyPanelAvailable } from "./inspector-model.js";
import { renderLayerItemsMarkup } from "./layer-panel.js";
import {
  toggleFontStyleToken,
  toggleTextDecorationToken,
} from "./text-style-tokens.js";
import {
  DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  clearArrayAlgorithmRuntimeMarkers,
} from "./array-algorithm-model.js";
import { createAppActionController } from "./app-action-controller.js";
import { createAppChromeController } from "./app-chrome-controller.js";
import { createAppPanelController } from "./app-panel-controller.js";
import { createArrayAlgorithmPanelController } from "./array-algorithm-panel-controller.js";
import { createArrayAlgorithmSessionController } from "./array-algorithm-session-controller.js";
import { createExportPngController } from "./export-png-controller.js";
import { createImportWorkflowController } from "./import-workflow-controller.js";
import { createInspectorPanelDomController } from "./inspector-panel-dom-controller.js";
import { createKeyboardController } from "./keyboard-controller.js";
import { createLayerPanelController } from "./layer-panel-controller.js";
import { createPanelDomController } from "./panel-dom-controller.js";
import { createSelectionActionController } from "./selection-action-controller.js";
import { createSelectionClipboardController } from "./selection-clipboard-controller.js";
import { createStructureCellEditorController } from "./structure-cell-editor-controller.js";
import { createStructureEditActionController } from "./structure-edit-action-controller.js";
import { createStructureExportController } from "./structure-export-controller.js";
import { createStructureInspectorSyncController } from "./structure-inspector-sync-controller.js";
import { createStructureNodeActionController } from "./structure-node-action-controller.js";
import { createStatusController } from "./status-controller.js";
import { createTextElementMeasurer } from "./text-element-measure.js";
import { createToolCursorController } from "./tool-cursor-controller.js";
import { createUiEventsController } from "./ui-events-controller.js";
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
  createShapeElement as buildShapeElement,
  createStickyElement as buildStickyElement,
  createTextElement as buildTextElement,
  isTinyElement,
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
import { areStrokeFragmentsEquivalent, splitStrokeByEraser, getEraserPathSamples, getWorldPointer, normalizeRect, rectsIntersect } from "../canvas/geometry.js";
import { createHistory } from "../board/history.js";
import { createId } from "../board/ids.js";
import {
  createElementNode,
  createNodeAttrs,
  getStickyBorderColor,
  PRESSURE_STROKE_PREVIEW_ATTR,
  syncCoordinatePlaneNodeContent,
  syncElementNode,
  syncLinearStructureNodeContent,
  syncTextNodeContent,
  syncTextNodeScalePreview,
  syncTextNodeSize,
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
  getTextScaleCommitBox,
  getTextEditorStyle,
  getStickyEditorCommitBox,
  getStickyScaleCommitBox,
  getStickyTextInsets,
  getTextTransformMinimumSize,
  getUniformScaledBoxForResize,
  getSelectionHitRadius,
  getSingleLineTextEditorHeight,
  getMinimumTextResizeWidth,
  getTransformerAnchorsForSelection,
  isNativeTextEditingTarget,
  isTransformerAnchorTarget,
  isTransformerTarget,
  measureTextareaContentHeight,
  isTextWidthResizeAnchor,
  nextToolAfterTextPlacement,
  pickElementIdAtPoint,
  pointHitsSelectionBounds,
  shouldPreventBrowserZoom,
  shouldEditTextOnTransformerDoubleClick,
  shouldIgnoreCanvasPointerDown,
  shouldPreserveTextEditorOnPointerDown,
  shouldSelectAll,
  shouldUseBrowserSelectAll,
  clampTransformerAnchorDragBySize,
} from "../tools/interaction-rules.js";
import {
  computeEraserRadius,
  getFillValue,
  isShapeTool,
  resolveActiveDrawingTool,
} from "../tools/tool-behavior.js";
import {
  captureDrawingPointer,
  normalizePressure,
  preventDrawingPointerDefault,
  releaseDrawingPointer,
  shouldAppendStrokePoint,
  shouldHandlePointerEvent,
  smoothStrokePoint,
} from "../tools/stroke-engine.js";
import {
  DEFAULT_SHAPE_TOOL,
  TOOLS,
} from "../ui/ui-config.js";
import {
  ARRAY_STRUCTURE_STYLE,
  TREE_STRUCTURE_STYLE,
  LINEAR_STRUCTURE_TYPES,
  createStructureElements,
  isLinearStructureElement,
  moveArrayItem,
  getLinearStructureLocalPoint,
  clampLinearItemDropGap,
  getLinearItemPreviewGap,
  getLinearItemDropIndex,
  setArrayPointer,
  exportGraph,
  exportTree,
  getBinaryTreeChildSides,
} from "../structures/structure-templates.js";
import {
  LINEAR_STRUCTURE_EVENT_TYPES,
  createLinearStructureEventAdapter,
} from "../structures/structure-event-adapter.js";
import { createStructureInteraction } from "../structures/structure-interaction.js";
import {
  isLayerPanelAvailable,
  shouldShowPanelEdgeToggle,
} from "../ui/panel-state.js";

const LINEAR_POINTER_BASE_Y = -30;
const LINEAR_POINTER_DRAG_Y = -40;

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
  let strokeDraft = null;
  let activeDrawingPointerCapture = null;
  let shapeDraft = null;
  let selectionDraft = null;
  let selectionDrag = null;
  let nodeDragSelection = null;
  let eraseSnapshot = null;
  let lastEraserPoint = null;
  let activeEraserRadius = 24;
  let isEditingText = false;
  let lastPointerWorldPoint = null;
  let initialStatusMessage = null;
  let lastTransformAnchor = null;
  let handledNodeDragEnd = false;
  let linearItemPressState = null;
  let linearPointerPressState = null;
  let linearItemLiftTween = null;
  let linearPointerTween = null;
  let suppressLinearItemSelectTimer = null;
  let suppressSelectionDragOnce = false;
  let suppressNextCanvasSelection = false;
  let suppressNextSelectionClick = false;
  let suppressedNodeDragElementId = null;
  const structureInteraction = createStructureInteraction();
  const linearStructureEventAdapter = createLinearStructureEventAdapter(dispatchLinearStructureEvent);
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

  const MIN_TRANSFORM_SIZE = 12;

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
    renderBinaryTreeControls,
    renderTreeNodeControls,
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
    updateLinearItemControlsPosition,
    updateTreeNodeControlsPosition,
    updateBinaryTreeNodeControlsPosition,
    updateTreeTraversalControlsPosition,
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
    anchorDragBoundFunc: (oldAbsPos, newAbsPos) => clampTransformerAnchorDrag(oldAbsPos, newAbsPos),
    boundBoxFunc: (oldBox, newBox) => {
      if (!Number.isFinite(newBox.width) || !Number.isFinite(newBox.height)) return oldBox;
      const anchor = transformer.getActiveAnchor?.();
      const minWidth = getActiveTransformerMinWidth();
      const minHeight = getActiveTransformerMinHeight();
      const nextBox = getUniformScaledBoxForResize({
        elements: getActiveTransformerElements(),
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

  const {
    measureTextElementValue,
    getTextElementWrappedHeight,
    getMinimumTextElementWidth,
    getPreferredTextElementWidth,
    getNormalizedTextElementBox,
    normalizeTextElementBox,
  } = createTextElementMeasurer();

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
    getActiveEraserRadius: () => activeEraserRadius,
    hasActiveEraserSnapshot: () => Boolean(eraseSnapshot),
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
    hideLinearItemControls,
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
    selectionRect,
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
    consumeSuppressedBinaryTreeNodeClick,
    syncBinaryTreeActiveVisual,
    syncGeneralTreeActiveVisual,
    renderTreeNodeControls,
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
    hideTreeControls,
    hideBinaryTreeControls,
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
    updateLinearItemControlsPosition,
    syncActiveCellEditor,
    syncTextOverlays,
    updateContextPanel,
    schedulePersistCurrentDraft,
    closeZoomMenu: () => setZoomMenuOpen(false),
  });

  const selectionRect = new Konva.Rect({
    fill: "rgba(37, 99, 235, 0.08)",
    stroke: "#2563eb",
    strokeWidth: 1,
    dash: [4, 4],
    visible: false,
    listening: false,
  });
  contentLayer.add(selectionRect);

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

    transformer.on("transform", syncTextWidthResize);
    transformer.on("transform", syncTextTransformPreview);
    transformer.on("transform", syncCoordinatePlaneTransformPreview);
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
            beginSelectionDrag(worldPoint);
          }
          return;
        }
        beginSelectionDrag(worldPoint);
        return;
      }
      handleSelectPointerDown(event, worldPoint);
      return;
    }

    clearSelection();

    if (currentTool === TOOLS.PEN) {
      showBrushCursor(worldPoint);
      beginDrawingPointerSession(event);
      startStroke(worldPoint, event.evt.pressure);
      interactionSM.enter(SM.DRAWING);
      return;
    }

    if (currentTool === TOOLS.ERASER_STROKE) {
      eraseSnapshot = snapshotBoard();
      beginDrawingPointerSession(event);
      beginEraser(worldPoint);
      const radius = getVisibleEraserRadius(activeEraserRadius);
      eraseStrokeAt(worldPoint, radius);
      showStrokeEraser(worldPoint, radius);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT) {
      eraseSnapshot = snapshotBoard();
      beginDrawingPointerSession(event);
      beginEraser(worldPoint);
      eraseObjectAt(event.target);
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
      startShape(worldPoint);
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

    if (structureInteraction.hasLinearPointerDragState()) {
      updateLinearPointerDrag(worldPoint);
      return;
    }

    if (linearPointerPressState?.phase === "start" && linearPointerPressState.startWorldPoint) {
      linearPointerPressState = {
        ...linearPointerPressState,
        currentWorldPoint: worldPoint,
      };
      const distance = Math.hypot(
        worldPoint.x - linearPointerPressState.startWorldPoint.x,
        worldPoint.y - linearPointerPressState.startWorldPoint.y,
      );
      if (distance > 6) {
        beginLinearPointerDrag({
          elementId: linearPointerPressState.elementId,
          index: linearPointerPressState.index,
          worldPoint,
        });
        resetLinearPointerPressState();
        return;
      }
    }

    if (structureInteraction.hasLinearItemDragState()) {
      updateLinearItemDrag(worldPoint);
      return;
    }

    if (linearItemPressState?.phase === "start" && linearItemPressState.startWorldPoint) {
      const pressStart = linearItemPressState.startWorldPoint;
      const pressedElementId = linearItemPressState.elementId;
      linearItemPressState = {
        ...linearItemPressState,
        currentWorldPoint: worldPoint,
      };
      const distance = Math.hypot(
        worldPoint.x - pressStart.x,
        worldPoint.y - pressStart.y,
      );
      if (distance > 6) {
        const targetIds = expandGroupedIds([pressedElementId]);
        if (!selectedIds.some((id) => targetIds.includes(id))) {
          selectIds([pressedElementId]);
        }
        resetLinearItemPressState();
        beginSelectionDrag(pressStart);
        updateSelectionDrag(worldPoint);
        return;
      }
    }

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

    if (strokeDraft) {
      appendStroke(worldPoint, event.evt.pressure);
      showBrushCursor(worldPoint);
      return;
    }

    if (shapeDraft) {
      updateShapeDraft(worldPoint);
      return;
    }

    if (selectionDraft) {
      updateSelectionDraft(worldPoint);
      return;
    }

    if (selectionDrag) {
      updateSelectionDrag(worldPoint);
      return;
    }

    if (currentTool === TOOLS.PEN) {
      showBrushCursor(worldPoint);
      return;
    }

    if ((currentTool === TOOLS.ERASER_STROKE || currentTool === TOOLS.ERASER_OBJECT) && !eraseSnapshot) {
      if (currentTool === TOOLS.ERASER_OBJECT) {
        showObjectEraser(worldPoint);
      } else {
        showStrokeEraser(worldPoint, getBaseEraserRadius());
      }
      return;
    }

    if (currentTool === TOOLS.ERASER_STROKE && eraseSnapshot) {
      const previousPoint = lastEraserPoint ? { x: lastEraserPoint.x, y: lastEraserPoint.y } : worldPoint;
      const radius = updateEraserRadius(worldPoint);
      eraseStrokeAlongPath(previousPoint, worldPoint, radius);
      showStrokeEraser(worldPoint, radius);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT && eraseSnapshot) {
      updateEraserRadius(worldPoint);
      eraseObjectAt(event.target);
      showObjectEraser(worldPoint);
    }
  }

  function handlePointerUp(event) {
    if (!shouldHandlePointerEvent(event?.evt, activeDrawingPointerCapture?.pointerId)) return;
    if (activeDrawingPointerCapture) preventDrawingPointerDefault(event?.evt);

    if (structureInteraction.hasLinearPointerDragState()) {
      resetLinearPointerPressState();
      commitLinearPointerDrag();
      return;
    }

    resetLinearPointerPressState();

    if (structureInteraction.hasLinearItemDragState()) {
      resetLinearItemPressState();
      commitLinearItemDrag();
      return;
    }

    resetLinearItemPressState();

    if (isPanning) {
      isPanning = false;
      panStart = null;
      interactionSM.exitToIdle();
      stage.container().classList.remove("is-panning");
      persistCurrentDraft();
      return;
    }

    if (strokeDraft) {
      endDrawingPointerSession();
      finishStroke();
      interactionSM.exitToIdle();
      return;
    }

    if (shapeDraft) {
      endDrawingPointerSession();
      finishShape();
      interactionSM.exitToIdle();
      return;
    }

    if (selectionDraft) {
      finishSelectionDraft();
      interactionSM.exitToIdle();
      return;
    }

    if (selectionDrag) {
      finishSelectionDrag();
      interactionSM.exitToIdle();
      return;
    }


    if (eraseSnapshot) {
      endDrawingPointerSession();
      hideEraser();
      stage.container().classList.remove("is-erasing");
      if (JSON.stringify(eraseSnapshot.elements) !== JSON.stringify(board.elements)) {
        pushHistory("已擦除内容");
      }
      eraseSnapshot = null;
      lastEraserPoint = null;
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
        hideBinaryTreeControls();
        syncBinaryTreeActiveVisual(previousActiveTreeElementId);
        if (shouldDragBinaryTreeBlank) {
          beginSelectionDrag(worldPoint);
        }
        return;
      }
      if (isGeneralTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement) {
        const shouldDragTreeBlank = !event.evt.shiftKey && targetIds.some((id) => selectedIds.includes(id));
        const previousActiveTreeElementId = activeTreeNode.elementId;
        structureInteraction.clearActiveTreeNode();
        hideTreeControls();
        syncGeneralTreeActiveVisual(previousActiveTreeElementId);
        if (shouldDragTreeBlank) {
          beginSelectionDrag(worldPoint);
        }
        return;
      }
      if (isGeneralTreeElement(element) && isTreeNodeHitTarget(event.target)) {
        return;
      }
      if (!event.evt.shiftKey && targetIds.some((id) => selectedIds.includes(id))) {
        beginSelectionDrag(worldPoint);
        return;
      }
      selectElementById(targetElement, event.evt.shiftKey);
      if (!event.evt.shiftKey && element && (["text", "sticky"].includes(element.type) || targetElement !== rawTargetElement)) {
        beginSelectionDrag(worldPoint);
      }
      return;
    }

    const nearbySelectedId = getNearbySelectedElementId(worldPoint);
    if (nearbySelectedId && selectedIds.some((id) => !isElementLocked(id))) {
      beginSelectionDrag(worldPoint);
      return;
    }

    clearSelection();
    interactionSM.enter(SM.SELECTING);
    selectionDraft = { start: worldPoint };
    selectionRect.setAttrs({
      ...normalizeRect(worldPoint, worldPoint),
      visible: true,
    });
    contentLayer.batchDraw();
  }

  function beginSelectionDrag(worldPoint) {
    if (structureInteraction.hasLinearItemDragState()) return;
    interactionSM.enter(SM.DRAGGING);
    selectionDrag = {
      start: worldPoint,
      moved: false,
      originals: selectedIds.filter((id) => !isElementLocked(id)).map((id) => {
        const element = board.elements.find((item) => item.id === id);
        return {
          id,
          x: Number(element?.x ?? 0),
          y: Number(element?.y ?? 0),
        };
      }),
    };
    setSelectionDragNodeDraggable(false);
  }

  function updateSelectionDrag(worldPoint) {
    const dx = worldPoint.x - selectionDrag.start.x;
    const dy = worldPoint.y - selectionDrag.start.y;
    selectionDrag.moved = selectionDrag.moved || Math.hypot(dx, dy) > 0.5;
    const originals = new Map(selectionDrag.originals.map((item) => [item.id, item]));
    board.elements = board.elements.map((element) => {
      const original = originals.get(element.id);
      if (!original) return element;
      return {
        ...element,
        x: original.x + dx,
        y: original.y + dy,
      };
    });
    renderBoard();
    updateTreeControlsPosition();
  }

  function finishSelectionDrag() {
    const didMove = selectionDrag.moved;
    if (didMove) suppressBinaryTreeNodeClickAfterDrag();
    if (didMove) suppressLinearItemSelectAfterSelectionDrag();
    if (didMove) suppressNextSelectionClick = true;
    setSelectionDragNodeDraggable(true);
    selectionDrag = null;
    if (didMove) {
      pushHistory("已移动对象");
    }
  }

  function setSelectionDragNodeDraggable(enabled) {
    selectionDrag?.originals.forEach(({ id }) => {
      const element = board.elements.find((item) => item.id === id);
      contentLayer.findOne(`#${id}`)?.draggable(Boolean(enabled) && shouldElementBeDraggable(element) && !isLinearPointerGestureElement(id));
    });
  }

  function isSelectionDragElement(elementId) {
    return Boolean(selectionDrag?.originals.some((item) => item.id === elementId));
  }

  function suppressBinaryTreeNodeClickAfterDrag() {
    structureInteraction.suppressBinaryTreeNodeClicks(
      selectionDrag?.originals
        .map(({ id }) => board.elements.find((item) => item.id === id))
        .filter(isBinaryTreeElement)
        .map((element) => element.id) ?? [],
    );
  }

  function consumeSuppressedBinaryTreeNodeClick(elementId) {
    return structureInteraction.consumeSuppressedBinaryTreeNodeClick(elementId);
  }

  function suppressLinearItemSelectAfterSelectionDrag() {
    const draggedLinearElement = selectionDrag?.originals
      .map(({ id }) => board.elements.find((item) => item.id === id))
      .find(isLinearStructureElement);
    if (draggedLinearElement) suppressNextLinearItemSelect(draggedLinearElement.id);
  }

  function cancelSelectionDrag() {
    setSelectionDragNodeDraggable(true);
    selectionDrag = null;
  }

  function beginNodeDragSelection(node) {
    const id = getElementIdFromNode(node);
    if (id && (isLinearPointerGestureElement(id) || suppressSelectionDragOnce)) {
      suppressedNodeDragElementId = id;
      node.stopDrag?.();
      nodeDragSelection = null;
      return;
    }
    if (selectionDrag) {
      node.stopDrag?.();
      nodeDragSelection = null;
      return;
    }
    if (!id) {
      nodeDragSelection = null;
      return;
    }
    if (!selectedIds.includes(id)) {
      selectElementById(id);
      beginNodeDragSelection(node);
      return;
    }

    nodeDragSelection = {
      id,
      start: {
        x: node.x(),
        y: node.y(),
      },
      moved: false,
      originals: selectedIds
        .filter((selectedId) => !isElementLocked(selectedId))
        .map((selectedId) => {
          const element = board.elements.find((item) => item.id === selectedId);
          return {
            id: selectedId,
            x: Number(element?.x ?? 0),
            y: Number(element?.y ?? 0),
          };
        }),
    };
  }

  function updateNodeDragSelection(node) {
    if (!nodeDragSelection) return;
    if (isLinearPointerGestureElement(nodeDragSelection.id)) {
      suppressedNodeDragElementId = nodeDragSelection.id;
      node.stopDrag?.();
      nodeDragSelection = null;
      return;
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
    board.elements = board.elements.map((element) => {
      const original = nodeDragSelection.originals.find((item) => item.id === element.id);
      if (!original) return element;
      return {
        ...element,
        x: original.x + dx,
        y: original.y + dy,
      };
    });
    transformer.forceUpdate();
    contentLayer.batchDraw();
    updateTreeControlsPosition();
    syncTextOverlays();
  }

  function finishNodeDragSelection(node) {
    const dragSelection = nodeDragSelection;
    nodeDragSelection = null;
    const nodeId = getElementIdFromNode(node);

    if (suppressedNodeDragElementId && suppressedNodeDragElementId === nodeId) {
      suppressedNodeDragElementId = null;
      return;
    }

    if (!dragSelection) {
      return;
    }

    if (dragSelection.originals.length <= 1) {
      snapNodeToAlignment(node);
      syncNodeToElement(node);
      handledNodeDragEnd = true;
      pushHistory("已移动对象");
      return;
    }

    renderBoard();
    if (dragSelection.moved) {
      handledNodeDragEnd = true;
      pushHistory("已移动对象");
    }
  }

  function startStroke(worldPoint, pressure = 0.5) {
    const origin = { x: worldPoint.x, y: worldPoint.y };
    const points = [{ x: 0, y: 0, pressure: normalizePressure(pressure) }];
    const element = {
      id: createId("stroke"),
      type: "stroke",
      x: origin.x,
      y: origin.y,
      points,
      stroke: colorInput.value,
      strokeWidth: Number(widthInput.value),
      opacity: getBrushOpacityValue(),
      lineCap: brushCapInput.value,
      brushStyle: brushStyleInput.value,
      smoothing: getBrushSmoothingValue(),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: board.elements.length,
    };

    const node = createNode({ ...element, [PRESSURE_STROKE_PREVIEW_ATTR]: true });
    contentLayer.add(node);
    strokeDraft = { element, node, origin };
  }

  function appendStroke(worldPoint, pressure = 0.5) {
    const previousPoint = strokeDraft.element.points.at(-1);
    const nextPoint = {
      x: worldPoint.x - strokeDraft.origin.x,
      y: worldPoint.y - strokeDraft.origin.y,
      pressure: normalizePressure(pressure),
    };
    const minDistance = Math.max(0.7, Number(widthInput.value) * 0.08) / stage.scaleX();
    if (!shouldAppendStrokePoint(previousPoint, nextPoint, minDistance)) return;

    strokeDraft.element.points.push(smoothStrokePoint(previousPoint, nextPoint, getBrushInputSmoothingValue()));
    strokeDraft.node.setAttrs(createNodeAttrs(strokeDraft.element));
    contentLayer.batchDraw();
  }

  function finishStroke() {
    const { element, node } = strokeDraft;
    node.destroy();
    strokeDraft = null;

    if (element.points.length < 2) return;
    addElement(element, "已添加笔触");
  }

  function startShape(worldPoint) {
    const element = buildShapeElement(getShapeElementOptions(worldPoint, worldPoint));
    const node = createNode(element);
    node.listening(false);
    contentLayer.add(node);
    shapeDraft = { start: worldPoint, element, node };
    interactionSM.enter(SM.DRAWING);
  }

  function updateShapeDraft(worldPoint) {
    const updated = buildShapeElement(getShapeElementOptions(shapeDraft.start, worldPoint, shapeDraft.element.id));
    shapeDraft.element = { ...shapeDraft.element, ...updated };
    applyElementToNode(shapeDraft.element, shapeDraft.node);
    contentLayer.batchDraw();
  }

  function finishShape() {
    const { element, node } = shapeDraft;
    node.destroy();
    shapeDraft = null;

    if (isTinyElement(element)) return;
    addElement(element, "已添加形状");
    selectIds([element.id]);
    setTool(TOOLS.SELECT);
  }

  function getShapeElementOptions(start, end, existingId = null) {
    return {
      type: resolveActiveDrawingTool(currentTool, activeShapeTool),
      start,
      end,
      existingId,
      stroke: colorInput.value,
      strokeWidth: Number(widthInput.value),
      fillColor: fillInput.value,
      transparentFill: fillTransparentInput.checked,
      opacity: getBrushOpacityValue(),
      lineCap: brushCapInput.value,
      brushStyle: brushStyleInput.value,
      doubleArrow: arrowDoubleEndedInput.checked,
      zIndex: board.elements.length,
    };
  }

  function updateSelectionDraft(worldPoint) {
    const rect = normalizeRect(selectionDraft.start, worldPoint);
    selectionRect.setAttrs(rect);
    contentLayer.batchDraw();
  }

  function finishSelectionDraft() {
    const selectionBox = selectionRect.getClientRect({ relativeTo: contentLayer });
    const ids = contentLayer
      .find(".element")
      .filter((node) => rectsIntersect(selectionBox, node.getClientRect({ relativeTo: contentLayer })))
      .map((node) => getElementIdFromNode(node))
      .filter(Boolean);

    selectionRect.visible(false);
    selectionDraft = null;
    selectIds(expandGroupedIds(ids));
  }

  function eraseStrokeAt(worldPoint, radius) {
    let changed = false;
    const nextElements = [];

    for (const element of board.elements) {
      if (element.type !== "stroke") {
        nextElements.push(element);
        continue;
      }

      const fragments = splitStrokeByEraser(element, worldPoint, radius);
      if (!areStrokeFragmentsEquivalent(element, fragments)) {
        changed = true;
      }
      nextElements.push(...fragments);
    }

    if (changed) {
      board.elements = reorderElements(nextElements);
      renderBoard();
    }
  }

  function eraseStrokeAlongPath(fromPoint, toPoint, radius) {
    for (const point of getEraserPathSamples(fromPoint, toPoint, radius)) {
      eraseStrokeAt(point, radius);
    }
  }

  function eraseObjectAt(target) {
    const id = getElementIdAtPointer(target);
    if (!id) return;
    const element = board.elements.find((item) => item.id === id);
    if (element?.locked) return;
    board.elements = reorderElements(board.elements.filter((item) => item.id !== id));
    selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
    renderBoard();
  }

  function beginEraser(worldPoint) {
    activeEraserRadius = getBaseEraserRadius();
    interactionSM.enter(SM.ERASING);
    lastEraserPoint = { ...worldPoint, time: performance.now() };
    stage.container().classList.add("is-erasing");
  }

  function updateEraserRadius(worldPoint) {
    const now = performance.now();
    if (!lastEraserPoint) {
      lastEraserPoint = { ...worldPoint, time: now };
      return activeEraserRadius;
    }

    const elapsed = Math.max(16, now - lastEraserPoint.time);
    const speed = Math.hypot(worldPoint.x - lastEraserPoint.x, worldPoint.y - lastEraserPoint.y) / elapsed;
    activeEraserRadius = getVisibleEraserRadius(computeEraserRadius({
      baseRadius: getBaseEraserRadius(),
      speed,
    }));
    lastEraserPoint = { ...worldPoint, time: now };
    return activeEraserRadius;
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
      onDragStart: beginNodeDragSelection,
      onDragMove: updateNodeDragSelection,
      onMove: (node) => {
        if (isElementLocked(getElementIdFromNode(node))) return;
        finishNodeDragSelection(node);
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
      onArrayPointerPress: handleArrayPointerPress,
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

  function getTextOverlayPreviewElements() {
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return board.elements;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    if (!id) return board.elements;
    const anchor = transformer.getActiveAnchor?.();
    return board.elements.map((element) => (
      element.id === id && element.type === "text"
        ? {
          ...element,
          x: node.x(),
          y: node.y(),
          width: node.width() * (node.scaleX() || 1),
          height: node.height() * (node.scaleY() || 1),
          fontSize: isTextWidthResizeAnchor(anchor)
            ? element.fontSize
            : Math.max(8, element.fontSize * Math.max(Math.abs(node.scaleX() || 1), Math.abs(node.scaleY() || 1))),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        }
        : element
    ));
  }

  function syncTextOverlays({ hiddenIds = editController.isEditing ? selectedIds : [], elements = board.elements } = {}) {
    textOverlayController.setHiddenIds(hiddenIds);
    textOverlayController.sync(elements);
  }

  function renderBoard() {
    shapeRenderController.syncElementNodes(reorderElements(board.elements));
    selectionRect.moveToTop();
    syncSelectionNodes();
    renderLinearItemControls();
    renderTreeControls();
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
    renderLinearItemControls();
    renderTreeControls();
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
    cancelLinearPointerDrag();
    resetLinearItemPressState();
    hideLinearItemControls();
    clearLinearItemSelectSuppression();
    structureInteraction.clearActiveTreeNode();
    hideTreeControls();
    hideBinaryTreeControls();
    selectIds([]);
  }

  function syncSelectionNodes() {
    if (structureInteraction.hasLinearItemDragState() || structureInteraction.hasLinearPointerDragState()) {
      transformer.nodes([]);
      transformer.visible(false);
      transformer.resizeEnabled(false);
      transformer.rotateEnabled(false);
      transformer.enabledAnchors([]);
      disableTransformerHitAreaDrag();
      return;
    }
    const nodes = selectedIds
      .map((id) => contentLayer.findOne(`#${id}`))
      .filter(Boolean);
    transformer.nodes(nodes);
    const hasSelection = nodes.length > 0;
    const selectedElements = board.elements.filter((element) => selectedIds.includes(element.id));
    const canTransform = currentTool === TOOLS.SELECT && selectedElements.length > 0 && selectedElements.every((element) => !element.locked);
    transformer.visible(hasSelection);
    transformer.resizeEnabled(canTransform);
    transformer.rotateEnabled(canTransform);
    transformer.enabledAnchors(getTransformerAnchorsForSelection(selectedElements, canTransform));
    transformer.shouldOverdrawWholeArea(hasSelection && getTransformerOverdrawForState(interactionSM.state, selectedElements));
    transformer.forceUpdate();
    disableTransformerHitAreaDrag();
  }

  function disableTransformerHitAreaDrag() {
    transformer.findOne?.(".back")?.draggable(false);
  }

  function clampTransformerAnchorDrag(oldAbsPos, newAbsPos) {
    return clampTransformerAnchorDragBySize({
      transformer,
      oldAbsPos,
      newAbsPos,
      minWidth: getActiveTransformerMinWidth(),
      minHeight: getActiveTransformerMinHeight(),
    });
  }

  function getActiveTransformerMinWidth() {
    const node = transformer.nodes()[0];
    const id = getElementIdFromNode(node);
    const element = board.elements.find((item) => item.id === id);
    if (element?.type === "text") {
      return getTextTransformMinimumSize({
        element,
        anchor: transformer.getActiveAnchor?.(),
        stageScale: stage.scaleX(),
        measureText: (value) => measureTextElementValue(element, value),
      }).minWidth;
    }
    return MIN_TRANSFORM_SIZE;
  }

  function getActiveTransformerMinHeight() {
    const node = transformer.nodes()[0];
    const id = getElementIdFromNode(node);
    const element = board.elements.find((item) => item.id === id);
    if (element?.type === "text") {
      return getTextTransformMinimumSize({
        element,
        anchor: transformer.getActiveAnchor?.(),
        stageScale: stage.scaleX(),
      }).minHeight;
    }
    return MIN_TRANSFORM_SIZE;
  }

  function getActiveTransformerElements() {
    return transformer.nodes()
      .map((node) => board.elements.find((item) => item.id === getElementIdFromNode(node)))
      .filter(Boolean);
  }

  function updateDraggableState() {
    contentLayer.find(".element").forEach((node) => {
      const id = getElementIdFromNode(node);
      const element = board.elements.find((item) => item.id === id);
      node.draggable(shouldElementBeDraggable(element) && !isLinearPointerGestureElement(id) && !isSelectionDragElement(id));
    });
  }

  function syncSelectedNodes() {
    transformer.nodes().forEach(syncNodeToElement);
    renderBoard();
  }

  function syncTextWidthResize() {
    if (!isTextWidthResizeAnchor(transformer.getActiveAnchor?.())) return;
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    const element = board.elements.find((item) => item.id === id);
    if (element?.type !== "text") return;

    const proposedWidth = node.width() * (node.scaleX() || 1);
    const nextWidth = Math.max(getMinimumTextElementWidth(element), proposedWidth);
    const nextHeight = getTextElementWrappedHeight(element, nextWidth);
    syncTextNodeSize(node, {
      width: nextWidth,
      height: nextHeight,
      padding: element.padding ?? 0,
    });
    node.scaleX(1);
    node.scaleY(1);
    transformer.forceUpdate();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
    syncTextOverlays({ elements: getTextOverlayPreviewElements() });
  }

  function syncTextTransformPreview() {
    if (isTextWidthResizeAnchor(transformer.getActiveAnchor?.())) return;
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    const element = board.elements.find((item) => item.id === id);
    if (element?.type !== "text") return;
    const previewElements = getTextOverlayPreviewElements();
    const previewElement = previewElements.find((item) => item.id === id);
    if (previewElement) {
      syncTextNodeScalePreview(node, previewElement, {
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      });
      contentLayer.batchDraw();
    }
    syncTextOverlays({ elements: previewElements });
  }

  function syncCoordinatePlaneTransformPreview() {
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    const element = board.elements.find((item) => item.id === id);
    if (element?.type !== "coordinate-plane") return;

    const nextWidth = Math.max(24, node.width() * (node.scaleX() || 1));
    const nextHeight = Math.max(24, node.height() * (node.scaleY() || 1));
    const previewElement = {
      ...element,
      width: nextWidth,
      height: nextHeight,
      origin: { x: nextWidth / 2, y: nextHeight / 2 },
    };
    node.scaleX(1);
    node.scaleY(1);
    rerenderCoordinatePlaneNode(previewElement, node);
    transformer.forceUpdate();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
  }

  function syncNodeToElement(node) {
    const id = getElementIdFromNode(node);
    const index = board.elements.findIndex((element) => element.id === id);
    if (index === -1) return;

    const element = board.elements[index];
    board.elements[index] = {
      ...element,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    };

    if (element.type === "text") {
      const textCommit = getTextScaleCommitBox({
        element,
        nodeWidth: node.width(),
        nodeHeight: node.height(),
        nodeScaleX: node.scaleX(),
        nodeScaleY: node.scaleY(),
        anchor: lastTransformAnchor,
      });
      board.elements[index] = normalizeTextElementBox({
        ...board.elements[index],
        fontSize: textCommit.fontSize,
        width: textCommit.width,
        height: textCommit.height,
      }, { preserveHeight: Number.isFinite(textCommit.height) });
    }
    if (element.type === "sticky") {
      const stickyCommit = getStickyScaleCommitBox({
        element,
        nodeScaleX: node.scaleX(),
        nodeScaleY: node.scaleY(),
      });
      board.elements[index] = {
        ...board.elements[index],
        width: stickyCommit.width,
        height: stickyCommit.height,
        fontSize: stickyCommit.fontSize,
        scaleX: 1,
        scaleY: 1,
      };
    }
    if (element.type === "coordinate-plane") {
      const nextWidth = Math.max(24, node.width() * (node.scaleX() || 1));
      const nextHeight = Math.max(24, node.height() * (node.scaleY() || 1));
      board.elements[index] = {
        ...board.elements[index],
        width: nextWidth,
        height: nextHeight,
        origin: { x: nextWidth / 2, y: nextHeight / 2 },
        scaleX: 1,
        scaleY: 1,
      };
    }
  }

  function snapNodeToAlignment(node) {
    const threshold = 8 / stage.scaleX();
    const movingBox = node.getClientRect({ relativeTo: contentLayer });
    const movingGuides = {
      left: movingBox.x,
      centerX: movingBox.x + movingBox.width / 2,
      right: movingBox.x + movingBox.width,
      top: movingBox.y,
      centerY: movingBox.y + movingBox.height / 2,
      bottom: movingBox.y + movingBox.height,
    };
    let dx = 0;
    let dy = 0;
    let bestX = threshold;
    let bestY = threshold;

    contentLayer.find(".element").forEach((other) => {
      if (other === node) return;
      const otherBox = other.getClientRect({ relativeTo: contentLayer });
      const otherGuides = {
        left: otherBox.x,
        centerX: otherBox.x + otherBox.width / 2,
        right: otherBox.x + otherBox.width,
        top: otherBox.y,
        centerY: otherBox.y + otherBox.height / 2,
        bottom: otherBox.y + otherBox.height,
      };

      for (const movingKey of ["left", "centerX", "right"]) {
        for (const otherKey of ["left", "centerX", "right"]) {
          const delta = otherGuides[otherKey] - movingGuides[movingKey];
          if (Math.abs(delta) < bestX) {
            bestX = Math.abs(delta);
            dx = delta;
          }
        }
      }

      for (const movingKey of ["top", "centerY", "bottom"]) {
        for (const otherKey of ["top", "centerY", "bottom"]) {
          const delta = otherGuides[otherKey] - movingGuides[movingKey];
          if (Math.abs(delta) < bestY) {
            bestY = Math.abs(delta);
            dy = delta;
          }
        }
      }
    });

    if (dx || dy) {
      node.position({ x: node.x() + dx, y: node.y() + dy });
    }
  }

  function applyStyleToSelection() {
    if (selectedIds.length === 0) {
      saveToolPropertyControlsForCurrentTool();
      updateContextPanel();
      return;
    }

    const nextFontSize = Number(fontSizeInput.value);
    const strokeStyle = getStrokeStyleFromControls();
    const selectedElements = board.elements.filter((element) => selectedIds.includes(element.id));
    const isStrokeOnlySelection = selectedElements.every((element) => element.type === "stroke");
    board.elements = board.elements.map((element) => {
      if (!selectedIds.includes(element.id)) return element;
      if (element.locked) return element;
      if (element.type === "text") {
        return normalizeTextElementBox({
          ...element,
          fill: colorInput.value,
          fontSize: nextFontSize,
          fontFamily: fontFamilyInput.value,
        });
      }
      if (element.type === "sticky") {
        return {
          ...element,
          textFill: colorInput.value,
          fill: getFillValue({ transparent: false, color: fillInput.value }),
          fontSize: nextFontSize,
          fontFamily: fontFamilyInput.value,
        };
      }
      if (element.type === "arrow") {
        return {
          ...element,
          ...strokeStyle,
          fill: colorInput.value,
          pointerAtBeginning: arrowDoubleEndedInput.checked,
          pointerAtEnding: true,
        };
      }
      if (element.type === "stroke") {
        return isStrokeOnlySelection
          ? { ...element, ...strokeStyle }
          : { ...element, stroke: colorInput.value, strokeWidth: Number(widthInput.value) };
      }
      if (element.type === "line") {
        return { ...element, ...strokeStyle };
      }
      if (element.type === "coordinate-plane" || element.type.endsWith?.("-structure")) return element;
      return {
        ...element,
        stroke: colorInput.value,
        fill: getFillValue({ transparent: fillTransparentInput.checked, color: fillInput.value }),
        strokeWidth: Number(widthInput.value),
      };
    });

    renderBoard();
    pushHistory("已更新样式");
  }

  function applyCoordinateStyleToSelection() {
    const selectedCoordinateIds = selectedIds.filter((id) => {
      const element = board.elements.find((item) => item.id === id);
      return element?.type === "coordinate-plane" && !element.locked;
    });
    if (selectedCoordinateIds.length === 0) return;

    const unitSize = Math.max(8, Number(coordinateUnitSizeInput.value) || 40);
    board.elements = board.elements.map((element) => {
      if (!selectedCoordinateIds.includes(element.id)) return element;
      return {
        ...element,
        unitSize,
        settings: {
          ...(element.settings ?? {}),
          showGrid: coordinateShowGridInput.checked,
          showTicks: coordinateShowTicksInput.checked,
          showLabels: coordinateShowLabelsInput.checked,
        },
        style: {
          ...(element.style ?? {}),
          gridStroke: coordinateGridColorInput.value,
          axisStroke: coordinateAxisColorInput.value,
          labelFill: coordinateLabelColorInput.value,
        },
      };
    });

    renderBoard();
    pushHistory("已更新坐标系");
  }

  function toggleTextStyle(style) {
    if (!["bold", "italic", "underline", "strike"].includes(style)) return;
    if (selectedIds.length === 0) return;

    board.elements = board.elements.map((element) => {
      if (!selectedIds.includes(element.id) || element.locked || !["text", "sticky"].includes(element.type)) {
        return element;
      }

      if (style === "bold" || style === "italic") {
        return normalizeTextElementBox({
          ...element,
          fontStyle: toggleFontStyleToken(element.fontStyle, style),
        });
      }

      const decoration = style === "underline" ? "underline" : "line-through";
      return normalizeTextElementBox({
        ...element,
        textDecoration: toggleTextDecorationToken(element.textDecoration, decoration),
      });
    });

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

  function getLinearStructureDisplayName(type) {
    return {
      "array-structure": "数组",
      "stack-structure": "栈",
      "queue-structure": "队列",
      "deque-structure": "双端队列",
    }[type] ?? "线性";
  }

  function readLinearFieldNumber(fieldName, fallback = 0) {
    const raw = structureInspectorController.getLinearPanelState()[fieldName];
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : Math.max(0, fallback);
  }

  function getLinearIndexBase(element) {
    return Number(element?.settings?.indexBase) === 1 ? 1 : 0;
  }

  function toLinearDisplayIndex(element, index) {
    return Math.max(0, Number(index) || 0) + getLinearIndexBase(element);
  }

  function fromLinearDisplayIndex(element, index) {
    return Math.max(0, (Number(index) || 0) - getLinearIndexBase(element));
  }

  function readLinearDisplayIndexField(fieldName, element, fallback = 0) {
    return fromLinearDisplayIndex(element, readLinearFieldNumber(fieldName, toLinearDisplayIndex(element, fallback)));
  }

  function getActiveLinearIndex(element, fallback = 0) {
    return structureInteraction.getActiveLinearIndex(element, fallback);
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
      renderLinearItemControls();
      renderBinaryTreeControls();
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

  function syncLinearPanelState() {
    const element = getSelectedLinearStructure();
    if (!element) {
      if (linearValuesTitle) {
        linearValuesTitle.textContent = "当前结构";
      }
      if (linearValuesInput && document.activeElement !== linearValuesInput) {
        linearValuesInput.value = "";
        structureInspectorController.setLinearValuesDraft("");
      }
      applyLinearPanelState(structureInspectorController.getLinearPanelState());
      return;
    }
    if (linearValuesTitle) {
      linearValuesTitle.textContent = `当前${getLinearStructureDisplayName(element.type)}结构`;
    }
    if (linearValuesInput && document.activeElement !== linearValuesInput) {
      linearValuesInput.value = (element.items ?? []).map((item) => item.value ?? "").join(",");
      structureInspectorController.setLinearValuesDraft(linearValuesInput.value);
    }
    const itemCount = element.items?.length ?? 0;
    const currentIndex = getActiveLinearIndex(element, 0);
    const markers = element.markers ?? {};
    const highlight = Array.isArray(markers.highlight) ? markers.highlight : [];
    const firstHighlight = highlight[0] ?? currentIndex;
    const lastHighlight = highlight.at(-1) ?? currentIndex;
    const pointer = Number.isInteger(markers.pointer)
      ? Math.min(Math.max(0, itemCount - 1), Math.max(0, markers.pointer))
      : currentIndex;
    const linearPanelState = structureInspectorController.setLinearPanelState({
      highlightStart: String(toLinearDisplayIndex(element, Math.min(Math.max(0, itemCount - 1), Math.max(0, firstHighlight)))),
      highlightEnd: String(toLinearDisplayIndex(element, Math.min(Math.max(0, itemCount - 1), Math.max(0, lastHighlight)))),
      highlightPointer: String(toLinearDisplayIndex(element, pointer)),
    });
    applyLinearPanelState(linearPanelState);
  }

  function applyLinearPanelState(nextState) {
    Object.entries(linearFieldInputs).forEach(([key, input]) => {
      if (!input) return;
      const value = String(nextState[key] ?? "");
      if (input.value !== value) {
        input.value = value;
      }
    });
  }

  function ensureLinearItemControls() {
    return structureControlsController.ensureLinearItemControls();
  }

  function hideLinearItemControls() {
    structureControlsController.hideLinearItemControls();
  }

  function ensureTreeNodeControls() {
    return structureControlsController.ensureTreeNodeControls();
  }

  function ensureBinaryTreeNodeControls() {
    return structureControlsController.ensureBinaryTreeNodeControls();
  }

  function ensureBinaryTreeTraversalControls() {
    return structureControlsController.ensureBinaryTreeTraversalControls();
  }

  function hideBinaryTreeControls() {
    structureControlsController.hideBinaryTreeControls();
  }

  function hideTreeControls() {
    structureControlsController.hideTreeControls();
  }

  function renderLinearItemControls() {
    structureControlsController.renderLinearItemControls();
  }

  function renderTreeControls() {
    structureControlsController.renderTreeControls();
  }

  function renderTreeNodeControls() {
    structureControlsController.renderTreeNodeControls();
  }

  function renderBinaryTreeControls() {
    structureControlsController.renderBinaryTreeControls();
  }

  function renderBinaryTreeNodeControls() {
    structureControlsController.renderBinaryTreeNodeControls();
  }

  function renderTreeTraversalControls() {
    structureControlsController.renderTreeTraversalControls();
  }

  function renderBinaryTreeTraversalControls() {
    renderTreeTraversalControls();
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

  function updateLinearItemControlsPosition() {
    structureControlsPositionController.updateLinearItemControlsPosition();
  }

  function updateTreeControlsPosition() {
    structureControlsPositionController.updateTreeControlsPosition();
  }

  function updateTreeNodeControlsPosition() {
    structureControlsPositionController.updateTreeNodeControlsPosition();
  }

  function updateBinaryTreeNodeControlsPosition() {
    structureControlsPositionController.updateBinaryTreeNodeControlsPosition();
  }

  function updateTreeTraversalControlsPosition() {
    structureControlsPositionController.updateTreeTraversalControlsPosition();
  }

  function clearLinearItemPressTimer() {
    if (!linearItemPressState?.holdTimer) return;
    window.clearTimeout(linearItemPressState.holdTimer);
    linearItemPressState.holdTimer = null;
  }

  function clearLinearPointerPressTimer() {
    if (!linearPointerPressState?.holdTimer) return;
    window.clearTimeout(linearPointerPressState.holdTimer);
    linearPointerPressState.holdTimer = null;
  }

  function shouldElementBeDraggable(element) {
    if (!element) return false;
    return currentTool === TOOLS.SELECT
      && !isTemporaryPanActive()
      && !element.locked
      && !["text", "sticky"].includes(element.type);
  }

  function isLinearPointerGestureElement(elementId) {
    return linearItemPressState?.elementId === elementId
      || structureInteraction.getLinearItemDragState()?.elementId === elementId
      || linearPointerPressState?.elementId === elementId
      || structureInteraction.getLinearPointerDragState()?.elementId === elementId;
  }

  function setElementDraggableState(elementId, enabled) {
    contentLayer.findOne(`#${elementId}`)?.draggable(Boolean(enabled));
  }

  function resetLinearItemPressState() {
    const elementId = linearItemPressState?.elementId;
    clearLinearItemPressTimer();
    linearItemPressState = null;
    if (elementId) {
      const element = board.elements.find((item) => item.id === elementId);
      setElementDraggableState(elementId, shouldElementBeDraggable(element) && !isLinearPointerGestureElement(elementId));
    }
  }

  function suppressNextLinearItemSelect(elementId) {
    clearLinearItemSelectSuppression();
    structureInteraction.suppressNextLinearItemSelect(elementId);
    suppressLinearItemSelectTimer = window.setTimeout(() => {
      clearLinearItemSelectSuppression();
    }, 500);
  }

  function clearLinearItemSelectSuppression() {
    if (suppressLinearItemSelectTimer) {
      window.clearTimeout(suppressLinearItemSelectTimer);
      suppressLinearItemSelectTimer = null;
    }
    structureInteraction.clearLinearItemSelectSuppression();
  }

  function resetLinearPointerPressState() {
    const elementId = linearPointerPressState?.elementId;
    clearLinearPointerPressTimer();
    linearPointerPressState = null;
    if (elementId) {
      const element = board.elements.find((item) => item.id === elementId);
      setElementDraggableState(elementId, shouldElementBeDraggable(element) && !isLinearPointerGestureElement(elementId));
    }
  }

  function cancelLinearItemDragPreview() {
    if (!structureInteraction.hasLinearItemDragState()) return;
    structureInteraction.clearLinearItemDrag();
    renderBoard();
  }

  function cancelLinearPointerDrag() {
    const elementId = structureInteraction.getLinearPointerDragState()?.elementId ?? linearPointerPressState?.elementId;
    clearLinearPointerPressTimer();
    stopLinearPointerTween();
    linearPointerPressState = null;
    structureInteraction.clearLinearPointerDrag();
    if (elementId) {
      const element = board.elements.find((item) => item.id === elementId);
      setElementDraggableState(elementId, shouldElementBeDraggable(element));
    }
  }

  function getLinearStructureGeometry(element) {
    const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
    const showIndexes = element.settings?.showIndexes ?? element.type === "array-structure";
    const cellWidth = style.cellWidth;
    const cellHeight = style.cellHeight;
    const totalHeight = cellHeight * (showIndexes ? 2 : 1);
    return { style, showIndexes, cellWidth, cellHeight, totalHeight };
  }

  function getLinearItemDragThresholdY(element) {
    const { totalHeight } = getLinearStructureGeometry(element);
    return Math.max(28, totalHeight * 1.2);
  }

  function clampLinearGap(gap, length) {
    return clampLinearItemDropGap(gap, length);
  }

  function getLinearPreviewGap(element, localX) {
    const length = element.items?.length ?? 0;
    const { cellWidth } = getLinearStructureGeometry(element);
    return getLinearItemPreviewGap({ localX, length, cellWidth });
  }

  function getLinearDragInsertIndex(fromIndex, previewGap, length) {
    return getLinearItemDropIndex(fromIndex, previewGap, length);
  }

  function getLinearPreviewXForGap(index, dragIndex, dragGap, dragX, cellWidth) {
    if (!Number.isInteger(dragIndex) || !Number.isInteger(dragGap)) {
      return index * cellWidth;
    }
    if (index === dragIndex) {
      return dragX;
    }
    const baseX = index * cellWidth;
    if (index < dragIndex && index >= dragGap) {
      return baseX + cellWidth;
    }
    if (index > dragIndex && index < dragGap) {
      return baseX - cellWidth;
    }
    return baseX;
  }

  function getLinearPointerIndexFromWorldPoint(element, worldPoint) {
    const length = element.items?.length ?? 0;
    if (length <= 0) return null;
    const { cellWidth } = getLinearStructureGeometry(element);
    const group = contentLayer.findOne(`#${element.id}`);
    const localX = getLinearStructureLocalPoint(element, worldPoint, group).x;
    const centeredIndex = Math.floor(localX / cellWidth);
    return Math.min(length - 1, Math.max(0, centeredIndex));
  }

  function stopLinearPointerTween() {
    linearPointerTween?.destroy();
    linearPointerTween = null;
  }

  function animateLinearPointerDragVisual(elementId, nextIndex) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || !Number.isInteger(nextIndex)) return;
    const group = contentLayer.findOne(`#${elementId}`);
    const pointerNode = group?.findOne(".array-pointer-group");
    if (!pointerNode) return;
    const { cellWidth } = getLinearStructureGeometry(element);
    stopLinearPointerTween();
    pointerNode.setAttr("linearIndex", nextIndex);
    linearPointerTween = new Konva.Tween({
      node: pointerNode,
      x: nextIndex * cellWidth,
      y: LINEAR_POINTER_DRAG_Y,
      duration: 0.12,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        linearPointerTween?.destroy();
        linearPointerTween = null;
      },
    });
    linearPointerTween.play();
  }

  function animateLinearPointerLift(elementId) {
    const pointerNode = contentLayer.findOne(`#${elementId}`)?.findOne(".array-pointer-group");
    if (!pointerNode) return;
    stopLinearPointerTween();
    linearPointerTween = new Konva.Tween({
      node: pointerNode,
      y: LINEAR_POINTER_DRAG_Y,
      duration: 0.14,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        linearPointerTween?.destroy();
        linearPointerTween = null;
      },
    });
    linearPointerTween.play();
  }

  function animateLinearPointerDrop(dragState, finishLinearPointerDrop) {
    const element = board.elements.find((item) => item.id === dragState.elementId);
    const group = contentLayer.findOne(`#${dragState.elementId}`);
    const pointerNode = group?.findOne(".array-pointer-group");
    if (!isLinearStructureElement(element) || !pointerNode) {
      finishLinearPointerDrop();
      return;
    }
    const { cellWidth } = getLinearStructureGeometry(element);
    stopLinearPointerTween();
    linearPointerTween = new Konva.Tween({
      node: pointerNode,
      x: dragState.nextIndex * cellWidth,
      y: LINEAR_POINTER_BASE_Y,
      duration: 0.16,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        linearPointerTween?.destroy();
        linearPointerTween = null;
        finishLinearPointerDrop();
      },
    });
    linearPointerTween.play();
  }

  function animateLinearDragGapChange() {
    const linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    if (!group) return;
    const element = board.elements.find((item) => item.id === linearItemDragState.elementId);
    if (!isLinearStructureElement(element)) return;
    const { cellWidth } = getLinearStructureGeometry(element);
    const itemNodes = group.find(".array-item");
    itemNodes.forEach((node) => {
      const index = getLinearItemNodeIndex(node);
      if (index === linearItemDragState.fromIndex) {
        updateLinearDragVisualPosition();
        return;
      }
      const targetX = getLinearPreviewXForGap(
        index,
        linearItemDragState.fromIndex,
        linearItemDragState.cancelled ? linearItemDragState.fromIndex : linearItemDragState.previewGap,
        linearItemDragState.dragX,
        cellWidth,
      );
      node.to({
        x: targetX,
        y: 0,
        duration: 0.16,
        easing: Konva.Easings.EaseOut,
      });
    });
    const indicator = group.findOne(".array-drop-indicator");
    if (indicator) {
      indicator.visible(false);
      indicator.to({
        x: (linearItemDragState.cancelled ? linearItemDragState.fromIndex : linearItemDragState.previewGap) * cellWidth - 3,
        duration: 0.14,
        easing: Konva.Easings.EaseOut,
      });
    }
    contentLayer.batchDraw();
  }

  function animateLinearItemLift() {
    const linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return;
    const itemNode = findLinearItemNode(
      contentLayer.findOne(`#${linearItemDragState.elementId}`),
      linearItemDragState.fromIndex,
    );
    if (!itemNode) return;

    stopLinearItemLiftTween();
    linearItemLiftTween = new Konva.Tween({
      node: itemNode,
      y: -12,
      scaleX: 1.04,
      scaleY: 1.04,
      opacity: 0.96,
      shadowBlur: 18,
      shadowOpacity: 1,
      shadowOffsetY: -8,
      duration: 0.16,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        linearItemLiftTween?.destroy();
        linearItemLiftTween = null;
        if (!structureInteraction.hasLinearItemDragState()) return;
        structureInteraction.markLinearItemDragLifted();
      },
    });
    linearItemLiftTween.play();
  }

  function stopLinearItemLiftTween() {
    linearItemLiftTween?.destroy();
    linearItemLiftTween = null;
  }

  function animateLinearItemDrop(dragState, finishLinearItemDrop) {
    const element = board.elements.find((item) => item.id === dragState.elementId);
    const group = contentLayer.findOne(`#${dragState.elementId}`);
    const itemNode = findLinearItemNode(group, dragState.fromIndex);
    if (!isLinearStructureElement(element) || !itemNode) {
      finishLinearItemDrop();
      return;
    }

    const { cellWidth } = getLinearStructureGeometry(element);
    const length = element.items?.length ?? 0;
    const toIndex = dragState.cancelled
      ? dragState.fromIndex
      : getLinearDragInsertIndex(dragState.fromIndex, dragState.previewGap, length);
    const targetX = toIndex * cellWidth;

    itemNode.to({
      x: targetX,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      shadowBlur: 0,
      shadowOpacity: 0,
      shadowOffsetY: 0,
      duration: 0.18,
      easing: Konva.Easings.EaseOut,
      onFinish: finishLinearItemDrop,
    });
  }

  function beginLinearItemDrag({ elementId, index, worldPoint }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    const { cellWidth } = getLinearStructureGeometry(element);
    const group = contentLayer.findOne(`#${elementId}`);
    const { x: relativeX, y: relativeY } = getLinearStructureLocalPoint(element, worldPoint, group);
    const baseX = index * cellWidth;
    const previewGap = clampLinearGap(index, element.items?.length ?? 0);
    structureInteraction.beginLinearItemDrag({
      elementId,
      fromIndex: index,
      pointerOffsetX: relativeX - baseX,
      pointerOffsetY: relativeY,
      dragX: baseX,
      dragY: 0,
      previewGap,
    });
    setElementDraggableState(elementId, false);
    setActiveLinearItem(elementId, index, { syncPanel: false, rerender: false });
    renderBoard();
    animateLinearItemLift();
  }

  function updateLinearDragVisualPosition() {
    let linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    const itemNode = findLinearItemNode(group, linearItemDragState.fromIndex);
    const indicator = group?.findOne(".array-drop-indicator");
    const element = board.elements.find((item) => item.id === linearItemDragState.elementId);
    if (!itemNode) return;
    stopLinearItemLiftTween();
    if (!linearItemDragState.longPressTriggered) {
      structureInteraction.markLinearItemDragLifted();
      linearItemDragState = structureInteraction.getLinearItemDragState();
      if (!linearItemDragState) return;
    }
    itemNode.x(linearItemDragState.dragX);
    itemNode.y(linearItemDragState.cancelled ? 0 : linearItemDragState.dragY);
    itemNode.setAttrs({
      scaleX: linearItemDragState.longPressTriggered && !linearItemDragState.cancelled ? 1.04 : 1,
      scaleY: linearItemDragState.longPressTriggered && !linearItemDragState.cancelled ? 1.04 : 1,
      shadowBlur: linearItemDragState.cancelled ? 0 : 18,
      shadowOpacity: linearItemDragState.cancelled ? 0 : 1,
      shadowOffsetY: linearItemDragState.cancelled ? 0 : -8,
      opacity: linearItemDragState.cancelled ? 1 : 0.96,
    });
    if (indicator) {
      indicator.visible(false);
    }
    contentLayer.batchDraw();
  }

  function updateLinearItemDrag(worldPoint) {
    const linearItemDragState = structureInteraction.getLinearItemDragState();
    if (!linearItemDragState) return false;
    const element = board.elements.find((item) => item.id === linearItemDragState.elementId);
    if (!isLinearStructureElement(element)) return false;
    const { cellWidth } = getLinearStructureGeometry(element);
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    const { x: localX, y: localY } = getLinearStructureLocalPoint(element, worldPoint, group);
    const thresholdY = getLinearItemDragThresholdY(element);
    const offsetY = localY - linearItemDragState.pointerOffsetY;
    const cancelled = Math.abs(offsetY) > thresholdY;
    const previewGap = getLinearPreviewGap(element, localX);
    const baseX = localX - linearItemDragState.pointerOffsetX;
    const gapChanged = linearItemDragState.previewGap !== previewGap;
    const cancelChanged = linearItemDragState.cancelled !== cancelled;
    structureInteraction.updateLinearItemDrag({
      dragX: baseX,
      dragY: cancelled ? 0 : -12,
      previewGap,
      cancelled,
      dragYRaw: offsetY,
    });
    if (gapChanged || cancelChanged) {
      structureInteraction.updateLinearItemDrag({ lastAnimatedGap: previewGap });
      animateLinearDragGapChange();
      return true;
    }
    updateLinearDragVisualPosition();
    return true;
  }

  function commitLinearItemDrag() {
    if (!structureInteraction.hasLinearItemDragState()) return false;
    const { linearItemDragState: dragState } = structureInteraction.finishLinearItemDrag();
    if (!dragState) return false;
    const element = board.elements.find((item) => item.id === dragState.elementId);
    stopLinearItemLiftTween();
    suppressSelectionDragOnce = false;
    suppressedNodeDragElementId = dragState.elementId;
    contentLayer.findOne(`#${dragState.elementId}`)?.stopDrag();
    nodeDragSelection = null;
    cancelSelectionDrag();
    suppressNextLinearItemSelect(dragState.elementId);
    const finishLinearItemDrop = () => {
      if (!isLinearStructureElement(element) || dragState.cancelled) {
        renderBoard();
        return;
      }
      const length = element.items?.length ?? 0;
      const toIndex = getLinearDragInsertIndex(dragState.fromIndex, dragState.previewGap, length);
      moveArrayStructureItem({
        elementId: dragState.elementId,
        fromIndex: dragState.fromIndex,
        toIndex,
      });
    };
    animateLinearItemDrop(dragState, finishLinearItemDrop);
    return true;
  }

  function beginLinearPointerDrag({ elementId, index, worldPoint }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked || (element.items?.length ?? 0) === 0) return;
    const nextIndex = getLinearPointerIndexFromWorldPoint(element, worldPoint) ?? index;
    const hadPointer = Number.isInteger(element.markers?.pointer);
    suppressedNodeDragElementId = elementId;
    contentLayer.findOne(`#${elementId}`)?.stopDrag();
    nodeDragSelection = null;
    cancelSelectionDrag();
    structureInteraction.beginLinearPointerDrag({
      elementId,
      fromIndex: index,
      nextIndex,
      hadPointer,
    });
    setElementDraggableState(elementId, false);
    selectIds([elementId]);
    animateLinearPointerLift(elementId);
    if (nextIndex !== index || !hadPointer) {
      board.elements = board.elements.map((item) => (
        item.id === elementId ? setArrayPointer(item, nextIndex) : item
      ));
      const linearPanelState = structureInspectorController.setLinearPanelState({
        highlightPointer: String(nextIndex),
      });
      applyLinearPanelState(linearPanelState);
      animateLinearPointerDragVisual(elementId, nextIndex);
    }
    updateLinearPointerDrag(worldPoint);
  }

  function updateLinearPointerDrag(worldPoint) {
    const linearPointerDragState = structureInteraction.getLinearPointerDragState();
    if (!linearPointerDragState) return false;
    const element = board.elements.find((item) => item.id === linearPointerDragState.elementId);
    if (!isLinearStructureElement(element)) return false;
    const nextIndex = getLinearPointerIndexFromWorldPoint(element, worldPoint);
    if (!Number.isInteger(nextIndex) || nextIndex === linearPointerDragState.nextIndex) return true;
    const { linearPointerDragState: dragState } = structureInteraction.updateLinearPointerDrag({
      nextIndex,
    });
    if (!dragState) return false;
    board.elements = board.elements.map((item) => (
      item.id === dragState.elementId ? setArrayPointer(item, nextIndex) : item
    ));
    const linearPanelState = structureInspectorController.setLinearPanelState({
      highlightPointer: String(nextIndex),
    });
    applyLinearPanelState(linearPanelState);
    animateLinearPointerDragVisual(dragState.elementId, nextIndex);
    return true;
  }

  function commitLinearPointerDrag() {
    if (!structureInteraction.hasLinearPointerDragState()) return false;
    const { linearPointerDragState: dragState } = structureInteraction.finishLinearPointerDrag();
    if (!dragState) return false;
    suppressedNodeDragElementId = dragState.elementId;
    contentLayer.findOne(`#${dragState.elementId}`)?.stopDrag();
    nodeDragSelection = null;
    cancelSelectionDrag();
    const element = board.elements.find((item) => item.id === dragState.elementId);
    setElementDraggableState(dragState.elementId, shouldElementBeDraggable(element));
    const finishLinearPointerDrop = () => {
      renderBoard();
      selectIds([dragState.elementId]);
      if (dragState.didMove) {
        pushHistory("已移动数组指针");
      }
    };
    animateLinearPointerDrop(dragState, finishLinearPointerDrop);
    return true;
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
    if (!event.evt?.shiftKey && worldPoint) beginSelectionDrag(worldPoint);
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

  function dispatchLinearStructureEvent(event) {
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT) {
      handleArrayStructureItemSelect(event);
      return;
    }
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS) {
      handleArrayStructureItemPress(event);
      return;
    }
    if (event?.type === LINEAR_STRUCTURE_EVENT_TYPES.ITEM_RELEASE) {
      handleArrayStructureItemRelease(event);
    }
  }

  function handleArrayStructureItemSelect({ elementId, index }) {
    const result = structureInteraction.handleEvent({
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT,
      elementId,
      index,
    }, {
      elements: board.elements,
      currentTool,
      isTemporaryPanActive: isTemporaryPanActive(),
    });
    if (!result.handled) return;
    if (result.clearSuppression) {
      clearLinearItemSelectSuppression();
      return;
    }
    selectIds(result.selectedIds);
    syncLinearItemActiveVisual(result.previousActiveLinearItem?.elementId);
    syncLinearItemActiveVisual(result.activeLinearItem?.elementId);
    renderLinearItemControls();
    renderBinaryTreeControls();
    contentLayer.batchDraw();
  }

  function handleArrayStructureItemPress({ elementId, index }) {
    const result = structureInteraction.handleEvent({
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS,
      elementId,
      index,
    }, {
      elements: board.elements,
      currentTool,
      isTemporaryPanActive: isTemporaryPanActive(),
    });
    if (!result.handled || !result.pressState) return;
    const worldPoint = getWorldPointer(stage);
    if (result.clearSuppression) clearLinearItemSelectSuppression();
    suppressSelectionDragOnce = result.suppressSelectionDragOnce;
    if (result.stopElementDrag) contentLayer.findOne(`#${elementId}`)?.stopDrag();
    linearItemPressState = {
      ...result.pressState,
      holdTimer: window.setTimeout(() => {
        if (!linearItemPressState || linearItemPressState.elementId !== result.pressState.elementId || linearItemPressState.index !== result.pressState.index) return;
        linearItemPressState = {
          ...linearItemPressState,
          phase: "hold",
          holdTimer: null,
        };
        beginLinearItemDrag({
          elementId: result.pressState.elementId,
          index: result.pressState.index,
          worldPoint: linearItemPressState.currentWorldPoint ?? linearItemPressState.startWorldPoint ?? worldPoint,
        });
      }, 250),
      startWorldPoint: worldPoint,
      currentWorldPoint: worldPoint,
    };
    setElementDraggableState(result.pressState.elementId, false);
  }

  function handleArrayStructureItemRelease() {
    const result = structureInteraction.handleEvent({ type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_RELEASE });
    if (!result.handled) return;
    if (result.resetLinearItemPressState) resetLinearItemPressState();
  }

  function handleArrayPointerPress({ elementId, index }) {
    if (isTemporaryPanActive() || currentTool !== TOOLS.SELECT) return;
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked || (element.items?.length ?? 0) === 0) return;
    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;
    suppressSelectionDragOnce = true;
    suppressedNodeDragElementId = elementId;
    contentLayer.findOne(`#${elementId}`)?.stopDrag();
    nodeDragSelection = null;
    cancelSelectionDrag();
    linearPointerPressState = {
      elementId,
      index,
      phase: "start",
      holdTimer: window.setTimeout(() => {
        if (!linearPointerPressState || linearPointerPressState.elementId !== elementId || linearPointerPressState.index !== index) return;
        linearPointerPressState = {
          ...linearPointerPressState,
          phase: "hold",
          holdTimer: null,
        };
        beginLinearPointerDrag({
          elementId,
          index,
          worldPoint: linearPointerPressState.currentWorldPoint ?? linearPointerPressState.startWorldPoint ?? worldPoint,
        });
      }, 250),
      startWorldPoint: worldPoint,
      currentWorldPoint: worldPoint,
    };
    setElementDraggableState(elementId, false);
    selectIds([elementId]);
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
      resetLinearItemPressState();
      resetLinearPointerPressState();
      cancelSelectionDrag();
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
