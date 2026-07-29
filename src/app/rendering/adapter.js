import { TOOLS } from "../../ui/config.js";
import { STRUCTURE_ELEMENT_TYPES } from "../../structures/types.js";
import { isLinearStructureElement } from "../../structures/linear-structure.js";
import { isBinaryTreeStructure } from "../../structures/tree-structure.js";

export function createShapeRenderAdapter({
  getCurrentTool,
  isTemporaryPanActive,
  isArrayAlgorithmLocked,
  structureInteraction,
}) {
  return {
    getElementRenderHandlerSnapshot: (element) => createElementRenderHandlerSnapshot(element, {
      currentTool: getCurrentTool(),
      temporaryPanActive: isTemporaryPanActive(),
      activeTreeNode: structureInteraction.getActiveTreeNode(),
      activeGraphNode: structureInteraction.getActiveGraphNode(),
      isArrayAlgorithmLocked,
    }),
    projectRuntimeElement: (element) => structureInteraction.projectRuntime(element),
  };
}

export function createElementRenderHandlerSnapshot(element, {
  currentTool = null,
  temporaryPanActive = false,
  activeTreeNode = null,
  activeGraphNode = null,
  isArrayAlgorithmLocked = () => false,
} = {}) {
  if (isTreeStructure(element)) {
    return `activeTreeNode:${activeTreeNode?.elementId === element.id ? activeTreeNode.nodeId : ""}`;
  }
  if (isGraphStructure(element)) {
    return `activeGraphNode:${activeGraphNode?.elementId === element.id ? activeGraphNode.nodeId : ""}`;
  }
  if (element?.type === STRUCTURE_ELEMENT_TYPES.MATRIX) {
    return `canEditMatrixItems:${currentTool === TOOLS.SELECT && !temporaryPanActive}`;
  }
  if (!isLinearStructureElement(element)) return "";
  return `canEditArrayItems:${currentTool === TOOLS.SELECT && !temporaryPanActive && !isArrayAlgorithmLocked(element.id)}`;
}

export function isTreeStructure(element) {
  return element?.type === STRUCTURE_ELEMENT_TYPES.TREE;
}

export function isGraphStructure(element) {
  return element?.type === STRUCTURE_ELEMENT_TYPES.GRAPH;
}

export function isGeneralTreeStructure(element) {
  return isTreeStructure(element) && !isBinaryTreeStructure(element);
}
