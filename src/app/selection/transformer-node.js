import {
  getUniformScaledBoxForResize as defaultGetUniformScaledBoxForResize,
} from "../../tools/interaction-rules.js";

export function createSelectionTransformerNode({
  Konva,
  overlayLayer,
  getSelectionTransformerController,
  getUniformScaledBoxForResize = defaultGetUniformScaledBoxForResize,
}) {
  const transformer = new Konva.Transformer({
    rotateEnabled: true,
    rotateLineVisible: false,
    rotateAnchorOffset: 28,
    flipEnabled: false,
    borderStroke: "#2563eb",
    borderStrokeWidth: 1.5,
    anchorStroke: "#2563eb",
    anchorFill: "#ffffff",
    anchorSize: 10,
    anchorCornerRadius: 3,
    padding: 6,
    ignoreStroke: true,
    anchorStyleFunc: (anchor) => styleTransformerAnchor(anchor, transformer),
    anchorDragBoundFunc: (oldAbsPos, newAbsPos) => {
      return getSelectionTransformerController().clampAnchorDrag(oldAbsPos, newAbsPos);
    },
    boundBoxFunc: (oldBox, newBox) => {
      return getBoundedTransformerBox({
        oldBox,
        newBox,
        transformer,
        selectionTransformerController: getSelectionTransformerController(),
        getUniformScaledBoxForResize,
      });
    },
  });
  overlayLayer.add(transformer);
  return transformer;
}

function styleTransformerAnchor(anchor, transformer) {
  if (anchor.hasName("top-center") || anchor.hasName("bottom-center")) {
    const width = Math.max(36, transformer.width() - 28);
    anchor.width(width);
    anchor.height(14);
    anchor.offsetX(width / 2);
    anchor.offsetY(anchor.hasName("top-center") ? 20 : -6);
    anchor.fill("rgba(0,0,0,0)");
    anchor.stroke("rgba(0,0,0,0)");
    anchor.cornerRadius(7);
  } else if (anchor.hasName("middle-left") || anchor.hasName("middle-right")) {
    const height = Math.max(36, transformer.height() - 28);
    anchor.width(28);
    anchor.height(height);
    anchor.offsetX(anchor.hasName("middle-left") ? 34 : -6);
    anchor.offsetY(height / 2);
    anchor.fill("rgba(0,0,0,0)");
    anchor.stroke("rgba(0,0,0,0)");
    anchor.cornerRadius(7);
  } else if (!anchor.hasName("rotater")) {
    anchor.cornerRadius(3);
  }
}

function getBoundedTransformerBox({
  oldBox,
  newBox,
  transformer,
  selectionTransformerController,
  getUniformScaledBoxForResize,
}) {
  if (!Number.isFinite(newBox.width) || !Number.isFinite(newBox.height)) return oldBox;
  const anchor = transformer.getActiveAnchor?.();
  const minWidth = selectionTransformerController.getActiveMinWidth();
  const minHeight = selectionTransformerController.getActiveMinHeight();
  const nextBox = getUniformScaledBoxForResize({
    elements: selectionTransformerController.getActiveElements(),
    anchor,
    oldBox,
    newBox,
    minWidth,
    minHeight,
  });
  if (nextBox.width < minWidth) {
    if (anchor?.includes("left")) nextBox.x = oldBox.x + oldBox.width - minWidth;
    nextBox.width = minWidth;
  }
  if (nextBox.height < minHeight) {
    if (anchor?.includes("top")) nextBox.y = oldBox.y + oldBox.height - minHeight;
    nextBox.height = minHeight;
  }
  return nextBox;
}
