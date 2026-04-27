import Konva from "konva";
import {
  createEmptyBoard,
  normalizeBoard,
  reorderElements,
  serializeBoard,
} from "./board-model.js";
import { splitStrokeByEraser, flattenPoints, getWorldPointer, normalizeRect, rectsIntersect } from "./geometry.js";
import { createHistory } from "./history.js";
import { createId } from "./ids.js";
import {
  BACKGROUND_ICON,
  MENU_ICON,
  PANEL_ICON,
  SHAPE_TOOLS,
  TOOLS,
  icon,
  menuItemsMarkup,
  toolButtonsMarkup,
} from "./ui-config.js";
const FILE_TYPES = [
  {
    description: "lofiBoard 白板文件",
    accept: { "application/json": [".lofibrd", ".json"] },
  },
];

export function createWhiteboardApp(root) {
  if (!root) return null;

  root.innerHTML = renderShell();

  const container = root.querySelector("#stage-container");
  const status = root.querySelector("[data-status]");
  const activeFileLabel = root.querySelector("[data-file-name]");
  const menuButton = root.querySelector("[data-menu-trigger]");
  const settingsButton = root.querySelector("[data-settings-trigger]");
  const mainMenu = root.querySelector("[data-main-menu]");
  const stylePanel = root.querySelector("[data-style-panel]");
  const colorInput = root.querySelector("[data-control='color']");
  const fillInput = root.querySelector("[data-control='fill']");
  const widthInput = root.querySelector("[data-control='width']");
  const fontSizeInput = root.querySelector("[data-control='font-size']");
  const zoomLabel = root.querySelector("[data-zoom]");

  let board = createEmptyBoard();
  let history = createHistory(board);
  let currentTool = TOOLS.PEN;
  let selectedIds = [];
  let fileHandle = null;
  let activeFileName = "未命名白板";
  let isSpaceDown = false;
  let isPanning = false;
  let panStart = null;
  let strokeDraft = null;
  let shapeDraft = null;
  let selectionDraft = null;
  let eraseSnapshot = null;
  let isMainMenuOpen = false;
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

  function renderShell() {
    return `
      <div class="app-shell">
        <header class="topbar">
          <div class="brand-menu">
            <button type="button" class="board-trigger" data-menu-trigger aria-haspopup="true" aria-expanded="false">
              <span class="brand-mark"></span>
              <span class="board-title">
                <strong>lofiBoard</strong>
                <span data-file-name>未命名白板</span>
              </span>
            </button>
            <button type="button" class="settings-trigger" data-settings-trigger title="白板菜单" aria-label="白板菜单">
              ${icon(MENU_ICON)}
            </button>
            <div class="main-menu" data-main-menu hidden>
              <div class="menu-section">
                ${menuItemsMarkup()}
              </div>
              <div class="menu-section">
                <div class="menu-heading">${icon(BACKGROUND_ICON)}<span>画布背景</span></div>
                <div class="segmented-control" role="group" aria-label="画布背景">
                  <button type="button" data-background-mode="dots">点阵</button>
                  <button type="button" data-background-mode="plain">纯白</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <aside class="style-panel" data-style-panel aria-label="属性">
          <div class="panel-title">${icon(PANEL_ICON)}<span>属性</span></div>
          <label class="control-line">
            线条
            <input data-control="color" type="color" value="#111827" />
          </label>
          <label class="control-fill">
            填充
            <input data-control="fill" type="color" value="#ffffff" />
          </label>
          <label class="control-width">
            粗细
            <input data-control="width" type="range" min="1" max="28" value="6" />
          </label>
          <label class="control-font">
            字号
            <input data-control="font-size" type="range" min="12" max="96" value="28" />
          </label>
          <div class="quick-actions">
            <button type="button" data-action="bring-front">置顶</button>
            <button type="button" data-action="send-back">置底</button>
            <button type="button" data-action="delete-selection">删除</button>
          </div>
        </aside>

        <main id="stage-container" class="stage-container"></main>

        <nav class="tool-dock" aria-label="白板工具">
          ${toolButtonsMarkup()}
        </nav>

        <footer class="statusbar">
          <span data-status>就绪</span>
          <span data-zoom>100%</span>
        </footer>
      </div>
    `;
  }

  function hydrateControls() {
    for (const button of root.querySelectorAll("[data-tool]")) {
      button.addEventListener("click", () => setTool(button.dataset.tool));
    }

    menuButton.addEventListener("click", toggleMainMenu);
    settingsButton.addEventListener("click", toggleMainMenu);

    for (const button of root.querySelectorAll("[data-action]")) {
      button.addEventListener("click", () => runAction(button.dataset.action));
    }

    for (const button of root.querySelectorAll("[data-background-mode]")) {
      button.addEventListener("click", () => setBackgroundMode(button.dataset.backgroundMode));
    }

    colorInput.addEventListener("input", applyStyleToSelection);
    fillInput.addEventListener("input", applyStyleToSelection);
    widthInput.addEventListener("input", applyStyleToSelection);
    fontSizeInput.addEventListener("input", applyStyleToSelection);
  }

  function bindStageEvents() {
    stage.on("wheel", handleWheel);
    stage.on("pointerdown", handlePointerDown);
    stage.on("pointermove", handlePointerMove);
    stage.on("pointerup pointercancel", handlePointerUp);
    stage.container().addEventListener("contextmenu", (event) => event.preventDefault());

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
      clear: clearBoard,
      "reset-view": resetView,
      "bring-front": bringSelectionToFront,
      "send-back": sendSelectionToBack,
      "delete-selection": deleteSelection,
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
    settingsButton.classList.toggle("active", nextOpen);
  }

  function bindUiEvents() {
    window.addEventListener("resize", () => {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
      updateGrid();
    });

    window.addEventListener("pointerdown", (event) => {
      if (!isMainMenuOpen) return;
      if (event.target.closest("[data-main-menu], [data-menu-trigger], [data-settings-trigger]")) {
        return;
      }
      closeMainMenu();
    });
  }

  function bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLTextAreaElement) return;

      if (event.code === "Space") {
        isSpaceDown = true;
        stage.container().classList.add("is-panning");
        event.preventDefault();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (event.shiftKey) {
          saveBoardFileAs();
        } else {
          saveBoardFile();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openBoardFile();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        restoreFromHistory(history.undo(), "已撤销");
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        restoreFromHistory(history.redo(), "已重做");
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelection();
      }

      const shortcutMap = {
        v: TOOLS.SELECT,
        b: TOOLS.PEN,
        e: TOOLS.ERASER_STROKE,
        o: TOOLS.ERASER_OBJECT,
        t: TOOLS.TEXT,
        r: TOOLS.RECT,
        l: TOOLS.LINE,
        a: TOOLS.ARROW,
      };

      if (!event.ctrlKey && !event.metaKey && shortcutMap[event.key.toLowerCase()]) {
        setTool(shortcutMap[event.key.toLowerCase()]);
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        isSpaceDown = false;
        stage.container().classList.remove("is-panning");
      }
    });
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

  function handlePointerDown(event) {
    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;

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
      eraseStrokeAt(worldPoint);
      showEraser(worldPoint);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT) {
      eraseSnapshot = snapshotBoard();
      eraseObjectAt(event.target);
      showEraser(worldPoint);
      return;
    }

    if (currentTool === TOOLS.TEXT) {
      const element = createTextElement(worldPoint);
      addElement(element, "已添加文字");
      selectIds([element.id]);
      requestAnimationFrame(() => editTextElement(element.id));
      return;
    }

    if (SHAPE_TOOLS.has(currentTool)) {
      startShape(worldPoint);
    }
  }

  function handlePointerMove(event) {
    const worldPoint = getWorldPointer(stage);
    if (!worldPoint) return;

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

    if (currentTool === TOOLS.ERASER_STROKE && eraseSnapshot) {
      eraseStrokeAt(worldPoint);
      showEraser(worldPoint);
      return;
    }

    if (currentTool === TOOLS.ERASER_OBJECT && eraseSnapshot) {
      eraseObjectAt(event.target);
      showEraser(worldPoint);
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

    if (eraseSnapshot) {
      eraserCursor.visible(false);
      overlayLayer.batchDraw();
      if (JSON.stringify(eraseSnapshot.elements) !== JSON.stringify(board.elements)) {
        pushHistory("已擦除内容");
      }
      eraseSnapshot = null;
    }
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

    clearSelection();
    selectionDraft = { start: worldPoint };
    selectionRect.setAttrs({
      ...normalizeRect(worldPoint, worldPoint),
      visible: true,
    });
    contentLayer.batchDraw();
  }

  function startStroke(worldPoint, pressure = 0.5) {
    const points = [{ ...worldPoint, pressure: pressure || 0.5 }];
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
    strokeDraft.element.points.push({ ...worldPoint, pressure: pressure || 0.5 });
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
    const element = createShapeElement(currentTool, worldPoint, worldPoint);
    const node = createNode(element);
    node.listening(false);
    contentLayer.add(node);
    shapeDraft = { start: worldPoint, element, node };
  }

  function updateShapeDraft(worldPoint) {
    const updated = createShapeElement(currentTool, shapeDraft.start, worldPoint);
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

  function eraseStrokeAt(worldPoint) {
    let changed = false;
    const nextElements = [];

    for (const element of board.elements) {
      if (element.type !== "stroke") {
        nextElements.push(element);
        continue;
      }

      const fragments = splitStrokeByEraser(element, worldPoint, Number(widthInput.value) * 1.7);
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

  function showEraser(worldPoint) {
    eraserCursor.position(worldPoint);
    eraserCursor.radius(Number(widthInput.value) * 1.7);
    eraserCursor.visible(true);
    overlayLayer.batchDraw();
  }

  function createTextElement(worldPoint) {
    return {
      id: createId("text"),
      type: "text",
      x: worldPoint.x,
      y: worldPoint.y,
      text: "双击编辑文字",
      width: 280,
      fontSize: Number(fontSizeInput.value),
      fontFamily: "Inter, system-ui, sans-serif",
      fill: colorInput.value,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: board.elements.length,
    };
  }

  function createShapeElement(type, start, end) {
    const rect = normalizeRect(start, end);
    const common = {
      id: shapeDraft?.element?.id ?? createId(type),
      type,
      stroke: colorInput.value,
      strokeWidth: Number(widthInput.value),
      fill: fillInput.value,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: board.elements.length,
    };

    if (type === TOOLS.RECT) {
      return { ...common, type: "rect", ...rect };
    }

    if (type === TOOLS.ELLIPSE) {
      return {
        ...common,
        type: "ellipse",
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        radiusX: rect.width / 2,
        radiusY: rect.height / 2,
      };
    }

    const points = [start.x, start.y, end.x, end.y];
    return {
      ...common,
      type,
      x: 0,
      y: 0,
      points,
      fill: colorInput.value,
    };
  }

  function isTinyElement(element) {
    if (element.type === "rect") return element.width < 4 || element.height < 4;
    if (element.type === "ellipse") return element.radiusX < 3 || element.radiusY < 3;
    if (element.type === "line" || element.type === "arrow") {
      return Math.hypot(element.points[2] - element.points[0], element.points[3] - element.points[1]) < 4;
    }
    return false;
  }

  function addElement(element, message) {
    board.elements = reorderElements([...board.elements, element]);
    renderBoard();
    pushHistory(message);
  }

  function createNode(element) {
    let node;
    const common = {
      id: element.id,
      name: "element",
      draggable: currentTool === TOOLS.SELECT,
      rotation: element.rotation ?? 0,
      scaleX: element.scaleX ?? 1,
      scaleY: element.scaleY ?? 1,
    };

    if (element.type === "stroke") {
      node = new Konva.Line({
        ...common,
        x: element.x ?? 0,
        y: element.y ?? 0,
        points: flattenPoints(element.points ?? []),
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        lineCap: "round",
        lineJoin: "round",
        tension: 0.45,
      });
    } else if (element.type === "text") {
      node = new Konva.Text({
        ...common,
        x: element.x,
        y: element.y,
        text: element.text,
        width: element.width,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fill: element.fill,
        lineHeight: 1.25,
      });
      node.on("dblclick dbltap", () => editTextElement(element.id));
    } else if (element.type === "rect") {
      node = new Konva.Rect({
        ...common,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        fill: resolveFill(element.fill),
      });
    } else if (element.type === "ellipse") {
      node = new Konva.Ellipse({
        ...common,
        x: element.x,
        y: element.y,
        radiusX: element.radiusX,
        radiusY: element.radiusY,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        fill: resolveFill(element.fill),
      });
    } else if (element.type === "line") {
      node = new Konva.Line({
        ...common,
        x: element.x ?? 0,
        y: element.y ?? 0,
        points: element.points,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        lineCap: "round",
        lineJoin: "round",
      });
    } else if (element.type === "arrow") {
      node = new Konva.Arrow({
        ...common,
        x: element.x ?? 0,
        y: element.y ?? 0,
        points: element.points,
        stroke: element.stroke,
        fill: element.fill ?? element.stroke,
        strokeWidth: element.strokeWidth,
        pointerLength: 18,
        pointerWidth: 18,
        lineCap: "round",
        lineJoin: "round",
      });
    }

    node.on("dragend", () => {
      syncNodeToElement(node);
      pushHistory("已移动对象");
    });
    node.on("click tap", (event) => {
      if (currentTool !== TOOLS.SELECT) return;
      event.cancelBubble = true;
      const id = getElementIdFromNode(node);
      if (event.evt.shiftKey) {
        toggleSelection(id);
      } else {
        selectIds([id]);
      }
    });

    return node;
  }

  function applyElementToNode(element, node) {
    node.setAttrs(createNodeAttrs(element));
  }

  function createNodeAttrs(element) {
    if (element.type === "rect") {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        fill: resolveFill(element.fill),
      };
    }
    if (element.type === "ellipse") {
      return {
        x: element.x,
        y: element.y,
        radiusX: element.radiusX,
        radiusY: element.radiusY,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        fill: resolveFill(element.fill),
      };
    }
    if (element.type === "line" || element.type === "arrow") {
      return {
        points: element.points,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        fill: element.fill ?? element.stroke,
      };
    }
    return {};
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
        fill: fillInput.value,
        strokeWidth: Number(widthInput.value),
      };
    });

    renderBoard();
    pushHistory("已更新样式");
  }

  function deleteSelection() {
    if (selectedIds.length === 0) return;
    board.elements = reorderElements(
      board.elements.filter((element) => !selectedIds.includes(element.id)),
    );
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

    transformer.hide();
    node.hide();
    contentLayer.draw();

    const textarea = document.createElement("textarea");
    textarea.className = "text-editor";
    textarea.value = element.text;
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
      element.text = textarea.value.trim() || "双击编辑文字";
      textarea.remove();
      node.show();
      transformer.show();
      renderBoard();
      pushHistory("已编辑文字");
    };

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        commit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        editorClosed = true;
        textarea.remove();
        node.show();
        transformer.show();
        renderBoard();
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
      const [handle] = await window.showOpenFilePicker({
        types: FILE_TYPES,
        excludeAcceptAllOption: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      board = normalizeBoard(JSON.parse(text));
      fileHandle = handle;
      activeFileName = file.name;
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
      const handle = await window.showSaveFilePicker({
        suggestedName: `${activeFileName.replace(/\.lofibrd$/i, "") || "untitled"}.lofibrd`,
        types: FILE_TYPES,
      });
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
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(serializeCurrentBoard(), null, 2));
    await writable.close();
  }

  function exportPng() {
    const backgroundNodes = createExportBackground();
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

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${activeFileName.replace(/\.lofibrd$/i, "") || "lofiBoard"}.png`;
    link.click();
    link.remove();
    setStatus("已导出当前视图 PNG");
  }

  function createExportBackground() {
    const scale = stage.scaleX();
    const viewport = {
      x: -stage.x() / scale,
      y: -stage.y() / scale,
      width: stage.width() / scale,
      height: stage.height() / scale,
    };
    const background = new Konva.Rect({
      ...viewport,
      fill: "#ffffff",
      listening: false,
    });
    contentLayer.add(background);
    background.moveToBottom();

    if (board.canvas.backgroundMode !== "dots") {
      return [background];
    }

    const dotGroup = new Konva.Group({ listening: false });
    const spacing = 32;
    const startX = Math.floor(viewport.x / spacing) * spacing;
    const endX = viewport.x + viewport.width;
    const startY = Math.floor(viewport.y / spacing) * spacing;
    const endY = viewport.y + viewport.height;

    for (let x = startX; x <= endX; x += spacing) {
      for (let y = startY; y <= endY; y += spacing) {
        dotGroup.add(
          new Konva.Circle({
            x,
            y,
            radius: 1,
            fill: "rgba(100, 116, 139, 0.38)",
            listening: false,
          }),
        );
      }
    }

    contentLayer.add(dotGroup);
    dotGroup.moveToBottom();
    background.moveToBottom();
    return [background, dotGroup];
  }

  function supportsFileSystemAccess() {
    return "showOpenFilePicker" in window && "showSaveFilePicker" in window;
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
    updateContextPanel();
  }

  function updateContextPanel() {
    const selectedElements = board.elements.filter((element) => selectedIds.includes(element.id));
    const first = selectedElements[0];

    if (first) {
      hydrateControlsFromElement(first);
      const mode = selectedElements.every((element) => element.type === "text") ? "text" : "element";
      stylePanel.hidden = false;
      root.dataset.panelMode = mode;
      return;
    }

    if ([TOOLS.PEN, TOOLS.TEXT, ...SHAPE_TOOLS].includes(currentTool)) {
      stylePanel.hidden = false;
      root.dataset.panelMode = currentTool === TOOLS.TEXT ? "tool-text" : "tool";
      return;
    }

    stylePanel.hidden = true;
    root.dataset.panelMode = "hidden";
  }

  function hydrateControlsFromElement(element) {
    if (element.stroke) colorInput.value = element.stroke;
    if (element.fill && element.fill !== "transparent") fillInput.value = element.fill;
    if (element.fill && element.type === "text") colorInput.value = element.fill;
    if (element.strokeWidth) widthInput.value = String(element.strokeWidth);
    if (element.fontSize) fontSizeInput.value = String(element.fontSize);
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function resolveFill(fill) {
    return fill === "transparent" ? undefined : fill;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
