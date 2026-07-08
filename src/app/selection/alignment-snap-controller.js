const HORIZONTAL_GUIDE_KEYS = ["left", "centerX", "right"];
const VERTICAL_GUIDE_KEYS = ["top", "centerY", "bottom"];
const GUIDE_STROKE = "#6366f1";

function getBoxGuides(box) {
  return {
    left: box.x,
    centerX: box.x + box.width / 2,
    right: box.x + box.width,
    top: box.y,
    centerY: box.y + box.height / 2,
    bottom: box.y + box.height,
  };
}

function getSnapThreshold(stageScale) {
  return Number.isFinite(stageScale) && stageScale > 0 ? 8 / stageScale : 8;
}

export function createAlignmentSnapController({
  Konva = null,
  contentLayer,
  guideLayer = null,
  getStageScale = () => 1,
  getViewportWorldRect = () => null,
  isSnapDisabled = () => false,
} = {}) {
  let guideNodes = [];

  function computeAlignmentSnap(node, excludeIds = []) {
    const excluded = new Set(excludeIds);
    const threshold = getSnapThreshold(getStageScale());
    const movingBox = node.getClientRect({ relativeTo: contentLayer });
    const movingGuides = getBoxGuides(movingBox);
    let dx = 0;
    let dy = 0;
    let bestX = threshold;
    let bestY = threshold;
    let snapX = null;
    let snapY = null;

    contentLayer.find(".element").forEach((other) => {
      if (other === node) return;
      if (excluded.has(other.id?.())) return;
      const otherGuides = getBoxGuides(other.getClientRect({ relativeTo: contentLayer }));

      for (const movingKey of HORIZONTAL_GUIDE_KEYS) {
        for (const otherKey of HORIZONTAL_GUIDE_KEYS) {
          const delta = otherGuides[otherKey] - movingGuides[movingKey];
          if (Math.abs(delta) < bestX) {
            bestX = Math.abs(delta);
            dx = delta;
            snapX = otherGuides[otherKey];
          }
        }
      }

      for (const movingKey of VERTICAL_GUIDE_KEYS) {
        for (const otherKey of VERTICAL_GUIDE_KEYS) {
          const delta = otherGuides[otherKey] - movingGuides[movingKey];
          if (Math.abs(delta) < bestY) {
            bestY = Math.abs(delta);
            dy = delta;
            snapY = otherGuides[otherKey];
          }
        }
      }
    });

    return { dx, dy, snapX, snapY };
  }

  function snapNodeToAlignment(node, { excludeIds = [], showGuides = false } = {}) {
    if (isSnapDisabled()) {
      clearAlignmentGuides();
      return { dx: 0, dy: 0, snapX: null, snapY: null };
    }

    const snap = computeAlignmentSnap(node, excludeIds);
    if (snap.dx || snap.dy) {
      node.position({ x: node.x() + snap.dx, y: node.y() + snap.dy });
    }
    if (showGuides) {
      drawAlignmentGuides(snap);
    }
    return snap;
  }

  function drawAlignmentGuides({ snapX, snapY }) {
    destroyGuideNodes();
    if (!Konva || !guideLayer) return;
    const viewRect = getViewportWorldRect?.();
    if (!viewRect) return;
    const stageScale = getStageScale();
    const scale = Number.isFinite(stageScale) && stageScale > 0 ? stageScale : 1;

    const createGuideLine = (points) => new Konva.Line({
      points,
      stroke: GUIDE_STROKE,
      strokeWidth: 1 / scale,
      dash: [4 / scale, 4 / scale],
      listening: false,
      name: "alignment-guide",
    });

    if (snapX != null) {
      guideNodes.push(createGuideLine([snapX, viewRect.y, snapX, viewRect.y + viewRect.height]));
    }
    if (snapY != null) {
      guideNodes.push(createGuideLine([viewRect.x, snapY, viewRect.x + viewRect.width, snapY]));
    }
    guideNodes.forEach((line) => guideLayer.add(line));
    guideLayer.batchDraw?.();
  }

  function destroyGuideNodes() {
    guideNodes.forEach((line) => line.destroy());
    guideNodes = [];
  }

  function clearAlignmentGuides() {
    if (guideNodes.length === 0) return;
    destroyGuideNodes();
    guideLayer?.batchDraw?.();
  }

  return {
    clearAlignmentGuides,
    snapNodeToAlignment,
  };
}
