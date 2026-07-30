import { reorderElements } from "../../board/model.js";
import { createId } from "../../board/ids.js";
import {
  areStrokeFragmentsEquivalent,
  getEraserPathSamples,
  splitStrokeByEraser,
} from "../../canvas/geometry.js";
import {
  PRESSURE_STROKE_PREVIEW_ATTR,
  createNodeAttrs,
} from "../../canvas/konva-elements.js";
import { computeEraserRadius } from "../../tools/behavior.js";
import {
  normalizePressure,
  shouldAppendStrokePoint,
  smoothStrokePoint,
} from "../../tools/stroke-engine.js";

export function createDrawingInteractionController({
  addElement = () => {},
  contentLayer,
  createNode = () => null,
  getBaseEraserRadius = () => 24,
  getBoardElements = () => [],
  getBrushCap = () => "round",
  getBrushColor = () => "#111827",
  getBrushInputSmoothingValue = () => 0.35,
  getBrushOpacityValue = () => 1,
  getBrushSmoothingValue = () => 0.35,
  getBrushStyle = () => "solid",
  getElementIdAtPointer = () => null,
  getScale = () => 1,
  getSelectedIds = () => [],
  getStrokeWidth = () => 4,
  getVisibleEraserRadius = (radius) => radius,
  now = () => performance.now(),
  pushHistory = () => {},
  renderBoard = () => {},
  setBoardElements = () => {},
  setSelectedIds = () => {},
  snapshotBoard = () => ({ elements: getBoardElements() }),
} = {}) {
  let strokeDraft = null;
  let eraseSnapshot = null;
  let lastEraserPoint = null;
  let activeEraserRadius = 24;
  let eraseChanged = false;

  function startStroke(worldPoint, pressure = 0.5) {
    const origin = { x: worldPoint.x, y: worldPoint.y };
    const points = [{ x: 0, y: 0, pressure: normalizePressure(pressure) }];
    const element = {
      id: createId("stroke"),
      type: "stroke",
      x: origin.x,
      y: origin.y,
      points,
      stroke: getBrushColor(),
      strokeWidth: Number(getStrokeWidth()),
      opacity: getBrushOpacityValue(),
      lineCap: getBrushCap(),
      brushStyle: getBrushStyle(),
      smoothing: getBrushSmoothingValue(),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: getBoardElements().length,
    };

    const node = createNode({ ...element, [PRESSURE_STROKE_PREVIEW_ATTR]: true });
    contentLayer?.add?.(node);
    strokeDraft = { element, node, origin };
  }

  function appendStroke(worldPoint, pressure = 0.5) {
    if (!strokeDraft) return false;
    const previousPoint = strokeDraft.element.points.at(-1);
    const nextPoint = {
      x: worldPoint.x - strokeDraft.origin.x,
      y: worldPoint.y - strokeDraft.origin.y,
      pressure: normalizePressure(pressure),
    };
    const minDistance = Math.max(0.7, Number(getStrokeWidth()) * 0.08) / getScale();
    if (!shouldAppendStrokePoint(previousPoint, nextPoint, minDistance)) return false;

    strokeDraft.element.points.push(smoothStrokePoint(previousPoint, nextPoint, getBrushInputSmoothingValue()));
    strokeDraft.node?.setAttrs?.(createNodeAttrs(strokeDraft.element));
    contentLayer?.batchDraw?.();
    return true;
  }

  function finishStroke() {
    if (!strokeDraft) return false;
    const { element, node } = strokeDraft;
    node?.destroy?.();
    strokeDraft = null;

    if (element.points.length < 2) return false;
    addElement(element, "已添加笔触");
    return true;
  }

  function hasStrokeDraft() {
    return Boolean(strokeDraft);
  }

  function beginEraser(worldPoint) {
    eraseSnapshot = snapshotBoard();
    activeEraserRadius = getBaseEraserRadius();
    lastEraserPoint = { ...worldPoint, time: now() };
    eraseChanged = false;
    return activeEraserRadius;
  }

  function eraseStrokeAt(worldPoint, radius) {
    let changed = false;
    const nextElements = [];
    let footprintRadius = null;

    for (const element of getBoardElements()) {
      if (element.type !== "stroke") {
        nextElements.push(element);
        continue;
      }

      footprintRadius ??= getVisibleEraserRadius(radius);
      const fragments = splitStrokeByEraser(element, worldPoint, footprintRadius);
      if (!areStrokeFragmentsEquivalent(element, fragments)) {
        changed = true;
      }
      nextElements.push(...fragments);
    }

    if (!changed) return false;
    setBoardElements(reorderElements(nextElements));
    renderBoard();
    eraseChanged = true;
    return true;
  }

  function eraseStrokeAlongPath(fromPoint, toPoint, radius) {
    let changed = false;
    for (const point of getEraserPathSamples(fromPoint, toPoint, radius)) {
      changed = eraseStrokeAt(point, radius) || changed;
    }
    return changed;
  }

  function updateStrokeEraser(worldPoint) {
    const previousPoint = lastEraserPoint ? { x: lastEraserPoint.x, y: lastEraserPoint.y } : worldPoint;
    const radius = updateEraserRadius(worldPoint);
    eraseStrokeAlongPath(previousPoint, worldPoint, radius);
    return radius;
  }

  function eraseObjectAt(target) {
    const id = getElementIdAtPointer(target);
    if (!id) return false;
    const element = getBoardElements().find((item) => item.id === id);
    if (element?.locked) return false;
    setBoardElements(reorderElements(getBoardElements().filter((item) => item.id !== id)));
    setSelectedIds(getSelectedIds().filter((selectedId) => selectedId !== id));
    renderBoard();
    eraseChanged = true;
    return true;
  }

  function updateObjectEraser(worldPoint, target) {
    updateEraserRadius(worldPoint);
    return eraseObjectAt(target);
  }

  function updateEraserRadius(worldPoint) {
    const currentTime = now();
    if (!lastEraserPoint) {
      lastEraserPoint = { ...worldPoint, time: currentTime };
      return activeEraserRadius;
    }

    const elapsed = Math.max(16, currentTime - lastEraserPoint.time);
    const scale = Math.max(0.01, Number(getScale()) || 1);
    const screenDistance = Math.hypot(worldPoint.x - lastEraserPoint.x, worldPoint.y - lastEraserPoint.y) * scale;
    const zoomSpeedFactor = Math.min(1, scale / 0.25);
    const speed = (screenDistance / elapsed) * zoomSpeedFactor;
    activeEraserRadius = computeEraserRadius({
      baseRadius: getBaseEraserRadius(),
      speed,
    });
    lastEraserPoint = { ...worldPoint, time: currentTime };
    return activeEraserRadius;
  }

  function finishEraser() {
    if (!eraseSnapshot) return false;
    const didChange = eraseChanged;
    eraseSnapshot = null;
    lastEraserPoint = null;
    eraseChanged = false;
    if (didChange) {
      pushHistory("已擦除内容");
    }
    return didChange;
  }

  function cancelEraser() {
    eraseSnapshot = null;
    lastEraserPoint = null;
    eraseChanged = false;
  }

  function getActiveEraserRadius() {
    return activeEraserRadius;
  }

  function hasActiveEraserSnapshot() {
    return Boolean(eraseSnapshot);
  }

  return {
    appendStroke,
    beginEraser,
    cancelEraser,
    eraseObjectAt,
    eraseStrokeAt,
    eraseStrokeAlongPath,
    finishEraser,
    finishStroke,
    getActiveEraserRadius,
    hasActiveEraserSnapshot,
    hasStrokeDraft,
    startStroke,
    updateObjectEraser,
    updateStrokeEraser,
  };
}
