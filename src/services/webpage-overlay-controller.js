import { Edit, ExternalLink } from "lucide-static";
import { icon } from "../ui/config.js";
import {
  getElementLayerValue,
  getWebpageStackIndex,
  getWebpageStackZIndex,
} from "../app/rendering/layer-order.js";
import { getWebpageTitle, normalizeWebpageUrl } from "./webpage.js";

const MIN_WIDTH = 160;
const MIN_HEIGHT = 120;
const DRAG_THRESHOLD = 0.5;
const WEBPAGE_CONTROL_Z_INDEX = 100000;
const RESIZE_ANCHORS = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
];

function rotateLocalVector(x, y, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  };
}

function getResizePatch(startElement, anchor, worldDx, worldDy) {
  const angle = (startElement.rotation * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const localDx = worldDx * cosine + worldDy * sine;
  const localDy = -worldDx * sine + worldDy * cosine;
  const scaleX = Math.max(0.01, Math.abs(startElement.scaleX));
  const scaleY = Math.max(0.01, Math.abs(startElement.scaleY));
  const changesLeft = anchor.includes("left");
  const changesRight = anchor.includes("right");
  const changesTop = anchor.includes("top");
  const changesBottom = anchor.includes("bottom");
  const width = changesLeft || changesRight
    ? Math.max(MIN_WIDTH, startElement.width + (changesLeft ? -localDx : localDx) / scaleX)
    : startElement.width;
  const height = changesTop || changesBottom
    ? Math.max(MIN_HEIGHT, startElement.height + (changesTop ? -localDy : localDy) / scaleY)
    : startElement.height;
  const localPositionShift = {
    x: changesLeft ? (startElement.width - width) * scaleX : 0,
    y: changesTop ? (startElement.height - height) * scaleY : 0,
  };
  const positionShift = rotateLocalVector(localPositionShift.x, localPositionShift.y, angle);

  return {
    x: startElement.x + positionShift.x,
    y: startElement.y + positionShift.y,
    width,
    height,
  };
}

export function createWebpageOverlayController({
  container,
  getElements = () => [],
  getSelectedIds = () => [],
  getCurrentTool = () => "select",
  isCanvasInteractionActive = () => false,
  syncCanvasInteractionShield = () => {},
  getSelectableCanvasElementIdAtClientPoint = () => null,
  getViewport = () => ({ x: 0, y: 0, scale: 1 }),
  isElementLocked = () => false,
  setElements = () => {},
  syncWebpageNode = () => {},
  setWebpageNodeVisible = () => {},
  selectIds = () => {},
  promptValue = (_, fallback = "") => fallback,
  renderBoard = () => {},
  pushHistory = () => {},
  schedulePersistCurrentDraft = () => {},
  setStatus = () => {},
  documentRef = container?.ownerDocument ?? globalThis.document,
  windowRef = documentRef?.defaultView ?? globalThis.window,
} = {}) {
  if (!container || !documentRef?.createElement) {
    return {
      destroy() {},
      getOverlay() { return null; },
      sync() {},
    };
  }

  const layer = documentRef.createElement("div");
  layer.className = "webpage-overlay-layer";
  container.appendChild(layer);

  const controlsLayer = documentRef.createElement("div");
  controlsLayer.className = "webpage-overlay-controls-layer";
  container.appendChild(controlsLayer);

  const overlays = new Map();
  let interaction = null;
  let webpageInteractionTargetId = null;

  function setWebpageInteractionTarget(elementId = null) {
    const nextId = elementId || null;
    if (webpageInteractionTargetId === nextId) return;
    webpageInteractionTargetId = nextId;
    container.classList.toggle("is-webpage-interaction-hover", Boolean(nextId));
  }

  function getWebpageIdAtClientPoint(clientX, clientY) {
    if (getCurrentTool() !== "select" || isCanvasInteractionActive()) return null;
    const x = Number(clientX);
    const y = Number(clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const elements = getElements();
    const records = [...overlays.values()].sort((left, right) => (
      getWebpageStackIndex(elements, right.elementId) - getWebpageStackIndex(elements, left.elementId)
    ));
    for (const record of records) {
      const rect = record.wrapper.getBoundingClientRect?.();
      if (!rect) continue;
      const left = Number(rect.left) || 0;
      const top = Number(rect.top) || 0;
      const right = Number(rect.right) || left + (Number(rect.width) || 0);
      const bottom = Number(rect.bottom) || top + (Number(rect.height) || 0);
      if (x >= left && x <= right && y >= top && y <= bottom) {
        const canvasId = getSelectableCanvasElementIdAtClientPoint(x, y);
        const canvasElement = elements.find((element) => element.id === canvasId);
        const webpageElement = elements.find((element) => element.id === record.elementId);
        if (canvasElement && webpageElement
          && getElementLayerValue(canvasElement) > getElementLayerValue(webpageElement)) {
          return null;
        }
        return record.elementId;
      }
    }
    return null;
  }

  function handleContainerPointerMove(event) {
    setWebpageInteractionTarget(getWebpageIdAtClientPoint(event.clientX, event.clientY));
  }

  function handleContainerPointerLeave() {
    setWebpageInteractionTarget();
  }

  function handleWebpagePointerLeave() {
    setWebpageInteractionTarget();
  }

  container.addEventListener("pointermove", handleContainerPointerMove, true);
  container.addEventListener("pointerleave", handleContainerPointerLeave);

  function createOverlay(element) {
    const wrapper = documentRef.createElement("div");
    wrapper.className = "webpage-overlay";
    wrapper.dataset.elementId = element.id;

    const iframe = documentRef.createElement("iframe");
    iframe.className = "webpage-overlay-frame";
    iframe.title = "嵌入网页";
    iframe.setAttribute("tabindex", "0");
    iframe.setAttribute("loading", "eager");
    iframe.setAttribute("allow", "fullscreen; clipboard-read; clipboard-write");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    const chrome = documentRef.createElement("div");
    chrome.className = "webpage-overlay-chrome";
    chrome.dataset.webpageDrag = "true";
    chrome.setAttribute("role", "button");
    chrome.setAttribute("tabindex", "0");
    chrome.setAttribute("aria-label", "拖动网页");

    const title = documentRef.createElement("span");
    title.className = "webpage-overlay-title";

    const editButton = documentRef.createElement("button");
    editButton.type = "button";
    editButton.className = "webpage-overlay-edit";
    editButton.title = "编辑网址";
    editButton.setAttribute("aria-label", "编辑网址");
    editButton.dataset.webpageEdit = "true";
    editButton.innerHTML = icon(Edit);

    const openButton = documentRef.createElement("button");
    openButton.type = "button";
    openButton.className = "webpage-overlay-open";
    openButton.title = "在新窗口打开";
    openButton.setAttribute("aria-label", "在新窗口打开");
    openButton.innerHTML = icon(ExternalLink);

    const resizeHandles = new Map();
    for (const anchor of RESIZE_ANCHORS) {
      const resizeHandle = documentRef.createElement("button");
      resizeHandle.type = "button";
      resizeHandle.className = `webpage-overlay-resize webpage-overlay-resize-handle webpage-overlay-resize-${anchor}`;
      resizeHandle.dataset.webpageResize = "true";
      resizeHandle.dataset.webpageResizeAnchor = anchor;
      resizeHandle.title = "调整网页大小";
      resizeHandle.setAttribute("aria-label", "调整网页大小");
      resizeHandles.set(anchor, resizeHandle);
    }

    chrome.append(title, editButton, openButton);
    wrapper.append(iframe);
    layer.appendChild(wrapper);
    wrapper.addEventListener("pointerleave", handleWebpagePointerLeave);

    const controls = documentRef.createElement("div");
    controls.className = "webpage-overlay-controls";
    controls.dataset.elementId = element.id;
    controls.append(chrome, ...resizeHandles.values());
    controlsLayer.appendChild(controls);

    const record = {
      elementId: element.id,
      wrapper,
      controls,
      iframe,
      title,
      chrome,
      editButton,
      openButton,
      resizeHandle: resizeHandles.get("bottom-right"),
      resizeHandles,
      source: "",
    };
    overlays.set(element.id, record);

    chrome.addEventListener("pointerdown", (event) => {
      if (event.target?.closest?.("button")) return;
      beginInteraction("move", element.id, event);
    });
    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      editWebpageUrl(element.id);
    });
    openButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openInNewWindow(element.id);
    });
    for (const [anchor, resizeHandle] of resizeHandles) {
      resizeHandle.addEventListener("pointerdown", (event) => {
        beginInteraction("resize", element.id, event, anchor);
      });
    }
    return record;
  }

  function openInNewWindow(elementId) {
    const element = getElements().find((item) => item.id === elementId);
    if (!element || !canInteract(element)) return;
    const src = normalizeWebpageUrl(element?.src);
    if (!src) return;
    const opened = windowRef?.open?.(src, "_blank", "noopener,noreferrer");
    if (opened === null) setStatus("浏览器阻止了新窗口，请允许弹出窗口");
  }

  function canInteract(element) {
    return canMove(element)
      && getSelectedIds().includes(element.id);
  }

  function canMove(element) {
    return getCurrentTool() === "select"
      && !isElementLocked(element.id);
  }

  function editWebpageUrl(elementId) {
    const element = getElements().find((item) => item.id === elementId);
    if (!element || !canInteract(element)) return;

    const value = promptValue(
      "请输入新的网页地址（例如 https://example.com）",
      normalizeWebpageUrl(element.src) || element.src || "",
    );
    const normalizedSrc = normalizeWebpageUrl(value);
    if (!normalizedSrc) {
      if (String(value ?? "").trim()) setStatus("请输入有效的 http(s) 网页地址");
      return;
    }
    if (normalizedSrc === normalizeWebpageUrl(element.src)) return;

    const nextElements = getElements().map((item) => (
      item.id === elementId ? { ...item, src: normalizedSrc } : item
    ));
    setElements(nextElements);
    renderBoard();
    pushHistory("已修改网页地址");
    schedulePersistCurrentDraft();
  }

  function sync(elements = getElements()) {
    syncCanvasInteractionShield();
    const viewport = getViewport() ?? {};
    const scale = Math.max(0.01, Number(viewport.scale) || 1);
    const currentTool = getCurrentTool();
    const pageInteractionMode = currentTool === "select" && !isCanvasInteractionActive();
    layer.classList.toggle("is-laser-mode", currentTool === "laser");
    layer.classList.toggle("is-page-interaction-mode", pageInteractionMode);
    controlsLayer.classList.remove("is-canvas-above-webpage");
    container.classList.remove("is-canvas-above-webpage");
    if (!pageInteractionMode) setWebpageInteractionTarget();
    const visibleIds = new Set();
    const selectedIds = new Set(getSelectedIds());

    for (const element of elements) {
      if (element?.type !== "webpage") continue;
      visibleIds.add(element.id);
      const record = overlays.get(element.id) ?? createOverlay(element);
      const src = normalizeWebpageUrl(element.src);
      const selected = selectedIds.has(element.id);
      const interactive = canInteract(element);
      const movable = canMove(element);
      const webpageStackIndex = getWebpageStackIndex(elements, element.id);
      const width = Math.max(MIN_WIDTH, Number(element.width) || MIN_WIDTH);
      const height = Math.max(MIN_HEIGHT, Number(element.height) || MIN_HEIGHT);
      const toolbarHeight = Math.max(24, 30 * scale);

      for (const node of [record.wrapper, record.controls]) {
        node.style.left = `${(Number(viewport.x) || 0) + (Number(element.x) || 0) * scale}px`;
        node.style.top = `${(Number(viewport.y) || 0) + (Number(element.y) || 0) * scale}px`;
        node.style.width = `${width * scale}px`;
        node.style.height = `${height * scale}px`;
        node.style.transform = `rotate(${Number(element.rotation) || 0}deg) scale(${Number(element.scaleX) || 1}, ${Number(element.scaleY) || 1})`;
        node.style.setProperty("--webpage-toolbar-height", `${toolbarHeight}px`);
        node.classList.toggle("is-selected", selectedIds.has(element.id));
        node.classList.toggle("is-interactive", interactive);
        node.classList.toggle("is-moveable", movable);
        node.classList.toggle("is-locked", Boolean(element.locked));
      }
      record.wrapper.style.zIndex = String(getWebpageStackZIndex(webpageStackIndex));
      record.controls.style.zIndex = String(selected ? WEBPAGE_CONTROL_Z_INDEX : getWebpageStackZIndex(webpageStackIndex));
      record.controls.hidden = !selected;
      record.wrapper.style.pointerEvents = pageInteractionMode ? "auto" : "none";
      record.controls.style.pointerEvents = selected ? "auto" : "none";
      record.chrome.style.pointerEvents = interactive ? "auto" : "none";
      for (const button of [record.editButton, record.openButton, ...record.resizeHandles.values()]) {
        button.style.pointerEvents = interactive ? "auto" : "none";
      }
      record.iframe.style.pointerEvents = pageInteractionMode ? "auto" : "none";
      record.iframe.style.top = selected ? `${toolbarHeight}px` : "0px";
      record.iframe.style.height = selected ? `calc(100% - ${toolbarHeight}px)` : "100%";
      record.title.textContent = getWebpageTitle(src || element.src);
      setWebpageNodeVisible(element.id, false);

      if (src && record.source !== src) {
        record.source = src;
        record.iframe.src = src;
      }
    }

    for (const [id, record] of overlays) {
      if (visibleIds.has(id)) continue;
      record.wrapper.remove();
      record.controls.remove();
      overlays.delete(id);
    }
    if (webpageInteractionTargetId && !visibleIds.has(webpageInteractionTargetId)) {
      setWebpageInteractionTarget();
    }
  }

  function beginInteraction(kind, elementId, event, anchor = "bottom-right") {
    if (event.button !== undefined && event.button !== 0) return;
    const element = getElements().find((item) => item.id === elementId);
    if (!element || !canInteract(element)) return;
    const record = overlays.get(elementId);
    if (!record) return;

    event.preventDefault();
    event.stopPropagation();
    selectIds([elementId]);
    const scale = Math.max(0.01, Number(getViewport()?.scale) || 1);
    interaction = {
      kind,
      elementId,
      anchor,
      pointerId: event.pointerId,
      startClientX: Number(event.clientX) || 0,
      startClientY: Number(event.clientY) || 0,
      startElement: {
        x: Number(element.x) || 0,
        y: Number(element.y) || 0,
        width: Math.max(MIN_WIDTH, Number(element.width) || MIN_WIDTH),
        height: Math.max(MIN_HEIGHT, Number(element.height) || MIN_HEIGHT),
        rotation: Number(element.rotation) || 0,
        scaleX: Number(element.scaleX) || 1,
        scaleY: Number(element.scaleY) || 1,
      },
      scale,
      moved: false,
      captureTarget: event.currentTarget ?? record.controls,
    };
    interaction.captureTarget.setPointerCapture?.(event.pointerId);
    windowRef?.addEventListener?.("pointermove", handlePointerMove);
    windowRef?.addEventListener?.("pointerup", finishInteraction);
    windowRef?.addEventListener?.("pointercancel", cancelInteraction);
  }

  function handlePointerMove(event) {
    if (!interaction) return;
    if (interaction.pointerId !== undefined && event.pointerId !== interaction.pointerId) return;
    const element = getElements().find((item) => item.id === interaction.elementId);
    if (!element) return finishInteraction(event);

    const screenDx = (Number(event.clientX) || 0) - interaction.startClientX;
    const screenDy = (Number(event.clientY) || 0) - interaction.startClientY;
    const worldDx = screenDx / interaction.scale;
    const worldDy = screenDy / interaction.scale;
    let patch;

    if (interaction.kind === "move") {
      patch = {
        x: interaction.startElement.x + worldDx,
        y: interaction.startElement.y + worldDy,
      };
      interaction.moved = interaction.moved || Math.hypot(worldDx, worldDy) > DRAG_THRESHOLD;
    } else {
      patch = getResizePatch(interaction.startElement, interaction.anchor, worldDx, worldDy);
      interaction.moved = interaction.moved
        || Math.abs(patch.x - interaction.startElement.x) > DRAG_THRESHOLD
        || Math.abs(patch.y - interaction.startElement.y) > DRAG_THRESHOLD
        || Math.abs(patch.width - interaction.startElement.width) > DRAG_THRESHOLD
        || Math.abs(patch.height - interaction.startElement.height) > DRAG_THRESHOLD;
    }

    const nextElements = getElements().map((item) => (
      item.id === interaction.elementId ? { ...item, ...patch } : item
    ));
    const nextElement = nextElements.find((item) => item.id === interaction.elementId);
    setElements(nextElements);
    syncWebpageNode(nextElement);
    sync(nextElements);
    event.preventDefault?.();
  }

  function clearInteractionListeners() {
    windowRef?.removeEventListener?.("pointermove", handlePointerMove);
    windowRef?.removeEventListener?.("pointerup", finishInteraction);
    windowRef?.removeEventListener?.("pointercancel", cancelInteraction);
  }

  function finishInteraction(event) {
    if (!interaction) return;
    if (interaction.pointerId !== undefined && event?.pointerId !== undefined && event.pointerId !== interaction.pointerId) return;
    const current = interaction;
    current.captureTarget?.releasePointerCapture?.(current.pointerId);
    clearInteractionListeners();
    interaction = null;
    if (!current.moved) return;
    renderBoard();
    pushHistory(current.kind === "move" ? "已移动网页" : "已调整网页大小");
    schedulePersistCurrentDraft();
  }

  function cancelInteraction(event) {
    if (!interaction) return;
    if (interaction.pointerId !== undefined && event?.pointerId !== undefined && event.pointerId !== interaction.pointerId) return;
    const current = interaction;
    current.captureTarget?.releasePointerCapture?.(current.pointerId);
    clearInteractionListeners();
    interaction = null;
    const restoredElements = getElements().map((item) => (
      item.id === current.elementId
        ? { ...item, ...current.startElement }
        : item
    ));
    const restoredElement = restoredElements.find((item) => item.id === current.elementId);
    setElements(restoredElements);
    syncWebpageNode(restoredElement);
    sync(restoredElements);
    renderBoard();
  }

  function destroy() {
    clearInteractionListeners();
    interaction = null;
    for (const record of overlays.values()) {
      record.wrapper.remove();
      record.controls.remove();
    }
    overlays.clear();
    container.classList.remove("is-canvas-above-webpage");
    container.classList.remove("is-webpage-interaction-hover");
    container.removeEventListener("pointermove", handleContainerPointerMove, true);
    container.removeEventListener("pointerleave", handleContainerPointerLeave);
    layer.remove();
    controlsLayer.remove();
  }

  return {
    destroy,
    getOverlay: (id) => overlays.get(id)?.wrapper ?? null,
    sync,
  };
}
