const HORIZONTAL_GUIDE_KEYS = ["left", "centerX", "right"];
const VERTICAL_GUIDE_KEYS = ["top", "centerY", "bottom"];

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
  contentLayer,
  getStageScale = () => 1,
} = {}) {
  function snapNodeToAlignment(node) {
    const threshold = getSnapThreshold(getStageScale());
    const movingBox = node.getClientRect({ relativeTo: contentLayer });
    const movingGuides = getBoxGuides(movingBox);
    let dx = 0;
    let dy = 0;
    let bestX = threshold;
    let bestY = threshold;

    contentLayer.find(".element").forEach((other) => {
      if (other === node) return;
      const otherGuides = getBoxGuides(other.getClientRect({ relativeTo: contentLayer }));

      for (const movingKey of HORIZONTAL_GUIDE_KEYS) {
        for (const otherKey of HORIZONTAL_GUIDE_KEYS) {
          const delta = otherGuides[otherKey] - movingGuides[movingKey];
          if (Math.abs(delta) < bestX) {
            bestX = Math.abs(delta);
            dx = delta;
          }
        }
      }

      for (const movingKey of VERTICAL_GUIDE_KEYS) {
        for (const otherKey of VERTICAL_GUIDE_KEYS) {
          const delta = otherGuides[otherKey] - movingGuides[movingKey];
          if (Math.abs(delta) < bestY) {
            bestY = Math.abs(delta);
            dy = delta;
          }
        }
      }
    });

    if (dx || dy) {
      node.position({ x: node.x() + dx, y: node.y() + dy });
    }
  }

  return {
    snapNodeToAlignment,
  };
}
