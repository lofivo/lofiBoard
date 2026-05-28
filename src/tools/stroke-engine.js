export function normalizePressure(pressure) {
  if (!Number.isFinite(pressure) || pressure <= 0) return 0.5;
  return Math.min(1, Math.max(0.05, pressure));
}

export function getPointerEventId(event) {
  return Number.isInteger(event?.pointerId) ? event.pointerId : null;
}

export function shouldHandlePointerEvent(event, activePointerId = null) {
  const eventPointerId = getPointerEventId(event);
  if (activePointerId === null || activePointerId === undefined) return true;
  if (eventPointerId === null) return true;
  return eventPointerId === activePointerId;
}

export function captureDrawingPointer(event) {
  const pointerId = getPointerEventId(event);
  if (pointerId === null) {
    return { pointerId: null, target: null, captured: false };
  }

  const target = typeof event?.target?.setPointerCapture === "function" ? event.target : null;
  if (!target) {
    return { pointerId, target: null, captured: false };
  }

  try {
    target.setPointerCapture(pointerId);
    return { pointerId, target, captured: true };
  } catch {
    return { pointerId, target, captured: false };
  }
}

export function releaseDrawingPointer(capture) {
  if (!capture?.captured || !capture.target || capture.pointerId === null) return false;
  const { target, pointerId } = capture;

  try {
    if (typeof target.hasPointerCapture === "function" && !target.hasPointerCapture(pointerId)) {
      return false;
    }
    target.releasePointerCapture?.(pointerId);
    return true;
  } catch {
    return false;
  }
}

export function preventDrawingPointerDefault(event) {
  if (!["pen", "touch"].includes(event?.pointerType)) return false;
  event.preventDefault?.();
  return true;
}

export function shouldAppendStrokePoint(previousPoint, nextPoint, minDistance = 1) {
  if (!previousPoint) return true;
  return Math.hypot(nextPoint.x - previousPoint.x, nextPoint.y - previousPoint.y) >= minDistance;
}

export function smoothStrokePoint(previousPoint, nextPoint, smoothing = 0.35) {
  if (!previousPoint) return nextPoint;
  const currentWeight = 1 - smoothing;
  return {
    x: previousPoint.x * smoothing + nextPoint.x * currentWeight,
    y: previousPoint.y * smoothing + nextPoint.y * currentWeight,
    pressure: normalizePressure(nextPoint.pressure),
  };
}
