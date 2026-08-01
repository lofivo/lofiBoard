import {
  createShapeElement as buildShapeElement,
  isTinyElement,
} from "../../board/element-factory.js";
import { marqueeHitsRect, normalizeRect } from "../../canvas/geometry.js";
import { resolveActiveDrawingTool } from "../../tools/behavior.js";
import { nextToolAfterPlacement } from "../../tools/interaction-rules.js";
import { TOOLS } from "../../ui/config.js";

export function createDraftInteractionController({
  Konva,
  addElement = () => {},
  applyElementToNode = () => {},
  contentLayer,
  createNode = () => null,
  expandGroupedIds = (ids) => ids,
  getActiveShapeTool = () => TOOLS.RECT,
  getBoardElementCount = () => 0,
  getBrushCap = () => "round",
  getBrushColor = () => "#111827",
  getBrushOpacityValue = () => 1,
  getBrushStyle = () => "solid",
  getCurrentTool = () => TOOLS.RECT,
  getKeepToolActive = () => false,
  getElementIdFromNode = () => null,
  getFillColor = () => "#ffffff",
  getStrokeWidth = () => 4,
  isDoubleArrow = () => false,
  isFillTransparent = () => false,
  selectIds = () => {},
  setTool = () => {},
} = {}) {
  let shapeDraft = null;
  let webpageDraft = null;
  let selectionDraft = null;

  const selectionRect = new Konva.Rect({
    fill: "rgba(37, 99, 235, 0.08)",
    stroke: "#2563eb",
    strokeWidth: 1,
    dash: [4, 4],
    visible: false,
    listening: false,
  });
  contentLayer?.add?.(selectionRect);

  function startShapeDraft(worldPoint) {
    const element = buildShapeElement(getShapeElementOptions(worldPoint, worldPoint));
    const node = createNode(element);
    node?.listening?.(false);
    contentLayer?.add?.(node);
    shapeDraft = { start: worldPoint, element, node };
    return true;
  }

  function updateShapeDraft(worldPoint) {
    if (!shapeDraft) return false;
    const updated = buildShapeElement(getShapeElementOptions(shapeDraft.start, worldPoint, shapeDraft.element.id));
    shapeDraft.element = { ...shapeDraft.element, ...updated };
    applyElementToNode(shapeDraft.element, shapeDraft.node);
    contentLayer?.batchDraw?.();
    return true;
  }

  function finishShapeDraft() {
    if (!shapeDraft) return false;
    const { element, node } = shapeDraft;
    node?.destroy?.();
    shapeDraft = null;

    if (isTinyElement(element)) return false;
    addElement(element, "已添加形状");
    selectIds([element.id]);
    const currentTool = getCurrentTool();
    const nextTool = nextToolAfterPlacement(currentTool, getKeepToolActive());
    if (nextTool !== currentTool) setTool(nextTool);
    return true;
  }

  function getShapeElementOptions(start, end, existingId = null) {
    return {
      type: resolveActiveDrawingTool(getCurrentTool(), getActiveShapeTool()),
      start,
      end,
      existingId,
      stroke: getBrushColor(),
      strokeWidth: Number(getStrokeWidth()),
      fillColor: getFillColor(),
      transparentFill: isFillTransparent(),
      opacity: getBrushOpacityValue(),
      lineCap: getBrushCap(),
      brushStyle: getBrushStyle(),
      doubleArrow: isDoubleArrow(),
      zIndex: getBoardElementCount(),
    };
  }

  function hasShapeDraft() {
    return Boolean(shapeDraft);
  }

  function startWebpageDraft(worldPoint) {
    const node = new Konva.Rect({
      name: "webpage-draft",
      x: worldPoint.x,
      y: worldPoint.y,
      width: 1,
      height: 1,
      fill: "rgba(248, 250, 252, 0.94)",
      stroke: "#2563eb",
      strokeWidth: 2,
      dash: [8, 5],
      cornerRadius: 6,
      listening: false,
    });
    contentLayer?.add?.(node);
    webpageDraft = { start: worldPoint, end: worldPoint, node };
    return true;
  }

  function updateWebpageDraft(worldPoint) {
    if (!webpageDraft) return false;
    webpageDraft.end = worldPoint;
    const rect = normalizeRect(webpageDraft.start, worldPoint);
    webpageDraft.node?.setAttrs?.({ ...rect, width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    contentLayer?.batchDraw?.();
    return true;
  }

  function finishWebpageDraft() {
    if (!webpageDraft) return null;
    const { start, end, node } = webpageDraft;
    const rect = normalizeRect(start, end);
    node?.destroy?.();
    webpageDraft = null;
    if (rect.width < 160 || rect.height < 120) return null;
    return { start, end };
  }

  function hasWebpageDraft() {
    return Boolean(webpageDraft);
  }

  function startSelectionDraft(worldPoint) {
    selectionDraft = { start: worldPoint };
    selectionRect.setAttrs({
      ...normalizeRect(worldPoint, worldPoint),
      visible: true,
    });
    contentLayer?.batchDraw?.();
    return true;
  }

  function updateSelectionDraft(worldPoint) {
    if (!selectionDraft) return false;
    const rect = normalizeRect(selectionDraft.start, worldPoint);
    selectionRect.setAttrs(rect);
    contentLayer?.batchDraw?.();
    return true;
  }

  function finishSelectionDraft() {
    if (!selectionDraft) return [];
    const selectionBox = selectionRect.getClientRect({ relativeTo: contentLayer });
    const ids = contentLayer
      .find(".element")
      .filter((node) => marqueeHitsRect(selectionBox, node.getClientRect({ relativeTo: contentLayer })))
      .map((node) => getElementIdFromNode(node))
      .filter(Boolean);

    selectionRect.visible(false);
    selectionDraft = null;
    const expandedIds = expandGroupedIds(ids);
    selectIds(expandedIds);
    return expandedIds;
  }

  function hasSelectionDraft() {
    return Boolean(selectionDraft);
  }

  function moveSelectionRectToTop() {
    selectionRect.moveToTop();
  }

  function getSelectionRect() {
    return selectionRect;
  }

  return {
    finishSelectionDraft,
    finishShapeDraft,
    finishWebpageDraft,
    getSelectionRect,
    hasSelectionDraft,
    hasShapeDraft,
    hasWebpageDraft,
    moveSelectionRectToTop,
    startSelectionDraft,
    startShapeDraft,
    startWebpageDraft,
    updateSelectionDraft,
    updateShapeDraft,
    updateWebpageDraft,
  };
}
