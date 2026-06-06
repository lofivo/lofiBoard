import {
  getBaseEraserRadiusForWidth,
  getBrushPreviewAttrs,
  getObjectEraserIconAttrs,
  getScaledEraserRadius,
  getSquareEraserPreviewAttrs,
} from "../tools/tool-behavior.js";
import { TOOLS } from "../ui/ui-config.js";

export function createToolCursorController({
  Konva,
  overlayLayer,
  getBrushColor,
  getCurrentTool,
  getScale,
  getStrokeWidth,
  isTemporaryPanActive,
  getActiveEraserRadius = () => getBaseEraserRadius(),
  hasActiveEraserSnapshot = () => false,
}) {
  let eraserPreviewPoint = null;

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

  const objectEraserCursor = new Konva.Group({
    visible: false,
    listening: false,
  });
  const objectEraserBody = new Konva.Rect();
  const objectEraserSleeve = new Konva.Rect();
  const objectEraserDivider = new Konva.Line();
  objectEraserCursor.add(objectEraserBody);
  objectEraserCursor.add(objectEraserSleeve);
  objectEraserCursor.add(objectEraserDivider);
  overlayLayer.add(objectEraserCursor);

  const brushCursorDot = new Konva.Circle({
    radius: 3,
    fill: getBrushColor(),
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

  function getBaseEraserRadius() {
    return getBaseEraserRadiusForWidth(getStrokeWidth());
  }

  function getVisibleEraserRadius(radius = getBaseEraserRadius()) {
    return getScaledEraserRadius(radius, getScale());
  }

  function showStrokeEraser(worldPoint, radius = getActiveEraserRadius()) {
    eraserPreviewPoint = { ...worldPoint };
    const visibleRadius = getVisibleEraserRadius(radius);
    eraserCursor.setAttrs(getSquareEraserPreviewAttrs(worldPoint, visibleRadius, getScale()));
    eraserCursor.visible(true);
    objectEraserCursor.visible(false);
    overlayLayer.batchDraw();
  }

  function showObjectEraser(worldPoint) {
    eraserPreviewPoint = { ...worldPoint };
    const attrs = getObjectEraserIconAttrs(worldPoint, getScale());
    objectEraserCursor.setAttrs(attrs.group);
    objectEraserBody.setAttrs(attrs.body);
    objectEraserSleeve.setAttrs(attrs.sleeve);
    objectEraserDivider.setAttrs(attrs.divider);
    eraserCursor.visible(false);
    objectEraserCursor.visible(true);
    overlayLayer.batchDraw();
  }

  function hideEraser() {
    eraserPreviewPoint = null;
    eraserCursor.visible(false);
    objectEraserCursor.visible(false);
    overlayLayer.batchDraw();
  }

  function showBrushCursor(worldPoint) {
    const attrs = getBrushPreviewAttrs(worldPoint, getStrokeWidth(), getBrushColor(), getScale());
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
    objectEraserCursor.visible(false);
    brushCursorGap.visible(false);
    brushCursorDot.visible(false);
    brushCursorRing.visible(false);
    overlayLayer.batchDraw();
  }

  function updateBrushCursorStyle() {
    if (isTemporaryPanActive()) return;
    if (!brushCursorDot.visible()) return;
    showBrushCursor(brushCursorDot.position());
  }

  function updateEraserCursorStyle() {
    if (isTemporaryPanActive()) return;
    if (!eraserPreviewPoint) return;
    if (getCurrentTool() === TOOLS.ERASER_OBJECT) {
      if (!objectEraserCursor.visible()) return;
      showObjectEraser(eraserPreviewPoint);
      return;
    }
    if (!eraserCursor.visible()) return;
    showStrokeEraser(
      eraserPreviewPoint,
      hasActiveEraserSnapshot() ? getActiveEraserRadius() : getBaseEraserRadius(),
    );
  }

  return {
    getBaseEraserRadius,
    getVisibleEraserRadius,
    hideBrushCursor,
    hideEraser,
    hideToolCursors,
    nodes: {
      brushCursorDot,
      brushCursorGap,
      brushCursorRing,
      eraserCursor,
      objectEraserBody,
      objectEraserCursor,
      objectEraserDivider,
      objectEraserSleeve,
    },
    showBrushCursor,
    showObjectEraser,
    showStrokeEraser,
    updateBrushCursorStyle,
    updateEraserCursorStyle,
  };
}
