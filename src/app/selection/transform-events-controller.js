export function createSelectionTransformEventsController() {
  let lastTransformAnchor = null;
  let handledNodeDragEnd = false;

  function bindTransformerEvents({
    transformer,
    editController,
    selectionTransformPreviewController,
    handleTransformerDoubleClick,
    syncSelectedNodes,
    pushHistory,
  }) {
    transformer.on("transform", selectionTransformPreviewController.syncTextWidthResize);
    transformer.on("transform", selectionTransformPreviewController.syncTextTransformPreview);
    transformer.on("transform", selectionTransformPreviewController.syncCoordinatePlaneTransformPreview);
    transformer.on("transform", selectionTransformPreviewController.syncGraphTransformPreview);
    transformer.on("transformstart transform", () => {
      lastTransformAnchor = transformer.getActiveAnchor?.() ?? lastTransformAnchor;
    });
    transformer.on("dblclick dbltap", handleTransformerDoubleClick);
    transformer.on("dragend transformend", () => {
      if (editController.isEditing) return;
      if (handledNodeDragEnd) {
        handledNodeDragEnd = false;
        return;
      }
      syncSelectedNodes(transformer.nodes());
      pushHistory("已更新选择对象");
      lastTransformAnchor = null;
    });
  }

  return {
    bindTransformerEvents,
    getLastTransformAnchor: () => lastTransformAnchor,
    setHandledNodeDragEnd: (value) => { handledNodeDragEnd = Boolean(value); },
  };
}
