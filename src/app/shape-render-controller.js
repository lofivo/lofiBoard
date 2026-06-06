export function createShapeRenderController({
  contentLayer,
  createNode,
  syncNode,
  getHandlers,
  getHandlerSnapshot = () => "",
  projectRuntimeElement = (element) => element,
  isNodeDraggable = () => true,
}) {
  const nodeRegistry = new Map();
  const nodeRenderSnapshots = new Map();
  const elementRenderSnapshotValues = new WeakMap();

  function syncElementNodes(elements) {
    const runtimeElements = elements.map(projectRuntimeElement);
    const nextIds = new Set(runtimeElements.map((element) => element.id));
    for (const [id, node] of nodeRegistry) {
      if (!nextIds.has(id)) {
        node.destroy();
        nodeRegistry.delete(id);
        nodeRenderSnapshots.delete(id);
      }
    }
    return runtimeElements.map((element) => {
      const node = syncOrCreateElementNode(element);
      node.moveTo(contentLayer);
      node.moveToTop();
      return node;
    });
  }

  function syncOrCreateElementNode(element) {
    const existingNode = nodeRegistry.get(element.id);
    const nextSnapshot = createElementRenderSnapshot(element);
    const previousSnapshot = nodeRenderSnapshots.get(element.id);
    if (existingNode && previousSnapshot === nextSnapshot) {
      existingNode.draggable(isNodeDraggable(element));
      return existingNode;
    }
    if (existingNode && syncNode(existingNode, element, getHandlers(element))) {
      existingNode.draggable(isNodeDraggable(element));
      nodeRenderSnapshots.set(element.id, nextSnapshot);
      return existingNode;
    }
    if (existingNode) {
      existingNode.destroy();
      nodeRegistry.delete(element.id);
      nodeRenderSnapshots.delete(element.id);
    }
    const node = createNode(element);
    nodeRegistry.set(element.id, node);
    nodeRenderSnapshots.set(element.id, nextSnapshot);
    return node;
  }

  function createElementRenderSnapshot(element) {
    if (!element || typeof element !== "object") return "";
    const handlerSnapshot = getHandlerSnapshot(element);
    const cachedSnapshot = elementRenderSnapshotValues.get(element);
    if (cachedSnapshot) return `${cachedSnapshot}|${handlerSnapshot}`;
    const snapshot = JSON.stringify(element);
    elementRenderSnapshotValues.set(element, snapshot);
    return `${snapshot}|${handlerSnapshot}`;
  }

  function getNode(id) {
    return nodeRegistry.get(id) ?? null;
  }

  function clear() {
    for (const node of nodeRegistry.values()) {
      node.destroy();
    }
    nodeRegistry.clear();
    nodeRenderSnapshots.clear();
  }

  return {
    syncElementNodes,
    syncOrCreateElementNode,
    createElementRenderSnapshot,
    getNode,
    clear,
  };
}
