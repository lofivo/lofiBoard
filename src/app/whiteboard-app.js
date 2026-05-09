import Konva from "konva";
import { renderShell } from "./app-shell.js";
import {
  createClipboardSnapshot,
  createPastedElements,
  removeElementsById,
} from "../services/clipboard-service.js";
import {
  createEmptyBoard,
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
import { createExportBackground } from "../canvas/export-renderer.js";
import {
  chooseWhiteboardSaveFile,
  downloadDataUrl,
  openWhiteboardFile,
  supportsFileSystemAccess,
  writeWhiteboardFile,
} from "../services/file-service.js";
import { splitStrokeByEraser, flattenPoints, getWorldPointer, normalizeRect, rectsIntersect } from "../canvas/geometry.js";
import { createHistory } from "../board/history.js";
import { createId } from "../board/ids.js";
import {
  createElementNode,
  createNodeAttrs,
  syncTextNodeContent,
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
  getNormalizedTextBox,
  getSelectionHitRadius,
  getSingleLineTextEditorHeight,
  getMinimumTextResizeWidth,
  getTransformerAnchorsForSelection,
  measureTextareaContentHeight,
  isTextWidthResizeAnchor,
  nextToolAfterTextPlacement,
  pointHitsSelectionBounds,
  shouldPreventBrowserZoom,
  shouldIgnoreCanvasPointerDown,
  shouldSelectAll,
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
  STRUCTURE_TYPES,
  LINEAR_STRUCTURE_TYPES,
  createStructureElements,
  getStructureItem,
  isLinearStructureElement,
  insertArrayItem,
  deleteArrayItem,
  updateArrayItemValue,
  swapArrayItems,
  moveArrayItem,
  updateArrayValues,
  setArrayHighlight,
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
  setGraphHighlight,
  clearGraphHighlight,
  layoutGraph,
  exportGraph,
  importGraphFromText,
  updateGraphFromInput,
  addTreeNode,
  addTreeChild,
  updateTreeNodeValue,
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

export function createWhiteboardApp(root) {
  if (!root) return null;

  root.innerHTML = renderShell();

  const container = root.querySelector("#stage-container");
  const status = root.querySelector("[data-status]");
  const activeFileLabel = root.querySelector("[data-file-name]");
  const menuButton = root.querySelector("[data-menu-trigger]");
  const mainMenu = root.querySelector("[data-main-menu]");
  const stylePanel = root.querySelector("[data-style-panel]");
  const shapePopover = root.querySelector("[data-shape-popover]");
  const structurePanel = root.querySelector("[data-structure-panel]");
  const structureInput = root.querySelector("[data-structure-input]");
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
  const linearSectionButtons = Array.from(root.querySelectorAll("[data-linear-toggle]"));
  const linearFieldInputs = {
    currentIndex: root.querySelector("[data-linear-field='current-index']"),
    currentValue: root.querySelector("[data-linear-field='current-value']"),
    insertValue: root.querySelector("[data-linear-field='insert-value']"),
    insertIndex: root.querySelector("[data-linear-field='insert-index']"),
    swapIndex: root.querySelector("[data-linear-field='swap-index']"),
    moveIndex: root.querySelector("[data-linear-field='move-index']"),
    highlightStart: root.querySelector("[data-linear-field='highlight-start']"),
    highlightEnd: root.querySelector("[data-linear-field='highlight-end']"),
    highlightPointer: root.querySelector("[data-linear-field='highlight-pointer']"),
  };

  let board = createEmptyBoard();
  let history = createHistory(board);
  let currentTool = TOOLS.PEN;
  let activeShapeTool = DEFAULT_SHAPE_TOOL;
  let activeStructureType = STRUCTURE_TYPES.ARRAY;
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
  let lastTransformAnchor = null;
  let handledNodeDragEnd = false;
  let graphConnectState = null;
  let activeTreeParent = null;
  let activeLinearItem = null;
  let linearItemPressState = null;
  let linearItemDragState = null;
  let suppressLinearItemSelect = null;
  let suppressSelectionDragOnce = false;
  let suppressedNodeDragElementId = null;
  let inspectorSectionsState = {
    appearance: true,
    linear: false,
    graph: false,
    tree: false,
    arrange: false,
  };
  let linearGroupState = {
    edit: true,
    highlight: false,
    semantic: false,
    more: false,
  };
  let activeInspectorContext = "appearance";
  let linearPanelState = {
    currentIndex: "0",
    currentValue: "",
    insertValue: "",
    insertIndex: "0",
    swapIndex: "1",
    moveIndex: "1",
    highlightStart: "0",
    highlightEnd: "0",
    highlightPointer: "0",
  };

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

  const transformer = new Konva.Transformer({
    rotateEnabled: true,
    flipEnabled: false,
    borderStroke: "#2563eb",
    anchorStroke: "#2563eb",
    anchorFill: "#ffffff",
    anchorSize: 9,
    padding: 6,
    ignoreStroke: true,
    anchorDragBoundFunc: (oldAbsPos, newAbsPos) => clampTransformerAnchorDrag(oldAbsPos, newAbsPos),
    boundBoxFunc: (oldBox, newBox) => {
      if (!Number.isFinite(newBox.width) || !Number.isFinite(newBox.height)) return oldBox;
      const anchor = transformer.getActiveAnchor?.();
      const nextBox = { ...newBox };
      if (newBox.width < MIN_TRANSFORM_SIZE) {
        if (anchor?.includes("left")) nextBox.x = oldBox.x + oldBox.width - MIN_TRANSFORM_SIZE;
        nextBox.width = MIN_TRANSFORM_SIZE;
      }
      if (newBox.height < MIN_TRANSFORM_SIZE) {
        if (anchor?.includes("top")) nextBox.y = oldBox.y + oldBox.height - MIN_TRANSFORM_SIZE;
        nextBox.height = MIN_TRANSFORM_SIZE;
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

  hydrateControls();
  applyViewport(board.viewport);
  applyBackground();
  renderBoard();
  setTool(TOOLS.PEN);
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
    destroy: () => stage.destroy(),
  };

  function hydrateControls() {
    for (const button of root.querySelectorAll("[data-tool]")) {
      button.addEventListener("click", () => {
        setTool(button.dataset.tool);
        setShapePopoverOpen(button.dataset.tool === TOOLS.SHAPE);
        setStructurePanelOpen(button.dataset.tool === TOOLS.STRUCTURE);
      });
    }

    menuButton.addEventListener("click", toggleMainMenu);

    for (const button of root.querySelectorAll("[data-action]")) {
      button.addEventListener("click", () => runAction(button.dataset.action));
    }

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
    root.querySelector("[data-structure-insert]").addEventListener("click", insertStructureFromPanel);
    root.querySelector("[data-structure-cancel]").addEventListener("click", () => {
      setStructurePanelOpen(false);
      setTool(TOOLS.SELECT);
    });
    hydrateStructurePanel();

    colorInput.addEventListener("input", applyStyleToSelection);
    colorInput.addEventListener("input", updateBrushCursorStyle);
    fillInput.addEventListener("input", applyStyleToSelection);
    fillTransparentInput.addEventListener("change", applyStyleToSelection);
    widthInput.addEventListener("input", applyStyleToSelection);
    widthInput.addEventListener("input", updateBrushCursorStyle);
    brushOpacityInput.addEventListener("input", applyStyleToSelection);
    brushSmoothingInput.addEventListener("input", applyStyleToSelection);
    brushCapInput.addEventListener("change", applyStyleToSelection);
    brushStyleInput.addEventListener("change", applyStyleToSelection);
    fontSizeInput.addEventListener("input", applyStyleToSelection);
    fontFamilyInput.addEventListener("change", applyStyleToSelection);
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
    linearSectionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.linearToggle;
        linearGroupState = {
          ...linearGroupState,
          [key]: !linearGroupState[key],
        };
        applyLinearGroupState();
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
      const button = event.target.closest("[data-layer-id]");
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
    transformer.on("transformstart transform", () => {
      lastTransformAnchor = transformer.getActiveAnchor?.() ?? lastTransformAnchor;
    });
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
      "send-back": sendSelectionToBack,
      "delete-selection": deleteSelection,
      "array-insert-start": () => editSelectedArrayStructure((element) => insertArrayItem(
        element,
        activeLinearItem?.elementId === element.id ? getActiveLinearIndex(element, 0) : 0,
        linearPanelState.insertValue,
      )),
      "array-insert-end": () => editSelectedArrayStructure((element) => insertArrayItem(
        element,
        activeLinearItem?.elementId === element.id
          ? Math.min(element.items?.length ?? 0, getActiveLinearIndex(element, 0) + 1)
          : (element.items?.length ?? 0),
        linearPanelState.insertValue,
      )),
      "array-insert-at": () => editSelectedArrayStructure((element) => insertArrayItem(
        element,
        readLinearFieldNumber("insertIndex", element.items?.length ?? 0),
        linearPanelState.insertValue,
      )),
      "array-delete-at": () => editSelectedArrayStructure((element) => deleteArrayItem(
        element,
        getActiveLinearIndex(element, readLinearFieldNumber("currentIndex", (element.items?.length ?? 1) - 1)),
      )),
      "array-delete-end": () => editSelectedArrayStructure((element) => deleteArrayItem(element)),
      "array-set-value": () => editSelectedArrayStructure((element) => updateArrayItemValue(
        element,
        getActiveLinearIndex(element, readLinearFieldNumber("currentIndex", 0)),
        linearPanelState.currentValue,
      )),
      "array-swap": () => editSelectedArrayStructure((element) => swapArrayItems(
        element,
        getActiveLinearIndex(element, readLinearFieldNumber("currentIndex", 0)),
        readLinearFieldNumber("swapIndex", 1),
      )),
      "array-move": () => editSelectedArrayStructure((element) => moveArrayItem(
        element,
        getActiveLinearIndex(element, readLinearFieldNumber("currentIndex", 0)),
        readLinearFieldNumber("moveIndex", (element.items?.length ?? 1) - 1),
      )),
      "array-highlight": () => editSelectedArrayStructure((element) => setArrayHighlight(element, {
        start: readLinearFieldNumber("highlightStart", 0),
        end: readLinearFieldNumber("highlightEnd", Math.max(0, (element.items?.length ?? 1) - 1)),
        pointer: readLinearFieldNumber("highlightPointer", getActiveLinearIndex(element, 0)),
      })),
      "array-clear-highlight": () => editSelectedArrayStructure(clearArrayHighlight),
      "linear-index-zero": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: 0, showIndexes: element.settings?.showIndexes ?? true })),
      "linear-index-one": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: 1, showIndexes: element.settings?.showIndexes ?? true })),
      "linear-index-show": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: element.settings?.indexBase ?? 0, showIndexes: true })),
      "linear-index-hide": () => editSelectedArrayStructure((element) => setLinearIndexOptions(element, { indexBase: element.settings?.indexBase ?? 0, showIndexes: false })),
      "stack-push": () => editSelectedStructure("stack-structure", (element) => insertArrayItem(element, element.items?.length ?? 0, linearPanelState.insertValue), "已更新栈"),
      "stack-pop": () => editSelectedStructure("stack-structure", (element) => deleteArrayItem(element, (element.items?.length ?? 1) - 1), "已更新栈"),
      "queue-enqueue": () => editSelectedStructure("queue-structure", (element) => insertArrayItem(element, element.items?.length ?? 0, linearPanelState.insertValue), "已更新队列"),
      "queue-dequeue": () => editSelectedStructure("queue-structure", (element) => deleteArrayItem(element, 0), "已更新队列"),
      "deque-push-left": () => editSelectedStructure("deque-structure", (element) => insertArrayItem(element, 0, linearPanelState.insertValue), "已更新双端队列"),
      "deque-push-right": () => editSelectedStructure("deque-structure", (element) => insertArrayItem(element, element.items?.length ?? 0, linearPanelState.insertValue), "已更新双端队列"),
      "deque-pop-left": () => editSelectedStructure("deque-structure", (element) => deleteArrayItem(element, 0), "已更新双端队列"),
      "deque-pop-right": () => editSelectedStructure("deque-structure", (element) => deleteArrayItem(element, (element.items?.length ?? 1) - 1), "已更新双端队列"),
      "array-reload": () => editSelectedArrayStructure((element) => updateArrayValues(element, structureInput.value)),
      "graph-add-node": () => editSelectedStructure("graph-structure", (element) => addGraphNode(element), "已更新图"),
      "graph-add-edge": () => editSelectedStructure("graph-structure", (element) => addGraphEdge(element, null, null, { directed: element.settings?.directedDefault ?? false }), "已更新图"),
      "graph-connect-mode": beginGraphConnectMode,
      "graph-add-edge-input": () => editSelectedStructure("graph-structure", (element) => addGraphEdgeFromText(element, promptValue("边，例如 A->B:5", structureInput.value || "A-B")), "已更新图"),
      "graph-delete-node": () => editSelectedStructure("graph-structure", deleteGraphNode, "已更新图"),
      "graph-delete-edge": () => editSelectedStructure("graph-structure", deleteLastGraphEdge, "已更新图"),
      "graph-edit-edge": () => editSelectedStructure("graph-structure", (element) => editGraphEdgeData(element), "已更新图"),
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
      "graph-reload": () => editSelectedStructure("graph-structure", (element) => updateGraphFromInput(element, structureInput.value), "已更新图"),
      "tree-add-node": () => editSelectedStructure("tree-structure", (element) => addTreeNode(element, ""), "已更新树"),
      "tree-add-left": () => editSelectedStructure("tree-structure", (element) => addTreeChild(element, getActiveTreeParentIndex(element), "left", promptValue("左孩子值", "")), "已更新树"),
      "tree-add-right": () => editSelectedStructure("tree-structure", (element) => addTreeChild(element, getActiveTreeParentIndex(element), "right", promptValue("右孩子值", "")), "已更新树"),
      "tree-set-value": () => editSelectedStructure("tree-structure", (element) => updateTreeNodeValue(element, promptIndex("节点下标", 0), promptValue("节点值", element.values?.[0] ?? "")), "已更新树"),
      "tree-delete-subtree": () => editSelectedStructure("tree-structure", (element) => deleteTreeSubtree(element, promptIndex("删除子树根下标", (element.values?.length ?? 1) - 1)), "已更新树"),
      "tree-highlight-level": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "level"), "已高亮遍历"),
      "tree-highlight-preorder": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "preorder"), "已高亮遍历"),
      "tree-highlight-inorder": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "inorder"), "已高亮遍历"),
      "tree-highlight-postorder": () => editSelectedStructure("tree-structure", (element) => setTreeTraversalHighlight(element, "postorder"), "已高亮遍历"),
      "tree-step-next": () => editSelectedStructure("tree-structure", (element) => stepTreeTraversalHighlight(element, 1), "已推进遍历"),
      "tree-step-prev": () => editSelectedStructure("tree-structure", (element) => stepTreeTraversalHighlight(element, -1), "已回退遍历"),
      "tree-clear-highlight": () => editSelectedStructure("tree-structure", clearTreeHighlight, "已清除高亮"),
      "tree-collapse-subtree": () => editSelectedStructure("tree-structure", (element) => setTreeSubtreeCollapsed(element, getActiveTreeParentIndex(element), true), "已折叠子树"),
      "tree-expand-subtree": () => editSelectedStructure("tree-structure", (element) => setTreeSubtreeCollapsed(element, getActiveTreeParentIndex(element), false), "已展开子树"),
      "tree-copy-subtree": copySelectedTreeSubtree,
      "tree-move-subtree": () => editSelectedStructure("tree-structure", (element) => moveTreeSubtree(element, getActiveTreeParentIndex(element), promptIndex("移动到目标下标", 0)), "已移动子树"),
      "tree-delete-node": () => editSelectedStructure("tree-structure", deleteLastTreeNode, "已更新树"),
      "tree-reload": () => editSelectedStructure("tree-structure", (element) => updateTreeFromInput(element, structureInput.value), "已更新树"),
    };

    actions[action]?.();
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
    root.querySelectorAll("[data-structure-type]").forEach((button) => {
      button.classList.toggle("active", button.dataset.structureType === activeStructureType);
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
      arrange: false,
    };
  }

  function getVisibleInspectorSections(context) {
    return {
      appearance: true,
      linear: context === "linear",
      graph: context === "graph",
      tree: context === "tree",
      arrange: selectedIds.length > 0,
    };
  }

  function getDefaultLinearGroupState() {
    return {
      edit: true,
      highlight: false,
      semantic: false,
      more: false,
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

  function applyLinearGroupState() {
    root.querySelectorAll("[data-linear-group]").forEach((group) => {
      const key = group.dataset.linearGroup;
      const expanded = Boolean(linearGroupState[key]);
      group.dataset.collapsed = expanded ? "false" : "true";
      const button = group.querySelector("[data-linear-toggle]");
      const content = group.querySelector("[data-linear-content]");
      button?.setAttribute("aria-expanded", String(expanded));
      content?.setAttribute("aria-hidden", String(!expanded));
    });
  }

  function syncInspectorPanelState({ forceReset = false } = {}) {
    const nextContext = getInspectorContext();
    if (forceReset || nextContext !== activeInspectorContext) {
      activeInspectorContext = nextContext;
      inspectorSectionsState = getDefaultInspectorSections(nextContext);
      linearGroupState = getDefaultLinearGroupState();
    }
    applyInspectorSectionState();
    applyLinearGroupState();
    panelBody?.scrollTo?.(0, 0);
  }

  function bindUiEvents() {
    window.addEventListener("resize", () => {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
      updateGrid();
    });

    root.addEventListener("selectstart", (event) => {
      if (event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
    });

    window.addEventListener("wheel", (event) => {
      if (shouldPreventBrowserZoom(event)) {
        event.preventDefault();
      }
    }, { capture: true, passive: false });

    window.addEventListener("pointerdown", (event) => {
      if (!isMainMenuOpen) return;
      if (event.target.closest("[data-main-menu], [data-menu-trigger]")) {
        return;
      }
      closeMainMenu();
    });

    window.addEventListener("pointerdown", (event) => {
      if (shapePopover.hidden) return;
      if (event.target.closest("[data-shape-popover], [data-tool='shape']")) {
        return;
      }
      setShapePopoverOpen(false);
    });

    window.addEventListener("pointerdown", (event) => {
      if (structurePanel.hidden) return;
      if (event.target.closest("[data-structure-panel], [data-tool='structure']")) {
        return;
      }
      setStructurePanelOpen(false);
    });

    window.addEventListener("pointerdown", (event) => {
      if (!isZoomMenuOpen) return;
      if (event.target.closest("[data-zoom-menu], [data-zoom-trigger]")) {
        return;
      }
      setZoomMenuOpen(false);
    });

    window.addEventListener("pointerdown", (event) => {
      if (contextMenu.hidden) return;
      if (event.target.closest("[data-context-menu]")) {
        return;
      }
      hideContextMenu();
    });

    window.addEventListener("paste", handlePaste);
    container.addEventListener("dragover", handleImageDragOver);
    container.addEventListener("drop", handleImageDrop);
  }

  function bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLTextAreaElement) return;

      if (shouldSelectAll(event)) {
        event.preventDefault();
        event.stopPropagation();
        selectAllElements();
        return;
      }

      if (event.code === "Space") {
        isSpaceDown = true;
        stage.container().classList.add("is-panning");
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
        stage.container().classList.remove("is-panning");
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
    updateChrome();
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
    updateChrome();
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
      panStart = {
        pointer: stage.getPointerPosition(),
        stage: stage.position(),
      };
      return;
    }

    if (currentTool === TOOLS.SELECT) {
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
      const pointer = stage.getPointerPosition();
      stage.position({
        x: panStart.stage.x + pointer.x - panStart.pointer.x,
        y: panStart.stage.y + pointer.y - panStart.pointer.y,
      });
      updateGrid();
      updateChrome();
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
      const radius = updateEraserRadius(worldPoint);
      eraseStrokeAt(worldPoint, radius);
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
    if (linearItemDragState) {
      resetLinearItemPressState();
      commitLinearItemDrag();
      return;
    }

    resetLinearItemPressState();

    if (isPanning) {
      isPanning = false;
      panStart = null;
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
      const needsSelection = ["copy", "cut", "delete", "group", "ungroup", "toggle-lock"].includes(button.dataset.contextAction);
      const needsClipboard = button.dataset.contextAction === "paste";
      const needsMultiple = button.dataset.contextAction === "group";
      button.disabled = (needsSelection && selectedIds.length === 0)
        || (needsMultiple && selectedIds.length < 2)
        || (needsClipboard && clipboardSnapshot.length === 0);
    });
  }

  function handleSelectPointerDown(event, worldPoint) {
    if (suppressSelectionDragOnce) {
      suppressSelectionDragOnce = false;
      return;
    }
    const targetElement = getElementIdFromNode(event.target);
    const arrayValueHitNode = event.target?.hasName?.("array-item-value-hit")
      ? event.target
      : event.target?.findAncestor?.(".array-item-value-hit");
    if (targetElement) {
      const element = board.elements.find((item) => item.id === targetElement);
      const targetIds = expandGroupedIds([targetElement]);
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
      if (!event.evt.shiftKey && element && ["text", "sticky"].includes(element.type)) {
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
    selectionDrag = null;
    if (didMove) {
      pushHistory("已移动对象");
    }
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
    if (!id || !selectedIds.includes(id)) {
      nodeDragSelection = null;
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
    contentLayer.batchDraw();
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
    const points = [{ ...worldPoint, pressure: normalizePressure(pressure) }];
    const element = {
      id: createId("stroke"),
      type: "stroke",
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

    const node = createNode(element);
    contentLayer.add(node);
    strokeDraft = { element, node };
  }

  function appendStroke(worldPoint, pressure = 0.5) {
    const previousPoint = strokeDraft.element.points.at(-1);
    const nextPoint = { ...worldPoint, pressure: normalizePressure(pressure) };
    const minDistance = Math.max(0.7, Number(widthInput.value) * 0.08) / stage.scaleX();
    if (!shouldAppendStrokePoint(previousPoint, nextPoint, minDistance)) return;

    strokeDraft.element.points.push(smoothStrokePoint(previousPoint, nextPoint, getBrushInputSmoothingValue()));
    strokeDraft.node.points(flattenPoints(strokeDraft.element.points));
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

  function updateBrushCursorStyle() {
    if (!brushCursorDot.visible()) return;
    showBrushCursor(brushCursorDot.position());
  }

  function updateEraserCursorStyle() {
    if (!eraserCursor.visible() || !eraserPreviewPoint) return;
    showEraser(eraserPreviewPoint, eraseSnapshot ? activeEraserRadius : getBaseEraserRadius());
  }

  function addElement(element, message) {
    board.elements = reorderElements([...board.elements, element]);
    renderBoard();
    pushHistory(message);
  }

  function createNode(element) {
    return createElementNode(element, {
      draggable: shouldElementBeDraggable(element) && !isLinearPointerGestureElement(element.id),
      onDragStart: beginNodeDragSelection,
      onDragMove: updateNodeDragSelection,
      onMove: (node) => {
        if (isElementLocked(getElementIdFromNode(node))) return;
        finishNodeDragSelection(node);
      },
      onSelect: (event, node) => {
        if (currentTool !== TOOLS.SELECT) return;
        event.cancelBubble = true;
        const id = getElementIdFromNode(node);
        selectElementById(id, event.evt.shiftKey);
      },
      onEdit: (event, node) => {
        if (currentTool !== TOOLS.SELECT) return;
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
      onGraphNodeMove: moveGraphStructureNode,
      onGraphNodeClick: handleGraphNodeClick,
      onGraphEdgeEdit: editGraphStructureEdge,
      getGraphEdgeState: (elementId) => (graphConnectState?.elementId === elementId ? graphConnectState : null),
      onTreeNodeEdit: editTreeStructureNode,
      onTreeNodeClick: handleTreeNodeClick,
    });
  }

  function applyElementToNode(element, node) {
    node.setAttrs(createNodeAttrs(element));
    if (element.type === "text") {
      syncTextNodeContent(node, element);
    }
  }

  function renderBoard() {
    contentLayer.find(".element").forEach((node) => node.destroy());
    for (const element of reorderElements(board.elements)) {
      const runtimeElement = buildRuntimeElement(element);
      contentLayer.add(createNode(runtimeElement));
    }
    selectionRect.moveToTop();
    syncSelectionNodes();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
  }

  function buildRuntimeElement(element) {
    if (!isLinearStructureElement(element)) return element;
    const runtime = {};
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
    selectedIds = [...new Set(ids)];
    const selectedLinear = getSelectedLinearStructure();
    if (!selectedLinear) {
      activeLinearItem = null;
    } else if (activeLinearItem?.elementId === selectedLinear.id) {
      syncActiveLinearItemAfterEdit(selectedLinear.id);
    }
    syncSelectionNodes();
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
    resetLinearItemPressState();
    selectIds([]);
  }

  function syncSelectionNodes() {
    if (linearItemDragState) {
      transformer.nodes([]);
      transformer.visible(false);
      transformer.resizeEnabled(false);
      transformer.rotateEnabled(false);
      transformer.enabledAnchors([]);
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
      return (getMinimumTextResizeWidth(element.fontSize) + (element.padding ?? 0) * 2) * stage.scaleX();
    }
    return MIN_TRANSFORM_SIZE;
  }

  function getActiveTransformerMinHeight() {
    const node = transformer.nodes()[0];
    const id = getElementIdFromNode(node);
    const element = board.elements.find((item) => item.id === id);
    if (element?.type === "text") {
      return getSingleLineTextEditorHeight(element.fontSize, stage.scaleX());
    }
    return MIN_TRANSFORM_SIZE;
  }

  function updateDraggableState() {
    contentLayer.find(".element").forEach((node) => {
      const id = getElementIdFromNode(node);
      const element = board.elements.find((item) => item.id === id);
      node.draggable(shouldElementBeDraggable(element) && !isLinearPointerGestureElement(id));
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

  function normalizeTextElementBox(element) {
    if (element.type !== "text") return element;
    const box = getNormalizedTextElementBox(element);
    return {
      ...element,
      width: box.width,
      height: box.height,
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
      const widthOnlyResize = isTextWidthResizeAnchor(lastTransformAnchor);
      const nextScale = widthOnlyResize
        ? 1
        : Math.max(0.1, Math.max(Math.abs(node.scaleX() || 1), Math.abs(node.scaleY() || 1)));
      board.elements[index] = normalizeTextElementBox({
        ...board.elements[index],
        fontSize: Math.max(8, element.fontSize * nextScale),
        width: node.width() * Math.abs(node.scaleX() || 1),
      });
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
          stroke: colorInput.value,
          fill: colorInput.value,
          strokeWidth: Number(widthInput.value),
        };
      }
      if (element.type === "stroke") {
        return isStrokeOnlySelection
          ? { ...element, ...strokeStyle }
          : { ...element, stroke: colorInput.value, strokeWidth: Number(widthInput.value) };
      }
      if (element.type === "line") {
        return { ...element, stroke: colorInput.value, strokeWidth: Number(widthInput.value) };
      }
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
    if (board.elements.length === 0) return;
    selectIds(board.elements.map((element) => element.id));
    setStatus("已选择全部元素");
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
      point: getViewportCenterPoint(),
      zIndexStart: board.elements.length,
    });
    if (elements.length === 0) return;

    board.elements = reorderElements([...board.elements, ...elements]);
    renderBoard();
    setStructurePanelOpen(false);
    setTool(TOOLS.SELECT);
    selectIds(elements.map((element) => element.id));
    pushHistory(`已添加${getStructureItem(activeStructureType).label}`);
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

  function readLinearFieldNumber(fieldName, fallback = 0) {
    const raw = linearPanelState[fieldName];
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : Math.max(0, fallback);
  }

  function getActiveLinearIndex(element, fallback = 0) {
    const maxIndex = Math.max(0, (element?.items?.length ?? 1) - 1);
    if (activeLinearItem?.elementId === element?.id) {
      return Math.min(maxIndex, Math.max(0, activeLinearItem.index));
    }
    return Math.min(maxIndex, Math.max(0, fallback));
  }

  function setActiveLinearItem(elementId, index, { syncPanel = true } = {}) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element)) {
      activeLinearItem = null;
      if (syncPanel) syncLinearPanelState();
      return;
    }
    const maxIndex = Math.max(0, (element.items?.length ?? 1) - 1);
    activeLinearItem = {
      elementId,
      index: Math.min(maxIndex, Math.max(0, Number(index) || 0)),
    };
    if (syncPanel) syncLinearPanelState();
  }

  function syncActiveLinearItemAfterEdit(elementId, preferredIndex = null) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element)) {
      activeLinearItem = null;
      return;
    }
    const length = element.items?.length ?? 0;
    if (length === 0) {
      activeLinearItem = { elementId, index: 0 };
      return;
    }
    const fallbackIndex = activeLinearItem?.elementId === elementId ? activeLinearItem.index : 0;
    const nextIndex = preferredIndex ?? fallbackIndex;
    activeLinearItem = {
      elementId,
      index: Math.min(length - 1, Math.max(0, Number(nextIndex) || 0)),
    };
  }

  function syncLinearPanelState() {
    const element = getSelectedLinearStructure();
    if (!element) {
      applyLinearPanelState(linearPanelState);
      return;
    }
    const itemCount = element.items?.length ?? 0;
    const currentIndex = getActiveLinearIndex(element, readLinearFieldNumber("currentIndex", 0));
    const currentValue = itemCount > 0 ? String(element.items?.[currentIndex]?.value ?? "") : "";
    const markers = element.markers ?? {};
    const highlight = Array.isArray(markers.highlight) ? markers.highlight : [];
    const firstHighlight = highlight[0] ?? currentIndex;
    const lastHighlight = highlight.at(-1) ?? currentIndex;
    const pointer = Number.isInteger(markers.pointer) ? markers.pointer : currentIndex;
    linearPanelState = {
      ...linearPanelState,
      currentIndex: String(currentIndex),
      currentValue,
      insertIndex: String(readLinearFieldNumber("insertIndex", currentIndex)),
      swapIndex: String(readLinearFieldNumber("swapIndex", Math.min(currentIndex + 1, Math.max(0, itemCount - 1)))),
      moveIndex: String(readLinearFieldNumber("moveIndex", Math.min(currentIndex + 1, Math.max(0, itemCount - 1)))),
      highlightStart: String(readLinearFieldNumber("highlightStart", firstHighlight)),
      highlightEnd: String(readLinearFieldNumber("highlightEnd", lastHighlight)),
      highlightPointer: String(readLinearFieldNumber("highlightPointer", pointer)),
      currentValue,
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

  function clearLinearItemPressTimer() {
    if (!linearItemPressState?.holdTimer) return;
    window.clearTimeout(linearItemPressState.holdTimer);
    linearItemPressState.holdTimer = null;
  }

  function shouldElementBeDraggable(element) {
    if (!element) return false;
    return currentTool === TOOLS.SELECT
      && !element.locked
      && !["text", "sticky"].includes(element.type);
  }

  function isLinearPointerGestureElement(elementId) {
    return linearItemPressState?.elementId === elementId || linearItemDragState?.elementId === elementId;
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

  function cancelLinearItemDragPreview() {
    if (!linearItemDragState) return;
    linearItemDragState = null;
    renderBoard();
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

  function animateLinearDragGapChange() {
    if (!linearItemDragState) return;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    if (!group) return;
    const element = board.elements.find((item) => item.id === linearItemDragState.elementId);
    if (!isLinearStructureElement(element)) return;
    const { cellWidth } = getLinearStructureGeometry(element);
    const itemNodes = group.find(".array-item");
    itemNodes.forEach((node, index) => {
      const targetX = getLinearPreviewXForGap(
        index,
        linearItemDragState.fromIndex,
        linearItemDragState.cancelled ? linearItemDragState.fromIndex : linearItemDragState.previewGap,
        linearItemDragState.dragX,
        cellWidth,
      );
      const targetY = index === linearItemDragState.fromIndex
        ? (linearItemDragState.cancelled ? 0 : linearItemDragState.dragY)
        : 0;
      node.to({
        x: targetX,
        y: targetY,
        duration: index === linearItemDragState.fromIndex ? 0.04 : 0.16,
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
      longPressTriggered: true,
      cancelled: false,
    };
    setElementDraggableState(elementId, false);
    setActiveLinearItem(elementId, index, { syncPanel: false });
    renderBoard();
  }

  function updateLinearDragVisualPosition() {
    if (!linearItemDragState) return;
    const group = contentLayer.findOne(`#${linearItemDragState.elementId}`);
    const itemNode = group?.find(".array-item")?.[linearItemDragState.fromIndex];
    const indicator = group?.findOne(".array-drop-indicator");
    const element = board.elements.find((item) => item.id === linearItemDragState.elementId);
    if (!itemNode) return;
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
    suppressSelectionDragOnce = true;
    suppressedNodeDragElementId = dragState.elementId;
    contentLayer.findOne(`#${dragState.elementId}`)?.stopDrag();
    nodeDragSelection = null;
    selectionDrag = null;
    suppressLinearItemSelect = {
      elementId: dragState.elementId,
      index: dragState.fromIndex,
    };
    requestAnimationFrame(() => {
      if (suppressLinearItemSelect?.elementId === dragState.elementId && suppressLinearItemSelect?.index === dragState.fromIndex) {
        suppressLinearItemSelect = null;
      }
    });
    if (!isLinearStructureElement(element) || dragState.cancelled) {
      renderBoard();
      return true;
    }
    const length = element.items?.length ?? 0;
    const toIndex = getLinearDragInsertIndex(dragState.fromIndex, dragState.previewGap, length);
    moveArrayStructureItem({
      elementId: dragState.elementId,
      fromIndex: dragState.fromIndex,
      toIndex,
    });
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
    graphConnectState = { elementId: graphId, sourceNodeId: null };
    renderBoard();
    selectIds([graphId]);
    setStatus("连边模式：点击源节点，再点击目标节点");
  }

  function handleGraphNodeClick({ elementId, nodeId }) {
    if (!graphConnectState || graphConnectState.elementId !== elementId) {
      selectIds([elementId]);
      return;
    }
    if (!graphConnectState.sourceNodeId) {
      graphConnectState = { elementId, sourceNodeId: nodeId };
      renderBoard();
      selectIds([elementId]);
      setStatus("连边模式：点击目标节点");
      return;
    }
    const sourceNodeId = graphConnectState.sourceNodeId;
    graphConnectState = null;
    board.elements = board.elements.map((item) => (
      item.id === elementId
        ? addGraphEdge(item, sourceNodeId, nodeId, { directed: item.settings?.directedDefault ?? false })
        : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已添加图边");
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
    const values = copyTreeSubtreeValues(element, getActiveTreeParentIndex(element));
    const text = values.map((value) => value ?? "null").join(", ");
    navigator.clipboard?.writeText?.(text).then(
      () => setStatus("已复制子树层序数据"),
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
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    if (suppressLinearItemSelect?.elementId === elementId) {
      suppressLinearItemSelect = null;
      return;
    }
    const targetIds = expandGroupedIds([elementId]);
    if (selectedIds.some((id) => targetIds.includes(id))) {
      setActiveLinearItem(elementId, index);
      return;
    }
    selectIds([elementId]);
  }

  function handleArrayStructureItemPress({ elementId, index }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    const worldPoint = getWorldPointer(stage);
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
    const itemNode = node.find(".array-item")?.[index];
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
      input.remove();
      if (!commit) return;
      board.elements = board.elements.map((item) => (
        item.id === elementId ? updateArrayItemValue(item, index, nextValue) : item
      ));
      activeLinearItem = null;
      renderBoard();
      selectIds([]);
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
  }

  function editTreeStructureNode({ elementId, index, value }) {
    const element = board.elements.find((item) => item.id === elementId);
    if (!element || element.type !== "tree-structure" || element.locked) return;
    const nextValue = promptValue("节点值", value);
    board.elements = board.elements.map((item) => (
      item.id === elementId ? updateTreeNodeValue(item, index, nextValue) : item
    ));
    renderBoard();
    selectIds([elementId]);
    pushHistory("已更新树节点");
  }

  function handleTreeNodeClick({ elementId, index }) {
    activeTreeParent = { elementId, index };
    selectIds([elementId]);
    setStatus(`已选择父节点 ${index}`);
  }

  function getActiveTreeParentIndex(element) {
    if (activeTreeParent?.elementId === element.id) return activeTreeParent.index;
    return promptIndex("父节点下标", 0);
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
    setStatus("已新建白板");
  }

  function resetView() {
    applyViewport({ x: 0, y: 0, scale: 1 });
    board = serializeCurrentBoard();
    history.push(board);
    dirty = true;
    updateChrome();
    setStatus("已重置视图");
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
      [TOOLS.SHAPE]: "图形：从弹出框选择矩形、椭圆、线段或箭头",
      [TOOLS.RECT]: "矩形：拖动创建",
      [TOOLS.ELLIPSE]: "椭圆：拖动创建",
      [TOOLS.LINE]: "线段：拖动创建",
      [TOOLS.ARROW]: "箭头：拖动创建",
    }[tool];
  }

  function editTextElement(id) {
    const element = board.elements.find((item) => item.id === id);
    const node = contentLayer.findOne(`#${id}`);
    if (!element || !node) return;

    isEditingText = true;
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
    const scale = stage.scaleX() * (node.scaleX() || 1);
    const editorPadding = Number(element.padding ?? 6);
    const horizontalPadding = editorPadding * scale;
    const minEditorWidth = getMinimumTextResizeWidth(element.fontSize) * scale + horizontalPadding * 2;
    const minEditorHeight = getSingleLineTextEditorHeight(element.fontSize, scale);
    const editorWidth = Math.max(minEditorWidth, node.width() * scale);
    const editorHeight = Math.max(minEditorHeight, (node.height?.() || element.height || element.fontSize * 1.25) * scale);
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
      const nextWidth = Math.max(minEditorWidth, width);
      const nextHeight = Math.max(minEditorHeight, height);
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
      const nextWidth = canAutoFitWidth && textarea.value
        ? Math.min(maxAutoEditorWidth, Math.max(minEditorWidth, Math.ceil(contentWidth + horizontalPadding * 2 + 1)))
        : getEditorWidth();
      setEditorSize(nextWidth);
      applyNodeSizeFromEditor();
      transformer.forceUpdate();
      overlayLayer.batchDraw();
    };

    editorFrame.style.left = `${box.left + absolute.x}px`;
    editorFrame.style.top = `${box.top + absolute.y}px`;
    setEditorSize(editorWidth, editorHeight);
    editorFrame.style.minWidth = `${minEditorWidth}px`;
    editorFrame.style.minHeight = `${minEditorHeight}px`;
    textarea.style.fontSize = `${element.fontSize * scale}px`;
    textarea.style.padding = `0 ${horizontalPadding}px`;
    textarea.style.color = element.type === "sticky" ? element.textFill : element.fill;
    if (element.type === "sticky") {
      textarea.style.background = element.fill;
      textarea.style.padding = "10px";
    }
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.fontStyle = hasFontStyle(element.fontStyle, "italic") ? "italic" : "normal";
    textarea.style.fontWeight = hasFontStyle(element.fontStyle, "bold") ? "700" : "400";
    textarea.style.textDecoration = element.textDecoration || "none";
    editorFrame.style.transform = `rotate(${node.getAbsoluteRotation()}deg)`;
    applyNodeSizeFromEditor();
    node.hide();
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
      const nextBox = { ...newBox };
      if (newBox.width < minEditorWidth) {
        if (anchor?.includes("left")) nextBox.x = oldBox.x + oldBox.width - minEditorWidth;
        nextBox.width = minEditorWidth;
      }
      if (newBox.height < minEditorHeight) {
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

    const cleanupEditorTransformer = () => {
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
          nextElement.width = Math.max(80, committedWidth / scale);
          nextElement.height = Math.max(60, committedHeight / scale);
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

    const exitEditorForTransform = () => {
      commit({ keepNode: true });
    };

    transformer.on("transformstart.editor dragstart.editor", exitEditorForTransform);

    const cancel = () => {
      if (editorClosed) return;
      editorClosed = true;
      isEditingText = false;
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
      updateChrome();
      setStatus("已打开白板文件");
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
    await insertImageFile(file, "已导入图片");
  }

  async function handlePaste(event) {
    if (event.target instanceof HTMLTextAreaElement) return;
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
    const element = {
      ...buildTextElement({
        point,
        zIndex: board.elements.length,
      }),
      text,
    };
    addElement(element, message);
    setTool(TOOLS.SELECT);
    selectIds([element.id]);
  }

  async function insertImageFile(file, message) {
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
      });
      const element = buildImageElement({
        point,
        src,
        width: size.width,
        height: size.height,
        zIndex: board.elements.length,
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
    updateChrome();
    setStatus(message);
  }

  function restoreFromHistory(nextBoard, message) {
    if (!nextBoard) return;
    board = normalizeBoard(nextBoard);
    selectedIds = [];
    applyViewport(board.viewport);
    applyBackground();
    renderBoard();
    dirty = true;
    updateChrome();
    setStatus(message);
  }

  function applyViewport(viewport) {
    stage.position({ x: viewport.x, y: viewport.y });
    stage.scale({ x: viewport.scale, y: viewport.scale });
    updateGrid();
    updateBrushCursorStyle();
    updateEraserCursorStyle();
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
    syncInspectorPanelState();
    updateLayerPanelAvailability();
    renderLayerPanel();
    updateContextPanel();
  }

  function updateLayerPanelAvailability() {
    layerPanelAvailable = isLayerPanelAvailable();
    layerPanel.hidden = !layerPanelAvailable;
    applyPanelState();
  }

  function renderLayerPanel() {
    const elements = reorderElements(board.elements).slice().reverse();
    layerList.innerHTML = elements.map((element) => {
      const active = selectedIds.includes(element.id) ? " active" : "";
      const label = getElementLabel(element);
      const meta = [
        element.locked ? "锁定" : "",
        element.groupId ? "分组" : "",
      ].filter(Boolean).join(" · ");
      return `
        <button type="button" class="layer-item${active}" data-layer-id="${element.id}" title="${escapeHtml(label)}">
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
      line: "线段",
      arrow: "箭头",
      "array-structure": `数组：${element.items?.length ?? 0} 项`,
      "stack-structure": `栈：${element.items?.length ?? 0} 项`,
      "queue-structure": `队列：${element.items?.length ?? 0} 项`,
      "deque-structure": `双端队列：${element.items?.length ?? 0} 项`,
      "graph-structure": `图：${element.nodes?.length ?? 0} 点 ${element.edges?.length ?? 0} 边`,
      "tree-structure": `树：${element.nodes?.length ?? 0} 节点`,
    };
    return labels[element.type] ?? element.type;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
      hydrateControlsFromElement(first);
      const mode = selectedElements.every((element) => element.type === "text")
        ? "text"
        : selectedElements.every((element) => element.type === "stroke")
          ? "stroke"
        : selectedElements.every((element) => ["line", "arrow", "stroke"].includes(element.type))
          ? "linear"
        : selectedElements.every((element) => isLinearStructureElement(element) || ["graph-structure", "tree-structure"].includes(element.type))
          ? "structure"
          : "element";
      stylePanel.hidden = false;
      stylePanelAvailable = true;
      root.dataset.panelMode = mode;
      applyPanelState();
      return;
    }

    if ([TOOLS.PEN, TOOLS.STICKY, TOOLS.SHAPE, ...SHAPE_TOOLS].includes(currentTool)) {
      stylePanel.hidden = false;
      stylePanelAvailable = true;
      const drawingTool = resolveActiveDrawingTool(currentTool, activeShapeTool);
      root.dataset.panelMode = [TOOLS.TEXT, TOOLS.STICKY].includes(currentTool)
        ? "tool-text"
        : currentTool === TOOLS.PEN
          ? "brush"
        : ["line", "arrow"].includes(drawingTool)
          ? "linear-tool"
          : "tool";
      applyPanelState();
      return;
    }

    stylePanel.hidden = true;
    stylePanelAvailable = false;
    root.dataset.panelMode = "hidden";
    root.dataset.structureSelection = "none";
    applyPanelState();
  }

  function hydrateControlsFromElement(element) {
    if (element.stroke) colorInput.value = element.stroke;
    if (element.textFill) colorInput.value = element.textFill;
    if (element.fill && element.fill !== "transparent") fillInput.value = element.fill;
    fillTransparentInput.checked = !element.fill || element.fill === "transparent";
    if (element.fill && element.type === "text") colorInput.value = element.fill;
    if (element.strokeWidth) widthInput.value = String(element.strokeWidth);
    if (element.type === "stroke") hydrateBrushControlsFromElement(element);
    if (element.fontSize) fontSizeInput.value = String(element.fontSize);
    if (element.fontFamily) fontFamilyInput.value = element.fontFamily;
    updateTextStyleButtons(element);
  }

  function hydrateBrushControlsFromElement(element) {
    brushOpacityInput.value = String(Math.round((element.opacity ?? 1) * 100));
    brushSmoothingInput.value = String(Math.round((element.smoothing ?? 0.45) * 100));
    brushCapInput.value = element.lineCap ?? "round";
    brushStyleInput.value = element.brushStyle ?? "solid";
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
