import {
  syncTextNodeScalePreview as defaultSyncTextNodeScalePreview,
  syncTextNodeSize as defaultSyncTextNodeSize,
} from "../../canvas/konva-elements.js";
import { isTextWidthResizeAnchor as defaultIsTextWidthResizeAnchor } from "../../tools/interaction-rules.js";
import { getGraphMinSize } from "../../structures/graph-structure.js";

export function createSelectionTransformPreviewController({
  contentLayer,
  getElementIdFromNode = () => null,
  getElements = () => [],
  getMinimumTextElementWidth = () => 0,
  getTextElementWrappedHeight = () => 0,
  isTextWidthResizeAnchor = defaultIsTextWidthResizeAnchor,
  overlayLayer,
  rerenderCoordinatePlaneNode = () => {},
  syncTextNodeScalePreview = defaultSyncTextNodeScalePreview,
  syncTextNodeSize = defaultSyncTextNodeSize,
  syncTextOverlays = () => {},
  transformer,
} = {}) {
  function getTextOverlayPreviewElements() {
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return getElements();
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    if (!id) return getElements();
    const anchor = transformer.getActiveAnchor?.();
    return getElements().map((element) => (
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

  function syncTextWidthResize() {
    if (!isTextWidthResizeAnchor(transformer.getActiveAnchor?.())) return false;
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return false;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    const element = getElements().find((item) => item.id === id);
    if (element?.type !== "text") return false;

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
    const overlaySync = syncTextOverlays({ elements: getTextOverlayPreviewElements() });
    if (overlaySync?.then) {
      void overlaySync.then((measurements = []) => {
        const measurement = measurements.find((item) => item.id === id);
        if (!measurement || Math.abs(node.width() - nextWidth) > 0.01) return;
        syncTextNodeSize(node, {
          width: nextWidth,
          height: measurement.height,
          padding: element.padding ?? 0,
        });
        transformer.forceUpdate();
        contentLayer.batchDraw();
        overlayLayer.batchDraw();
      });
    }
    return true;
  }

  function syncTextTransformPreview() {
    if (isTextWidthResizeAnchor(transformer.getActiveAnchor?.())) return false;
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return false;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    const element = getElements().find((item) => item.id === id);
    if (element?.type !== "text") return false;
    const previewElements = getTextOverlayPreviewElements();
    const previewElement = previewElements.find((item) => item.id === id);
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    if (previewElement) {
      syncTextNodeScalePreview(node, previewElement, {
        scaleX,
        scaleY,
      });
      contentLayer.batchDraw();
    }
    const overlaySync = syncTextOverlays({ elements: previewElements });
    if (previewElement && overlaySync?.then) {
      void overlaySync.then((measurements = []) => {
        const measurement = measurements.find((item) => item.id === id);
        if (!measurement) return;
        if (Math.abs(node.scaleX() - scaleX) > 0.01 || Math.abs(node.scaleY() - scaleY) > 0.01) return;
        const correctedPreview = { ...previewElement, height: measurement.height };
        syncTextNodeSize(node, {
          width: node.width(),
          height: measurement.height / Math.max(0.01, Math.abs(scaleY || 1)),
          padding: element.padding ?? 0,
        });
        syncTextNodeScalePreview(node, correctedPreview, { scaleX, scaleY });
        transformer.forceUpdate();
        contentLayer.batchDraw();
        overlayLayer.batchDraw();
      });
    }
    return true;
  }

  function syncCoordinatePlaneTransformPreview() {
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return false;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    const element = getElements().find((item) => item.id === id);
    if (element?.type !== "coordinate-plane") return false;

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
    return true;
  }

  function syncGraphTransformPreview() {
    const nodes = transformer.nodes();
    if (nodes.length !== 1) return false;
    const node = nodes[0];
    const id = getElementIdFromNode(node);
    const element = getElements().find((item) => item.id === id);
    if (element?.type !== "graph-structure") return false;
    if (typeof node.applyGraphResize !== "function") return false;

    const radius = Number(element.style?.nodeRadius) || 26;
    const min = getGraphMinSize((element.nodes ?? []).length, radius);
    const nextWidth = Math.max(min.width, node.width() * (node.scaleX() || 1));
    const nextHeight = Math.max(min.height, node.height() * (node.scaleY() || 1));
    // 复位 scale,改用真实尺寸:节点圆/标签不会被 scale 放大,节点位置固定不动。
    node.scaleX(1);
    node.scaleY(1);
    node.applyGraphResize(nextWidth, nextHeight);
    transformer.forceUpdate();
    contentLayer.batchDraw();
    overlayLayer.batchDraw();
    return true;
  }

  return {
    getTextOverlayPreviewElements,
    syncCoordinatePlaneTransformPreview,
    syncGraphTransformPreview,
    syncTextTransformPreview,
    syncTextWidthResize,
  };
}
