export function createContentBoundsQuery({
  getContentLayer,
  getSelectedIds,
}) {
  function getContentBounds() {
    const contentLayer = getContentLayer();
    return mergeBoxes(
      contentLayer
        .find(".element")
        .map((node) => node.getClientRect({ relativeTo: contentLayer })),
    );
  }

  function getSelectedContentBounds() {
    const contentLayer = getContentLayer();
    return mergeBoxes(
      getSelectedIds()
        .map((id) => contentLayer.findOne(`#${id}`))
        .filter(Boolean)
        .map((node) => node.getClientRect({ relativeTo: contentLayer })),
    );
  }

  return {
    getContentBounds,
    getSelectedContentBounds,
  };
}

function mergeBoxes(boxes) {
  const validBoxes = boxes.filter(isValidBox);
  if (validBoxes.length === 0) return null;

  const minX = Math.min(...validBoxes.map((box) => box.x));
  const minY = Math.min(...validBoxes.map((box) => box.y));
  const maxX = Math.max(...validBoxes.map((box) => box.x + box.width));
  const maxY = Math.max(...validBoxes.map((box) => box.y + box.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function isValidBox(box) {
  return Number.isFinite(box?.x)
    && Number.isFinite(box?.y)
    && box.width > 0
    && box.height > 0;
}
