import { createId } from "../board/ids.js";

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

  if (points.every((point) => pointInSquare(point, localEraserPoint, localRadius))) {
    return [];
  }

  const fragments = [];
  let current = [{ ...points[0] }];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const previousInside = pointInSquare(previous, localEraserPoint, localRadius);
    const pointInside = pointInSquare(point, localEraserPoint, localRadius);
    const cutsSegment = segmentIntersectsSquare(previous, point, localEraserPoint, localRadius);

    if (cutsSegment && previousInside && pointInside) {
      if (current.length >= 2) {
        fragments.push(current);
      }
      current = [{ ...point }];
    } else if (cutsSegment && !previousInside && !pointInside) {
      if (current.length >= 2) {
        fragments.push(current);
      }
      current = [{ ...point }];
    } else {
      current.push({ ...point });
    }
  }

  if (current.length >= 2) {
    fragments.push(current);
  }

  return fragments.map((points, index) => ({
    ...stroke,
    id: index === 0 ? stroke.id : createId("stroke"),
    points: points.map((point) => ({ ...point })),
  }));
}

function pointInSquare(point, center, halfSize) {
  return Math.abs(point.x - center.x) <= halfSize && Math.abs(point.y - center.y) <= halfSize;
}

function segmentIntersectsSquare(start, end, center, halfSize) {
  if (pointInSquare(start, center, halfSize) || pointInSquare(end, center, halfSize)) return true;

  const left = center.x - halfSize;
  const right = center.x + halfSize;
  const top = center.y - halfSize;
  const bottom = center.y + halfSize;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let tMin = 0;
  let tMax = 1;

  const clip = (delta, min, max, value) => {
    if (delta === 0) return value >= min && value <= max;
    const t1 = (min - value) / delta;
    const t2 = (max - value) / delta;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    return tMin <= tMax;
  };

  return clip(dx, left, right, start.x) && clip(dy, top, bottom, start.y) && tMax > 0 && tMin < 1;
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
