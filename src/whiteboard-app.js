import Konva from "konva";
import { renderShell } from "./app-shell.js";
import {
  createClipboardSnapshot,
  createPastedElements,
  removeElementsById,
} from "./clipboard-service.js";
import {
  createEmptyBoard,
  normalizeBoard,
  reorderElements,
  serializeBoard,
} from "./board-model.js";
import {
  createShapeElement as buildShapeElement,
  createTextElement as buildTextElement,
  isTinyElement,
} from "./element-factory.js";
import { createExportBackground } from "./export-renderer.js";
import {
  chooseWhiteboardSaveFile,
  downloadDataUrl,
  openWhiteboardFile,
  supportsFileSystemAccess,
  writeWhiteboardFile,
} from "./file-service.js";
import { splitStrokeByEraser, flattenPoints, getWorldPointer, normalizeRect, rectsIntersect } from "./geometry.js";
import { createHistory } from "./history.js";
import { createId } from "./ids.js";
import { createElementNode, createNodeAttrs } from "./konva-elements.js";
import {
  getSelectionHitRadius,
  nextToolAfterTextPlacement,
  pointHitsSelectionBounds,
  shouldPreventBrowserZoom,
  shouldIgnoreCanvasPointerDown,
  shouldSelectAll,
} from "./interaction-rules.js";
import {
  computeEraserRadius,
  getFillValue,
  isShapeTool,
  resolveActiveDrawingTool,
} from "./tool-behavior.js";
import {
  normalizePressure,
  shouldAppendStrokePoint,
  smoothStrokePoint,
} from "./stroke-engine.js";
import {
  DEFAULT_SHAPE_TOOL,
  SHAPE_TOOLS,
  TOOLS,
} from "./ui-config.js";
import { computeFitViewport } from "./viewport-service.js";

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
  const contextMenu = root.querySelector("[data-context-menu]");
  const colorInput = root.querySelector("[data-control='color']");
  const fillInput = root.querySelector("[data-control='fill']");
  const fillTransparentInput = root.querySelector("[data-control='fill-transparent']");
  const widthInput = root.querySelector("[data-control='width']");
  const fontSizeInput = root.querySelector("[data-control='font-size']");
  const zoomLabel = root.querySelector("[data-zoom]");
  const zoomButton = root.querySelector("[data-zoom-trigger]");
  const zoomMenu = root.querySelector("[data-zoom-menu]");
  const zoomOutButton = root.querySelector("[data-zoom-out]");
  const zoomInButton = root.querySelector("[data-zoom-in]");

  let board = createEmptyBoard();
  let history = createHistory(board);
  let currentTool = TOOLS.PEN;
  let activeShapeTool = DEFAULT_SHAPE_TOOL;
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
  let eraseSnapshot = null;
  let lastEraserPoint = null;
  let activeEraserRadius = 24;
  let isMainMenuOpen = false;
  let isZoomMenuOpen = false;
  let isEditingText = false;
  let clipboardSnapshot = [];
  let lastPointerWorldPoint = null;
  let statusTimer = null;
  let dirty = false;

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
    borderStroke: "#2563eb",
    anchorStroke: "#2563eb",
    anchorFill: "#ffffff",
    anchorSize: 9,
    padding: 6,
    ignoreStroke: true,
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

  const eraserCursor = new Konva.Circle({
    radius: 18,
    stroke: "#111827",
    strokeWidth: 1,
    fill: "rgba(17,24,39,0.08)",
    visible: false,
    listening: false,
  });
  overlayLayer.add(eraserCursor);

  hydrateControls();
  applyViewport(board.viewport);
  applyBackground();
  renderBoard();
  setTool(TOOLS.PEN);
  updateChrome();
  bindStageEvents();
  bindUiEvents();
  bindKeyboard();

  return {
    getBoard: () => serializeCurrentBoard(),
    destroy: () => stage.destroy(),
  };

  function hydrateControls() {
    for (const button of root.querySelectorAll("[data-tool]")) {
      button.addEventListener("click", () => {
        setTool(button.dataset.tool);
        setShapePopoverOpen(button.dataset.tool === TOOLS.SHAPE);
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

    colorInput.addEventListener("input", applyStyleToSelection);
    fillInput.addEventListener("input", applyStyleToSelection);
    fillTransparentInput.addEventListener("change", applyStyleToSelection);
    widthInput.addEventListener("input", applyStyleToSelection);
    fontSizeInput.addEventListener("input", applyStyleToSelection);
    zoomButton.addEventListener("click", toggleZoomMenu);
    zoomOutButton.addEventListener("click", () => zoomBy(1 / 1.25));
    zoomInButton.addEventListener("click", () => zoomBy(1.25));
  }

  function bindStageEvents() {
    stage.on("wheel", handleWheel);
    stage.on("pointerdown", handlePointerDown);
    stage.on("pointermove", handlePointerMove);
    stage.on("pointerup pointercancel", handlePointerUp);
    stage.container().addEventListener("contextmenu", handleContextMenu);

    transformer.on("dragend transformend", () => {
      syncSelectedNodes();
      pushHistory("已更新选择对象");
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
      undo: undoHistory,
      redo: redoHistory,
      "fit-content": fitContent,
      clear: clearBoard,
      "reset-view": resetView,
      "bring-front": bringSelectionToFront,
      "send-back": sendSelectionToBack,
      "delete-selection": deleteSelection,
    };

    actions[action]?.();
  }

  function runContextAction(action) {
    hideContextMenu();
    const actions = {
      copy: copySelection,
      cut: cutSelection,
      paste: pasteClipboard,
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

  function bindUiEvents() {
    window.addEventListener("resize", () => {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
      updateGrid();
    });

    root.addEventListener("selectstart", (event) => {
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
        event.preventDefault();
        event.stopPropagation();
        pasteClipboard();
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

    if (isSpaceDown || event.evt.button === 1) {
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
      startStroke(worldPoint, event.evt.pressure);
      return;
    }

    if (currentTool === TOOLS.ERASER_STROKE) {
      eraseSnapshot = snapshotBoard();
      beginEraser(worldPoint);
      eraseStrokeAt(worldPoint, activeEraserRadius);
      showEraser(worldPoint, activeEraserRadius);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT) {
      eraseSnapshot = snapshotBoard();
      beginEraser(worldPoint);
      eraseObjectAt(event.target);
      showEraser(worldPoint, activeEraserRadius);
      return;
    }

    if (currentTool === TOOLS.TEXT) {
      const element = buildTextElement({
        point: worldPoint,
        color: colorInput.value,
        fontSize: Number(fontSizeInput.value),
        zIndex: board.elements.length,
      });
      addElement(element, "已添加文字");
      selectIds([element.id]);
      setTool(nextToolAfterTextPlacement(currentTool));
      requestAnimationFrame(() => editTextElement(element.id));
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
      eraserCursor.visible(false);
      stage.container().classList.remove("is-erasing");
      overlayLayer.batchDraw();
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
      const needsSelection = ["copy", "cut", "delete"].includes(button.dataset.contextAction);
      const needsClipboard = button.dataset.contextAction === "paste";
      button.disabled = (needsSelection && selectedIds.length === 0) || (needsClipboard && clipboardSnapshot.length === 0);
    });
  }

  function handleSelectPointerDown(event, worldPoint) {
    const targetElement = getElementIdFromNode(event.target);
    if (targetElement) {
      if (event.evt.shiftKey) {
        toggleSelection(targetElement);
      } else if (!selectedIds.includes(targetElement)) {
        selectIds([targetElement]);
      }
      return;
    }

    const nearbySelectedId = getNearbySelectedElementId(worldPoint);
    if (nearbySelectedId) {
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
    selectionDrag = {
      start: worldPoint,
      moved: false,
      originals: selectedIds.map((id) => {
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

  function startStroke(worldPoint, pressure = 0.5) {
    const points = [{ ...worldPoint, pressure: normalizePressure(pressure) }];
    const element = {
      id: createId("stroke"),
      type: "stroke",
      points,
      stroke: colorInput.value,
      strokeWidth: Number(widthInput.value),
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

    strokeDraft.element.points.push(smoothStrokePoint(previousPoint, nextPoint, 0.28));
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
    selectIds(ids);
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
    board.elements = reorderElements(board.elements.filter((element) => element.id !== id));
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
    activeEraserRadius = computeEraserRadius({
      baseRadius: getBaseEraserRadius(),
      speed,
    });
    lastEraserPoint = { ...worldPoint, time: now };
    return activeEraserRadius;
  }

  function getBaseEraserRadius() {
    return Math.max(18, Number(widthInput.value) * 1.7);
  }

  function showEraser(worldPoint, radius = activeEraserRadius) {
    eraserCursor.position(worldPoint);
    eraserCursor.radius(radius);
    eraserCursor.visible(true);
    overlayLayer.batchDraw();
  }

  function addElement(element, message) {
    board.elements = reorderElements([...board.elements, element]);
    renderBoard();
    pushHistory(message);
  }

  function createNode(element) {
    return createElementNode(element, {
      draggable: currentTool === TOOLS.SELECT,
      onEditText: editTextElement,
      onMove: (node) => {
        syncNodeToElement(node);
        pushHistory("已移动对象");
      },
      onSelect: (event, node) => {
        if (currentTool !== TOOLS.SELECT) return;
        event.cancelBubble = true;
        const id = getElementIdFromNode(node);
        if (event.evt.shiftKey) {
          toggleSelection(id);
        } else {
          selectIds([id]);
        }
      },
    });
  }

  function applyElementToNode(element, node) {
    node.setAttrs(createNodeAttrs(element));
  }

  function renderBoard() {
    contentLayer.find(".element").forEach((node) => node.destroy());
    for (const element of reorderElements(board.elements)) {
      contentLayer.add(createNode(element));
    }
    selectionRect.moveToTop();
    syncSelectionNodes();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
  }

  function selectIds(ids) {
    selectedIds = ids;
    syncSelectionNodes();
    updateChrome();
  }

  function toggleSelection(id) {
    if (selectedIds.includes(id)) {
      selectIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      selectIds([...selectedIds, id]);
    }
  }

  function clearSelection() {
    selectIds([]);
  }

  function syncSelectionNodes() {
    const nodes = selectedIds
      .map((id) => contentLayer.findOne(`#${id}`))
      .filter(Boolean);
    transformer.nodes(nodes);
  }

  function updateDraggableState() {
    contentLayer.find(".element").forEach((node) => {
      node.draggable(currentTool === TOOLS.SELECT);
    });
  }

  function syncSelectedNodes() {
    transformer.nodes().forEach(syncNodeToElement);
    renderBoard();
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
      board.elements[index].width = node.width();
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

  function applyStyleToSelection() {
    if (selectedIds.length === 0) {
      updateContextPanel();
      return;
    }

    board.elements = board.elements.map((element) => {
      if (!selectedIds.includes(element.id)) return element;
      if (element.type === "text") {
        return {
          ...element,
          fill: colorInput.value,
          fontSize: Number(fontSizeInput.value),
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
      if (element.type === "line" || element.type === "stroke") {
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
    clipboardSnapshot = createClipboardSnapshot(board.elements, selectedIds);
    board.elements = removeElementsById(board.elements, selectedIds);
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

  function deleteSelection() {
    if (selectedIds.length === 0) return;
    board.elements = removeElementsById(board.elements, selectedIds);
    clearSelection();
    renderBoard();
    pushHistory("已删除对象");
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
    transformer.visible(tool === TOOLS.SELECT);
    eraserCursor.visible(false);
    stage.container().classList.remove("is-erasing");
    if (tool !== TOOLS.SELECT) {
      clearSelection();
    }
    updateDraggableState();
    stage.container().dataset.tool = tool;
    updateChrome();
    setStatus(getToolStatus(tool));
  }

  function getToolStatus(tool) {
    return {
      [TOOLS.SELECT]: "选择：拖动框选，Shift 多选，Delete 删除",
      [TOOLS.PEN]: "画笔：拖动画出可编辑笔触",
      [TOOLS.ERASER_STROKE]: "片段橡皮：擦除笔触的一部分",
      [TOOLS.ERASER_OBJECT]: "对象橡皮：碰到对象即删除",
      [TOOLS.TEXT]: "文字：点击画布添加文字",
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
    node.hide();
    contentLayer.draw();

    const textarea = document.createElement("textarea");
    textarea.className = "text-editor";
    textarea.value = element.text;
    const originalText = element.text;
    document.body.appendChild(textarea);

    const box = stage.container().getBoundingClientRect();
    const absolute = node.getAbsolutePosition();
    const scale = stage.scaleX() * (node.scaleX() || 1);

    textarea.style.left = `${box.left + absolute.x}px`;
    textarea.style.top = `${box.top + absolute.y}px`;
    textarea.style.width = `${Math.max(160, node.width() * scale)}px`;
    textarea.style.fontSize = `${element.fontSize * scale}px`;
    textarea.style.color = element.fill;
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.transform = `rotate(${node.getAbsoluteRotation()}deg)`;
    textarea.focus();
    textarea.select();

    let editorClosed = false;

    const commit = () => {
      if (editorClosed) return;
      editorClosed = true;
      isEditingText = false;
      const nextText = textarea.value.trim();
      textarea.remove();

      if (!nextText) {
        board.elements = removeElementsById(board.elements, [id]);
        selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
        transformer.show();
        renderBoard();
        pushHistory("已删除空文字");
        return;
      }

      board.elements = board.elements.map((item) => (
        item.id === id ? { ...item, text: nextText } : item
      ));
      transformer.show();
      renderBoard();
      pushHistory("已编辑文字");
    };

    const cancel = () => {
      if (editorClosed) return;
      editorClosed = true;
      isEditingText = false;
      textarea.remove();

      if (!originalText) {
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
    textarea.addEventListener("blur", commit, { once: true });
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
    transformer.visible(currentTool === TOOLS.SELECT);
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
    const dirtyMarker = dirty ? " *" : "";
    activeFileLabel.textContent = `${activeFileName}${dirtyMarker}`;
    zoomLabel.textContent = `${Math.round(stage.scaleX() * 100)}%`;
    root.dataset.hasSelection = selectedIds.length > 0 ? "true" : "false";
    root.querySelectorAll("[data-background-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.backgroundMode === board.canvas.backgroundMode);
    });
    root.querySelectorAll("[data-shape-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.shapeTool === activeShapeTool);
    });
    root.querySelectorAll("[data-zoom-level]").forEach((button) => {
      button.classList.toggle(
        "active",
        Math.abs(Number(button.dataset.zoomLevel) - stage.scaleX()) < 0.02,
      );
    });
    updateContextPanel();
  }

  function updateContextPanel() {
    const selectedElements = board.elements.filter((element) => selectedIds.includes(element.id));
    const first = selectedElements[0];

    if (first) {
      hydrateControlsFromElement(first);
      const mode = selectedElements.every((element) => element.type === "text")
        ? "text"
        : selectedElements.every((element) => ["line", "arrow", "stroke"].includes(element.type))
          ? "linear"
          : "element";
      stylePanel.hidden = false;
      root.dataset.panelMode = mode;
      return;
    }

    if ([TOOLS.PEN, TOOLS.TEXT, TOOLS.SHAPE, ...SHAPE_TOOLS].includes(currentTool)) {
      stylePanel.hidden = false;
      const drawingTool = resolveActiveDrawingTool(currentTool, activeShapeTool);
      root.dataset.panelMode = currentTool === TOOLS.TEXT
        ? "tool-text"
        : ["line", "arrow", "pen"].includes(drawingTool) || currentTool === TOOLS.PEN
          ? "linear-tool"
          : "tool";
      return;
    }

    stylePanel.hidden = true;
    root.dataset.panelMode = "hidden";
  }

  function hydrateControlsFromElement(element) {
    if (element.stroke) colorInput.value = element.stroke;
    if (element.fill && element.fill !== "transparent") fillInput.value = element.fill;
    fillTransparentInput.checked = !element.fill || element.fill === "transparent";
    if (element.fill && element.type === "text") colorInput.value = element.fill;
    if (element.strokeWidth) widthInput.value = String(element.strokeWidth);
    if (element.fontSize) fontSizeInput.value = String(element.fontSize);
  }

  function setStatus(message) {
    window.clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.add("is-visible");
    statusTimer = window.setTimeout(() => {
      status.classList.remove("is-visible");
    }, 5000);
  }

}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
