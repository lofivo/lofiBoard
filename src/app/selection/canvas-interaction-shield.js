export function createCanvasInteractionShieldController({
  Konva,
  layer,
  getStage = () => null,
  getContentLayer = () => null,
  getElements = () => [],
  getSelectedIds = () => [],
  isElementLocked = () => false,
  getCurrentTool = () => "select",
  isCanvasInteractionActive = () => false,
} = {}) {
  let shield = null;

  function getSelectedCanvasElements() {
    const selectedIds = new Set(getSelectedIds());
    return getElements().filter((element) => (
      selectedIds.has(element?.id)
      && element?.type !== "webpage"
      && !isElementLocked(element.id)
    ));
  }

  function getSelectionBounds(elements) {
    const stage = getStage();
    const contentLayer = getContentLayer();
    const boxes = elements
      .map((element) => contentLayer?.findOne?.(`#${element.id}`))
      .filter((node) => node?.getClientRect)
      .map((node) => node.getClientRect({ relativeTo: stage ?? contentLayer }));
    if (boxes.length === 0) return null;

    const minX = Math.min(...boxes.map((box) => box.x));
    const minY = Math.min(...boxes.map((box) => box.y));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    const maxY = Math.max(...boxes.map((box) => box.y + box.height));
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  function getViewportBounds() {
    const stage = getStage();
    if (!stage) return null;
    const scale = Math.max(0.01, Number(stage.scaleX?.()) || 1);
    return {
      x: -(Number(stage.x?.()) || 0) / scale,
      y: -(Number(stage.y?.()) || 0) / scale,
      width: Math.max(1, (Number(stage.width?.()) || 1) / scale),
      height: Math.max(1, (Number(stage.height?.()) || 1) / scale),
    };
  }

  function createShield() {
    if (shield || !Konva?.Shape || !layer) return shield;
    shield = new Konva.Shape({
      name: "canvas-selection-shield",
      fill: "#000000",
      listening: true,
      perfectDrawEnabled: false,
      sceneFunc() {},
      hitFunc: (context, shape) => {
        context.beginPath();
        context.rect(0, 0, shape.width(), shape.height());
        context.fillShape(shape);
      },
    });
    layer.add(shield);
    return shield;
  }

  function sync() {
    const shouldShield = getCurrentTool() === "select";
    const selectedElements = getSelectedCanvasElements();
    const bounds = shouldShield && selectedElements.length > 0
      ? (isCanvasInteractionActive() ? getViewportBounds() : getSelectionBounds(selectedElements))
      : null;
    const nextShield = bounds ? createShield() : shield;
    if (!nextShield) return;
    if (!bounds) {
      nextShield.visible(false);
      return;
    }
    nextShield.setAttrs({ ...bounds, visible: true });
    nextShield.moveToTop();
    layer.batchDraw?.();
  }

  function destroy() {
    shield?.destroy?.();
    shield = null;
  }

  return {
    destroy,
    isSelectionShieldTarget: (node) => Boolean(node?.hasName?.("canvas-selection-shield")),
    sync,
  };
}
