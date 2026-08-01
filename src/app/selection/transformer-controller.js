import { getTransformerOverdrawForState as defaultGetTransformerOverdrawForState } from "../../tools/interaction-state-machine.js";
import {
  clampTransformerAnchorDragBySize as defaultClampTransformerAnchorDragBySize,
  getTextTransformMinimumSize as defaultGetTextTransformMinimumSize,
  getTransformerAnchorsForSelection as defaultGetTransformerAnchorsForSelection,
} from "../../tools/interaction-rules.js";
import { getGraphMinSize } from "../../structures/graph-structure.js";
import { TOOLS } from "../../ui/config.js";

export function createSelectionTransformerController({
  clampTransformerAnchorDragBySize = defaultClampTransformerAnchorDragBySize,
  contentLayer,
  getCurrentTool = () => TOOLS.SELECT,
  getElementIdFromNode = () => null,
  getElements = () => [],
  getInteractionState = () => "idle",
  getSelectedIds = () => [],
  getStageScale = () => 1,
  getTextTransformMinimumSize = defaultGetTextTransformMinimumSize,
  getTransformerAnchorsForSelection = defaultGetTransformerAnchorsForSelection,
  getTransformerOverdrawForState = defaultGetTransformerOverdrawForState,
  measureTextValue = () => 0,
  minTransformSize = 12,
  selectTool = TOOLS.SELECT,
  structureInteraction,
  transformer,
} = {}) {
  function syncSelectionNodes() {
    if (structureInteraction.hasLinearItemDragState() || structureInteraction.hasLinearPointerDragState()) {
      transformer.nodes([]);
      transformer.visible(false);
      transformer.resizeEnabled(false);
      transformer.rotateEnabled(false);
      transformer.enabledAnchors([]);
      disableHitAreaDrag();
      return;
    }
    const selectedIds = getSelectedIds();
    const nodes = selectedIds
      .map((id) => contentLayer.findOne(`#${id}`))
      .filter(Boolean);
    const selectedElements = getElements().filter((element) => selectedIds.includes(element.id));
    if (selectedElements.length === 1 && selectedElements[0].type === "webpage") {
      // 网页由 DOM overlay 接收内容交互和自定义缩放,Konva Transformer 会被 iframe 遮住。
      transformer.nodes([]);
      transformer.visible(false);
      transformer.resizeEnabled(false);
      transformer.rotateEnabled(false);
      transformer.enabledAnchors([]);
      disableHitAreaDrag();
      return;
    }
    transformer.nodes(nodes);
    const hasSelection = nodes.length > 0;
    const canTransform = getCurrentTool() === selectTool
      && selectedElements.length > 0
      && selectedElements.every((element) => !element.locked);
    transformer.visible(hasSelection);
    transformer.resizeEnabled(canTransform);
    transformer.rotateEnabled(canTransform);
    transformer.enabledAnchors(getTransformerAnchorsForSelection(selectedElements, canTransform));
    transformer.shouldOverdrawWholeArea(hasSelection && getTransformerOverdrawForState(getInteractionState(), selectedElements));
    transformer.forceUpdate();
    disableHitAreaDrag();
  }

  function disableHitAreaDrag() {
    transformer.findOne?.(".back")?.draggable(false);
  }

  function clampAnchorDrag(oldAbsPos, newAbsPos) {
    return clampTransformerAnchorDragBySize({
      transformer,
      oldAbsPos,
      newAbsPos,
      minWidth: getActiveMinWidth(),
      minHeight: getActiveMinHeight(),
    });
  }

  function getActiveMinWidth() {
    const element = getFirstActiveElement();
    if (element?.type === "text") {
      return getTextTransformMinimumSize({
        element,
        anchor: transformer.getActiveAnchor?.(),
        stageScale: getStageScale(),
        measureText: (value) => measureTextValue(element, value),
      }).minWidth;
    }
    if (element?.type === "graph-structure") {
      return getGraphMinSize((element.nodes ?? []).length, element.style?.nodeRadius).width;
    }
    return minTransformSize;
  }

  function getActiveMinHeight() {
    const element = getFirstActiveElement();
    if (element?.type === "text") {
      return getTextTransformMinimumSize({
        element,
        anchor: transformer.getActiveAnchor?.(),
        stageScale: getStageScale(),
        measureText: (value) => measureTextValue(element, value),
      }).minHeight;
    }
    if (element?.type === "graph-structure") {
      return getGraphMinSize((element.nodes ?? []).length, element.style?.nodeRadius).height;
    }
    return minTransformSize;
  }

  function getActiveElements() {
    return transformer.nodes()
      .map((node) => getElements().find((item) => item.id === getElementIdFromNode(node)))
      .filter(Boolean);
  }

  function getFirstActiveElement() {
    const node = transformer.nodes()[0];
    const id = getElementIdFromNode(node);
    return getElements().find((item) => item.id === id) ?? null;
  }

  return {
    clampAnchorDrag,
    disableHitAreaDrag,
    getActiveElements,
    getActiveMinHeight,
    getActiveMinWidth,
    syncSelectionNodes,
  };
}
