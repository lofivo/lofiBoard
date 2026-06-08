import { containsRenderableLatex, renderLatexMixedToHtml } from "./latex.js";

function hasFontStyleToken(fontStyle, token) {
  return String(fontStyle ?? "").split(/\s+/).includes(token);
}

function getTextOverlayInnerHtml(element) {
  if (element.type !== "text" || !containsRenderableLatex(element.text)) {
    return null;
  }
  return renderLatexMixedToHtml(element.text);
}

export function getTextOverlayDisplayStyle(element, {
  containerRect = { left: 0, top: 0 },
  stage = { x: 0, y: 0, scale: 1 },
} = {}) {
  const scale = Math.max(0.01, Number(stage.scale) || 1);
  const padding = Math.max(0, Number(element.padding) || 0) * scale;
  const x = Number(containerRect.left || 0) + Number(stage.x || 0) + Number(element.x || 0) * scale;
  const y = Number(containerRect.top || 0) + Number(stage.y || 0) + Number(element.y || 0) * scale;
  const width = Math.max(1, Number(element.width) || 1) * scale;
  const minHeight = Math.max(1, Number(element.height) || 1) * scale;
  const fontSize = Math.max(1, Number(element.fontSize) || 1) * scale;

  const baseStyle = {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    minHeight: `${minHeight}px`,
    boxSizing: "border-box",
    fontFamily: element.fontFamily ?? "Inter, system-ui, sans-serif",
    fontWeight: hasFontStyleToken(element.fontStyle, "bold") ? "700" : "400",
    fontStyle: hasFontStyleToken(element.fontStyle, "italic") ? "italic" : "normal",
    textDecoration: element.textDecoration ?? "",
    fontSize: `${fontSize}px`,
    lineHeight: "1.25",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    transformOrigin: "left top",
    transform: `rotate(${Number(element.rotation) || 0}deg)`,
    zIndex: "2",
    outline: "none",
    margin: "0",
    padding: "0",
  };

  if (element.type === "text") {
    return {
      ...baseStyle,
      color: element.fill ?? "#111827",
      textAlign: element.align ?? "left",
      padding: `0 ${padding}px`,
    };
  }

  if (element.type === "sticky") {
    return {
      ...baseStyle,
      color: element.textFill ?? "#1f2937",
      padding: "0",
    };
  }

  return baseStyle;
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
  let pendingLatex = new Map();

  const getOverlayEl = (id) => {
    let overlay = overlays.get(id);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "text-dom-overlay";
    overlay.dataset.elementId = id;
    overlay.contentEditable = "false";
    container.appendChild(overlay);
    overlays.set(id, overlay);
    return overlay;
  };

  const getKonvaTextNode = (id) => contentLayer?.findOne?.(`#${id}`)?.findOne?.("Text");

  const removeOverlay = (id) => {
    const overlay = overlays.get(id);
    if (overlay) overlay.remove();
    overlays.delete(id);
    pendingLatex.delete(id);
    getKonvaTextNode(id)?.visible?.(true);
  };

  const syncLatexContent = async (overlay, element, signature, version) => {
    if (overlay.dataset.renderSignature === signature) return;
    const html = await getTextOverlayInnerHtml(element);
    if (renderVersion !== version) return;
    if (!html) {
      overlay.textContent = element.text;
      overlay.dataset.renderSignature = "";
      return;
    }
    overlay.innerHTML = html;
    overlay.querySelectorAll(".katex .base").forEach((base) => {
      base.style.whiteSpace = "nowrap";
    });
    overlay.dataset.renderSignature = signature;
  };

  const sync = async (elements) => {
    const currentVersion = renderVersion + 1;
    renderVersion = currentVersion;
    const visibleIds = new Set();
    const stage = getStageState?.() ?? { x: 0, y: 0, scale: 1 };
    const containerRect = getContainerRect?.() ?? { left: 0, top: 0 };

    const textElements = elements.filter((el) => ["text", "sticky"].includes(el.type));
    for (const element of textElements) {
      visibleIds.add(element.id);
      const overlay = getOverlayEl(element.id);
      const style = getTextOverlayDisplayStyle(element, { containerRect, stage });
      Object.assign(overlay.style, style);
      overlay.hidden = hiddenIds.has(element.id);

      const latexSignature = `latex:${element.text}`;
      if (overlay.dataset.renderSignature === latexSignature) {
        getKonvaTextNode(element.id)?.visible?.(overlay.hidden);
        continue;
      }

      const needsLatex = element.type === "text" && containsRenderableLatex(element.text);
      if (needsLatex) {
        pendingLatex.set(element.id, element);
        syncLatexContent(overlay, element, latexSignature, currentVersion);
      } else {
        if (overlay.textContent !== element.text) {
          overlay.textContent = element.text;
        }
        overlay.dataset.renderSignature = "";
      }
      getKonvaTextNode(element.id)?.visible?.(overlay.hidden);
    }

    for (const id of [...overlays.keys()]) {
      if (!visibleIds.has(id)) removeOverlay(id);
    }
    contentLayer?.batchDraw?.();
  };

  return {
    sync,

    getOverlay(id) {
      return overlays.get(id) ?? null;
    },

    enterEditMode(id) {
      const overlay = overlays.get(id);
      if (!overlay) return null;
      overlay.contentEditable = "true";
      overlay.classList.add("is-editing");
      return overlay;
    },

    exitEditMode(id) {
      const overlay = overlays.get(id);
      if (!overlay) return;
      overlay.contentEditable = "false";
      overlay.classList.remove("is-editing");
    },

    setHiddenIds(ids = []) {
      hiddenIds = new Set(ids);
      for (const [id, overlay] of overlays) {
        overlay.hidden = hiddenIds.has(id);
        getKonvaTextNode(id)?.visible?.(overlay.hidden);
      }
      contentLayer?.batchDraw?.();
    },

    removeOverlay,

    clear() {
      for (const id of [...overlays.keys()]) removeOverlay(id);
    },
  };
}
