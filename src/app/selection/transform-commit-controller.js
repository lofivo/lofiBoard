import {
  getStickyScaleCommitBox as defaultGetStickyScaleCommitBox,
  getTextScaleCommitBox as defaultGetTextScaleCommitBox,
} from "../../tools/interaction-rules.js";
import { getGraphMinSize } from "../../structures/graph-structure.js";

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

  function syncNodeToElement(node, { positionOnly = false } = {}) {
    const id = getElementIdFromNode(node);
    const elements = getElements();
    const index = elements.findIndex((element) => element.id === id);
    if (index === -1) return false;

    const element = elements[index];
    const nextElements = [...elements];
    if (positionOnly) {
      nextElements[index] = {
        ...element,
        x: node.x(),
        y: node.y(),
      };
      setElements(nextElements);
      return true;
    }

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
    if (element.type === "graph-structure") {
      // 拖边框 = 调节边框真实尺寸:把 scale 烘焙进 width/height 并复位 scale=1。
      // 节点位置固定不动(只在缩小到出界时钳进 [r, 边长-r]);边框不小于 count 下限。
      const radius = Number(element.style?.nodeRadius) || 26;
      const min = getGraphMinSize((element.nodes ?? []).length, radius);
      // 关键:preview(syncGraphTransformPreview)每次 transform 已把真实尺寸烘焙进 node、
      // 复位 scale=1。所以这里必须读 node.width()(真实尺寸)而非旧 element.width;否则
      // transformend 时 scale=1 → nextWidth 退回旧尺寸,边框不放大,而 x/y 又取自被 Konva
      // 移动过的 node,表现为"拖边框不变大反而整图移动"(与 coordinate-plane 分支保持一致)。
      const nextWidth = Math.max(min.width, node.width() * (node.scaleX() || 1));
      const nextHeight = Math.max(min.height, node.height() * (node.scaleY() || 1));
      const clamp = (value, max) => Math.min(Math.max(value, radius), max - radius);
      nextElements[index] = {
        ...nextElements[index],
        width: nextWidth,
        height: nextHeight,
        scaleX: 1,
        scaleY: 1,
        nodes: (element.nodes ?? []).map((graphNode) => ({
          ...graphNode,
          x: clamp(Number(graphNode.x) || 0, nextWidth),
          y: clamp(Number(graphNode.y) || 0, nextHeight),
        })),
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
