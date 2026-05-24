import { containsRenderableLatex, renderLatexMixedToHtml } from "./latex-service.js";

export function shouldRenderTextOverlay(element) {
  return element?.type === "text" && containsRenderableLatex(element.text);
}

function hasFontStyle(fontStyle, token) {
  return String(fontStyle ?? "").split(/\s+/).includes(token);
}

function setStyles(node, styles) {
  for (const [key, value] of Object.entries(styles)) {
    node.style[key] = value;
  }
}

export function getTextOverlayStyle(element, {
  containerRect = { left: 0, top: 0 },
  stage = { x: 0, y: 0, scale: 1 },
} = {}) {
  const scale = Math.max(0.01, Number(stage.scale) || 1);
  const padding = Math.max(0, Number(element.padding) || 0) * scale;
  const x = Number(containerRect.left || 0) + Number(stage.x || 0) + Number(element.x || 0) * scale;
  const y = Number(containerRect.top || 0) + Number(stage.y || 0) + Number(element.y || 0) * scale;
  return {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: `${Math.max(1, Number(element.width) || 1) * scale}px`,
    minHeight: `${Math.max(1, Number(element.height) || 1) * scale}px`,
    boxSizing: "border-box",
    padding: `0 ${padding}px`,
    pointerEvents: "none",
    color: element.fill ?? "#111827",
    fontSize: `${Math.max(1, Number(element.fontSize) || 1) * scale}px`,
    fontFamily: element.fontFamily ?? "Inter, system-ui, sans-serif",
    fontWeight: hasFontStyle(element.fontStyle, "bold") ? "700" : "400",
    fontStyle: hasFontStyle(element.fontStyle, "italic") ? "italic" : "normal",
    textDecoration: element.textDecoration ?? "",
    textAlign: element.align ?? "left",
    lineHeight: "1.25",
    whiteSpace: "pre-wrap",
    overflow: "visible",
    overflowWrap: "normal",
    wordBreak: "normal",
    transformOrigin: "left top",
    transform: `rotate(${Number(element.rotation) || 0}deg)`,
    zIndex: "2",
  };
}

export function createTextOverlayController({
  container,
  contentLayer,
  getContainerRect,
  getStageState,
}) {
  const overlays = new Map();
  let hiddenIds = new Set();
  let renderVersion = 0;

  const getOverlay = (id) => {
    let overlay = overlays.get(id);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "text-latex-overlay";
    overlay.dataset.textOverlayId = id;
    container.appendChild(overlay);
    overlays.set(id, overlay);
    return overlay;
  };

  const getTextNode = (id) => contentLayer?.findOne?.(`#${id}`)?.findOne?.("Text");

  const removeOverlay = (id) => {
    const overlay = overlays.get(id);
    if (overlay) overlay.remove();
    overlays.delete(id);
    getTextNode(id)?.visible?.(true);
  };

  const sync = async (elements) => {
    const currentVersion = renderVersion + 1;
    renderVersion = currentVersion;
    const visibleIds = new Set();
    const stage = getStageState?.() ?? { x: 0, y: 0, scale: 1 };
    const containerRect = getContainerRect?.() ?? { left: 0, top: 0 };

    for (const element of elements) {
      if (!shouldRenderTextOverlay(element)) continue;
      visibleIds.add(element.id);
      const overlay = getOverlay(element.id);
      setStyles(overlay, getTextOverlayStyle(element, { containerRect, stage }));
      overlay.hidden = hiddenIds.has(element.id);

      const signature = JSON.stringify({
        text: element.text,
        fill: element.fill,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fontStyle: element.fontStyle,
        textDecoration: element.textDecoration,
        align: element.align,
      });
      if (overlay.dataset.renderSignature === signature) {
        getTextNode(element.id)?.visible?.(overlay.hidden);
        continue;
      }

      if (!overlay.dataset.renderSignature) {
        getTextNode(element.id)?.visible?.(true);
      } else {
        getTextNode(element.id)?.visible?.(overlay.hidden);
      }
      const html = await renderLatexMixedToHtml(element.text);
      if (renderVersion !== currentVersion) return;
      if (!html) {
        removeOverlay(element.id);
        continue;
      }
      overlay.innerHTML = html;
      overlay.dataset.renderSignature = signature;
      overlay.hidden = hiddenIds.has(element.id);
      getTextNode(element.id)?.visible?.(overlay.hidden);
    }

    for (const id of [...overlays.keys()]) {
      if (!visibleIds.has(id)) removeOverlay(id);
    }
    contentLayer?.batchDraw?.();
  };

  return {
    sync,
    setHiddenIds(ids = []) {
      hiddenIds = new Set(ids);
      for (const [id, overlay] of overlays) {
        overlay.hidden = hiddenIds.has(id);
        getTextNode(id)?.visible?.(overlay.hidden);
      }
      contentLayer?.batchDraw?.();
    },
    clear() {
      for (const id of [...overlays.keys()]) removeOverlay(id);
    },
  };
}
