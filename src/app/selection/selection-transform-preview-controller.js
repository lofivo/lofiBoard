import {
  syncTextNodeScalePreview as defaultSyncTextNodeScalePreview,
  syncTextNodeSize as defaultSyncTextNodeSize,
} from "../../canvas/konva-elements.js";
import { isTextWidthResizeAnchor as defaultIsTextWidthResizeAnchor } from "../../tools/interaction-rules.js";

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
    syncTextOverlays({ elements: getTextOverlayPreviewElements() });
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
    if (previewElement) {
      syncTextNodeScalePreview(node, previewElement, {
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      });
      contentLayer.batchDraw();
    }
    syncTextOverlays({ elements: previewElements });
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

  return {
    getTextOverlayPreviewElements,
    syncCoordinatePlaneTransformPreview,
    syncTextTransformPreview,
    syncTextWidthResize,
  };
}
