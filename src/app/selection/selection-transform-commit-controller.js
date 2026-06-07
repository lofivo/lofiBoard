import {
  getStickyScaleCommitBox as defaultGetStickyScaleCommitBox,
  getTextScaleCommitBox as defaultGetTextScaleCommitBox,
} from "../../tools/interaction-rules.js";

export function createSelectionTransformCommitController({
  getElementIdFromNode = () => null,
  getElements = () => [],
  getLastTransformAnchor = () => null,
  getStickyScaleCommitBox = defaultGetStickyScaleCommitBox,
  getTextScaleCommitBox = defaultGetTextScaleCommitBox,
  normalizeTextElementBox = (element) => element,
  setElements = () => {},
} = {}) {
  function syncSelectedNodes(nodes = []) {
    nodes.forEach(syncNodeToElement);
  }

  function syncNodeToElement(node) {
    const id = getElementIdFromNode(node);
    const elements = getElements();
    const index = elements.findIndex((element) => element.id === id);
    if (index === -1) return false;

    const element = elements[index];
    const nextElements = [...elements];
    nextElements[index] = {
      ...element,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    };

    if (element.type === "text") {
      const textCommit = getTextScaleCommitBox({
        element,
        nodeWidth: node.width(),
        nodeHeight: node.height(),
        nodeScaleX: node.scaleX(),
        nodeScaleY: node.scaleY(),
        anchor: getLastTransformAnchor(),
      });
      nextElements[index] = normalizeTextElementBox({
        ...nextElements[index],
        fontSize: textCommit.fontSize,
        width: textCommit.width,
        height: textCommit.height,
      }, { preserveHeight: Number.isFinite(textCommit.height) });
    }
    if (element.type === "sticky") {
      const stickyCommit = getStickyScaleCommitBox({
        element,
        nodeScaleX: node.scaleX(),
        nodeScaleY: node.scaleY(),
      });
      nextElements[index] = {
        ...nextElements[index],
        width: stickyCommit.width,
        height: stickyCommit.height,
        fontSize: stickyCommit.fontSize,
        scaleX: 1,
        scaleY: 1,
      };
    }
    if (element.type === "coordinate-plane") {
      const nextWidth = Math.max(24, node.width() * (node.scaleX() || 1));
      const nextHeight = Math.max(24, node.height() * (node.scaleY() || 1));
      nextElements[index] = {
        ...nextElements[index],
        width: nextWidth,
        height: nextHeight,
        origin: { x: nextWidth / 2, y: nextHeight / 2 },
        scaleX: 1,
        scaleY: 1,
      };
    }

    setElements(nextElements);
    return true;
  }

  return {
    syncNodeToElement,
    syncSelectedNodes,
  };
}
