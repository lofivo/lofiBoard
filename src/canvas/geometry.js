import { createId } from "../board/ids.js";

const PRESSURE_VARIATION_THRESHOLD = 0.08;
const MIN_ERASER_FOOTPRINT_INSET = 1;
const MAX_ERASER_FOOTPRINT_INSET = 3;
const ERASER_FOOTPRINT_INSET_RATIO = 0.1;

export function flattenPoints(points) {
  return points.flatMap((point) => [point.x, point.y]);
}

export function unflattenPoints(points) {
  const result = [];
  for (let index = 0; index < points.length; index += 2) {
    result.push({ x: points[index], y: points[index + 1], pressure: 0.5 });
  }
  return result;
}

export function distance(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

export function splitStrokeByEraser(stroke, eraserPoint, radius) {
  const points = stroke.points ?? [];
  if (points.length < 2) return [];
  const localEraserPoint = toElementLocalPoint(stroke, eraserPoint);
  const localRadius = getLocalRadius(stroke, radius);
  const localEraseRadius = getInsetEraserRadius(localRadius);
  const localHalfSize = localEraseRadius + getLocalStrokeRadius(stroke, points);

  const fragments = [];
  let current = [];
  let didErase = false;

  const closeCurrent = () => {
    if (current.length >= 2) {
      fragments.push(current);
    }
    current = [];
  };

  const appendPoint = (point) => {
    const previous = current.at(-1);
    if (previous && nearlyEqualPoints(previous, point)) return;
    current.push(point);
  };

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const outsideIntervals = getSegmentOutsideSquareIntervals(start, end, localEraserPoint, localHalfSize);
    if (!isWholeSegmentOutside(outsideIntervals)) {
      didErase = true;
    }

    if (outsideIntervals.length === 0) {
      closeCurrent();
      continue;
    }

    for (const [startT, endT] of outsideIntervals) {
      if (startT > 0) {
        closeCurrent();
      }

      appendPoint(getPointAtRatio(start, end, startT));
      appendPoint(getPointAtRatio(start, end, endT));

      if (endT < 1) {
        closeCurrent();
      }
    }
  }

  closeCurrent();
  const retainedFragments = didErase
    ? fragments.filter((fragment) => getPathLength(fragment) >= getMinimumRetainedFragmentLength(stroke, points))
    : fragments;

  return retainedFragments.map((points, index) => ({
    ...stroke,
    id: index === 0 ? stroke.id : createId("stroke"),
    points: points.map((point) => ({ ...point })),
  }));
}

export function areStrokeFragmentsEquivalent(stroke, fragments) {
  if (fragments.length !== 1) return false;
  const points = stroke.points ?? [];
  const fragmentPoints = fragments[0].points ?? [];
  if (fragmentPoints.length !== points.length) return false;

  return points.every((point, index) => nearlyEqualStrokePoints(point, fragmentPoints[index]));
}

export function getEraserPathSamples(fromPoint, toPoint, radius) {
  if (!fromPoint || !toPoint) return toPoint ? [{ ...toPoint }] : [];
  const distanceValue = distance(fromPoint, toPoint);
  const step = Math.max(2, Math.max(1, Number(radius) || 1) * 0.65);
  const segments = Math.max(1, Math.ceil(distanceValue / step));
  const samples = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    samples.push({
      x: fromPoint.x + (toPoint.x - fromPoint.x) * t,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * t,
    });
  }
  return samples;
}

function pointInSquare(point, center, halfSize) {
  return Math.abs(point.x - center.x) <= halfSize && Math.abs(point.y - center.y) <= halfSize;
}

function getSegmentOutsideSquareIntervals(start, end, center, halfSize) {
  const intersection = getSegmentSquareIntersectionInterval(start, end, center, halfSize);
  if (!intersection) return [[0, 1]];

  const { enter, exit } = intersection;
  if (exit - enter <= Number.EPSILON) return [[0, 1]];

  const intervals = [];
  if (enter > Number.EPSILON) {
    intervals.push([0, enter]);
  }
  if (exit < 1 - Number.EPSILON) {
    intervals.push([exit, 1]);
  }
  return intervals;
}

function isWholeSegmentOutside(intervals) {
  return intervals.length === 1 && intervals[0][0] === 0 && intervals[0][1] === 1;
}

function getSegmentSquareIntersectionInterval(start, end, center, halfSize) {
  const left = center.x - halfSize;
  const right = center.x + halfSize;
  const top = center.y - halfSize;
  const bottom = center.y + halfSize;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let enter = 0;
  let exit = 1;

  const clip = (delta, min, max, value) => {
    if (delta === 0) return value >= min && value <= max;
    const t1 = (min - value) / delta;
    const t2 = (max - value) / delta;
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
    return enter <= exit;
  };

  if (!clip(dx, left, right, start.x) || !clip(dy, top, bottom, start.y)) {
    return null;
  }
  if (exit < 0 || enter > 1) return null;
  return {
    enter: Math.max(0, enter),
    exit: Math.min(1, exit),
  };
}

function getPointAtRatio(start, end, ratio) {
  if (ratio <= Number.EPSILON) return { ...start };
  if (ratio >= 1 - Number.EPSILON) return { ...end };
  return {
    ...start,
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
    pressure: interpolateNumber(start.pressure, end.pressure, ratio),
  };
}

function interpolateNumber(start, end, ratio) {
  if (typeof start !== "number" || typeof end !== "number") return start ?? end;
  return start + (end - start) * ratio;
}

function nearlyEqualPoints(pointA, pointB) {
  return Math.abs(pointA.x - pointB.x) <= Number.EPSILON && Math.abs(pointA.y - pointB.y) <= Number.EPSILON;
}

function nearlyEqualStrokePoints(pointA, pointB) {
  return nearlyEqualPoints(pointA, pointB)
    && Math.abs(normalizePressure(pointA.pressure) - normalizePressure(pointB.pressure)) <= Number.EPSILON;
}

function toElementLocalPoint(element, worldPoint) {
  const x = worldPoint.x - (element.x ?? 0);
  const y = worldPoint.y - (element.y ?? 0);
  const rotation = -((element.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotatedX = x * cos - y * sin;
  const rotatedY = x * sin + y * cos;

  return {
    x: rotatedX / getSafeScale(element.scaleX),
    y: rotatedY / getSafeScale(element.scaleY),
  };
}

function getLocalRadius(element, radius) {
  const scaleX = Math.abs(getSafeScale(element.scaleX));
  const scaleY = Math.abs(getSafeScale(element.scaleY));
  return radius / Math.max(scaleX, scaleY);
}

function getInsetEraserRadius(radius) {
  const safeRadius = Math.max(1, Number(radius) || 1);
  const inset = Math.min(
    MAX_ERASER_FOOTPRINT_INSET,
    Math.max(MIN_ERASER_FOOTPRINT_INSET, Math.round(safeRadius * ERASER_FOOTPRINT_INSET_RATIO)),
  );
  return Math.max(1, safeRadius - inset);
}

function getLocalStrokeRadius(stroke, points) {
  const baseWidth = Math.max(1, Number(stroke.strokeWidth) || 1);
  if (!hasPressureVariation(points) && !stroke.forcePressureStroke) {
    return baseWidth / 2;
  }

  const maxPressureWidth = points.reduce((maxWidth, point) => (
    Math.max(maxWidth, getPressureStrokeWidth(baseWidth, point.pressure))
  ), baseWidth);
  return maxPressureWidth / 2;
}

function getMinimumRetainedFragmentLength(stroke, points) {
  return Math.max(2, getLocalStrokeRadius(stroke, points) * 2);
}

function getPathLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distance(points[index - 1], points[index]);
  }
  return length;
}

function hasPressureVariation(points) {
  if (points.length < 2) return false;
  const firstPressure = normalizePressure(points[0].pressure);
  return points.some((point) => Math.abs(normalizePressure(point.pressure) - firstPressure) > PRESSURE_VARIATION_THRESHOLD);
}

function getPressureStrokeWidth(strokeWidth, pressure) {
  return Math.max(1, strokeWidth * (0.35 + normalizePressure(pressure) * 1.15));
}

function normalizePressure(pressure) {
  if (!Number.isFinite(pressure) || pressure <= 0) return 0.5;
  return Math.min(1, Math.max(0.05, pressure));
}

function getSafeScale(scale) {
  return scale || 1;
}

export function getWorldPointer(stage) {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  const scale = stage.scaleX();

  return {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale,
  };
}

export function normalizeRect(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function rectsIntersect(rectA, rectB) {
  return !(
    rectB.x > rectA.x + rectA.width ||
    rectB.x + rectB.width < rectA.x ||
    rectB.y > rectA.y + rectA.height ||
    rectB.y + rectB.height < rectA.y
  );
}

// 框选命中:包围盒相交,但整个选框陷在元素包围盒内部(一条边都没碰到)时不算命中。
// 否则在手绘正方形 / 坐标系 / 未填充图形里面拉小选框,会把外面那个大元素一起选走。
export function marqueeHitsRect(marquee, rect) {
  if (!marquee || !rect || !rectsIntersect(marquee, rect)) return false;
  return !(
    marquee.x > rect.x &&
    marquee.y > rect.y &&
    marquee.x + marquee.width < rect.x + rect.width &&
    marquee.y + marquee.height < rect.y + rect.height
  );
}
