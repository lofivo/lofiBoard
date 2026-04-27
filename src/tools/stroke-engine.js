export function normalizePressure(pressure) {
  if (!Number.isFinite(pressure) || pressure <= 0) return 0.5;
  return Math.min(1, Math.max(0.05, pressure));
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
