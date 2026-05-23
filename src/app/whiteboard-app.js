import Konva from "konva";
import { renderShell } from "./app-shell.js";
import {
  createClipboardSnapshot,
  createPastedElements,
  removeElementsById,
} from "../services/clipboard-service.js";
import {
  createEmptyBoard,
  moveElementsByLayer,
  normalizeBoard,
  reorderElements,
  serializeBoard,
} from "../board/board-model.js";
import {
  DEFAULT_TEXT_STYLE,
  createImageElement as buildImageElement,
  createShapeElement as buildShapeElement,
  createStickyElement as buildStickyElement,
  createTextElement as buildTextElement,
  isTinyElement,
} from "../board/element-factory.js";
import { createExportBackground } from "../canvas/export-renderer.js";
import {
  chooseWhiteboardSaveFile,
  downloadDataUrl,
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
import { createTextOverlayController } from "../services/text-overlay-service.js";
import { splitStrokeByEraser, getEraserPathSamples, getWorldPointer, normalizeRect, rectsIntersect } from "../canvas/geometry.js";
import { createHistory } from "../board/history.js";
import { createId } from "../board/ids.js";
import {
  createElementNode,
  createNodeAttrs,
  getStickyBorderColor,
  PRESSURE_STROKE_PREVIEW_ATTR,
  syncCoordinatePlaneNodeContent,
  syncElementNode,
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
  getNormalizedTextBox,
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
  shouldSelectAll,
  shouldUseBrowserSelectAll,
  truncateWithEllipsis,
} from "../tools/interaction-rules.js";
import {
  computeEraserRadius,
  getBrushPreviewAttrs,
  getFillValue,
  getMinimumEraserRadius,
  getSquareEraserPreviewAttrs,
  isShapeTool,
  resolveActiveDrawingTool,
} from "../tools/tool-behavior.js";
import {
  normalizePressure,
  shouldAppendStrokePoint,
  smoothStrokePoint,
} from "../tools/stroke-engine.js";
import {
  DEFAULT_SHAPE_TOOL,
  SHAPE_TOOLS,
  TOOLS,
} from "../ui/ui-config.js";
import {
  ARRAY_STRUCTURE_STYLE,
  TREE_STRUCTURE_STYLE,
  STRUCTURE_TYPES,
  LINEAR_STRUCTURE_TYPES,
  createStructureElements,
  getStructureItem,
  isLinearStructureElement,
  isLinearStructureType,
  insertArrayItem,
  deleteArrayItem,
  updateArrayItemValue,
  updateArrayValues,
  moveArrayItem,
  setArrayHighlight,
  setArrayPointer,
  setArrayPointerVisibility,
  clearArrayHighlight,
  setLinearIndexOptions,
  addGraphNode,
  addGraphEdge,
  addGraphEdgeFromText,
  deleteGraphNode,
  deleteLastGraphEdge,
  moveGraphNode,
  setGraphDirectedDefault,
  updateGraphEdge,
  updateGraphNodeLabel,
  setGraphHighlight,
  clearGraphHighlight,
  layoutGraph,
  exportGraph,
  exportTree,
  importGraphFromText,
  updateGraphFromInput,
  addTreeNode,
  addTreeChild,
  addTreeSibling,
  addBinaryTreeChild,
  addTreeEdge,
  getBinaryTreeChildSides,
  moveTreeNode,
  updateTreeNodeValue,
  layoutTreeStructure,
  setTreeTraversalHighlight,
  stepTreeTraversalHighlight,
  clearTreeHighlight,
  setTreeSubtreeCollapsed,
  copyTreeSubtreeValues,
  moveTreeSubtree,
  deleteTreeSubtree,
  deleteLastTreeNode,
  updateTreeFromInput,
} from "../structures/structure-templates.js";
import {
  getNextPanelCollapsedState,
  getPanelStateForLayerContent,
  isLayerPanelAvailable,
  shouldShowPanelEdgeToggle,
} from "../ui/panel-state.js";
import { computeFitViewport, computeViewportForBoundsVisibility } from "../canvas/viewport-service.js";

const LINEAR_POINTER_BASE_Y = -30;
const LINEAR_POINTER_DRAG_Y = -40;

export function createWhiteboardApp(root) {
  if (!root) return null;

  root.innerHTML = renderShell();

  const container = root.querySelector("#stage-container");
  const status = root.querySelector("[data-status]");
  const activeFileLabel = root.querySelector("[data-file-name]");
  const menuButton = root.querySelector("[data-menu-trigger]");
  const mainMenu = root.querySelector("[data-main-menu]");
  const stylePanel = root.querySelector("[data-style-panel]");
  const stylePanelTitle = root.querySelector("[data-style-panel-title]");
  const shapePopover = root.querySelector("[data-shape-popover]");
  const structurePanel = root.querySelector("[data-structure-panel]");
  const structureInputLabel = root.querySelector("[data-structure-input-label]");
  const structureInput = root.querySelector("[data-structure-input]");
  const linearInitPanel = root.querySelector("[data-linear-init-panel]");
  const arrayRandomFields = root.querySelector("[data-array-random-fields]");
  const arrayRandomCountInput = root.querySelector("[data-array-random-count]");
  const graphStructureInput = root.querySelector("[data-graph-structure-input]");
  const treeStructureInput = root.querySelector("[data-tree-structure-input]");
  const contextMenu = root.querySelector("[data-context-menu]");
  const layerPanel = root.querySelector("[data-layer-panel]");
  const panelBody = root.querySelector("[data-panel-body]");
  const colorInput = root.querySelector("[data-control='color']");
  const fillInput = root.querySelector("[data-control='fill']");
  const fillTransparentInput = root.querySelector("[data-control='fill-transparent']");
  const widthInput = root.querySelector("[data-control='width']");
  const brushOpacityInput = root.querySelector("[data-control='brush-opacity']");
  const brushSmoothingInput = root.querySelector("[data-control='brush-smoothing']");
  const brushCapInput = root.querySelector("[data-control='brush-cap']");
  const brushStyleInput = root.querySelector("[data-control='brush-style']");
  const arrowDoubleEndedInput = root.querySelector("[data-control='arrow-double-ended']");
  const coordinateUnitSizeInput = root.querySelector("[data-control='coordinate-unit-size']");
  const coordinateShowGridInput = root.querySelector("[data-control='coordinate-show-grid']");
  const coordinateShowTicksInput = root.querySelector("[data-control='coordinate-show-ticks']");
  const coordinateShowLabelsInput = root.querySelector("[data-control='coordinate-show-labels']");
  const coordinateGridColorInput = root.querySelector("[data-control='coordinate-grid-color']");
  const coordinateAxisColorInput = root.querySelector("[data-control='coordinate-axis-color']");
  const coordinateLabelColorInput = root.querySelector("[data-control='coordinate-label-color']");
  const brushCustomColorInput = root.querySelector("[data-brush-custom-color]");
  const brushWidthSlider = root.querySelector("[data-brush-width-slider]");
  const brushWidthValue = root.querySelector("[data-brush-width-value]");
  const brushOpacityValue = root.querySelector("[data-brush-opacity-value]");
  const brushPreviewPath = root.querySelector("[data-brush-preview-path]");
  const fontSizeInput = root.querySelector("[data-control='font-size']");
  const fontFamilyInput = root.querySelector("[data-control='font-family']");
  const zoomLabel = root.querySelector("[data-zoom]");
  const zoomButton = root.querySelector("[data-zoom-trigger]");
  const zoomMenu = root.querySelector("[data-zoom-menu]");
  const zoomOutButton = root.querySelector("[data-zoom-out]");
  const zoomInButton = root.querySelector("[data-zoom-in]");
  const imageInput = root.querySelector("[data-image-input]");
  const layerList = root.querySelector("[data-layer-list]");
  const inspectorSectionButtons = Array.from(root.querySelectorAll("[data-section-toggle]"));
  const linearFieldInputs = {
    highlightStart: root.querySelector("[data-linear-field='highlight-start']"),
    highlightEnd: root.querySelector("[data-linear-field='highlight-end']"),
    highlightPointer: root.querySelector("[data-linear-field='highlight-pointer']"),
  };
  const linearValuesTitle = root.querySelector("[data-linear-values-title]");
  const linearValuesInput = root.querySelector("[data-linear-values-input]");

  let board = createEmptyBoard();
  let history = createHistory(board);
  let currentTool = TOOLS.PEN;
  let activeShapeTool = DEFAULT_SHAPE_TOOL;
  let activeStructureType = STRUCTURE_TYPES.ARRAY;
  let activeArrayInitMode = "manual";
  let selectedIds = [];
  let fileHandle = null;
  let activeFileName = "未命名白板";
  let isSpaceDown = false;
  let isPanning = false;
  let panStart = null;
  let strokeDraft = null;
  let shapeDraft = null;
  let selectionDraft = null;
  let selectionDrag = null;
  let nodeDragSelection = null;
  let eraseSnapshot = null;
  let lastEraserPoint = null;
  let activeEraserRadius = 24;
  let eraserPreviewPoint = null;
  let isMainMenuOpen = false;
  let isZoomMenuOpen = false;
  let isEditingText = false;
  let clipboardSnapshot = [];
  let lastPointerWorldPoint = null;
  let panelCollapsedState = { style: false, layers: true };
  let stylePanelAvailable = true;
  let layerPanelAvailable = false;
  let statusTimer = null;
  let dirty = false;
  let suppressNextTextHistory = false;
  let activeTextEditorCommit = null;
  let initialStatusMessage = null;
  let draftSaveTimer = null;
  let lastTransformAnchor = null;
  let handledNodeDragEnd = false;
  let structureConnectState = null;
  let activeTreeNode = null;
  let activeLinearItem = null;
  let linearItemPressState = null;
  let linearItemDragState = null;
  let linearPointerPressState = null;
  let linearPointerDragState = null;
  let linearItemLiftTween = null;
  let linearPointerTween = null;
  let linearItemControls = null;
  let treeNodeControls = null;
  let binaryTreeNodeControls = null;
  let binaryTreeTraversalControls = null;
  let suppressLinearItemSelect = null;
  let suppressLinearItemSelectTimer = null;
  let suppressSelectionDragOnce = false;
  let suppressNextCanvasSelection = false;
  let suppressNextSelectionClick = false;
  let suppressedNodeDragElementId = null;
  let suppressedBinaryTreeNodeClickElementIds = new Set();
  let inspectorSectionsState = {
    appearance: true,
    linear: false,
    graph: false,
    tree: false,
  };
  let activeInspectorContext = "appearance";
  let linearPanelState = {
    highlightStart: "0",
    highlightEnd: "0",
    highlightPointer: "0",
  };
  let linearValuesDraft = "";
  let graphStructureDraft = "";
  const nodeRegistry = new Map();
  const nodeRenderSnapshots = new Map();
  const elementRenderSnapshotValues = new WeakMap();
  const DEFAULT_PROPERTY_CONTROLS = Object.freeze({
    color: "#111827",
    fill: "#ffffff",
    fillTransparent: true,
    width: "6",
    brushOpacity: "100",
    brushSmoothing: "45",
    brushCap: "round",
    brushStyle: "solid",
    fontSize: "28",
    fontFamily: "Inter, system-ui, sans-serif",
  });

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

  const selectionRect = new Konva.Rect({
    fill: "rgba(37, 99, 235, 0.08)",
    stroke: "#2563eb",
    strokeWidth: 1,
    dash: [4, 4],
    visible: false,
    listening: false,
  });
  contentLayer.add(selectionRect);

  const eraserCursor = new Konva.Rect({
    x: -18,
    y: -18,
    width: 36,
    height: 36,
    stroke: "#111827",
    strokeWidth: 2,
    dash: [2.5, 1.8],
    fill: "rgba(0,0,0,0)",
    strokeScaleEnabled: false,
    visible: false,
    listening: false,
  });
  overlayLayer.add(eraserCursor);

  const brushCursorDot = new Konva.Circle({
    radius: 3,
    fill: colorInput.value,
    visible: false,
    listening: false,
  });
  const brushCursorGap = new Konva.Circle({
    radius: 6,
    fill: "#ffffff",
    visible: false,
    listening: false,
  });
  const brushCursorRing = new Konva.Circle({
    radius: 3,
    stroke: "#111827",
    strokeWidth: 1,
    dash: [1, 1],
    fill: "rgba(0,0,0,0)",
    strokeScaleEnabled: false,
    visible: false,
    listening: false,
  });
  overlayLayer.add(brushCursorGap);
  overlayLayer.add(brushCursorDot);
  overlayLayer.add(brushCursorRing);

  hydrateLocalDraft();
  hydrateControls();
  applyViewport(board.viewport);
  applyBackground();
  renderBoard();
  setTool(TOOLS.PEN);
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
      getActiveLinearItem: () => (activeLinearItem ? { ...activeLinearItem } : null),
    },
    destroy: () => {
      if (draftSaveTimer) window.clearTimeout(draftSaveTimer);
      textOverlayController.clear();
      nodeRenderSnapshots.clear();
      nodeRegistry.clear();
      stage.destroy();
    },
  };

  function hydrateControls() {
    for (const button of root.querySelectorAll("[data-tool]")) {
      button.addEventListener("click", () => {
        setTool(button.dataset.tool);
        setShapePopoverOpen(button.dataset.tool === TOOLS.SHAPE);
        setStructurePanelOpen(button.dataset.tool === TOOLS.STRUCTURE);
      });
    }
    for (const button of root.querySelectorAll("[data-tool-action]")) {
      button.addEventListener("click", () => runToolAction(button.dataset.toolAction));
    }

    menuButton.addEventListener("click", toggleMainMenu);

    for (const button of root.querySelectorAll("[data-action]")) {
      button.addEventListener("click", () => runAction(button.dataset.action));
    }
    linearValuesInput?.addEventListener("input", () => {
      linearValuesDraft = linearValuesInput.value;
    });
    graphStructureInput?.addEventListener("input", () => {
      graphStructureDraft = graphStructureInput.value;
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-linear-item-action]");
      if (!button) return;
      runLinearItemAction(button.dataset.linearItemAction);
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-tree-node-action]");
      if (!button) return;
      runTreeNodeAction(button.dataset.treeNodeAction);
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-binary-tree-node-action]");
      if (!button) return;
      runBinaryTreeNodeAction(button.dataset.binaryTreeNodeAction);
    });
    root.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-binary-tree-traversal-action]");
      if (!button) return;
      runTreeTraversalAction(button.dataset.binaryTreeTraversalAction);
    });

    for (const button of root.querySelectorAll("[data-background-mode]")) {
      button.addEventListener("click", () => setBackgroundMode(button.dataset.backgroundMode));
    }

    for (const button of root.querySelectorAll("[data-context-action]")) {
      button.addEventListener("click", () => runContextAction(button.dataset.contextAction));
    }

    for (const button of root.querySelectorAll("[data-zoom-level]")) {
      button.addEventListener("click", () => setZoomAtCenter(Number(button.dataset.zoomLevel)));
    }

    for (const button of root.querySelectorAll("[data-shape-tool]")) {
      button.addEventListener("click", () => {
        activeShapeTool = button.dataset.shapeTool;
        setTool(TOOLS.SHAPE);
        setShapePopoverOpen(false);
      });
    }

    for (const button of root.querySelectorAll("[data-structure-type]")) {
      button.addEventListener("click", () => {
        setActiveStructureType(button.dataset.structureType);
      });
    }
    for (const button of root.querySelectorAll("[data-array-init-mode]")) {
      button.addEventListener("click", () => {
        activeArrayInitMode = button.dataset.arrayInitMode === "random" ? "random" : "manual";
        hydrateStructurePanel();
      });
    }
    root.querySelector("[data-structure-insert]").addEventListener("click", insertStructureFromPanel);
    root.querySelector("[data-structure-cancel]").addEventListener("click", () => {
      setStructurePanelOpen(false);
      setTool(TOOLS.SELECT);
    });
    hydrateStructurePanel();

    colorInput.addEventListener("input", applyStyleToSelection);
    colorInput.addEventListener("input", updateBrushCursorStyle);
    colorInput.addEventListener("input", syncBrushPresetButtons);
    fillInput.addEventListener("input", applyStyleToSelection);
    fillTransparentInput.addEventListener("change", () => syncFillTransparentControls(fillTransparentInput.checked));
    fillTransparentInput.addEventListener("change", applyStyleToSelection);
    widthInput.addEventListener("input", applyStyleToSelection);
    widthInput.addEventListener("input", updateBrushCursorStyle);
    widthInput.addEventListener("input", syncBrushWidthControl);
    widthInput.addEventListener("input", syncBrushPresetButtons);
    brushOpacityInput.addEventListener("input", applyStyleToSelection);
    brushOpacityInput.addEventListener("input", syncBrushWidthControl);
    brushOpacityInput.addEventListener("input", syncBrushPreview);
    brushSmoothingInput.addEventListener("input", applyStyleToSelection);
    brushSmoothingInput.addEventListener("input", syncBrushPresetButtons);
    brushSmoothingInput.addEventListener("input", syncBrushPreview);
    brushCapInput.addEventListener("change", applyStyleToSelection);
    brushCapInput.addEventListener("change", syncBrushPresetButtons);
    brushCapInput.addEventListener("change", syncBrushPreview);
    brushStyleInput.addEventListener("change", applyStyleToSelection);
    brushStyleInput.addEventListener("change", syncBrushPresetButtons);
    brushStyleInput.addEventListener("change", syncBrushPreview);
    arrowDoubleEndedInput.addEventListener("change", applyStyleToSelection);
    arrowDoubleEndedInput.addEventListener("change", syncShapeEndpointControls);
    [
      coordinateUnitSizeInput,
      coordinateShowGridInput,
      coordinateShowTicksInput,
      coordinateShowLabelsInput,
      coordinateGridColorInput,
      coordinateAxisColorInput,
      coordinateLabelColorInput,
    ].forEach((input) => input.addEventListener("input", applyCoordinateStyleToSelection));
    [
      coordinateShowGridInput,
      coordinateShowTicksInput,
      coordinateShowLabelsInput,
    ].forEach((input) => input.addEventListener("change", applyCoordinateStyleToSelection));
    fontSizeInput.addEventListener("input", applyStyleToSelection);
    fontFamilyInput.addEventListener("change", applyStyleToSelection);

    // Sync new UI controls to master controls
    root.querySelectorAll("[data-ui-control]").forEach((uiInput) => {
      const controlName = uiInput.dataset.uiControl;
      let masterInput = root.querySelector(`[data-control="${controlName}"]`);
      
      if (controlName === "sticky-font-size") masterInput = fontSizeInput;
      if (controlName === "sticky-font-family") masterInput = fontFamilyInput;
      if (controlName === "text-color") masterInput = colorInput;
      
      if (!masterInput) return;

      uiInput.addEventListener("input", () => {
        if (uiInput.type === "checkbox") masterInput.checked = uiInput.checked;
        if (controlName === "fill") syncFillTransparentControls(false);
        setBrushControlValue(masterInput, uiInput.value, "input");
        if (controlName === "color" || controlName === "width") {
          updateBrushCursorStyle();
        }
      });
      uiInput.addEventListener("change", () => {
        if (uiInput.type === "checkbox") masterInput.checked = uiInput.checked;
        if (controlName === "fill") syncFillTransparentControls(false);
        setBrushControlValue(masterInput, uiInput.value, "change");
      });
    });

    root.querySelectorAll("[data-brush-color]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = root.dataset.panelMode;
        const isSticky = mode === "sticky" || Boolean(closestElement(button, ".sticky-inspector"));
        const targetInput = isSticky ? fillInput : colorInput;
        setBrushControlValue(targetInput, button.dataset.brushColor, "input");
        if (!isSticky) updateBrushCursorStyle();
      });
    });

    root.querySelectorAll("[data-brush-text-color]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(colorInput, button.dataset.brushTextColor, "input");
      });
    });
    root.querySelectorAll("[data-shape-fill-color]").forEach((button) => {
      button.addEventListener("click", () => {
        syncFillTransparentControls(false);
        setBrushControlValue(fillInput, button.dataset.shapeFillColor, "input");
      });
    });
    brushCustomColorInput?.addEventListener("input", () => {
      setBrushControlValue(colorInput, brushCustomColorInput.value, "input");
      updateBrushCursorStyle();
    });
    brushWidthSlider?.addEventListener("input", () => {
      setBrushControlValue(widthInput, brushWidthSlider.value, "input");
      updateBrushCursorStyle();
    });
    root.querySelectorAll("[data-brush-width-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const step = Number(button.dataset.brushWidthStep) || 0;
        const current = Math.round(Number(widthInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.width));
        const min = Number(brushWidthSlider?.min ?? widthInput.min ?? 1);
        const max = Number(brushWidthSlider?.max ?? widthInput.max ?? 28);
        const next = Math.max(min, Math.min(max, current + step));
        setBrushControlValue(widthInput, String(next), "input");
        updateBrushCursorStyle();
      });
    });
    root.querySelectorAll("[data-brush-style-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushStyleInput, button.dataset.brushStyleOption, "change");
      });
    });
    root.querySelectorAll("[data-brush-cap-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushCapInput, button.dataset.brushCapOption, "change");
      });
    });
    root.querySelectorAll("[data-brush-smoothing]").forEach((button) => {
      button.addEventListener("click", () => {
        setBrushControlValue(brushSmoothingInput, button.dataset.brushSmoothing, "input");
      });
    });
    root.querySelectorAll("[data-text-style]").forEach((button) => {
      button.addEventListener("click", () => toggleTextStyle(button.dataset.textStyle));
    });
    zoomButton.addEventListener("click", toggleZoomMenu);
    zoomOutButton.addEventListener("click", () => zoomBy(1 / 1.25));
    zoomInButton.addEventListener("click", () => zoomBy(1.25));
    imageInput.addEventListener("change", importSelectedImage);
    for (const button of root.querySelectorAll("[data-panel-toggle]")) {
      button.addEventListener("click", () => togglePanel(button.dataset.panelToggle));
    }
    inspectorSectionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.sectionToggle;
        inspectorSectionsState = {
          ...inspectorSectionsState,
          [key]: !inspectorSectionsState[key],
        };
        applyInspectorSectionState();
      });
    });
    Object.entries(linearFieldInputs).forEach(([key, input]) => {
      if (!input) return;
      input.addEventListener("input", () => {
        linearPanelState = {
          ...linearPanelState,
          [key]: input.value,
        };
      });
    });
    layerList.addEventListener("click", (event) => {
      const button = closestElement(event.target, "[data-layer-id]");
      if (!button) return;
      setTool(TOOLS.SELECT);
      selectElementById(button.dataset.layerId, event.shiftKey);
      ensureSelectionVisible();
    });
  }

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
      if (isEditingText) return;
      if (handledNodeDragEnd) {
        handledNodeDragEnd = false;
        return;
      }
      syncSelectedNodes();
      pushHistory("已更新选择对象");
      lastTransformAnchor = null;
    });
  }

  function runAction(action) {
    closeMainMenu();
    const actions = {
      new: newBoard,
      open: openBoardFile,
      save: saveBoardFile,
      "save-as": saveBoardFileAs,
      export: exportPng,
      "import-image": () => imageInput.click(),
      undo: undoHistory,
      redo: redoHistory,
      "fit-content": fitContent,
      group: groupSelection,
      ungroup: ungroupSelection,
      "toggle-lock": toggleSelectionLock,
      clear: clearBoard,
      "reset-view": resetView,
      "bring-front": bringSelectionToFront,
      "bring-forward": bringSelectionForward,
      "send-backward": sendSelectionBackward,
      "send-back": sendSelectionToBack,
      "delete-selection": deleteSelection,
      "linear-apply-values": () => editSelectedArrayStructure((element) => updateArrayValues(element, linearValuesDraft)),
      "array-highlight": () => editSelectedArrayStructure((element) => setArrayHighlight(element, {
        start: readLinearDisplayIndexField("highlightStart", element, 0),
        end: readLinearDisplayIndexField("highlightEnd", element, Math.max(0, (element.items?.length ?? 1) - 1)),
        pointer: readLinearDisplayIndexField("highlightPointer", element, getActiveLinearIndex(element, 0)),
        showPointer: element.markers?.showPointer ?? true,
      })),
      "array-clear-highlight": () => editSelectedArrayStructure(clearArrayHighlight),
      "linear-index-zero": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: 0, showIndexes: element.settings?.showIndexes ?? true })),
      "linear-index-one": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: 1, showIndexes: element.settings?.showIndexes ?? true })),
      "linear-index-show": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: element.settings?.indexBase ?? 0, showIndexes: true })),
      "linear-index-hide": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: element.settings?.indexBase ?? 0, showIndexes: false })),
      "linear-pointer-show": () => editSelectedArrayStructure((element) => setArrayPointerVisibility(element, true)),
      "linear-pointer-hide": () => editSelectedArrayStructure((element) => setArrayPointerVisibility(element, false)),
      "graph-add-node": () => editSelectedStructure("graph-structure", (element) => addGraphNode(element), "已更新图"),
      "graph-add-edge": () => editSelectedStructure("graph-structure", (element) => addGraphEdge(element, null, null, { directed: element.settings?.directedDefault ?? false }), "已更新图"),
      "graph-connect-mode": beginGraphConnectMode,
      "graph-add-edge-input": () => editSelectedStructure("graph-structure", (element) => addGraphEdgeFromText(element, promptValue("边，例如 A->B:5", structureInput.value || "A-B")), "已更新图"),
      "graph-delete-node": () => editSelectedStructure("graph-structure", deleteGraphNode, "已更新图"),
      "graph-delete-edge": () => editSelectedStructure("graph-structure", deleteLastGraphEdge, "已更新图"),
      "graph-edit-edge": () => editSelectedStructure("graph-structure", (element) => editGraphEdgeData(element), "已更新图"),
      "graph-apply-structure": () => editSelectedStructure("graph-structure", (element) => updateGraphFromInput(element, graphStructureDraft), "已更新图"),
      "graph-directed-on": () => editSelectedStructure("graph-structure", (element) => setGraphDirectedDefault(element, true), "已更新图"),
      "graph-directed-off": () => editSelectedStructure("graph-structure", (element) => setGraphDirectedDefault(element, false), "已更新图"),
      "graph-highlight": () => editSelectedStructure("graph-structure", (element) => setGraphHighlight(element, {
        nodes: promptValue("高亮节点，逗号分隔", "").split(",").map((item) => item.trim()).filter(Boolean),
        edges: promptValue("高亮边 ID，逗号分隔", "").split(",").map((item) => item.trim()).filter(Boolean),
      }), "已更新图"),
      "graph-clear-highlight": () => editSelectedStructure("graph-structure", clearGraphHighlight, "已更新图"),
      "graph-layout-circle": () => editSelectedStructure("graph-structure", (element) => layoutGraph(element, "circle"), "已更新图布局"),
      "graph-layout-grid": () => editSelectedStructure("graph-structure", (element) => layoutGraph(element, "grid"), "已更新图布局"),
      "graph-layout-layered": () => editSelectedStructure("graph-structure", (element) => layoutGraph(element, "layered"), "已更新图布局"),
      "graph-layout-force": () => editSelectedStructure("graph-structure", (element) => layoutGraph(element, "force"), "已更新图布局"),
      "graph-export-edge-list": () => copySelectedGraphExport("edge-list"),
      "graph-export-adjacency-list": () => copySelectedGraphExport("adjacency-list"),
      "graph-export-adjacency-matrix": () => copySelectedGraphExport("adjacency-matrix"),
      "graph-import-adjacency-list": () => editSelectedStructure("graph-structure", (element) => importGraphFromText(element, promptMultiline("邻接表", exportGraph(element, "adjacency-list")), "adjacency-list"), "已导入图"),
      "graph-import-adjacency-matrix": () => editSelectedStructure("graph-structure", (element) => importGraphFromText(element, promptMultiline("邻接矩阵 CSV", exportGraph(element, "adjacency-matrix")), "adjacency-matrix"), "已导入图"),
      "graph-reload": () => editSelectedStructure("graph-structure", (element) => updateGraphFromInput(element, graphStructureDraft || structureInput.value), "已更新图"),
      "tree-add-node": () => editSelectedStructure("tree-structure", (element) => addTreeNode(element, "0"), "已更新树"),
      "tree-connect-mode": beginTreeConnectMode,
      "tree-set-value": () => editSelectedStructure("tree-structure", (element) => updateTreeNodeValue(element, getActiveTreeNodeId(element), promptValue("节点值", element.nodes?.[0]?.label ?? "")), "已更新树"),
      "tree-delete-subtree": () => editSelectedStructure("tree-structure", (element) => deleteTreeSubtree(element, getActiveTreeNodeId(element)), "已更新树"),
      "tree-highlight-level": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "level"), "已高亮遍历"),
      "tree-highlight-preorder": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "preorder"), "已选择前序遍历"),
      "tree-highlight-inorder": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "inorder"), "已选择中序遍历"),
      "tree-highlight-postorder": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "postorder"), "已选择后序遍历"),
      "tree-step-next": () => editSelectedStructure("tree-structure", (element) => stepTreeTraversalHighlight(element, 1), "已推进遍历"),
      "tree-step-prev": () => editSelectedStructure("tree-structure", (element) => stepTreeTraversalHighlight(element, -1), "已回退遍历"),
      "tree-clear-highlight": () => editSelectedStructure("tree-structure", clearTreeHighlight, "已清除高亮"),
      "tree-collapse-subtree": () => editSelectedStructure("tree-structure", (element) => setTreeSubtreeCollapsed(element, getActiveTreeNodeId(element), true), "已折叠子树"),
      "tree-expand-subtree": () => editSelectedStructure("tree-structure", (element) => setTreeSubtreeCollapsed(element, getActiveTreeNodeId(element), false), "已展开子树"),
      "tree-copy-subtree": copySelectedTreeSubtree,
      "tree-move-subtree": () => editSelectedStructure("tree-structure", (element) => moveTreeSubtree(element, getActiveTreeNodeId(element), element.settings?.rootId), "已移动子树"),
      "tree-delete-node": () => editSelectedStructure("tree-structure", deleteLastTreeNode, "已更新树"),
      "tree-layout": () => editSelectedStructure("tree-structure", layoutTreeStructure, "已更新树布局"),
      "tree-reload": () => editSelectedStructure("tree-structure", (element) => updateTreeFromInput(element, structureInput.value), "已更新树"),
      "tree-apply-structure": () => editSelectedStructure("tree-structure", (element) => updateTreeFromInput(element, treeStructureInput.value), "已更新树"),
    };

    actions[action]?.();
  }

  function runToolAction(action) {
    const actions = {
      "import-image": () => imageInput.click(),
    };

    actions[action]?.();
  }

  function runLinearItemAction(action) {
    const elementId = activeLinearItem?.elementId;
    const index = activeLinearItem?.index;
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked || !Number.isInteger(index)) return;

    if (action === "insert-before" || action === "insert-after") {
      const insertIndex = action === "insert-before" ? index : index + 1;
      const nextActiveIndex = action === "insert-before" ? index + 1 : index;
      board.elements = board.elements.map((item) => (
        item.id === elementId ? insertArrayItem(item, insertIndex, "0") : item
      ));
      renderBoard();
      selectIds([elementId]);
      setActiveLinearItem(elementId, nextActiveIndex);
      pushHistory("已插入数组项");
      return;
    }

    if (action === "delete") {
      board.elements = board.elements.map((item) => (
        item.id === elementId ? deleteArrayItem(item, index) : item
      ));
      const updated = board.elements.find((item) => item.id === elementId);
      renderBoard();
      selectIds([elementId]);
      if ((updated?.items?.length ?? 0) > 0) {
        setActiveLinearItem(elementId, Math.min(index, updated.items.length - 1));
      }
      pushHistory("已删除数组项");
    }
  }

  function runTreeNodeAction(action) {
    const elementId = activeTreeNode?.elementId;
    const nodeId = activeTreeNode?.nodeId;
    const element = board.elements.find((item) => item.id === elementId);
    if (!isSelectedGeneralTreeElement(element) || element.locked || !nodeId) return;

    if (action === "add-child") {
      const nextElement = addTreeChild(element, nodeId, "0");
      if (nextElement === element) return;
      board.elements = board.elements.map((item) => (item.id === elementId ? nextElement : item));
      activeTreeNode = { elementId, nodeId };
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已添加子节点");
      return;
    }

    if (action === "add-left-sibling" || action === "add-right-sibling") {
      const side = action === "add-left-sibling" ? "left" : "right";
      const nextElement = addTreeSibling(element, nodeId, side, "0");
      if (nextElement === element) return;
      board.elements = board.elements.map((item) => (item.id === elementId ? nextElement : item));
      activeTreeNode = { elementId, nodeId };
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory(side === "left" ? "已添加左兄弟节点" : "已添加右兄弟节点");
      return;
    }

    if (action === "edit") {
      const node = element.nodes?.find((item) => item.id === nodeId);
      editTreeStructureNode({ elementId, nodeId, label: String(node?.label ?? node?.value ?? "") });
      return;
    }

    if (action === "delete") {
      if (isTreeRootNode(element, nodeId)) {
        board.elements = removeElementsById(board.elements, [elementId]);
        activeTreeNode = null;
        selectedIds = selectedIds.filter((id) => id !== elementId);
        hideTreeControls();
        renderBoard();
        updateChrome();
        pushHistory("已删除树");
        return;
      }
      const nextElement = deleteTreeSubtree(element, nodeId);
      board.elements = board.elements.map((item) => (item.id === elementId ? nextElement : item));
      activeTreeNode = { elementId, nodeId: getTreeParentNodeId(element, nodeId) ?? nextElement.settings?.rootId ?? nextElement.nodes?.[0]?.id ?? null };
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已删除子树");
    }
  }

  function runBinaryTreeNodeAction(action) {
    const elementId = activeTreeNode?.elementId;
    const nodeId = activeTreeNode?.nodeId;
    const element = board.elements.find((item) => item.id === elementId);
    if (!isSelectedBinaryTreeElement(element) || element.locked || !nodeId) return;
    if (action === "add-left" || action === "add-right") {
      const side = action === "add-right" ? "right" : "left";
      const nextElement = addBinaryTreeChild(element, nodeId, side, "0");
      if (nextElement === element) return;
      board.elements = board.elements.map((item) => (item.id === elementId ? nextElement : item));
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory(side === "left" ? "已添加左子节点" : "已添加右子节点");
      return;
    }
    if (action === "delete") {
      if (nodeId === element.settings?.rootId) {
        board.elements = removeElementsById(board.elements, [elementId]);
        activeTreeNode = null;
        selectedIds = selectedIds.filter((id) => id !== elementId);
        hideBinaryTreeControls();
        renderBoard();
        updateChrome();
        pushHistory("已删除二叉树");
        return;
      }
      const nextElement = deleteTreeSubtree(element, nodeId);
      board.elements = board.elements.map((item) => (item.id === elementId ? nextElement : item));
      activeTreeNode = { elementId, nodeId: nextElement.settings?.rootId ?? nextElement.nodes?.[0]?.id ?? null };
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已删除子树");
    }
  }

  function runTreeTraversalAction(action) {
    const direction = action === "prev" ? -1 : 1;
    editSelectedStructure("tree-structure", (element) => (
      isTreeElementWithTraversal(element) ? stepTreeTraversalHighlight(element, direction) : element
    ), direction > 0 ? "已推进遍历" : "已回退遍历");
  }

  function runBinaryTreeTraversalAction(action) {
    runTreeTraversalAction(action);
  }

  function runContextAction(action) {
    hideContextMenu();
    const actions = {
      copy: copySelection,
      cut: cutSelection,
      paste: pasteClipboard,
      group: groupSelection,
      ungroup: ungroupSelection,
      "toggle-lock": toggleSelectionLock,
      "bring-front": bringSelectionToFront,
      "bring-forward": bringSelectionForward,
      "send-backward": sendSelectionBackward,
      "send-back": sendSelectionToBack,
      delete: deleteSelection,
    };

    actions[action]?.();
  }

  function toggleMainMenu() {
    setMainMenuOpen(!isMainMenuOpen);
  }

  function closeMainMenu() {
    setMainMenuOpen(false);
  }

  function setMainMenuOpen(nextOpen) {
    isMainMenuOpen = nextOpen;
    mainMenu.hidden = !nextOpen;
    menuButton.setAttribute("aria-expanded", String(nextOpen));
    menuButton.classList.toggle("active", nextOpen);
  }

  function setShapePopoverOpen(nextOpen) {
    shapePopover.hidden = !nextOpen;
  }

  function setStructurePanelOpen(nextOpen) {
    structurePanel.hidden = !nextOpen;
    if (!nextOpen) return;
    hydrateStructurePanel({ resetInput: true });
    requestAnimationFrame(() => structureInput.focus());
  }

  function hydrateStructurePanel({ resetInput = false } = {}) {
    const item = getStructureItem(activeStructureType);
    structureInput.placeholder = item.placeholder;
    if (resetInput) {
      structureInput.value = item.defaultInput;
    }
    const activeTypeIsLinear = isLinearStructureType(activeStructureType);
    const activeTypeSupportsRandom = activeTypeIsLinear || activeStructureType === STRUCTURE_TYPES.BINARY_TREE;
    linearInitPanel.hidden = !activeTypeSupportsRandom;
    structureInputLabel.hidden = activeTypeSupportsRandom && activeArrayInitMode === "random";
    arrayRandomFields.hidden = !activeTypeSupportsRandom || activeArrayInitMode !== "random";
    root.querySelectorAll("[data-structure-type]").forEach((button) => {
      button.classList.toggle("active", button.dataset.structureType === activeStructureType);
    });
    root.querySelectorAll("[data-array-init-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.arrayInitMode === activeArrayInitMode);
    });
  }

  function setActiveStructureType(type) {
    activeStructureType = getStructureItem(type).id;
    hydrateStructurePanel({ resetInput: true });
    structureInput.focus();
  }

  function toggleZoomMenu() {
    setZoomMenuOpen(!isZoomMenuOpen);
  }

  function setZoomMenuOpen(nextOpen) {
    isZoomMenuOpen = nextOpen;
    zoomMenu.hidden = !nextOpen;
    zoomButton.setAttribute("aria-expanded", String(nextOpen));
    zoomButton.classList.toggle("active", nextOpen);
  }

  function hideContextMenu() {
    contextMenu.hidden = true;
  }

  function togglePanel(panelName) {
    panelCollapsedState = getNextPanelCollapsedState(panelCollapsedState, panelName);
    applyPanelState();
  }

  function applyPanelState() {
    stylePanel.classList.toggle("is-collapsed", panelCollapsedState.style);
    layerPanel.classList.toggle("is-collapsed", panelCollapsedState.layers);
    root.querySelector("[data-panel-toggle='style']").textContent = panelCollapsedState.style ? "›" : "‹";
    root.querySelector("[data-panel-toggle='layers']").textContent = panelCollapsedState.layers ? "‹" : "›";
    root.querySelector("[data-panel-edge='style']").classList.toggle(
      "is-visible",
      shouldShowPanelEdgeToggle({ collapsed: panelCollapsedState.style, available: stylePanelAvailable }),
    );
    root.querySelector("[data-panel-edge='layers']").classList.toggle(
      "is-visible",
      shouldShowPanelEdgeToggle({ collapsed: panelCollapsedState.layers, available: layerPanelAvailable }),
    );
  }

  function getInspectorContext() {
    const selectedElements = board.elements.filter((element) => selectedIds.includes(element.id));
    if (selectedElements.length > 0) {
      if (selectedElements.every((element) => isLinearStructureElement(element))) {
        return "linear";
      }
      if (selectedElements.every((element) => element.type === "graph-structure")) {
        return "graph";
      }
      if (selectedElements.every((element) => element.type === "tree-structure")) {
        return "tree";
      }
      return "appearance";
    }
    return "appearance";
  }

  function getDefaultInspectorSections(context) {
    return {
      appearance: context === "appearance",
      linear: context === "linear",
      graph: context === "graph",
      tree: context === "tree",
    };
  }

  function getVisibleInspectorSections(context) {
    return {
      appearance: context === "appearance",
      linear: context === "linear",
      graph: context === "graph",
      tree: context === "tree",
    };
  }

  function applyInspectorSectionState() {
    const visibleSections = getVisibleInspectorSections(activeInspectorContext);
    root.querySelectorAll("[data-inspector-section]").forEach((section) => {
      const key = section.dataset.inspectorSection;
      const isVisible = Boolean(visibleSections[key]);
      const expanded = isVisible && Boolean(inspectorSectionsState[key]);
      section.hidden = !isVisible;
      section.dataset.collapsed = expanded ? "false" : "true";
      const button = section.querySelector("[data-section-toggle]");
      const content = section.querySelector("[data-section-content]");
      button?.setAttribute("aria-expanded", String(expanded));
      content?.setAttribute("aria-hidden", String(!expanded));
    });
  }

  function syncInspectorPanelState({ forceReset = false } = {}) {
    const nextContext = getInspectorContext();
    const shouldResetScroll = forceReset || nextContext !== activeInspectorContext;
    if (shouldResetScroll) {
      activeInspectorContext = nextContext;
      inspectorSectionsState = getDefaultInspectorSections(nextContext);
    }
    applyInspectorSectionState();
    if (shouldResetScroll) {
      panelBody?.scrollTo?.(0, 0);
    }
  }

  function bindUiEvents() {
    window.addEventListener("resize", () => {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
      updateGrid();
      syncTextOverlays();
    });

    document.addEventListener("selectstart", (event) => {
      if (isNativeTextEditingTarget(event.target)) return;
      event.preventDefault();
    }, { capture: true });

    window.addEventListener("wheel", (event) => {
      if (shouldPreventBrowserZoom(event)) {
        event.preventDefault();
      }
    }, { capture: true, passive: false });

    window.addEventListener("pointerdown", (event) => {
      if (!isMainMenuOpen) return;
      if (closestElement(event.target, "[data-main-menu], [data-menu-trigger]")) {
        return;
      }
      closeMainMenu();
    });

    window.addEventListener("pointerdown", (event) => {
      if (shapePopover.hidden) return;
      if (closestElement(event.target, "[data-shape-popover], [data-tool='shape']")) {
        return;
      }
      setShapePopoverOpen(false);
    });

    window.addEventListener("pointerdown", (event) => {
      if (structurePanel.hidden) return;
      if (closestElement(event.target, "[data-structure-panel], [data-tool='structure']")) {
        return;
      }
      setStructurePanelOpen(false);
    });

    window.addEventListener("pointerdown", (event) => {
      if (!isZoomMenuOpen) return;
      if (closestElement(event.target, "[data-zoom-menu], [data-zoom-trigger]")) {
        return;
      }
      setZoomMenuOpen(false);
    });

    window.addEventListener("pointerdown", (event) => {
      if (contextMenu.hidden) return;
      if (closestElement(event.target, "[data-context-menu]")) {
        return;
      }
      hideContextMenu();
    });

    window.addEventListener("paste", handlePaste);
    window.addEventListener("beforeunload", persistCurrentDraft);
    container.addEventListener("dragover", handleImageDragOver);
    container.addEventListener("drop", handleImageDrop);
  }

  function hydrateLocalDraft() {
    const result = loadLocalDraft();
    if (!result.ok) {
      initialStatusMessage = "自动草稿恢复失败";
      return;
    }
    if (!result.board) return;

    board = result.board;
    history = createHistory(board);
    selectedIds = [];
    fileHandle = null;
    activeFileName = LOCAL_DRAFT_FILE_NAME;
    dirty = true;
    initialStatusMessage = "已恢复自动草稿";
  }

  function bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (shouldSelectAll(event)) {
        if (shouldUseBrowserSelectAll(event)) return;
        event.preventDefault();
        event.stopPropagation();
        clearNativeSelection();
        selectAllElements();
        clearNativeSelection();
        return;
      }

      if (isTypingInEditableControl(event.target)) return;

      if (event.code === "Space") {
        isSpaceDown = true;
        stage.container().classList.add("is-pan-ready");
        updateDraggableState();
        hideToolCursors();
        event.preventDefault();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        event.stopPropagation();
        copySelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
        event.preventDefault();
        event.stopPropagation();
        cutSelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.stopPropagation();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          saveBoardFileAs();
        } else {
          saveBoardFile();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        event.stopPropagation();
        openBoardFile();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          redoHistory();
        } else {
          undoHistory();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        event.stopPropagation();
        redoHistory();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length > 0) {
          event.preventDefault();
          event.stopPropagation();
        }
        deleteSelection();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeMainMenu();
        setShapePopoverOpen(false);
        setStructurePanelOpen(false);
        setZoomMenuOpen(false);
        hideContextMenu();
        if (currentTool !== TOOLS.SELECT) {
          setTool(TOOLS.SELECT);
        } else {
          clearSelection();
        }
        return;
      }

      const shortcutMap = {
        v: TOOLS.SELECT,
        b: TOOLS.PEN,
        e: TOOLS.ERASER_STROKE,
        o: TOOLS.ERASER_OBJECT,
        t: TOOLS.TEXT,
        n: TOOLS.STICKY,
        h: TOOLS.PAN,
        s: TOOLS.STRUCTURE,
        r: TOOLS.SHAPE,
        l: TOOLS.SHAPE,
        a: TOOLS.SHAPE,
      };

      if (!event.ctrlKey && !event.metaKey && shortcutMap[event.key.toLowerCase()]) {
        if (event.key.toLowerCase() === "r") activeShapeTool = TOOLS.RECT;
        if (event.key.toLowerCase() === "l") activeShapeTool = TOOLS.LINE;
        if (event.key.toLowerCase() === "a") activeShapeTool = TOOLS.ARROW;
        setTool(shortcutMap[event.key.toLowerCase()]);
      }
    }, { capture: true });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        isSpaceDown = false;
        stage.container().classList.remove("is-pan-ready", "is-panning");
        updateDraggableState();
      }
    }, { capture: true });
  }

  function handleWheel(event) {
    event.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const newScale = clamp(
      direction > 0 ? oldScale * scaleBy : oldScale / scaleBy,
      0.12,
      4,
    );
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    updateGrid();
    updateBrushCursorStyle();
    updateEraserCursorStyle();
    updateViewportChrome();
    syncTextOverlays();
    schedulePersistCurrentDraft();
  }

  function zoomBy(multiplier) {
    setZoomAtCenter(stage.scaleX() * multiplier);
  }

  function setZoomAtCenter(requestedScale) {
    const oldScale = stage.scaleX();
    const newScale = clamp(requestedScale, 0.12, 4);
    const center = {
      x: stage.width() / 2,
      y: stage.height() / 2,
    };
    const worldCenter = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: center.x - worldCenter.x * newScale,
      y: center.y - worldCenter.y * newScale,
    });
    setZoomMenuOpen(false);
    updateGrid();
    updateBrushCursorStyle();
    updateEraserCursorStyle();
    updateViewportChrome();
    syncTextOverlays();
    schedulePersistCurrentDraft();
  }

  function handlePointerDown(event) {
    hideContextMenu();
    setZoomMenuOpen(false);

    if (shouldIgnoreCanvasPointerDown({ target: event.target, isEditingText })) {
      return;
    }

    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;
    lastPointerWorldPoint = worldPoint;

    if (isSpaceDown || currentTool === TOOLS.PAN || event.evt.button === 1) {
      isPanning = true;
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
      startStroke(worldPoint, event.evt.pressure);
      return;
    }

    if (currentTool === TOOLS.ERASER_STROKE) {
      eraseSnapshot = snapshotBoard();
      beginEraser(worldPoint);
      const radius = getVisibleEraserRadius(activeEraserRadius);
      eraseStrokeAt(worldPoint, radius);
      showEraser(worldPoint, radius);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT) {
      eraseSnapshot = snapshotBoard();
      beginEraser(worldPoint);
      eraseObjectAt(event.target);
      showEraser(worldPoint, getVisibleEraserRadius(activeEraserRadius));
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
      requestAnimationFrame(() => editTextElement(element.id));
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
      requestAnimationFrame(() => editTextElement(element.id));
      return;
    }

    if (currentTool === TOOLS.STRUCTURE) {
      setStructurePanelOpen(true);
      return;
    }

    const drawingTool = resolveActiveDrawingTool(currentTool, activeShapeTool);
    if (isShapeTool(drawingTool)) {
      startShape(worldPoint);
    }
  }

  function handlePointerMove(event) {
    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;
    lastPointerWorldPoint = worldPoint;

    if (isTemporaryPanActive() && !isPanning) {
      hideToolCursors();
      return;
    }

    if (linearPointerDragState) {
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

    if (linearItemDragState) {
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
        beginSelectionDrag(pressStart);
        resetLinearItemPressState();
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
      showEraser(worldPoint, getBaseEraserRadius());
      return;
    }

    if (currentTool === TOOLS.ERASER_STROKE && eraseSnapshot) {
      const previousPoint = lastEraserPoint ? { x: lastEraserPoint.x, y: lastEraserPoint.y } : worldPoint;
      const radius = updateEraserRadius(worldPoint);
      eraseStrokeAlongPath(previousPoint, worldPoint, radius);
      showEraser(worldPoint, radius);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT && eraseSnapshot) {
      const radius = updateEraserRadius(worldPoint);
      eraseObjectAt(event.target);
      showEraser(worldPoint, radius);
    }
  }

  function handlePointerUp() {
    if (linearPointerDragState) {
      resetLinearPointerPressState();
      commitLinearPointerDrag();
      return;
    }

    resetLinearPointerPressState();

    if (linearItemDragState) {
      resetLinearItemPressState();
      commitLinearItemDrag();
      return;
    }

    resetLinearItemPressState();

    if (isPanning) {
      isPanning = false;
      panStart = null;
      stage.container().classList.remove("is-panning");
      persistCurrentDraft();
      return;
    }

    if (strokeDraft) {
      finishStroke();
      return;
    }

    if (shapeDraft) {
      finishShape();
      return;
    }

    if (selectionDraft) {
      finishSelectionDraft();
      return;
    }

    if (selectionDrag) {
      finishSelectionDrag();
      return;
    }


    if (eraseSnapshot) {
      hideEraser();
      stage.container().classList.remove("is-erasing");
      if (JSON.stringify(eraseSnapshot.elements) !== JSON.stringify(board.elements)) {
        pushHistory("已擦除内容");
      }
      eraseSnapshot = null;
      lastEraserPoint = null;
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

    if (!targetId && selectedIds.length === 0 && clipboardSnapshot.length === 0) {
      return;
    }

    showContextMenu(event.clientX, event.clientY);
  }

  function showContextMenu(clientX, clientY) {
    updateContextMenuActions();
    contextMenu.hidden = false;
    const box = contextMenu.getBoundingClientRect();
    const left = clamp(clientX, 8, window.innerWidth - box.width - 8);
    const top = clamp(clientY, 8, window.innerHeight - box.height - 8);
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
  }

  function updateContextMenuActions() {
    root.querySelectorAll("[data-context-action]").forEach((button) => {
      const needsSelection = [
        "copy",
        "cut",
        "delete",
        "group",
        "ungroup",
        "toggle-lock",
        "bring-front",
        "bring-forward",
        "send-backward",
        "send-back",
      ].includes(button.dataset.contextAction);
      const needsClipboard = button.dataset.contextAction === "paste";
      const needsMultiple = button.dataset.contextAction === "group";
      button.disabled = (needsSelection && selectedIds.length === 0)
        || (needsMultiple && selectedIds.length < 2)
        || (needsClipboard && clipboardSnapshot.length === 0);
    });
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
    requestAnimationFrame(() => editTextElement(id));
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
    const arrayValueHitNode = event.target?.hasName?.("array-item-value-hit")
      ? event.target
      : event.target?.findAncestor?.(".array-item-value-hit");
    if (targetElement) {
      const element = board.elements.find((item) => item.id === targetElement);
      const targetIds = expandGroupedIds([targetElement]);
      if (isBinaryTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement) {
        const shouldDragBinaryTreeBlank = !event.evt.shiftKey && targetIds.some((id) => selectedIds.includes(id));
        const previousActiveTreeElementId = activeTreeNode.elementId;
        activeTreeNode = null;
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
        activeTreeNode = null;
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
      if (arrayValueHitNode && isLinearStructureElement(element)) {
        if (!event.evt.shiftKey && targetIds.some((id) => selectedIds.includes(id))) {
          beginSelectionDrag(worldPoint);
        }
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
    selectionDraft = { start: worldPoint };
    selectionRect.setAttrs({
      ...normalizeRect(worldPoint, worldPoint),
      visible: true,
    });
    contentLayer.batchDraw();
  }

  function beginSelectionDrag(worldPoint) {
    if (linearItemDragState) return;
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
    suppressedBinaryTreeNodeClickElementIds = new Set(
      selectionDrag?.originals
        .map(({ id }) => board.elements.find((item) => item.id === id))
        .filter(isBinaryTreeElement)
        .map((element) => element.id) ?? [],
    );
  }

  function consumeSuppressedBinaryTreeNodeClick(elementId) {
    if (!suppressedBinaryTreeNodeClickElementIds.has(elementId)) return false;
    suppressedBinaryTreeNodeClickElementIds.delete(elementId);
    return true;
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
      selectIds([id]);
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
    contentLayer.batchDraw();
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

    const dx = node.x() - dragSelection.start.x;
    const dy = node.y() - dragSelection.start.y;
    board.elements = board.elements.map((element) => {
      const original = dragSelection.originals.find((item) => item.id === element.id);
      if (!original) return element;
      return {
        ...element,
        x: original.x + dx,
        y: original.y + dy,
        scaleX: element.scaleX ?? 1,
        scaleY: element.scaleY ?? 1,
      };
    });
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
      if (fragments.length !== 1 || fragments[0].points.length !== element.points.length) {
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

  function getBaseEraserRadius() {
    return Math.max(18, Number(widthInput.value) * 1.7);
  }

  function getVisibleEraserRadius(radius = getBaseEraserRadius()) {
    return Math.max(radius, getMinimumEraserRadius(stage.scaleX()));
  }

  function showEraser(worldPoint, radius = activeEraserRadius) {
    eraserPreviewPoint = { ...worldPoint };
    const visibleRadius = getVisibleEraserRadius(radius);
    eraserCursor.setAttrs(getSquareEraserPreviewAttrs(worldPoint, visibleRadius));
    eraserCursor.visible(true);
    overlayLayer.batchDraw();
  }

  function hideEraser() {
    eraserPreviewPoint = null;
    eraserCursor.visible(false);
    overlayLayer.batchDraw();
  }

  function showBrushCursor(worldPoint) {
    const attrs = getBrushPreviewAttrs(worldPoint, widthInput.value, colorInput.value, stage.scaleX());
    brushCursorGap.setAttrs(attrs.gap);
    brushCursorDot.setAttrs(attrs.dot);
    brushCursorRing.setAttrs(attrs.ring);
    brushCursorGap.visible(true);
    brushCursorDot.visible(true);
    brushCursorRing.visible(true);
    overlayLayer.batchDraw();
  }

  function hideBrushCursor() {
    brushCursorGap.visible(false);
    brushCursorDot.visible(false);
    brushCursorRing.visible(false);
    overlayLayer.batchDraw();
  }

  function hideToolCursors() {
    eraserCursor.visible(false);
    brushCursorGap.visible(false);
    brushCursorDot.visible(false);
    brushCursorRing.visible(false);
    overlayLayer.batchDraw();
  }

  function isTemporaryPanActive() {
    return isSpaceDown || currentTool === TOOLS.PAN;
  }

  function updateBrushCursorStyle() {
    if (isTemporaryPanActive()) return;
    if (!brushCursorDot.visible()) return;
    showBrushCursor(brushCursorDot.position());
  }

  function updateEraserCursorStyle() {
    if (isTemporaryPanActive()) return;
    if (!eraserCursor.visible() || !eraserPreviewPoint) return;
    showEraser(eraserPreviewPoint, eraseSnapshot ? activeEraserRadius : getBaseEraserRadius());
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
      canEditArrayItems: currentTool === TOOLS.SELECT && !isTemporaryPanActive(),
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
        requestAnimationFrame(() => editTextElement(id));
      },
      onArrayItemMove: moveArrayStructureItem,
      onArrayItemEdit: editArrayStructureItem,
      onArrayItemSelect: handleArrayStructureItemSelect,
      onArrayItemPress: handleArrayStructureItemPress,
      onArrayItemRelease: handleArrayStructureItemRelease,
      onArrayPointerPress: handleArrayPointerPress,
      onGraphNodeMove: moveGraphStructureNode,
      onGraphNodeClick: handleGraphNodeClick,
      onGraphNodeConnect: connectGraphStructureNodes,
      onGraphNodeEdit: editGraphStructureNode,
      onGraphEdgeEdit: editGraphStructureEdge,
      getGraphEdgeState: (elementId) => (structureConnectState?.kind === "graph" && structureConnectState.elementId === elementId ? structureConnectState : null),
      onTreeNodeEdit: editTreeStructureNode,
      onTreeNodeClick: handleTreeNodeClick,
      onTreeNodePress: handleTreeStructureNodePress,
      onTreeNodeMove: moveTreeStructureNode,
      onTreeNodeConnect: connectTreeStructureNodes,
      getTreeConnectState: (elementId) => (structureConnectState?.kind === "tree" && structureConnectState.elementId === elementId ? structureConnectState : null),
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

  function syncTextOverlays({ hiddenIds = isEditingText ? selectedIds : [], elements = board.elements } = {}) {
    textOverlayController.setHiddenIds(hiddenIds);
    textOverlayController.sync(elements);
  }

  function renderBoard() {
    const orderedElements = reorderElements(board.elements);
    const nextIds = new Set(orderedElements.map((element) => element.id));
    for (const [id, node] of nodeRegistry) {
      if (!nextIds.has(id)) {
        node.destroy();
        nodeRegistry.delete(id);
        nodeRenderSnapshots.delete(id);
      }
    }
    for (const element of orderedElements) {
      const runtimeElement = buildRuntimeElement(element);
      const node = syncOrCreateElementNode(runtimeElement);
      node.moveTo(contentLayer);
      node.moveToTop();
    }
    selectionRect.moveToTop();
    syncSelectionNodes();
    renderLinearItemControls();
    renderTreeControls();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
    syncTextOverlays({ hiddenIds: isEditingText ? selectedIds : [] });
  }

  function syncOrCreateElementNode(element) {
    const existingNode = nodeRegistry.get(element.id);
    const nextSnapshot = createElementRenderSnapshot(element);
    const previousSnapshot = nodeRenderSnapshots.get(element.id);
    if (existingNode && previousSnapshot === nextSnapshot) {
      existingNode.draggable(shouldElementBeDraggable(element) && !isLinearPointerGestureElement(element.id) && !isSelectionDragElement(element.id));
      return existingNode;
    }
    if (existingNode && syncElementNode(existingNode, element, getElementNodeHandlers(element))) {
      existingNode.draggable(shouldElementBeDraggable(element) && !isLinearPointerGestureElement(element.id) && !isSelectionDragElement(element.id));
      nodeRenderSnapshots.set(element.id, nextSnapshot);
      return existingNode;
    }
    if (existingNode) {
      existingNode.destroy();
      nodeRegistry.delete(element.id);
      nodeRenderSnapshots.delete(element.id);
    }
    const node = createNode(element);
    nodeRegistry.set(element.id, node);
    nodeRenderSnapshots.set(element.id, nextSnapshot);
    return node;
  }

  function createElementRenderSnapshot(element) {
    if (!element || typeof element !== "object") return "";
    const handlerSnapshot = getElementRenderHandlerSnapshot(element);
    const cachedSnapshot = elementRenderSnapshotValues.get(element);
    if (cachedSnapshot) return `${cachedSnapshot}|${handlerSnapshot}`;
    const snapshot = JSON.stringify(element);
    elementRenderSnapshotValues.set(element, snapshot);
    return `${snapshot}|${handlerSnapshot}`;
  }

  function getElementRenderHandlerSnapshot(element) {
    if (isBinaryTreeElement(element)) {
      return `activeTreeNode:${activeTreeNode?.elementId === element.id ? activeTreeNode.nodeId : ""}`;
    }
    if (isGeneralTreeElement(element)) {
      return `activeTreeNode:${activeTreeNode?.elementId === element.id ? activeTreeNode.nodeId : ""}`;
    }
    if (!isLinearStructureElement(element)) return "";
    return `canEditArrayItems:${currentTool === TOOLS.SELECT && !isTemporaryPanActive()}`;
  }

  function buildRuntimeElement(element) {
    const runtime = {};
    if (isBinaryTreeElement(element) && activeTreeNode?.elementId === element.id) {
      runtime.activeNodeId = activeTreeNode.nodeId;
    }
    if (isGeneralTreeElement(element) && activeTreeNode?.elementId === element.id) {
      runtime.activeNodeId = activeTreeNode.nodeId;
    }
    if (!isLinearStructureElement(element)) {
      return Object.keys(runtime).length > 0
        ? { ...element, runtime: { ...(element.runtime ?? {}), ...runtime } }
        : element;
    }
    if (activeLinearItem?.elementId === element.id) {
      runtime.activeIndex = activeLinearItem.index;
    }
    if (linearItemDragState?.elementId === element.id) {
      Object.assign(runtime, {
        dragIndex: linearItemDragState.fromIndex,
        dragGap: linearItemDragState.previewGap,
        dragX: linearItemDragState.dragX,
        dragY: linearItemDragState.dragY,
        dragLift: linearItemDragState.longPressTriggered,
      });
    }
    return Object.keys(runtime).length > 0
      ? { ...element, runtime: { ...(element.runtime ?? {}), ...runtime } }
      : element;
  }

  function selectIds(ids) {
    const previousActive = activeLinearItem;
    selectedIds = [...new Set(ids)];
    const selectedLinear = getSelectedLinearStructure();
    if (!selectedLinear) {
      activeLinearItem = null;
    } else if (activeLinearItem?.elementId === selectedLinear.id) {
      syncActiveLinearItemAfterEdit(selectedLinear.id);
    }
    syncSelectionNodes();
    syncLinearItemActiveVisual(previousActive?.elementId);
    syncLinearItemActiveVisual(activeLinearItem?.elementId);
    renderLinearItemControls();
    renderTreeControls();
    contentLayer.batchDraw();
    updateChrome();
  }

  function selectElementById(id, additive = false) {
    const ids = expandGroupedIds([id]);
    if (additive) {
      const next = selectedIds.some((selectedId) => ids.includes(selectedId))
        ? selectedIds.filter((selectedId) => !ids.includes(selectedId))
        : [...selectedIds, ...ids];
      selectIds(next);
      return;
    }
    selectIds(ids);
  }

  function toggleSelection(id) {
    if (selectedIds.includes(id)) {
      selectIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      selectIds([...selectedIds, id]);
    }
  }

  function clearSelection() {
    cancelLinearItemDragPreview();
    cancelLinearPointerDrag();
    resetLinearItemPressState();
    hideLinearItemControls();
    clearLinearItemSelectSuppression();
    activeTreeNode = null;
    hideTreeControls();
    hideBinaryTreeControls();
    selectIds([]);
  }

  function syncSelectionNodes() {
    if (linearItemDragState || linearPointerDragState) {
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
    transformer.shouldOverdrawWholeArea(hasSelection && !selectedElements.some((element) => isInteractiveStructureElement(element)));
    transformer.forceUpdate();
    disableTransformerHitAreaDrag();
  }

  function disableTransformerHitAreaDrag() {
    transformer.findOne?.(".back")?.draggable(false);
  }

  function clampTransformerAnchorDrag(oldAbsPos, newAbsPos) {
    return clampTransformerAnchorDragBySize(oldAbsPos, newAbsPos, {
      minWidth: getActiveTransformerMinWidth(),
      minHeight: getActiveTransformerMinHeight(),
    });
  }

  function clampTransformerAnchorDragBySize(oldAbsPos, newAbsPos, { minWidth, minHeight }) {
    const anchor = transformer.getActiveAnchor?.();
    if (!anchor || anchor === "rotater") return newAbsPos;
    const topLeft = transformer.findOne?.(".top-left");
    const bottomRight = transformer.findOne?.(".bottom-right");
    if (!topLeft || !bottomRight) return newAbsPos;

    const minimumWidth = Math.max(1, Number(minWidth) || 1);
    const minimumHeight = Math.max(1, Number(minHeight) || 1);
    const topLeftAbs = topLeft.getAbsolutePosition();
    const bottomRightAbs = bottomRight.getAbsolutePosition();
    const nextPos = clampResizeAnchorPosition({
      anchor,
      position: newAbsPos,
      topLeft: topLeftAbs,
      bottomRight: bottomRightAbs,
      minWidth: minimumWidth,
      minHeight: minimumHeight,
    });

    return Number.isFinite(nextPos.x) && Number.isFinite(nextPos.y) ? nextPos : oldAbsPos;
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
    const nextWidth = Math.max(getMinimumTextResizeWidth(element.fontSize) + (element.padding ?? 0) * 2, proposedWidth);
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

  function getTextMeasureContext() {
    const canvas = getTextMeasureContext.canvas ?? document.createElement("canvas");
    getTextMeasureContext.canvas = canvas;
    return canvas.getContext("2d");
  }

  function getTextElementWrappedHeight(element, width) {
    return getNormalizedTextElementBox(element, width).height;
  }

  function getNormalizedTextElementBox(element, width = element.width) {
    const padding = Number(element.padding ?? 0);
    const context = getTextMeasureContext();
    const fontWeight = hasFontStyle(element.fontStyle, "bold") ? "700" : "400";
    const fontStyle = hasFontStyle(element.fontStyle, "italic") ? "italic" : "normal";
    context.font = `${fontStyle} ${fontWeight} ${element.fontSize}px ${element.fontFamily}`;
    return getNormalizedTextBox({
      text: element.text,
      width,
      fontSize: element.fontSize,
      padding,
      lineHeight: 1.25,
      verticalGap: 2,
      measureText: (value) => context.measureText(value || " ").width,
    });
  }

  function normalizeTextElementBox(element, { preserveHeight = false } = {}) {
    if (element.type !== "text") return element;
    const box = getNormalizedTextElementBox(element);
    return {
      ...element,
      width: box.width,
      height: preserveHeight && Number.isFinite(element.height) ? element.height : box.height,
      scaleX: 1,
      scaleY: 1,
    };
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

  function getElementIdFromNode(node) {
    if (!node || node === stage) return null;
    const elementNode = node.hasName?.("element") ? node : node.findAncestor?.(".element");
    return elementNode?.id() ?? null;
  }

  function getElementIdAtPointer(fallbackNode) {
    const fallbackId = getElementIdFromNode(fallbackNode);
    if (fallbackId) return fallbackId;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return getElementIdFromNode(stage.getIntersection(pointer));
  }

  function getSelectableElementIdAtWorldPoint(worldPoint, {
    fallbackNode = null,
    preferUnselected = false,
  } = {}) {
    const fallbackId = getElementIdFromNode(fallbackNode);
    const candidates = board.elements.map((element) => {
      const node = contentLayer.findOne(`#${element.id}`);
      if (!node) return null;
      return {
        id: element.id,
        zIndex: element.zIndex,
        box: node.getClientRect({ relativeTo: contentLayer }),
      };
    }).filter(Boolean);

    return pickElementIdAtPoint({
      point: worldPoint,
      candidates,
      padding: getSelectionHitRadius(stage.scaleX()),
      fallbackId,
      selectedIds,
      preferUnselected,
    });
  }

  function getNearbySelectedElementId(worldPoint) {
    if (selectedIds.length === 0) return null;
    const padding = getSelectionHitRadius(stage.scaleX());
    const boxes = selectedIds
      .map((id) => contentLayer.findOne(`#${id}`))
      .filter(Boolean)
      .map((node) => node.getClientRect({ relativeTo: contentLayer }));

    return pointHitsSelectionBounds(worldPoint, boxes, padding) ? selectedIds[0] : null;
  }

  function expandGroupedIds(ids) {
    const requested = new Set(ids.filter(Boolean));
    const groupIds = new Set(
      board.elements
        .filter((element) => requested.has(element.id) && element.groupId)
        .map((element) => element.groupId),
    );
    if (groupIds.size === 0) return [...requested];
    return board.elements
      .filter((element) => requested.has(element.id) || groupIds.has(element.groupId))
      .map((element) => element.id);
  }

  function isElementLocked(id) {
    return Boolean(board.elements.find((element) => element.id === id)?.locked);
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

  function copySelection() {
    if (selectedIds.length === 0) return;
    clipboardSnapshot = createClipboardSnapshot(board.elements, selectedIds);
    updateContextMenuActions();
    setStatus("已复制对象");
  }

  function cutSelection() {
    if (selectedIds.length === 0) return;
    const editableIds = selectedIds.filter((id) => !isElementLocked(id));
    if (editableIds.length === 0) return;
    clipboardSnapshot = createClipboardSnapshot(board.elements, editableIds);
    board.elements = removeElementsById(board.elements, editableIds);
    clearSelection();
    renderBoard();
    updateContextMenuActions();
    pushHistory("已剪切对象");
  }

  function pasteClipboard() {
    if (clipboardSnapshot.length === 0) return;
    const pasted = createPastedElements(clipboardSnapshot, {
      offset: 24,
      targetPoint: lastPointerWorldPoint,
      zIndexStart: board.elements.length,
    });
    board.elements = reorderElements([...board.elements, ...pasted]);
    clipboardSnapshot = createClipboardSnapshot(pasted, pasted.map((element) => element.id));
    renderBoard();
    setTool(TOOLS.SELECT);
    selectIds(pasted.map((element) => element.id));
    pushHistory("已粘贴对象");
  }

  function insertStructureFromPanel() {
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
    pushHistory(`已添加${getStructureItem(activeStructureType).label}`);
  }

  function isRandomStructureInitSupported(type) {
    return isLinearStructureType(type) || type === STRUCTURE_TYPES.BINARY_TREE;
  }

  function getViewportCenterPoint() {
    return {
      x: (stage.width() / 2 - stage.x()) / stage.scaleX(),
      y: (stage.height() / 2 - stage.y()) / stage.scaleX(),
    };
  }

  function deleteSelection() {
    if (selectedIds.length === 0) return;
    const editableIds = selectedIds.filter((id) => !isElementLocked(id));
    if (editableIds.length === 0) return;
    board.elements = removeElementsById(board.elements, editableIds);
    clearSelection();
    renderBoard();
    pushHistory("已删除对象");
  }

  function editSelectedArrayStructure(edit) {
    const targetId = selectedIds.find((id) => {
      const element = board.elements.find((item) => item.id === id);
      return isLinearStructureElement(element) && !element.locked;
    });
    if (!targetId) return;

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
    const raw = linearPanelState[fieldName];
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
    const maxIndex = Math.max(0, (element?.items?.length ?? 1) - 1);
    if (activeLinearItem?.elementId === element?.id) {
      return Math.min(maxIndex, Math.max(0, activeLinearItem.index));
    }
    return Math.min(maxIndex, Math.max(0, fallback));
  }

  function setActiveLinearItem(elementId, index, { syncPanel = true, rerender = true } = {}) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element)) {
      const previousActive = activeLinearItem;
      activeLinearItem = null;
      if (syncPanel) syncLinearPanelState();
      syncLinearItemActiveVisual(previousActive?.elementId);
      return;
    }
    const previousActive = activeLinearItem;
    const maxIndex = Math.max(0, (element.items?.length ?? 1) - 1);
    activeLinearItem = {
      elementId,
      index: Math.min(maxIndex, Math.max(0, Number(index) || 0)),
    };
    if (syncPanel) syncLinearPanelState();
    if (rerender) {
      renderBoard();
    } else {
      syncLinearItemActiveVisual(previousActive?.elementId);
      syncLinearItemActiveVisual(elementId);
      renderLinearItemControls();
      renderBinaryTreeControls();
      contentLayer.batchDraw();
    }
  }

  function syncActiveLinearItemAfterEdit(elementId, preferredIndex = null) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element)) {
      activeLinearItem = null;
      return;
    }
    if (activeLinearItem?.elementId !== elementId) {
      activeLinearItem = null;
      return;
    }
    const length = element.items?.length ?? 0;
    if (length === 0) {
      activeLinearItem = null;
      return;
    }
    const fallbackIndex = activeLinearItem.index;
    const nextIndex = preferredIndex ?? fallbackIndex;
    activeLinearItem = {
      elementId,
      index: Math.min(length - 1, Math.max(0, Number(nextIndex) || 0)),
    };
  }

  function syncLinearPanelState() {
    const element = getSelectedLinearStructure();
    if (!element) {
      if (linearValuesTitle) {
        linearValuesTitle.textContent = "当前结构";
      }
      if (linearValuesInput && document.activeElement !== linearValuesInput) {
        linearValuesInput.value = "";
        linearValuesDraft = "";
      }
      applyLinearPanelState(linearPanelState);
      return;
    }
    if (linearValuesTitle) {
      linearValuesTitle.textContent = `当前${getLinearStructureDisplayName(element.type)}结构`;
    }
    if (linearValuesInput && document.activeElement !== linearValuesInput) {
      linearValuesInput.value = (element.items ?? []).map((item) => item.value ?? "").join(",");
      linearValuesDraft = linearValuesInput.value;
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
    linearPanelState = {
      ...linearPanelState,
      highlightStart: String(toLinearDisplayIndex(element, Math.min(Math.max(0, itemCount - 1), Math.max(0, firstHighlight)))),
      highlightEnd: String(toLinearDisplayIndex(element, Math.min(Math.max(0, itemCount - 1), Math.max(0, lastHighlight)))),
      highlightPointer: String(toLinearDisplayIndex(element, pointer)),
    };
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
    if (linearItemControls) return linearItemControls;
    const controls = document.createElement("div");
    controls.className = "linear-item-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-linear-item-action="insert-before" title="前插" aria-label="前插">+左</button>
      <button type="button" data-linear-item-action="insert-after" title="后插" aria-label="后插">+右</button>
      <button type="button" data-linear-item-action="delete" title="删除" aria-label="删除">删除</button>
    `;
    root.appendChild(controls);
    linearItemControls = controls;
    return controls;
  }

  function hideLinearItemControls() {
    if (linearItemControls) linearItemControls.hidden = true;
  }

  function ensureTreeNodeControls() {
    if (treeNodeControls) return treeNodeControls;
    const controls = document.createElement("div");
    controls.className = "tree-node-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-tree-node-action="add-child" title="添加子节点" aria-label="添加子节点">子+</button>
      <button type="button" data-tree-node-action="add-left-sibling" title="添加左兄弟" aria-label="添加左兄弟">左兄+</button>
      <button type="button" data-tree-node-action="add-right-sibling" title="添加右兄弟" aria-label="添加右兄弟">右兄+</button>
      <button type="button" data-tree-node-action="edit" title="改值" aria-label="改值">改值</button>
      <button type="button" data-tree-node-action="delete" title="删除子树" aria-label="删除子树">删除</button>
    `;
    root.appendChild(controls);
    treeNodeControls = controls;
    return controls;
  }

  function ensureBinaryTreeNodeControls() {
    if (binaryTreeNodeControls) return binaryTreeNodeControls;
    const controls = document.createElement("div");
    controls.className = "binary-tree-node-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-binary-tree-node-action="add-left" title="添加左子节点" aria-label="添加左子节点">左+</button>
      <button type="button" data-binary-tree-node-action="add-right" title="添加右子节点" aria-label="添加右子节点">右+</button>
      <button type="button" data-binary-tree-node-action="delete" title="删除子树" aria-label="删除子树">删除</button>
    `;
    root.appendChild(controls);
    binaryTreeNodeControls = controls;
    return controls;
  }

  function ensureBinaryTreeTraversalControls() {
    if (binaryTreeTraversalControls) return binaryTreeTraversalControls;
    const controls = document.createElement("div");
    controls.className = "binary-tree-traversal-controls";
    controls.hidden = true;
    controls.innerHTML = `
      <button type="button" data-binary-tree-traversal-action="prev" title="上一步" aria-label="上一步">‹</button>
      <button type="button" data-binary-tree-traversal-action="next" title="下一步" aria-label="下一步">›</button>
    `;
    root.appendChild(controls);
    binaryTreeTraversalControls = controls;
    return controls;
  }

  function hideBinaryTreeControls() {
    if (binaryTreeNodeControls) binaryTreeNodeControls.hidden = true;
    if (binaryTreeTraversalControls) binaryTreeTraversalControls.hidden = true;
  }

  function hideTreeControls() {
    if (treeNodeControls) treeNodeControls.hidden = true;
  }

  function renderLinearItemControls() {
    const controls = ensureLinearItemControls();
    const element = board.elements.find((item) => item.id === activeLinearItem?.elementId);
    if (!isLinearStructureElement(element) || !selectedIds.includes(element.id) || linearItemDragState) {
      controls.hidden = true;
      return;
    }
    controls.hidden = false;
    updateLinearItemControlsPosition();
  }

  function renderTreeControls() {
    renderTreeNodeControls();
    renderTreeTraversalControls();
    renderBinaryTreeControls();
  }

  function renderTreeNodeControls() {
    const controls = ensureTreeNodeControls();
    const element = board.elements.find((item) => item.id === activeTreeNode?.elementId);
    if (!isSelectedGeneralTreeElement(element) || element.locked || !activeTreeNode?.nodeId) {
      controls.hidden = true;
      return;
    }
    const group = contentLayer.findOne(`#${element.id}`);
    const treeNode = findTreeNodeGroup(group, activeTreeNode.nodeId);
    if (!treeNode) {
      controls.hidden = true;
      return;
    }
    const isRoot = isTreeRootNode(element, activeTreeNode.nodeId);
    controls.querySelector("[data-tree-node-action='add-left-sibling']").hidden = isRoot;
    controls.querySelector("[data-tree-node-action='add-right-sibling']").hidden = isRoot;
    controls.hidden = false;
    const box = treeNode.getClientRect();
    const stageBox = stage.container().getBoundingClientRect();
    controls.style.left = `${stageBox.left + box.x + box.width / 2}px`;
    controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;
    controls.style.transform = "translateX(-50%)";
  }

  function renderBinaryTreeControls() {
    renderBinaryTreeNodeControls();
    renderTreeTraversalControls();
  }

  function renderBinaryTreeNodeControls() {
    const controls = ensureBinaryTreeNodeControls();
    const element = board.elements.find((item) => item.id === activeTreeNode?.elementId);
    if (!isSelectedBinaryTreeElement(element) || element.locked || !activeTreeNode?.nodeId) {
      controls.hidden = true;
      return;
    }
    const group = contentLayer.findOne(`#${element.id}`);
    const treeNode = findTreeNodeGroup(group, activeTreeNode.nodeId);
    if (!treeNode) {
      controls.hidden = true;
      return;
    }
    const sides = getBinaryTreeChildSides(element, activeTreeNode.nodeId);
    controls.querySelector("[data-binary-tree-node-action='add-left']").hidden = Boolean(sides.left);
    controls.querySelector("[data-binary-tree-node-action='add-right']").hidden = Boolean(sides.right);
    controls.hidden = false;
    const box = treeNode.getClientRect();
    const stageBox = stage.container().getBoundingClientRect();
    controls.style.left = `${stageBox.left + box.x + box.width / 2}px`;
    controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;
    controls.style.transform = "translateX(-50%)";
  }

  function renderTreeTraversalControls() {
    const controls = ensureBinaryTreeTraversalControls();
    const element = board.elements.find((item) => isSelectedTreeElementWithTraversal(item));
    if (!element || !element.markers?.traversalMode) {
      controls.hidden = true;
      return;
    }
    const group = contentLayer.findOne(`#${element.id}`);
    if (!group) {
      controls.hidden = true;
      return;
    }
    controls.hidden = false;
    const box = group.getClientRect();
    const stageBox = stage.container().getBoundingClientRect();
    controls.style.left = `${stageBox.left + box.x + box.width - controls.offsetWidth}px`;
    controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;
    controls.style.transform = "none";
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
    if (!elementId) return;
    const element = board.elements.find((item) => item.id === elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!isLinearStructureElement(element) || !group) return;
    const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
    group.find(".array-item").forEach((itemNode) => {
      const index = getLinearItemNodeIndex(itemNode);
      const isActive = activeLinearItem?.elementId === elementId && activeLinearItem.index === index;
      itemNode.find(".array-item-index-hit").forEach((node) => {
        if (node.getClassName?.() !== "Rect") return;
        node.stroke(isActive ? "#2563eb" : style.stroke);
        node.strokeWidth(isActive ? 3 : 2);
      });
      itemNode.find(".array-item-value-hit").forEach((node) => {
        if (node.getClassName?.() !== "Rect") return;
        node.stroke(isActive ? "#2563eb" : style.stroke);
        node.strokeWidth(isActive ? 3 : 2);
      });
      if (isActive) itemNode.moveToTop();
    });
    group.findOne(".array-drop-indicator")?.moveToTop();
  }

  function syncBinaryTreeActiveVisual(elementId) {
    if (!elementId) return;
    const element = board.elements.find((item) => item.id === elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!isBinaryTreeElement(element) || !group) return;
    const style = { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) };
    group.find(".tree-node").forEach((nodeGroup) => {
      const nodeId = nodeGroup.getAttr("treeNodeId");
      const ellipse = nodeGroup.findOne("Ellipse");
      if (!ellipse) return;
      const isActive = activeTreeNode?.elementId === elementId && activeTreeNode.nodeId === nodeId;
      ellipse.stroke(isActive ? "#2563eb" : style.nodeStroke);
      ellipse.strokeWidth(isActive ? 3 : 2);
      if (isActive) nodeGroup.moveToTop();
    });
    renderBinaryTreeControls();
    contentLayer.batchDraw();
  }

  function syncGeneralTreeActiveVisual(elementId) {
    if (!elementId) return;
    const element = board.elements.find((item) => item.id === elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!isGeneralTreeElement(element) || !group) return;
    const style = { ...TREE_STRUCTURE_STYLE, ...(element.style ?? {}) };
    group.find(".tree-node").forEach((nodeGroup) => {
      const nodeId = nodeGroup.getAttr("treeNodeId");
      const ellipse = nodeGroup.findOne("Ellipse");
      if (!ellipse) return;
      const isActive = activeTreeNode?.elementId === elementId && activeTreeNode.nodeId === nodeId;
      ellipse.stroke(isActive ? "#2563eb" : style.nodeStroke);
      ellipse.strokeWidth(isActive ? 3 : 2);
      if (isActive) nodeGroup.moveToTop();
    });
    renderTreeNodeControls();
    contentLayer.batchDraw();
  }

  function updateLinearItemControlsPosition() {
    if (!linearItemControls || linearItemControls.hidden || !activeLinearItem) return;
    const group = contentLayer.findOne(`#${activeLinearItem.elementId}`);
    const itemNode = findLinearItemNode(group, activeLinearItem.index);
    if (!itemNode) {
      linearItemControls.hidden = true;
      return;
    }
    const box = itemNode.getClientRect();
    const stageBox = stage.container().getBoundingClientRect();
    linearItemControls.style.left = `${stageBox.left + box.x + box.width / 2}px`;
    linearItemControls.style.top = `${stageBox.top + box.y + box.height + 8}px`;
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
      || linearItemDragState?.elementId === elementId
      || linearPointerPressState?.elementId === elementId
      || linearPointerDragState?.elementId === elementId;
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
    suppressLinearItemSelect = { elementId };
    suppressLinearItemSelectTimer = window.setTimeout(() => {
      clearLinearItemSelectSuppression();
    }, 500);
  }

  function clearLinearItemSelectSuppression() {
    if (suppressLinearItemSelectTimer) {
      window.clearTimeout(suppressLinearItemSelectTimer);
      suppressLinearItemSelectTimer = null;
    }
    suppressLinearItemSelect = null;
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
    if (!linearItemDragState) return;
    linearItemDragState = null;
    renderBoard();
  }

  function cancelLinearPointerDrag() {
    const elementId = linearPointerDragState?.elementId ?? linearPointerPressState?.elementId;
    clearLinearPointerPressTimer();
    stopLinearPointerTween();
    linearPointerPressState = null;
    linearPointerDragState = null;
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
    return Math.min(length, Math.max(0, Number(gap) || 0));
  }

  function getLinearPreviewGap(element, localX) {
    const length = element.items?.length ?? 0;
    const { cellWidth } = getLinearStructureGeometry(element);
    const paddedX = localX + cellWidth * 0.35;
    return clampLinearGap(Math.floor(paddedX / cellWidth), length);
  }

  function getLinearDragInsertIndex(fromIndex, previewGap, length) {
    const safeGap = clampLinearGap(previewGap, length);
    return safeGap > fromIndex ? safeGap - 1 : safeGap;
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
    const localX = worldPoint.x - (element.x ?? 0);
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
        if (!linearItemDragState) return;
        linearItemDragState.longPressTriggered = true;
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
    const relativeX = worldPoint.x - (element.x ?? 0);
    const relativeY = worldPoint.y - (element.y ?? 0);
    const baseX = index * cellWidth;
    const previewGap = clampLinearGap(index, element.items?.length ?? 0);
    linearItemDragState = {
      elementId,
      fromIndex: index,
      pointerOffsetX: relativeX - baseX,
      pointerOffsetY: relativeY,
      dragX: baseX,
      dragY: 0,
      previewGap,
      lastAnimatedGap: previewGap,
      longPressTriggered: false,
      cancelled: false,
    };
    setElementDraggableState(elementId, false);
    setActiveLinearItem(elementId, index, { syncPanel: false, rerender: false });
    renderBoard();
    animateLinearItemLift();
  }

  function updateLinearDragVisualPosition() {
    if (!linearItemDragState) return;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    const itemNode = findLinearItemNode(group, linearItemDragState.fromIndex);
    const indicator = group?.findOne(".array-drop-indicator");
    const element = board.elements.find((item) => item.id === linearItemDragState.elementId);
    if (!itemNode) return;
    stopLinearItemLiftTween();
    if (!linearItemDragState.longPressTriggered) {
      linearItemDragState.longPressTriggered = true;
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
    if (!linearItemDragState) return false;
    const element = board.elements.find((item) => item.id === linearItemDragState.elementId);
    if (!isLinearStructureElement(element)) return false;
    const { cellWidth } = getLinearStructureGeometry(element);
    const localX = worldPoint.x - (element.x ?? 0);
    const localY = worldPoint.y - (element.y ?? 0);
    const thresholdY = getLinearItemDragThresholdY(element);
    const offsetY = localY - linearItemDragState.pointerOffsetY;
    const cancelled = Math.abs(offsetY) > thresholdY;
    const previewGap = getLinearPreviewGap(element, localX);
    const baseX = localX - linearItemDragState.pointerOffsetX;
    const gapChanged = linearItemDragState.previewGap !== previewGap;
    const cancelChanged = linearItemDragState.cancelled !== cancelled;
    linearItemDragState = {
      ...linearItemDragState,
      dragX: baseX,
      dragY: cancelled ? 0 : -12,
      previewGap,
      cancelled,
      dragYRaw: offsetY,
    };
    if (gapChanged || cancelChanged) {
      linearItemDragState.lastAnimatedGap = previewGap;
      animateLinearDragGapChange();
      return true;
    }
    updateLinearDragVisualPosition();
    return true;
  }

  function commitLinearItemDrag() {
    if (!linearItemDragState) return false;
    const dragState = linearItemDragState;
    const element = board.elements.find((item) => item.id === dragState.elementId);
    linearItemDragState = null;
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
    linearPointerDragState = {
      elementId,
      fromIndex: index,
      nextIndex,
      didMove: nextIndex !== index || !hadPointer,
    };
    setElementDraggableState(elementId, false);
    selectIds([elementId]);
    animateLinearPointerLift(elementId);
    if (nextIndex !== index || !hadPointer) {
      board.elements = board.elements.map((item) => (
        item.id === elementId ? setArrayPointer(item, nextIndex) : item
      ));
      linearPanelState = {
        ...linearPanelState,
        highlightPointer: String(nextIndex),
      };
      applyLinearPanelState(linearPanelState);
      animateLinearPointerDragVisual(elementId, nextIndex);
    }
    updateLinearPointerDrag(worldPoint);
  }

  function updateLinearPointerDrag(worldPoint) {
    if (!linearPointerDragState) return false;
    const element = board.elements.find((item) => item.id === linearPointerDragState.elementId);
    if (!isLinearStructureElement(element)) return false;
    const nextIndex = getLinearPointerIndexFromWorldPoint(element, worldPoint);
    if (!Number.isInteger(nextIndex) || nextIndex === linearPointerDragState.nextIndex) return true;
    linearPointerDragState = {
      ...linearPointerDragState,
      nextIndex,
      didMove: linearPointerDragState.didMove || nextIndex !== linearPointerDragState.fromIndex,
    };
    board.elements = board.elements.map((item) => (
      item.id === linearPointerDragState.elementId ? setArrayPointer(item, nextIndex) : item
    ));
    linearPanelState = {
      ...linearPanelState,
      highlightPointer: String(nextIndex),
    };
    applyLinearPanelState(linearPanelState);
    animateLinearPointerDragVisual(linearPointerDragState.elementId, nextIndex);
    return true;
  }

  function commitLinearPointerDrag() {
    if (!linearPointerDragState) return false;
    const dragState = linearPointerDragState;
    linearPointerDragState = null;
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

  function beginGraphConnectMode() {
    const graphId = selectedIds.find((id) => {
      const element = board.elements.find((item) => item.id === id);
      return element?.type === "graph-structure" && !element.locked;
    });
    if (!graphId) return;
    structureConnectState = { kind: "graph", elementId: graphId, sourceNodeId: null };
    renderBoard();
    selectIds([graphId]);
    setStatus("连边模式：点击源节点，再点击目标节点");
  }

  function beginTreeConnectMode() {
    const treeId = selectedIds.find((id) => {
      const element = board.elements.find((item) => item.id === id);
      return element?.type === "tree-structure" && !element.locked;
    });
    if (!treeId) return;
    structureConnectState = { kind: "tree", elementId: treeId, sourceNodeId: null };
    renderBoard();
    selectIds([treeId]);
    setStatus("连接父子：点击父节点，再点击子节点");
  }

  function handleGraphNodeClick({ elementId, nodeId }) {
    if (structureConnectState?.kind !== "graph" || structureConnectState.elementId !== elementId) {
      selectIds([elementId]);
      return;
    }
    if (!structureConnectState.sourceNodeId) {
      structureConnectState = { kind: "graph", elementId, sourceNodeId: nodeId };
      renderBoard();
      selectIds([elementId]);
      setStatus("连边模式：点击目标节点");
      return;
    }
    const sourceNodeId = structureConnectState.sourceNodeId;
    structureConnectState = null;
    board.elements = board.elements.map((item) => (
      item.id === elementId
        ? addGraphEdge(item, sourceNodeId, nodeId, { directed: item.settings?.directedDefault ?? false })
        : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已添加图边");
  }

  function handleTreeNodeClick({ elementId, nodeId }) {
    if (isTemporaryPanActive()) return;
    const clickedElement = board.elements.find((item) => item.id === elementId);
    if (isBinaryTreeElement(clickedElement)) {
      if (consumeSuppressedBinaryTreeNodeClick(elementId)) return;
      const previousActive = activeTreeNode;
      structureConnectState = null;
      activeTreeNode = { elementId, nodeId };
      selectIds([elementId]);
      syncBinaryTreeActiveVisual(previousActive?.elementId);
      syncBinaryTreeActiveVisual(elementId);
      setStatus("已选择二叉树节点");
      return;
    }
    if (structureConnectState?.kind !== "tree" || structureConnectState.elementId !== elementId) {
      const previousActive = activeTreeNode;
      activeTreeNode = { elementId, nodeId };
      selectIds([elementId]);
      syncGeneralTreeActiveVisual(previousActive?.elementId);
      syncGeneralTreeActiveVisual(elementId);
      renderTreeNodeControls();
      setStatus("已选择树节点");
      return;
    }
    if (!structureConnectState.sourceNodeId) {
      structureConnectState = { kind: "tree", elementId, sourceNodeId: nodeId };
      renderBoard();
      selectIds([elementId]);
      setStatus("连接父子：点击子节点");
      return;
    }
    const sourceNodeId = structureConnectState.sourceNodeId;
    structureConnectState = null;
    const element = board.elements.find((item) => item.id === elementId);
    const nextElement = addTreeEdge(element, sourceNodeId, nodeId);
    if (nextElement === element) {
      renderBoard();
      selectIds([elementId]);
      setStatus(element.settings?.treeKind === "binary" ? "二叉树父节点最多 2 个孩子" : "无法连接树节点");
      return;
    }
    board.elements = board.elements.map((item) => (item.id === elementId ? nextElement : item));
    renderBoard();
    selectIds([elementId]);
    syncTreeStructurePanelState();
    pushHistory("已连接树节点");
  }

  function connectGraphStructureNodes({ elementId, sourceNodeId, targetNodeId }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "graph-structure" || element.locked || !sourceNodeId || !targetNodeId) return;
    structureConnectState = null;
    board.elements = board.elements.map((item) => (
      item.id === elementId
        ? addGraphEdge(item, sourceNodeId, targetNodeId, { directed: item.settings?.directedDefault ?? false })
        : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已添加图边");
  }

  function connectTreeStructureNodes({ elementId, sourceNodeId, targetNodeId }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "tree-structure" || element.locked || !sourceNodeId || !targetNodeId) return;
    structureConnectState = null;
    const nextElement = addTreeEdge(element, sourceNodeId, targetNodeId);
    if (nextElement === element) {
      renderBoard();
      selectIds([elementId]);
      setStatus(element.settings?.treeKind === "binary" ? "二叉树父节点最多 2 个孩子" : "无法连接树节点");
      return;
    }
    board.elements = board.elements.map((item) => (item.id === elementId ? nextElement : item));
    renderBoard();
    selectIds([elementId]);
    syncTreeStructurePanelState();
    pushHistory("已连接树节点");
  }

  function editGraphStructureEdge({ elementId, edgeId, directed, weight }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    const nextWeight = promptValue("边权，留空表示无权", weight);
    const nextDirected = promptBoolean("是否有向？y/n", directed);
    board.elements = board.elements.map((item) => (
      item.id === elementId ? updateGraphEdge(item, edgeId, { weight: nextWeight, directed: nextDirected }) : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已更新图边");
  }

  function editGraphStructureNode({ elementId, nodeId, label }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    const nextLabel = promptValue("节点名称", label);
    board.elements = board.elements.map((item) => (
      item.id === elementId ? updateGraphNodeLabel(item, nodeId, nextLabel) : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已更新图节点");
  }

  function editGraphEdgeData(element) {
    const edge = element.edges?.at(-1);
    if (!edge) return element;
    return updateGraphEdge(element, edge.id, {
      weight: promptValue("边权，留空表示无权", edge.weight ?? ""),
      directed: promptBoolean("是否有向？y/n", edge.directed),
    });
  }

  function copySelectedGraphExport(format) {
    const element = board.elements.find((item) => selectedIds.includes(item.id) && item.type === "graph-structure");
    if (!element) return;
    const text = exportGraph(element, format);
    navigator.clipboard?.writeText?.(text).then(
      () => setStatus("已复制图数据"),
      () => {
        structureInput.value = text;
        setStatus("无法访问剪贴板，已写入结构输入框");
      },
    );
    if (!navigator.clipboard?.writeText) {
      structureInput.value = text;
      setStatus("已写入结构输入框");
    }
  }

  function copySelectedTreeSubtree() {
    const element = board.elements.find((item) => selectedIds.includes(item.id) && item.type === "tree-structure");
    if (!element) return;
    const text = exportTree(element);
    navigator.clipboard?.writeText?.(text).then(
      () => setStatus("已复制树边列表"),
      () => {
        structureInput.value = text;
        setStatus("无法访问剪贴板，已写入结构输入框");
      },
    );
    if (!navigator.clipboard?.writeText) {
      structureInput.value = text;
      setStatus("已写入结构输入框");
    }
  }

  function moveGraphStructureNode({ elementId, nodeId, x, y }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    board.elements = board.elements.map((item) => (
      item.id === elementId ? moveGraphNode(item, nodeId, x, y) : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已移动图节点");
  }

  function moveTreeStructureNode({ elementId, nodeId, x, y }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "tree-structure" || element.locked) return;
    if (element.settings?.treeKind === "binary") return;
    board.elements = board.elements.map((item) => (
      item.id === elementId ? moveTreeNode(item, nodeId, x, y) : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已移动树节点");
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
      activeLinearItem = null;
      renderBoard();
      selectIds([]);
      return;
    }
    board.elements = board.elements.map((item) => (
      item.id === elementId ? moveArrayItem(item, fromIndex, toIndex) : item
    ));
    activeLinearItem = null;
    renderBoard();
    selectIds([]);
    pushHistory("已移动数组元素");
  }

  function handleArrayStructureItemSelect({ elementId, index }) {
    if (isTemporaryPanActive()) return;
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    if (suppressLinearItemSelect?.elementId === elementId) {
      clearLinearItemSelectSuppression();
      return;
    }
    selectIds([elementId]);
    setActiveLinearItem(elementId, index, { rerender: false });
  }

  function handleArrayStructureItemPress({ elementId, index }) {
    if (isTemporaryPanActive()) return;
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    const worldPoint = getWorldPointer(stage);
    clearLinearItemSelectSuppression();
    suppressSelectionDragOnce = false;
    contentLayer.findOne(`#${elementId}`)?.stopDrag();
    linearItemPressState = {
      elementId,
      index,
      phase: "start",
      holdTimer: window.setTimeout(() => {
        if (!linearItemPressState || linearItemPressState.elementId !== elementId || linearItemPressState.index !== index) return;
        linearItemPressState = {
          ...linearItemPressState,
          phase: "hold",
          holdTimer: null,
        };
        beginLinearItemDrag({
          elementId,
          index,
          worldPoint: linearItemPressState.currentWorldPoint ?? linearItemPressState.startWorldPoint ?? worldPoint,
        });
      }, 250),
      startWorldPoint: worldPoint,
      currentWorldPoint: worldPoint,
    };
    setElementDraggableState(elementId, false);
  }

  function handleArrayStructureItemRelease() {
    if (linearItemDragState) return;
    resetLinearItemPressState();
  }

  function handleArrayPointerPress({ elementId, index }) {
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

  function editArrayStructureItem({ elementId, index, value }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    activeLinearItem = null;
    renderBoard();
    selectIds([]);
    requestAnimationFrame(() => editLinearStructureItemInline({ elementId, index, value }));
  }

  function editLinearStructureItemInline({ elementId, index, value }) {
    const element = board.elements.find((item) => item.id === elementId);
    const node = contentLayer.findOne(`#${elementId}`);
    if (!isLinearStructureElement(element) || !node) return;
    const itemNode = findLinearItemNode(node, index);
    if (!itemNode) return;

    const valueRect = itemNode.findOne(".array-item-value-hit");
    if (!valueRect) return;
    const absolute = valueRect.getAbsolutePosition();
    const scale = stage.scaleX() * (node.scaleX() || 1);
    const box = stage.container().getBoundingClientRect();
    const input = document.createElement("input");
    input.className = "cell-editor";
    input.value = value;
    input.style.left = `${box.left + absolute.x}px`;
    input.style.top = `${box.top + absolute.y}px`;
    input.style.width = `${valueRect.width() * scale}px`;
    input.style.height = `${valueRect.height() * scale}px`;
    input.style.fontSize = `${20 * scale}px`;
    document.body.appendChild(input);
    input.focus();
    input.select();

    let closed = false;
    const close = (commit) => {
      if (closed) return;
      closed = true;
      const nextValue = input.value;
      window.removeEventListener("pointerdown", handleCellEditorOutsidePointerDown, { capture: true });
      input.remove();
      if (!commit) return;
      board.elements = board.elements.map((item) => (
        item.id === elementId ? updateArrayItemValue(item, index, nextValue) : item
      ));
      renderBoard();
      selectIds([elementId]);
      setActiveLinearItem(elementId, index);
      pushHistory("已更新线性结构元素");
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });
    input.addEventListener("blur", () => close(true));

    const handleCellEditorOutsidePointerDown = (event) => {
      if (closed) return;
      if (input.contains(event.target)) return;
      suppressNextCanvasSelection = container.contains(event.target);
      close(true);
    };
    window.addEventListener("pointerdown", handleCellEditorOutsidePointerDown, { capture: true });
  }

  function getLinearItemNodeIndex(node) {
    const linearIndex = node?.getAttr?.("linearIndex");
    return Number.isInteger(linearIndex) ? linearIndex : 0;
  }

  function findLinearItemNode(group, index) {
    return group?.find(".array-item")?.find((node) => getLinearItemNodeIndex(node) === index) ?? null;
  }

  function findTreeNodeGroup(group, nodeId) {
    if (!group || !nodeId) return null;
    return group.find(".tree-node").find((node) => node.getAttr("treeNodeId") === nodeId) ?? null;
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

  function editTreeStructureNode({ elementId, nodeId, label }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "tree-structure" || element.locked) return;
    renderBoard();
    selectIds([elementId]);
    requestAnimationFrame(() => editTreeStructureNodeInline({ elementId, nodeId, label }));
  }

  function editTreeStructureNodeInline({ elementId, nodeId, label }) {
    const element = board.elements.find((item) => item.id === elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!element || element.type !== "tree-structure" || !group) return;
    const treeNode = findTreeNodeGroup(group, nodeId);
    if (!treeNode) return;

    const style = element.style ?? {};
    const radius = Number(style.nodeRadius) || 24;
    const absolute = treeNode.getAbsolutePosition();
    const scale = stage.scaleX() * (group.scaleX() || 1);
    const box = stage.container().getBoundingClientRect();
    const input = document.createElement("input");
    input.className = "cell-editor";
    input.value = label;
    input.style.left = `${box.left + absolute.x - radius * scale}px`;
    input.style.top = `${box.top + absolute.y - radius * scale}px`;
    input.style.width = `${radius * 2 * scale}px`;
    input.style.height = `${radius * 2 * scale}px`;
    input.style.borderRadius = "999px";
    input.style.textAlign = "center";
    input.style.fontSize = `${19 * scale}px`;
    document.body.appendChild(input);
    input.focus();
    input.select();

    let closed = false;
    const close = (commit) => {
      if (closed) return;
      closed = true;
      const nextValue = input.value;
      window.removeEventListener("pointerdown", handleTreeEditorOutsidePointerDown, { capture: true });
      input.remove();
      if (!commit) return;
      board.elements = board.elements.map((item) => (
        item.id === elementId ? updateTreeNodeValue(item, nodeId, nextValue) : item
      ));
      activeTreeNode = { elementId, nodeId };
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已更新树节点");
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });
    input.addEventListener("blur", () => close(true));

    const handleTreeEditorOutsidePointerDown = (event) => {
      if (closed) return;
      if (input.contains(event.target)) return;
      suppressNextCanvasSelection = container.contains(event.target);
      close(true);
    };
    window.addEventListener("pointerdown", handleTreeEditorOutsidePointerDown, { capture: true });
  }

  function getActiveTreeNodeId(element) {
    if (activeTreeNode?.elementId === element.id) return activeTreeNode.nodeId;
    return element.settings?.rootId ?? element.nodes?.[0]?.id ?? null;
  }

  function bringSelectionToFront() {
    if (selectedIds.length === 0) return;
    const selected = [];
    const rest = [];
    for (const element of board.elements) {
      (selectedIds.includes(element.id) ? selected : rest).push(element);
    }
    board.elements = reorderElements([...rest, ...selected]);
    renderBoard();
    pushHistory("已置顶对象");
  }

  function bringSelectionForward() {
    moveSelectionByLayer(1, "已上移对象");
  }

  function groupSelection() {
    if (selectedIds.length < 2) return;
    const groupId = createId("group");
    board.elements = board.elements.map((element) => (
      selectedIds.includes(element.id) && !element.locked ? { ...element, groupId } : element
    ));
    renderBoard();
    pushHistory("已分组对象");
  }

  function ungroupSelection() {
    if (selectedIds.length === 0) return;
    const groupIds = new Set(
      board.elements
        .filter((element) => selectedIds.includes(element.id) && element.groupId)
        .map((element) => element.groupId),
    );
    if (groupIds.size === 0) return;
    board.elements = board.elements.map((element) => (
      groupIds.has(element.groupId) && !element.locked ? { ...element, groupId: undefined } : element
    ));
    renderBoard();
    pushHistory("已取消分组");
  }

  function toggleSelectionLock() {
    if (selectedIds.length === 0) return;
    const selectedElements = board.elements.filter((element) => selectedIds.includes(element.id));
    const shouldLock = selectedElements.some((element) => !element.locked);
    board.elements = board.elements.map((element) => (
      selectedIds.includes(element.id) ? { ...element, locked: shouldLock } : element
    ));
    renderBoard();
    pushHistory(shouldLock ? "已锁定对象" : "已解锁对象");
  }

  function sendSelectionToBack() {
    if (selectedIds.length === 0) return;
    const selected = [];
    const rest = [];
    for (const element of board.elements) {
      (selectedIds.includes(element.id) ? selected : rest).push(element);
    }
    board.elements = reorderElements([...selected, ...rest]);
    renderBoard();
    pushHistory("已置底对象");
  }

  function sendSelectionBackward() {
    moveSelectionByLayer(-1, "已下移对象");
  }

  function moveSelectionByLayer(direction, historyLabel) {
    if (selectedIds.length === 0) return;
    const previousOrder = board.elements.map((element) => element.id).join("\n");
    board.elements = moveElementsByLayer(board.elements, selectedIds, direction);
    const nextOrder = board.elements.map((element) => element.id).join("\n");
    if (previousOrder === nextOrder) return;
    renderBoard();
    pushHistory(historyLabel);
  }

  function clearBoard() {
    if (board.elements.length === 0) return;
    board.elements = [];
    clearSelection();
    renderBoard();
    pushHistory("已清空白板");
  }

  function undoHistory() {
    restoreFromHistory(history.undo(), "已撤销");
  }

  function redoHistory() {
    restoreFromHistory(history.redo(), "已重做");
  }

  function fitContent() {
    if (board.elements.length === 0) {
      setStatus("当前白板没有可适配的内容");
      return;
    }

    const bounds = getContentBounds();
    if (!bounds) return;

    applyViewport(computeFitViewport({
      bounds,
      stageSize: {
        width: stage.width(),
        height: stage.height(),
      },
      padding: 96,
    }));
    board = serializeCurrentBoard();
    history.push(board);
    dirty = true;
    updateChrome();
    setStatus("已适配全部内容");
  }

  function getContentBounds() {
    const boxes = contentLayer
      .find(".element")
      .map((node) => node.getClientRect({ relativeTo: contentLayer }))
      .filter((box) => Number.isFinite(box.x) && Number.isFinite(box.y) && box.width > 0 && box.height > 0);

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

  function ensureSelectionVisible() {
    const bounds = getSelectedContentBounds();
    if (!bounds) return;

    const nextViewport = computeViewportForBoundsVisibility({
      bounds,
      viewport: {
        x: stage.x(),
        y: stage.y(),
        scale: stage.scaleX(),
      },
      stageSize: {
        width: stage.width(),
        height: stage.height(),
      },
      padding: 96,
    });

    if (nextViewport.x === stage.x() && nextViewport.y === stage.y() && nextViewport.scale === stage.scaleX()) {
      return;
    }
    applyViewport(nextViewport);
    board = serializeCurrentBoard();
    dirty = true;
    updateChrome();
  }

  function getSelectedContentBounds() {
    const boxes = selectedIds
      .map((id) => contentLayer.findOne(`#${id}`))
      .filter(Boolean)
      .map((node) => node.getClientRect({ relativeTo: contentLayer }))
      .filter((box) => Number.isFinite(box.x) && Number.isFinite(box.y) && box.width > 0 && box.height > 0);

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

  function newBoard() {
    board = createEmptyBoard();
    history = createHistory(board);
    selectedIds = [];
    fileHandle = null;
    activeFileName = "未命名白板";
    dirty = false;
    applyViewport(board.viewport);
    applyBackground();
    renderBoard();
    updateChrome();
    clearLocalDraft();
    setStatus("已新建白板");
  }

  function resetView() {
    applyViewport({ x: 0, y: 0, scale: 1 });
    board = serializeCurrentBoard();
    history.push(board);
    dirty = true;
    const draftSaved = persistCurrentDraft();
    updateChrome();
    if (draftSaved) setStatus("已重置视图");
  }

  function setBackgroundMode(backgroundMode) {
    if (!["dots", "plain"].includes(backgroundMode)) return;
    if (board.canvas.backgroundMode === backgroundMode) {
      closeMainMenu();
      return;
    }

    board.canvas.backgroundMode = backgroundMode;
    applyBackground();
    pushHistory(backgroundMode === "dots" ? "已切换为点阵背景" : "已切换为纯白背景");
    closeMainMenu();
  }

  function setTool(tool) {
    const toolChanged = currentTool !== tool;
    currentTool = tool;
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
      resetPropertyControlsForTool(tool);
      syncInspectorPanelState({ forceReset: true });
    }
    updateChrome();
    setStatus(getToolStatus(tool));
  }

  function getToolStatus(tool) {
    return {
      [TOOLS.SELECT]: "选择：拖动框选，Shift 多选，Delete 删除",
      [TOOLS.PAN]: "平移：拖动画布",
      [TOOLS.PEN]: "画笔：拖动画出可编辑笔触",
      [TOOLS.ERASER_STROKE]: "片段橡皮：擦除笔触的一部分",
      [TOOLS.ERASER_OBJECT]: "对象橡皮：碰到对象即删除",
      [TOOLS.TEXT]: "文字：点击画布添加文字",
      [TOOLS.STICKY]: "便签：点击画布添加便签",
      [TOOLS.STRUCTURE]: "结构：选择数组、图或树并填写初始内容",
      [TOOLS.SHAPE]: "图形：从弹出框选择矩形、椭圆、直线或箭头",
      [TOOLS.RECT]: "矩形：拖动创建",
      [TOOLS.ELLIPSE]: "椭圆：拖动创建",
      [TOOLS.LINE]: "直线：拖动创建",
      [TOOLS.ARROW]: "箭头：拖动创建",
    }[tool];
  }

  function editTextElement(id) {
    const element = board.elements.find((item) => item.id === id);
    const node = contentLayer.findOne(`#${id}`);
    if (!element || !node) return;

    isEditingText = true;
    textOverlayController.setHiddenIds([id]);
    transformer.hide();
    contentLayer.draw();

    const editorFrame = document.createElement("div");
    editorFrame.className = "text-editor-frame";
    const textarea = document.createElement("textarea");
    textarea.className = "text-editor";
    textarea.rows = 1;
    textarea.value = element.text;
    editorFrame.appendChild(textarea);
    const measureTextarea = document.createElement("textarea");
    measureTextarea.className = "text-editor text-editor-measure";
    measureTextarea.tabIndex = -1;
    measureTextarea.rows = 1;
    measureTextarea.value = element.text;
    document.body.appendChild(measureTextarea);
    const originalText = element.text;
    document.body.appendChild(editorFrame);

    const box = stage.container().getBoundingClientRect();
    const absolute = node.getAbsolutePosition();
    const stageScale = stage.scaleX();
    const scale = stageScale * (node.scaleX() || 1);
    const editorPadding = Number(element.padding ?? 6);
    const horizontalPadding = editorPadding * scale;
    const minEditorWidth = getMinimumTextResizeWidth(element.fontSize) * scale + horizontalPadding * 2;
    const minEditorHeight = getSingleLineTextEditorHeight(element.fontSize, scale);
    const editorWidth = Math.max(minEditorWidth, node.width() * scale);
    const editorHeight = Math.max(minEditorHeight, (node.height?.() || element.height || element.fontSize * 1.25) * scale);
    const minLiveEditorWidth = element.type === "sticky" ? editorWidth : minEditorWidth;
    const minLiveEditorHeight = element.type === "sticky" ? editorHeight : minEditorHeight;
    const maxAutoEditorWidth = editorWidth;
    let hasManualEditorResize = false;

    const getEditorWidth = () => Math.max(minEditorWidth, editorFrame.offsetWidth || editorWidth);
    const applyNodeSizeFromEditor = () => {
      const nextWidth = editorFrame.offsetWidth / scale;
      const nextHeight = editorFrame.offsetHeight / scale;
      if (element.type === "text") {
        syncTextNodeSize(node, {
          width: nextWidth,
          height: nextHeight,
          padding: editorPadding,
        });
        return;
      }
      node.width(nextWidth);
      node.height(nextHeight);
    };

    const measureTextHeight = (width = getEditorWidth()) => {
      const currentFontSize = Number.parseFloat(textarea.style.fontSize) || element.fontSize * scale;
      return measureTextareaContentHeight({
        sourceTextarea: textarea,
        measureTextarea,
        width: Math.max(minEditorWidth, width),
        minHeight: currentFontSize * 1.25,
      }) + 2 * scale;
    };

    const setEditorSize = (width, height = measureTextHeight(width)) => {
      const nextWidth = Math.max(minLiveEditorWidth, width);
      const nextHeight = Math.max(minLiveEditorHeight, height);
      editorFrame.style.width = `${nextWidth}px`;
      editorFrame.style.height = `${nextHeight}px`;
    };

    const getTextLineWidth = (line) => {
      const context = getTextMeasureContext();
      const fontWeight = hasFontStyle(element.fontStyle, "bold") ? "700" : "400";
      const fontStyle = hasFontStyle(element.fontStyle, "italic") ? "italic" : "normal";
      context.font = `${fontStyle} ${fontWeight} ${element.fontSize * scale}px ${element.fontFamily}`;
      return context.measureText(line || " ").width;
    };

    const fitEditorToContent = () => {
      const lines = textarea.value.split("\n");
      const contentWidth = Math.max(...lines.map(getTextLineWidth));
      const canAutoFitWidth = !hasManualEditorResize && !originalText;
      const nextWidth = element.type !== "sticky" && canAutoFitWidth && textarea.value
        ? Math.min(maxAutoEditorWidth, Math.max(minEditorWidth, Math.ceil(contentWidth + horizontalPadding * 2 + 1)))
        : getEditorWidth();
      setEditorSize(nextWidth);
      applyNodeSizeFromEditor();
      if (["text", "sticky"].includes(element.type)) {
        syncTextNodeContent(node, {
          ...element,
          text: textarea.value,
          width: editorFrame.offsetWidth / scale,
          height: editorFrame.offsetHeight / scale,
        }, { renderLatex: false });
      }
      transformer.forceUpdate();
      overlayLayer.batchDraw();
    };

    editorFrame.style.left = `${box.left + absolute.x}px`;
    editorFrame.style.top = `${box.top + absolute.y}px`;
    setEditorSize(editorWidth, editorHeight);
    editorFrame.style.minWidth = `${minEditorWidth}px`;
    editorFrame.style.minHeight = `${minEditorHeight}px`;
    Object.assign(textarea.style, getTextEditorStyle({ element, scale, horizontalPadding }));
    if (element.type === "sticky") {
      const stickyFill = node.findOne?.("Rect")?.fill?.() ?? element.fill;
      const stickyInsets = getStickyTextInsets(element.fontSize);
      editorFrame.classList.add("is-sticky-editor");
      editorFrame.style.borderColor = getStickyBorderColor(stickyFill);
      textarea.style.padding = `${stickyInsets.y * scale}px ${stickyInsets.x * scale}px`;
    }
    editorFrame.style.transform = `rotate(${node.getAbsoluteRotation()}deg)`;
    applyNodeSizeFromEditor();
    syncTextNodeContent(node, {
      ...element,
      width: editorFrame.offsetWidth / scale,
      height: editorFrame.offsetHeight / scale,
    }, { renderLatex: false });
    transformer.nodes([node]);
    transformer.visible(true);
    transformer.resizeEnabled(true);
    transformer.rotateEnabled(true);
    transformer.enabledAnchors(getTransformerAnchorsForSelection([element], true));
    const previousBoundBoxFunc = transformer.boundBoxFunc();
    const previousAnchorDragBoundFunc = transformer.anchorDragBoundFunc();
    transformer.anchorDragBoundFunc((oldAbsPos, newAbsPos) => {
      return clampTransformerAnchorDragBySize(oldAbsPos, newAbsPos, {
        minWidth: minEditorWidth,
        minHeight: minEditorHeight,
      });
    });
    transformer.boundBoxFunc((oldBox, newBox) => {
      if (!Number.isFinite(newBox.width) || !Number.isFinite(newBox.height)) return oldBox;
      const anchor = transformer.getActiveAnchor?.();
      const nextBox = getUniformScaledBoxForResize({
        elements: [element],
        anchor,
        oldBox,
        newBox,
        minWidth: minEditorWidth,
        minHeight: minEditorHeight,
      });
      if (nextBox.width < minEditorWidth) {
        if (anchor?.includes("left")) nextBox.x = oldBox.x + oldBox.width - minEditorWidth;
        nextBox.width = minEditorWidth;
      }
      if (nextBox.height < minEditorHeight) {
        if (anchor?.includes("top")) nextBox.y = oldBox.y + oldBox.height - minEditorHeight;
        nextBox.height = minEditorHeight;
      }
      return nextBox;
    });
    transformer.forceUpdate();
    overlayLayer.batchDraw();
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    let editorClosed = false;
    const handleEditorOutsidePointerDown = (event) => {
      if (editorClosed) return;
      if (editorFrame.contains(event.target)) return;
      if (isTransformerTarget(event.target)) return;
      commit();
    };

    const cleanupEditorTransformer = () => {
      window.removeEventListener("pointerdown", handleEditorOutsidePointerDown, { capture: true });
      transformer.off(".editor");
      transformer.boundBoxFunc(previousBoundBoxFunc);
      transformer.anchorDragBoundFunc(previousAnchorDragBoundFunc);
    };

    const applyCommittedTextToNode = (nextElement) => {
      syncTextNodeContent(node, nextElement);
      node.scaleX(1);
      node.scaleY(1);
    };

    const commit = ({ keepNode = false } = {}) => {
      if (editorClosed) return;
      editorClosed = true;
      isEditingText = false;
      activeTextEditorCommit = null;
      textOverlayController.setHiddenIds([]);
      const nextText = textarea.value.trim();
      const committedWidth = editorFrame.offsetWidth;
      const committedHeight = editorFrame.offsetHeight;
      editorFrame.remove();
      measureTextarea.remove();
      cleanupEditorTransformer();

      if (!nextText && element.type !== "sticky") {
        board.elements = removeElementsById(board.elements, [id]);
        selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
        transformer.show();
        renderBoard();
        pushHistory("已删除空文字");
        return;
      }

      let committedElement = null;
      board.elements = board.elements.map((item) => {
        if (item.id !== id) return item;
        const nextFontSize = item.fontSize;
        const nextElement = {
          ...item,
          text: nextText,
          fontSize: nextFontSize,
          scaleX: 1,
          scaleY: 1,
        };
        if (item.type === "text") {
          committedElement = normalizeTextElementBox({
            ...nextElement,
            width: Math.max(getMinimumTextResizeWidth(nextFontSize) + editorPadding * 2, committedWidth / scale),
            height: Math.max(nextFontSize * 1.25, committedHeight / scale),
          });
          return committedElement;
        }
        if (item.type === "sticky") {
          const stickyBox = getStickyEditorCommitBox({
            committedWidth,
            committedHeight,
            stageScale,
          });
          nextElement.width = Math.max(element.width, stickyBox.width);
          nextElement.height = Math.max(element.height, stickyBox.height);
          committedElement = nextElement;
        }
        return nextElement;
      });
      transformer.show();
      if (keepNode && committedElement) {
        if (!selectedIds.includes(id)) selectedIds = [id];
        applyCommittedTextToNode(committedElement);
        node.show();
        transformer.nodes([node]);
        transformer.forceUpdate();
        contentLayer.batchDraw();
        overlayLayer.batchDraw();
        pushHistory("已编辑文字");
        return;
      }
      renderBoard();
      pushHistory("已编辑文字");
    };
    activeTextEditorCommit = () => commit();
    window.addEventListener("pointerdown", handleEditorOutsidePointerDown, { capture: true });

    const exitEditorForTransform = () => {
      commit({ keepNode: true });
    };

    transformer.on("transformstart.editor dragstart.editor", exitEditorForTransform);

    const cancel = () => {
      if (editorClosed) return;
      editorClosed = true;
      isEditingText = false;
      if (activeTextEditorCommit) activeTextEditorCommit = null;
      textOverlayController.setHiddenIds([]);
      editorFrame.remove();
      measureTextarea.remove();
      cleanupEditorTransformer();

      if (!originalText && element.type !== "sticky") {
        board.elements = removeElementsById(board.elements, [id]);
        selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
        transformer.show();
        renderBoard();
        pushHistory("已取消空文字");
        return;
      }

      node.show();
      transformer.show();
      renderBoard();
    };

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        commit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    });
    textarea.addEventListener("input", fitEditorToContent);
    textarea.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!transformer.isTransforming?.()) commit();
      });
    });
  }

  async function openBoardFile() {
    if (!supportsFileSystemAccess()) {
      setStatus("当前浏览器不支持原地打开保存，请使用 Chrome 或 Edge");
      return;
    }

    try {
      const { handle, name, contents } = await openWhiteboardFile();
      board = normalizeBoard(contents);
      fileHandle = handle;
      activeFileName = name;
      history = createHistory(board);
      selectedIds = [];
      applyViewport(board.viewport);
      applyBackground();
      renderBoard();
      dirty = false;
      const draftSaved = persistCurrentDraft();
      updateChrome();
      if (draftSaved) setStatus("已打开白板文件");
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus(`打开失败：${error.message}`);
      }
    }
  }

  async function importSelectedImage() {
    const file = imageInput.files?.[0];
    imageInput.value = "";
    if (!file) return;
    await insertImageFile(file, "已导入图片", { preferViewportCenter: true });
  }

  async function handlePaste(event) {
    if (isTypingInEditableControl(event.target)) return;
    const file = getImageFileFromPasteEvent(event);
    if (!file) {
      const text = getTextFromPasteEvent(event);
      if (text) {
        event.preventDefault();
        insertTextElement(text, "已粘贴文字");
        return;
      }
      if (clipboardSnapshot.length === 0) return;
      event.preventDefault();
      pasteClipboard();
      return;
    }
    event.preventDefault();
    await insertImageFile(file, "已粘贴图片");
  }

  function handleImageDragOver(event) {
    event.preventDefault();
  }

  async function handleImageDrop(event) {
    const file = getImageFileFromDropEvent(event);
    const text = getTextFromDropEvent(event);
    event.preventDefault();
    stage.setPointersPositions(event);
    const worldPoint = getWorldPointer(stage);
    if (worldPoint) {
      lastPointerWorldPoint = worldPoint;
    }
    if (!file) {
      if (text) {
        insertTextElement(text, "已拖入文字");
        return;
      }
      setStatus("只支持拖入图片文件");
      return;
    }
    await insertImageFile(file, "已拖入图片");
  }

  function insertTextElement(text, message) {
    const point = lastPointerWorldPoint ?? {
      x: (stage.width() / 2 - stage.x()) / stage.scaleX(),
      y: (stage.height() / 2 - stage.y()) / stage.scaleX(),
    };
    const context = getTextMeasureContext();
    const { fontSize, fontFamily, fontStyle } = DEFAULT_TEXT_STYLE;
    const fontWeight = hasFontStyle(fontStyle, "bold") ? "700" : "400";
    const fontSlant = hasFontStyle(fontStyle, "italic") ? "italic" : "normal";
    context.font = `${fontSlant} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const element = buildTextElement({
      point,
      zIndex: board.elements.length,
      text,
      measureText: (value) => context.measureText(value || " ").width,
    });
    addElement(element, message);
    setTool(TOOLS.SELECT);
    selectIds([element.id]);
  }

  async function insertImageFile(file, message, { preferViewportCenter = false } = {}) {
    try {
      const src = await readFileAsDataUrl(file);
      const size = await readImageSize(src);
      const point = getImageInsertPoint(lastPointerWorldPoint, {
        width: stage.width(),
        height: stage.height(),
      }, {
        x: stage.x(),
        y: stage.y(),
        scale: stage.scaleX(),
      }, { preferViewportCenter });
      const element = buildImageElement({
        point,
        src,
        width: size.width,
        height: size.height,
        zIndex: board.elements.length,
        anchor: preferViewportCenter ? "center" : "top-left",
      });
      addElement(element, message);
      setTool(TOOLS.SELECT);
      selectIds([element.id]);
    } catch (error) {
      setStatus(`图片处理失败：${error.message}`);
    }
  }

  async function saveBoardFile() {
    if (!supportsFileSystemAccess()) {
      setStatus("当前浏览器不支持原地保存，请使用 Chrome 或 Edge");
      return;
    }

    if (!fileHandle) {
      await saveBoardFileAs();
      return;
    }

    try {
      await writeToHandle(fileHandle);
      dirty = false;
      updateChrome();
      setStatus("已保存到当前白板文件");
    } catch (error) {
      setStatus(`保存失败：${error.message}`);
    }
  }

  async function saveBoardFileAs() {
    if (!supportsFileSystemAccess()) {
      setStatus("当前浏览器不支持另存为，请使用 Chrome 或 Edge");
      return;
    }

    try {
      const handle = await chooseWhiteboardSaveFile(activeFileName);
      fileHandle = handle;
      activeFileName = handle.name;
      await writeToHandle(handle);
      dirty = false;
      updateChrome();
      setStatus("已另存为白板文件");
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus(`另存为失败：${error.message}`);
      }
    }
  }

  async function writeToHandle(handle) {
    await writeWhiteboardFile(handle, serializeCurrentBoard());
  }

  function exportPng() {
    const backgroundNodes = createExportBackground({
      stage,
      contentLayer,
      backgroundMode: board.canvas.backgroundMode,
    });
    selectionRect.visible(false);
    transformer.visible(false);
    contentLayer.draw();
    overlayLayer.draw();

    const dataUrl = stage.toDataURL({
      pixelRatio: 2,
      mimeType: "image/png",
    });
    backgroundNodes.forEach((node) => node.destroy());
    syncSelectionNodes();
    syncSelectionNodes();
    contentLayer.draw();
    overlayLayer.draw();

    downloadDataUrl({
      dataUrl,
      fileName: `${activeFileName.replace(/\.lofibrd$/i, "") || "lofiBoard"}.png`,
    });
    setStatus("已导出当前视图 PNG");
  }

  function serializeCurrentBoard() {
    return serializeBoard(board, {
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX(),
    });
  }

  function snapshotBoard() {
    return serializeCurrentBoard();
  }

  function pushHistory(message) {
    board = serializeCurrentBoard();
    history.push(board);
    dirty = true;
    const draftSaved = persistCurrentDraft();
    updateChrome();
    if (suppressNextTextHistory) {
      suppressNextTextHistory = false;
      return;
    }
    if (draftSaved) setStatus(message);
  }

  function restoreFromHistory(nextBoard, message) {
    if (!nextBoard) return;
    board = normalizeBoard(nextBoard);
    selectedIds = [];
    applyViewport(board.viewport);
    applyBackground();
    renderBoard();
    dirty = true;
    const draftSaved = persistCurrentDraft();
    updateChrome();
    if (draftSaved) setStatus(message);
  }

  function persistCurrentDraft() {
    if (draftSaveTimer) {
      window.clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    if (activeTextEditorCommit) {
      suppressNextTextHistory = true;
      activeTextEditorCommit();
    }
    const result = saveLocalDraft(serializeCurrentBoard());
    if (!result.ok) {
      setStatus("自动草稿保存失败");
      return false;
    }
    return true;
  }

  function schedulePersistCurrentDraft() {
    if (draftSaveTimer) window.clearTimeout(draftSaveTimer);
    draftSaveTimer = window.setTimeout(() => {
      draftSaveTimer = null;
      persistCurrentDraft();
    }, 150);
  }

  function applyViewport(viewport) {
    stage.position({ x: viewport.x, y: viewport.y });
    stage.scale({ x: viewport.scale, y: viewport.scale });
    updateGrid();
    updateBrushCursorStyle();
    updateEraserCursorStyle();
    syncTextOverlays();
  }

  function applyBackground() {
    container.dataset.background = board.canvas.backgroundMode;
    updateGrid();
  }

  function updateGrid() {
    const scale = stage.scaleX();
    const size = Math.max(12, 32 * scale);
    container.style.setProperty("--grid-size", `${size}px`);
    container.style.setProperty("--grid-x", `${stage.x()}px`);
    container.style.setProperty("--grid-y", `${stage.y()}px`);
    updateLinearItemControlsPosition();
    syncTextOverlays();
  }

  function updateViewportChrome() {
    zoomLabel.textContent = `${Math.round(stage.scaleX() * 100)}%`;
    root.querySelectorAll("[data-zoom-level]").forEach((button) => {
      button.classList.toggle(
        "active",
        Math.abs(Number(button.dataset.zoomLevel) - stage.scaleX()) < 0.02,
      );
    });
    updateContextPanel();
  }

  function updateChrome() {
    panelCollapsedState = getPanelStateForLayerContent(panelCollapsedState, board.elements.length > 0);
    const dirtyMarker = dirty ? " *" : "";
    activeFileLabel.textContent = `${activeFileName}${dirtyMarker}`;
    zoomLabel.textContent = `${Math.round(stage.scaleX() * 100)}%`;
    root.dataset.hasSelection = selectedIds.length > 0 ? "true" : "false";
    const selectedStructures = board.elements.filter((element) => selectedIds.includes(element.id) && element.type.endsWith?.("-structure"));
    root.dataset.structureSelection = selectedStructures.length === 1 ? selectedStructures[0].type : "none";
    root.querySelectorAll("[data-background-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.backgroundMode === board.canvas.backgroundMode);
    });
    root.querySelectorAll("[data-shape-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.shapeTool === activeShapeTool);
    });
    root.dataset.activeShape = selectedIds.length === 1
      ? board.elements.find((element) => element.id === selectedIds[0])?.type ?? activeShapeTool
      : activeShapeTool;
    root.querySelectorAll("[data-structure-type]").forEach((button) => {
      button.classList.toggle("active", button.dataset.structureType === activeStructureType);
    });
    root.querySelectorAll("[data-zoom-level]").forEach((button) => {
      button.classList.toggle(
        "active",
        Math.abs(Number(button.dataset.zoomLevel) - stage.scaleX()) < 0.02,
      );
    });
    syncLinearPanelState();
    syncGraphStructurePanelState();
    syncTreeStructurePanelState();
    syncInspectorPanelState();
    syncBrushPresetButtons();
    updateLayerPanelAvailability();
    renderLayerPanel();
    updateContextPanel();
  }

  function syncTreeStructurePanelState() {
    if (!treeStructureInput) return;
    const element = board.elements.find((item) => selectedIds.includes(item.id) && item.type === "tree-structure");
    if (document.activeElement !== treeStructureInput) {
      treeStructureInput.value = element ? exportTree(element) : "";
    }
    root.dataset.treeKind = element?.settings?.treeKind === "binary" ? "binary" : "general";
  }

  function syncGraphStructurePanelState() {
    if (!graphStructureInput) return;
    const element = board.elements.find((item) => selectedIds.includes(item.id) && item.type === "graph-structure");
    if (document.activeElement !== graphStructureInput) {
      graphStructureInput.value = element ? exportGraph(element, "edge-list") : "";
      graphStructureDraft = graphStructureInput.value;
    }
  }

  function updateLayerPanelAvailability() {
    layerPanelAvailable = isLayerPanelAvailable();
    layerPanel.hidden = !layerPanelAvailable;
    applyPanelState();
  }

  function renderLayerPanel() {
    const orderedElements = reorderElements(board.elements);
    const layerLevels = new Map(orderedElements.map((element, index) => [element.id, index]));
    const elements = orderedElements.slice().reverse();
    layerList.innerHTML = elements.map((element) => {
      const active = selectedIds.includes(element.id) ? " active" : "";
      const label = getElementLabel(element);
      const meta = [
        element.locked ? "锁定" : "",
        element.groupId ? "分组" : "",
      ].filter(Boolean).join(" · ");
      const level = layerLevels.get(element.id) ?? 0;
      return `
        <button type="button" class="layer-item${active}" data-layer-id="${element.id}" data-layer-level="${level}" title="${escapeHtml(label)}">
          <span class="layer-label">${escapeHtml(label)}</span>
          <span class="layer-meta">${escapeHtml(meta)}</span>
        </button>
      `;
    }).join("");
  }

  function getElementLabel(element) {
    const labels = {
      stroke: "笔触",
      text: element.text ? `文字：${truncateWithEllipsis(element.text, 10)}` : "文字",
      sticky: element.text ? `便签：${truncateWithEllipsis(element.text, 10)}` : "便签",
      image: "图片",
      rect: "矩形",
      ellipse: "椭圆",
      line: "直线",
      arrow: "箭头",
      "coordinate-plane": "坐标系",
      "array-structure": `数组：${element.items?.length ?? 0} 项`,
      "stack-structure": `栈：${element.items?.length ?? 0} 项`,
      "queue-structure": `队列：${element.items?.length ?? 0} 项`,
      "deque-structure": `双端队列：${element.items?.length ?? 0} 项`,
      "graph-structure": `图：${element.nodes?.length ?? 0} 点 ${element.edges?.length ?? 0} 边`,
      "tree-structure": `树：${element.nodes?.length ?? 0} 节点`,
    };
    return labels[element.type] ?? element.type;
  }

  function syncPropertyPanelTitle(selectedElements = []) {
    if (!stylePanelTitle) return;
    stylePanelTitle.textContent = getPropertyPanelTitle(selectedElements);
  }

  function getPropertyPanelTitle(selectedElements) {
    if (selectedElements.length !== 1) return "属性";
    const element = selectedElements[0];
    if (element.type === "tree-structure") return element.settings?.treeKind === "binary" ? "二叉树" : "树";
    const elementTitles = {
      stroke: "画笔",
      text: "文字",
      sticky: "便签",
      image: "图片",
      rect: "矩形",
      ellipse: "椭圆",
      line: "直线",
      arrow: "箭头",
      "coordinate-plane": "坐标系",
      "array-structure": "数组",
      "stack-structure": "栈",
      "queue-structure": "队列",
      "deque-structure": "双端队列",
      "graph-structure": "图",
    };
    return elementTitles[element.type] ?? "属性";
  }

  function syncToolPropertyPanelTitle() {
    if (!stylePanelTitle) return;
    const toolTitles = {
      [TOOLS.PEN]: "画笔",
      [TOOLS.SHAPE]: getShapeToolTitle(activeShapeTool),
      [TOOLS.RECT]: "矩形",
      [TOOLS.ELLIPSE]: "椭圆",
      [TOOLS.LINE]: "直线",
      [TOOLS.ARROW]: "箭头",
      [TOOLS.COORDINATE_PLANE]: "坐标系",
    };
    stylePanelTitle.textContent = toolTitles[currentTool] ?? "属性";
  }

  function getShapeToolTitle(shapeTool) {
    return {
      [TOOLS.RECT]: "矩形",
      [TOOLS.ELLIPSE]: "椭圆",
      [TOOLS.LINE]: "直线",
      [TOOLS.ARROW]: "箭头",
      [TOOLS.COORDINATE_PLANE]: "坐标系",
    }[shapeTool] ?? "图形";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function getTokenSet(value) {
    return new Set(String(value ?? "").split(/\s+/).filter((token) => token && token !== "normal" && token !== "none"));
  }

  function formatTokens(tokens, fallback = "") {
    return Array.from(tokens).join(" ") || fallback;
  }

  function hasFontStyle(value, token) {
    return getTokenSet(value).has(token);
  }

  function hasTextDecoration(value, token) {
    return getTokenSet(value).has(token);
  }

  function toggleFontStyleToken(value, token) {
    const tokens = getTokenSet(value);
    if (tokens.has(token)) {
      tokens.delete(token);
    } else {
      tokens.add(token);
    }
    return formatTokens(tokens, "normal");
  }

  function toggleTextDecorationToken(value, token) {
    const tokens = getTokenSet(value);
    if (tokens.has(token)) {
      tokens.delete(token);
    } else {
      tokens.add(token);
    }
    return formatTokens(tokens);
  }

  function updateContextPanel() {
    const selectedElements = board.elements.filter((element) => selectedIds.includes(element.id));
    const first = selectedElements[0];

    if (first) {
      const hydrateSource = getSelectionHydrateSource(selectedElements) ?? first;
      hydrateControlsFromElement(hydrateSource);
      const capabilities = getSelectionInspectorCapabilities(selectedElements);
      syncSelectionInspectorDataset(capabilities);
      const mode = selectedElements.length > 1
        ? "multi"
        : selectedElements.every((element) => element.type === "text")
        ? "text"
        : selectedElements.every((element) => element.type === "sticky")
          ? "sticky"
          : selectedElements.every((element) => element.type === "stroke")
            ? "brush"
          : selectedElements.every((element) => ["line", "arrow", "stroke"].includes(element.type))
            ? "linear"
          : selectedElements.every((element) => element.type === "coordinate-plane")
            ? "coordinate"
          : selectedElements.every((element) => isLinearStructureElement(element) || ["graph-structure", "tree-structure"].includes(element.type))
            ? "structure"
            : "element";
      stylePanel.hidden = false;
      stylePanelAvailable = true;
      root.dataset.panelMode = mode;
      syncPropertyPanelTitle(selectedElements);
      applyPanelState();
      return;
    }

    const toolPanelModes = new Set([TOOLS.PEN, TOOLS.SHAPE, ...SHAPE_TOOLS]);
    if (toolPanelModes.has(currentTool)) {
      stylePanel.hidden = false;
      stylePanelAvailable = true;
      const drawingTool = resolveActiveDrawingTool(currentTool, activeShapeTool);
      syncSelectionInspectorDataset(getToolInspectorCapabilities(drawingTool, currentTool));
      root.dataset.panelMode = currentTool === TOOLS.PEN
            ? "brush"
          : drawingTool === TOOLS.COORDINATE_PLANE
            ? "coordinate-tool"
          : ["line", "arrow"].includes(drawingTool)
            ? "linear-tool"
            : "tool";
      syncToolPropertyPanelTitle();
      applyPanelState();
      return;
    }

    stylePanel.hidden = true;
    stylePanelAvailable = false;
    root.dataset.panelMode = "hidden";
    root.dataset.structureSelection = "none";
    syncPropertyPanelTitle([]);
    syncSelectionInspectorDataset(getSelectionInspectorCapabilities([]));
    applyPanelState();
  }

  function getSelectionInspectorCapabilities(elements) {
    return {
      text: elements.some((element) => element.type === "text"),
      sticky: elements.some((element) => element.type === "sticky"),
      stroke: elements.some((element) => element.type === "stroke"),
      drawing: elements.some((element) => ["stroke", "line", "arrow", "rect", "ellipse"].includes(element.type)),
      fillShape: elements.some((element) => ["rect", "ellipse"].includes(element.type)),
      arrow: elements.some((element) => element.type === "arrow"),
      coordinate: elements.some((element) => element.type === "coordinate-plane"),
    };
  }

  function getSelectionHydrateSource(elements) {
    return elements.find((element) => ["rect", "ellipse"].includes(element.type))
      ?? elements.find((element) => element.type === "arrow")
      ?? elements.find((element) => element.type === "line")
      ?? elements.find((element) => element.type === "stroke")
      ?? elements.find((element) => element.type === "sticky")
      ?? elements.find((element) => element.type === "text")
      ?? elements.find((element) => element.type === "coordinate-plane");
  }

  function getToolInspectorCapabilities(drawingTool, currentToolName) {
    return {
      text: currentToolName === TOOLS.TEXT,
      sticky: currentToolName === TOOLS.STICKY,
      stroke: currentToolName === TOOLS.PEN,
      drawing: currentToolName === TOOLS.PEN || ["rect", "ellipse", "line", "arrow"].includes(drawingTool),
      fillShape: ["rect", "ellipse"].includes(drawingTool),
      arrow: drawingTool === "arrow",
      coordinate: drawingTool === TOOLS.COORDINATE_PLANE,
    };
  }

  function syncSelectionInspectorDataset(capabilities) {
    root.dataset.selectionHasText = String(capabilities.text);
    root.dataset.selectionHasSticky = String(capabilities.sticky);
    root.dataset.selectionHasStroke = String(capabilities.stroke);
    root.dataset.selectionHasDrawing = String(capabilities.drawing);
    root.dataset.selectionHasFillShape = String(capabilities.fillShape);
    root.dataset.selectionHasArrow = String(capabilities.arrow);
    root.dataset.selectionHasCoordinate = String(capabilities.coordinate);
  }

  function hydrateControlsFromElement(element) {
    if (element.stroke) colorInput.value = element.stroke;
    if (element.textFill) colorInput.value = element.textFill;
    if (element.fill && element.fill !== "transparent") fillInput.value = element.fill;
    fillTransparentInput.checked = !element.fill || element.fill === "transparent";
    if (element.fill && element.type === "text") colorInput.value = element.fill;
    if (element.strokeWidth) widthInput.value = String(element.strokeWidth);
    if (["stroke", "line", "arrow"].includes(element.type)) hydrateBrushControlsFromElement(element);
    if (element.type === "coordinate-plane") hydrateCoordinateControlsFromElement(element);
    arrowDoubleEndedInput.checked = element.type === "arrow" && Boolean(element.pointerAtBeginning);
    if (element.fontSize) fontSizeInput.value = String(element.fontSize);
    if (element.fontFamily) fontFamilyInput.value = element.fontFamily;
    updateTextStyleButtons(element);
    syncTextInspectorControls(element);
    syncShapeEndpointControls();
  }

  function hydrateCoordinateControlsFromElement(element) {
    coordinateUnitSizeInput.value = String(Math.max(8, Number(element.unitSize) || 40));
    coordinateShowGridInput.checked = element.settings?.showGrid ?? true;
    coordinateShowTicksInput.checked = element.settings?.showTicks ?? true;
    coordinateShowLabelsInput.checked = element.settings?.showLabels ?? true;
    coordinateGridColorInput.value = element.style?.gridStroke ?? "#e5e7eb";
    coordinateAxisColorInput.value = element.style?.axisStroke ?? "#111827";
    coordinateLabelColorInput.value = element.style?.labelFill ?? "#64748b";
    syncCoordinateControls();
  }

  function resetPropertyControlsForTool(tool) {
    colorInput.value = DEFAULT_PROPERTY_CONTROLS.color;
    fillInput.value = DEFAULT_PROPERTY_CONTROLS.fill;
    fillTransparentInput.checked = DEFAULT_PROPERTY_CONTROLS.fillTransparent;
    widthInput.value = DEFAULT_PROPERTY_CONTROLS.width;
    brushOpacityInput.value = DEFAULT_PROPERTY_CONTROLS.brushOpacity;
    brushSmoothingInput.value = DEFAULT_PROPERTY_CONTROLS.brushSmoothing;
    brushCapInput.value = DEFAULT_PROPERTY_CONTROLS.brushCap;
    brushStyleInput.value = DEFAULT_PROPERTY_CONTROLS.brushStyle;
    arrowDoubleEndedInput.checked = false;
    coordinateUnitSizeInput.value = "40";
    coordinateShowGridInput.checked = true;
    coordinateShowTicksInput.checked = true;
    coordinateShowLabelsInput.checked = true;
    coordinateGridColorInput.value = "#e5e7eb";
    coordinateAxisColorInput.value = "#111827";
    coordinateLabelColorInput.value = "#64748b";
    fontSizeInput.value = DEFAULT_PROPERTY_CONTROLS.fontSize;
    fontFamilyInput.value = DEFAULT_PROPERTY_CONTROLS.fontFamily;
    updateTextStyleButtons({
      fontStyle: "normal",
      textDecoration: "",
    });
    if (tool === TOOLS.STICKY) {
      fillInput.value = "#fef08a";
      fillTransparentInput.checked = false;
    }
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncTextInspectorControls();
    syncShapeEndpointControls();
    syncCoordinateControls();
    updateBrushCursorStyle();
  }

  function hydrateBrushControlsFromElement(element) {
    brushOpacityInput.value = String(Math.round((element.opacity ?? 1) * 100));
    brushSmoothingInput.value = String(Math.round((element.smoothing ?? 0.45) * 100));
    brushCapInput.value = element.lineCap ?? "round";
    brushStyleInput.value = element.brushStyle ?? "solid";
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncShapeEndpointControls();
  }

  function setBrushControlValue(input, value, eventName) {
    if (!input || value === undefined) return;
    input.value = value;
    input.dispatchEvent(new Event(eventName, { bubbles: true }));
    syncBrushWidthControl();
    syncBrushPresetButtons();
    syncTextInspectorControls();
    syncBrushPreview();
  }

  function syncBrushWidthControl() {
    const value = String(Math.round(Number(widthInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.width)));
    if (brushWidthSlider && brushWidthSlider.value !== value) brushWidthSlider.value = value;
    if (brushWidthValue) brushWidthValue.textContent = value;
    if (brushOpacityValue) brushOpacityValue.textContent = String(Math.round(Number(brushOpacityInput.value) || 100));
    syncBrushPreview();
  }

  function syncBrushPresetButtons() {
    if (brushCustomColorInput && normalizeHexColor(brushCustomColorInput.value) !== normalizeHexColor(colorInput.value)) {
      brushCustomColorInput.value = colorInput.value;
    }
    const presetColors = Array.from(root.querySelectorAll("[data-brush-color]"))
      .map((button) => normalizeHexColor(button.dataset.brushColor));
    const customColorActive = !presetColors.includes(normalizeHexColor(colorInput.value));
    root.querySelectorAll("[data-brush-color]").forEach((button) => {
      setBrushPresetActive(button, normalizeHexColor(button.dataset.brushColor) === normalizeHexColor(colorInput.value));
    });
    root.querySelectorAll(".brush-custom-color").forEach((control) => {
      setBrushPresetActive(control, customColorActive);
    });
    root.querySelectorAll("[data-brush-style-option]").forEach((button) => {
      setBrushPresetActive(button, button.dataset.brushStyleOption === brushStyleInput.value);
    });
    root.querySelectorAll("[data-brush-cap-option]").forEach((button) => {
      setBrushPresetActive(button, button.dataset.brushCapOption === brushCapInput.value);
    });
    syncBrushPreview();
  }

  function syncShapeEndpointControls() {
    root.querySelectorAll("[data-ui-control='arrow-double-ended']").forEach((input) => {
      input.checked = arrowDoubleEndedInput.checked;
    });
  }

  function syncFillTransparentControls(checked) {
    fillTransparentInput.checked = checked;
    root.querySelectorAll("[data-ui-control='fill-transparent']").forEach((input) => {
      input.checked = checked;
    });
  }

  function syncTextInspectorControls(element = null) {
    const fontSizeValue = String(Math.round(Number(fontSizeInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.fontSize)));
    root.querySelectorAll("[data-ui-control='font-size'], [data-ui-control='sticky-font-size']").forEach((input) => {
      input.value = fontSizeValue;
    });
    root.querySelectorAll("[data-ui-control='font-family'], [data-ui-control='sticky-font-family']").forEach((input) => {
      input.value = fontFamilyInput.value;
    });
    root.querySelectorAll("[data-ui-control='text-color']").forEach((input) => {
      input.value = colorInput.value;
    });
    root.querySelectorAll("[data-ui-control='fill']").forEach((input) => {
      input.value = element?.type === "sticky" && element.fill && element.fill !== "transparent"
        ? element.fill
        : fillInput.value;
    });
  }

  function syncCoordinateControls() {
    root.querySelectorAll("[data-ui-control^='coordinate-']").forEach((input) => {
      const masterInput = root.querySelector(`[data-control="${input.dataset.uiControl}"]`);
      if (!masterInput) return;
      if (input.type === "checkbox") {
        input.checked = masterInput.checked;
      } else {
        input.value = masterInput.value;
      }
    });
  }

  function syncBrushPreview() {
    if (!brushPreviewPath) return;
    const width = Math.max(1, Math.round(Number(widthInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.width)));
    const smoothing = Number(brushSmoothingInput.value) || Number(DEFAULT_PROPERTY_CONTROLS.brushSmoothing);
    brushPreviewPath.setAttribute("stroke", colorInput.value);
    brushPreviewPath.setAttribute("stroke-width", String(width));
    brushPreviewPath.setAttribute("stroke-opacity", String(getBrushOpacityValue()));
    brushPreviewPath.setAttribute("stroke-linecap", brushStyleInput.value === "dot" ? "round" : brushCapInput.value);
    if (brushStyleInput.value === "dash") {
      brushPreviewPath.setAttribute("stroke-dasharray", `${Math.max(8, width * 3)},${Math.max(6, width * 2)}`);
    } else if (brushStyleInput.value === "dot") {
      brushPreviewPath.setAttribute("stroke-dasharray", `0.1,${Math.max(8, width * 1.8)}`);
    } else {
      brushPreviewPath.removeAttribute("stroke-dasharray");
    }
    if (smoothing < 30) {
      brushPreviewPath.setAttribute("d", "M 14,24 L 72,10 L 132,38 L 266,24");
    } else if (smoothing < 60) {
      brushPreviewPath.setAttribute("d", "M 14,24 Q 72,10 132,24 T 266,24");
    } else {
      brushPreviewPath.setAttribute("d", "M 14,24 C 72,10 132,38 266,24");
    }
  }

  function setBrushPresetActive(button, active) {
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function normalizeHexColor(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function getStrokeStyleFromControls() {
    return {
      stroke: colorInput.value,
      strokeWidth: Number(widthInput.value),
      opacity: getBrushOpacityValue(),
      lineCap: brushCapInput.value,
      brushStyle: brushStyleInput.value,
      smoothing: getBrushSmoothingValue(),
    };
  }

  function getBrushOpacityValue() {
    return Math.max(0.1, Math.min(1, Number(brushOpacityInput.value) / 100 || 1));
  }

  function getBrushSmoothingValue() {
    return Math.max(0, Math.min(1, Number(brushSmoothingInput.value) / 100 || 0));
  }

  function getBrushInputSmoothingValue() {
    return Math.min(0.9, getBrushSmoothingValue());
  }

  function updateTextStyleButtons(element) {
    root.querySelectorAll("[data-text-style]").forEach((button) => {
      const style = button.dataset.textStyle;
      const active = style === "bold" || style === "italic"
        ? hasFontStyle(element.fontStyle, style)
        : hasTextDecoration(element.textDecoration, style === "underline" ? "underline" : "line-through");
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setStatus(message) {
    window.clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.add("is-visible");
    statusTimer = window.setTimeout(() => {
      status.classList.remove("is-visible");
    }, 3000);
  }

}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
