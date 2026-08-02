import { Edit, ExternalLink } from "lucide-static";
import { icon } from "../ui/config.js";
import {
  getWebpageStackIndex,
  getWebpageStackZIndex,
  getOrderedElements,
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
  getCanvasInteractionAtClientPoint = () => null,
  getCanvasElementHitProxies = () => [],
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

  const higherHitProxyLayer = documentRef.createElement("div");
  higherHitProxyLayer.className = "webpage-higher-hit-proxy-layer";
  container.appendChild(higherHitProxyLayer);

  const overlays = new Map();
  let interaction = null;
  let webpageInteractionTargetId = null;

  function isPageInteractionMode() {
    return getCurrentTool() === "select" && !isCanvasInteractionActive();
  }

  function hasBlockingCanvasSelection() {
    // A non-webpage selection must keep canvas pointer events active so blank
    // clicks inside a webpage frame can deselect the canvas element.
    const selectedIds = getSelectedIds() || [];
    if (!selectedIds.length) return false;
    const elements = getElements();
    return selectedIds.some((id) => {
      const element = elements.find((item) => item.id === id);
      return Boolean(element && element.type !== "webpage");
    });
  }

  function getOverlayStackZIndex(elementId, { selected = false } = {}) {
    // Keep the normal interleaved stack position even while the webpage is the
    // content-interaction target. Raising the opaque iframe above higher canvas
    // bands would visually hide strokes/shapes that sort above the webpage.
    // Hit routing is handled by pointer-events (canvas PE none + iframe PE auto).
    void selected;
    const webpageStackIndex = getWebpageStackIndex(getElements(), elementId);
    return getWebpageStackZIndex(webpageStackIndex);
  }

  function getControlsStackZIndex(elementId, { selected = false } = {}) {
    const webpageStackIndex = getWebpageStackIndex(getElements(), elementId);
    return WEBPAGE_CONTROL_Z_INDEX + webpageStackIndex + (selected ? 1000 : 0);
  }

  function syncWebpagePointerRouting() {
    const pageInteractionMode = isPageInteractionMode();
    const selectedIds = new Set(getSelectedIds());
    const enableWebpageContent = pageInteractionMode && Boolean(webpageInteractionTargetId);
    // Disable the Konva host box itself (not only its canvases). With PE-none children,
    // the host would still capture hits and block a non-topmost lifted iframe.
    // Canvas inline PE is owned by layered-content; the CSS hover rule overrides it.
    const konvaContent = container.querySelector?.(".konvajs-content");
    if (konvaContent?.style) {
      konvaContent.style.pointerEvents = enableWebpageContent ? "none" : "";
    }
    for (const [id, record] of overlays) {
      // Only the non-occluded webpage under the pointer may receive content input.
      // Otherwise higher full-viewport canvas bands permanently steal hits, or the
      // iframe blocks selecting canvas elements that sort above the webpage.
      const enableIframe = pageInteractionMode && webpageInteractionTargetId === id;
      record.iframe.style.pointerEvents = enableIframe ? "auto" : "none";
      record.wrapper.style.zIndex = String(getOverlayStackZIndex(id, {
        selected: selectedIds.has(id),
      }));
      record.controls.style.zIndex = String(getControlsStackZIndex(id, {
        selected: selectedIds.has(id),
      }));
    }
    syncHigherHitProxies();
  }

  function clearHigherHitProxies() {
    higherHitProxyLayer.replaceChildren();
  }

  function syncHigherHitProxies() {
    clearHigherHitProxies();
    if (!isPageInteractionMode() || !webpageInteractionTargetId) return;

    // DOM hit proxies sit above the iframe (but below title-bar controls) so higher
    // canvas strokes remain clickable while content-interaction hover disables canvas PE.
    const proxies = getCanvasElementHitProxies(webpageInteractionTargetId) || [];
    for (const proxy of proxies) {
      const elementId = proxy?.elementId;
      if (!elementId) continue;
      const left = Number(proxy.left);
      const top = Number(proxy.top);
      const width = Number(proxy.width);
      const height = Number(proxy.height);
      if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;

      const node = documentRef.createElement("div");
      node.className = "webpage-higher-hit-proxy";
      node.dataset.elementId = elementId;
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
      node.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        setWebpageInteractionTarget(null);
        selectIds([elementId]);
      });
      higherHitProxyLayer.appendChild(node);
    }
  }

  function setWebpageInteractionTarget(elementId = null) {
    const nextId = elementId || null;
    if (webpageInteractionTargetId === nextId) {
      syncWebpagePointerRouting();
      return;
    }
    webpageInteractionTargetId = nextId;
    container.classList.toggle("is-webpage-interaction-hover", Boolean(nextId));
    syncWebpagePointerRouting();
  }

  function getWebpageIdAtClientPoint(clientX, clientY) {
    if (getCurrentTool() !== "select" || isCanvasInteractionActive()) return null;
    if (hasBlockingCanvasSelection()) return null;
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
        const canvasInteraction = getCanvasInteractionAtClientPoint(x, y);
        const canvasElement = elements.find((element) => element.id === canvasInteraction?.elementId);
        const webpageElement = elements.find((element) => element.id === record.elementId);
        const orderedElements = getOrderedElements(elements);
        const canvasIndex = orderedElements.indexOf(canvasElement);
        const webpageIndex = orderedElements.indexOf(webpageElement);
        const canvasIsAboveWebpage = canvasElement && webpageElement
          ? canvasIndex > webpageIndex
          : Boolean(canvasInteraction?.blocksWebpage);
        if (canvasIsAboveWebpage && canvasInteraction?.blocksWebpage) {
          return null;
        }
        return record.elementId;
      }
    }
    return null;
  }

  function updateWebpageInteractionFromEvent(event) {
    setWebpageInteractionTarget(getWebpageIdAtClientPoint(event.clientX, event.clientY));
  }

  function handleContainerPointerMove(event) {
    updateWebpageInteractionFromEvent(event);
  }

  function handleContainerPointerEnter(event) {
    updateWebpageInteractionFromEvent(event);
  }

  function handleContainerPointerDown(event) {
    if (!isPageInteractionMode()) {
      updateWebpageInteractionFromEvent(event);
      return;
    }
    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      updateWebpageInteractionFromEvent(event);
      return;
    }

    // When content-interaction hover is active, canvas PE is none and higher strokes stay
    // painted above the iframe but are not hittable. Steal the click so the user can select them.
    // Only steal while a webpage is already the interaction target — otherwise canvas PE is auto
    // and stage pointer handling must receive the event.
    if (webpageInteractionTargetId) {
      const canvasInteraction = getCanvasInteractionAtClientPoint(x, y);
      if (canvasInteraction?.blocksWebpage && canvasInteraction.elementId) {
        setWebpageInteractionTarget(null);
        selectIds([canvasInteraction.elementId]);
        event.preventDefault?.();
        event.stopPropagation?.();
        return;
      }
    }

    // While a non-webpage element is selected, blank clicks inside the webpage frame must
    // clear that selection. Hover is suppressed (canvas PE stays auto), so stage usually
    // handles this; clear here as a defensive fallback for residual hover states.
    if (hasBlockingCanvasSelection()) {
      const canvasInteraction = getCanvasInteractionAtClientPoint(x, y);
      if (!canvasInteraction?.blocksWebpage) {
        const overWebpage = [...overlays.values()].some((record) => {
          const rect = record.wrapper.getBoundingClientRect?.();
          if (!rect) return false;
          const left = Number(rect.left) || 0;
          const top = Number(rect.top) || 0;
          const right = Number(rect.right) || left + (Number(rect.width) || 0);
          const bottom = Number(rect.bottom) || top + (Number(rect.height) || 0);
          return x >= left && x <= right && y >= top && y <= bottom;
        });
        if (overWebpage) {
          setWebpageInteractionTarget(null);
          selectIds([]);
        }
      }
      return;
    }

    // Prime routing before the canvas full-viewport band consumes the click.
    updateWebpageInteractionFromEvent(event);
  }

  function handleContainerPointerLeave(event) {
    // Entering a cross-origin iframe yields relatedTarget=null and fires pointerleave on
    // the container. Clearing routing here re-enables full-viewport canvas bands, so they
    // steal the pointer again and webpage content stays dead.
    const related = event?.relatedTarget;
    if (related && typeof container.contains === "function" && container.contains(related)) {
      return;
    }
    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const webpageId = getWebpageIdAtClientPoint(x, y);
      if (webpageId) {
        setWebpageInteractionTarget(webpageId);
        return;
      }
    }
    setWebpageInteractionTarget();
  }

  container.addEventListener("pointermove", handleContainerPointerMove, true);
  container.addEventListener("pointerdown", handleContainerPointerDown, true);
  container.addEventListener("pointerenter", handleContainerPointerEnter);
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
      const currentElement = getElements().find((item) => item.id === element.id);
      if (!currentElement || !canSelect(currentElement) || !canMove(currentElement)) return;
      // Select first so beginInteraction's canInteract gate passes, then start drag on the same pointerdown.
      if (!getSelectedIds().includes(element.id)) {
        selectIds([element.id]);
      }
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

  function canSelect(element) {
    return getCurrentTool() === "select" && !isCanvasInteractionActive() && Boolean(element);
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
    if (!pageInteractionMode || hasBlockingCanvasSelection()) setWebpageInteractionTarget();
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
      record.wrapper.style.zIndex = String(getOverlayStackZIndex(element.id, { selected }));
      // Keep title/controls above interleaved canvas bands. The controls box itself is
      // pointer-events:none, so only the title bar / buttons / handles opt into hits.
      // This lets users select a webpage from its title bar even when it is not topmost.
      record.controls.style.zIndex = String(getControlsStackZIndex(element.id, { selected }));
      record.controls.hidden = false;
      record.wrapper.style.pointerEvents = "none";
      // The controls box covers the whole webpage rect; only its visible controls may receive events.
      record.controls.style.pointerEvents = "none";
      record.chrome.style.pointerEvents = canSelect(element) ? "auto" : "none";
      for (const button of [record.editButton, record.openButton, ...record.resizeHandles.values()]) {
        button.style.pointerEvents = interactive ? "auto" : "none";
      }
      record.iframe.style.pointerEvents = pageInteractionMode && webpageInteractionTargetId === element.id
        ? "auto"
        : "none";
      record.iframe.style.top = `${toolbarHeight}px`;
      record.iframe.style.height = `calc(100% - ${toolbarHeight}px)`;
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
    } else {
      syncWebpagePointerRouting();
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
    webpageInteractionTargetId = null;
    for (const record of overlays.values()) {
      record.wrapper.remove();
      record.controls.remove();
    }
    overlays.clear();
    const konvaContent = container.querySelector?.(".konvajs-content");
    if (konvaContent?.style) konvaContent.style.pointerEvents = "";
    container.classList.remove("is-canvas-above-webpage");
    container.classList.remove("is-webpage-interaction-hover");
    container.removeEventListener("pointermove", handleContainerPointerMove, true);
    container.removeEventListener("pointerdown", handleContainerPointerDown, true);
    container.removeEventListener("pointerenter", handleContainerPointerEnter);
    container.removeEventListener("pointerleave", handleContainerPointerLeave);
    layer.remove();
    clearHigherHitProxies();
    higherHitProxyLayer.remove();
    controlsLayer.remove();
  }

  return {
    destroy,
    getOverlay: (id) => overlays.get(id)?.wrapper ?? null,
    sync,
  };
}
