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

const LASER_FADE_DURATION_MS = 1000;
const DEFAULT_REQUEST_ANIMATION_FRAME = globalThis.requestAnimationFrame?.bind(globalThis)
  ?? ((callback) => globalThis.setTimeout?.(() => callback(Date.now()), 16));
const DEFAULT_CANCEL_ANIMATION_FRAME = globalThis.cancelAnimationFrame?.bind(globalThis)
  ?? ((frameId) => globalThis.clearTimeout?.(frameId));

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
  getIsLaser = () => false,
  getVisibleEraserRadius = (radius) => radius,
  now = () => performance.now(),
  requestAnimationFrame = DEFAULT_REQUEST_ANIMATION_FRAME,
  cancelAnimationFrame = DEFAULT_CANCEL_ANIMATION_FRAME,
  laserFadeDuration = LASER_FADE_DURATION_MS,
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
  const laserAnimations = new Set();

  function startStroke(worldPoint, pressure = 0.5) {
    const isLaser = Boolean(getIsLaser());
    const laserNow = isLaser ? now() : null;
    const origin = { x: worldPoint.x, y: worldPoint.y };
    const points = [{ x: 0, y: 0, pressure: normalizePressure(pressure) }];
    if (isLaser) points[0].time = laserNow;
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
    if (isLaser) {
      element.laser = true;
      element.laserNow = laserNow;
    }

    const node = createNode({ ...element, [PRESSURE_STROKE_PREVIEW_ATTR]: true });
    contentLayer?.add?.(node);
    contentLayer?.batchDraw?.();
    strokeDraft = { element, node, origin, isLaser };
  }

  function appendStroke(worldPoint, pressure = 0.5) {
    if (!strokeDraft) return false;
    const previousPoint = strokeDraft.element.points.at(-1);
    const nextPoint = {
      x: worldPoint.x - strokeDraft.origin.x,
      y: worldPoint.y - strokeDraft.origin.y,
      pressure: normalizePressure(pressure),
    };
    if (strokeDraft.isLaser) nextPoint.time = now();
    const minDistance = Math.max(0.7, Number(getStrokeWidth()) * 0.08) / getScale();
    if (!shouldAppendStrokePoint(previousPoint, nextPoint, minDistance)) return false;

    const smoothedPoint = smoothStrokePoint(previousPoint, nextPoint, getBrushInputSmoothingValue());
    if (strokeDraft.isLaser) {
      smoothedPoint.time = nextPoint.time;
      strokeDraft.element.laserNow = nextPoint.time;
    }
    strokeDraft.element.points.push(smoothedPoint);
    strokeDraft.node?.setAttrs?.(createNodeAttrs(strokeDraft.element));
    contentLayer?.batchDraw?.();
    return true;
  }

  function finishStroke() {
    if (!strokeDraft) return false;
    const { element, node, isLaser } = strokeDraft;
    strokeDraft = null;

    if (element.points.length < 2) {
      node?.destroy?.();
      return false;
    }
    if (isLaser) {
      fadeLaserStroke(element, node);
      return true;
    }
    node?.destroy?.();
    addElement(element, "已添加笔触");
    return true;
  }

  function setNodeOpacity(node, opacity) {
    if (!node) return;
    if (typeof node.opacity === "function") {
      node.opacity(opacity);
    } else if (typeof node.setAttr === "function") {
      node.setAttr("opacity", opacity);
    } else {
      node.setAttrs?.({ opacity });
    }
    contentLayer?.batchDraw?.();
  }

  function fadeLaserStroke(element, node) {
    if (!node) return;
    const opacity = Number(element.opacity);
    const animation = {
      node,
      frameId: null,
      startedAt: null,
      initialOpacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1,
    };
    const duration = Math.max(1, Number(laserFadeDuration) || LASER_FADE_DURATION_MS);

    const step = (timestamp) => {
      if (!laserAnimations.has(animation)) return;
      const currentTime = Number.isFinite(timestamp) ? timestamp : now();
      animation.startedAt ??= currentTime;
      const progress = Math.min(1, Math.max(0, (currentTime - animation.startedAt) / duration));
      animation.node.setAttrs?.({ laserNow: currentTime });
      setNodeOpacity(animation.node, animation.initialOpacity * (1 - (progress ** 4)));
      if (progress >= 1) {
        laserAnimations.delete(animation);
        animation.node.destroy?.();
        contentLayer?.batchDraw?.();
        return;
      }
      animation.frameId = requestAnimationFrame?.(step) ?? null;
    };

    laserAnimations.add(animation);
    animation.frameId = requestAnimationFrame?.(step) ?? null;
  }

  function cancelLaserAnimations() {
    for (const animation of laserAnimations) {
      if (animation.frameId !== null) cancelAnimationFrame?.(animation.frameId);
      animation.node.destroy?.();
    }
    laserAnimations.clear();
    contentLayer?.batchDraw?.();
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

  function destroy() {
    if (strokeDraft) {
      strokeDraft.node?.destroy?.();
      strokeDraft = null;
    }
    cancelLaserAnimations();
    cancelEraser();
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
    destroy,
    startStroke,
    updateObjectEraser,
    updateStrokeEraser,
  };
}
