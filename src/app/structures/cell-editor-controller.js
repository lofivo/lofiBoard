import {
  updateArrayItemValue,
} from "../../structures/linear-structure.js";
import {
  updateTreeNodeValue,
} from "../../structures/tree-structure.js";
import {
  updateGraphNodeLabel,
  updateGraphEdge,
} from "../../structures/graph-structure.js";

export function createStructureCellEditorController({
  container,
  contentLayer,
  stage,
  getElements,
  setElements,
  getCurrentTool,
  selectTool,
  isTemporaryPanActive,
  isLinearStructureElement,
  findLinearItemNode,
  findTreeNodeGroup,
  findGraphNodeGroup,
  structureInteraction,
  renderBoard,
  selectIds,
  setActiveLinearItem,
  syncTreeStructurePanelState,
  syncGraphStructurePanelState,
  pushHistory,
  setSuppressNextCanvasSelection,
  requestAnimationFrameFn = (callback) => requestAnimationFrame(callback),
  documentRef = document,
  windowRef = window,
}) {
  let activeCellEditorSync = null;

  function findElement(elementId) {
    return getElements().find((item) => item.id === elementId);
  }

  function editArrayStructureItem({ elementId, index, value }) {
    if (isTemporaryPanActive() || getCurrentTool() !== selectTool) return;
    const element = findElement(elementId);
    if (!isLinearStructureElement(element) || element.locked) return;
    renderBoard();
    selectIds([elementId]);
    requestAnimationFrameFn(() => editLinearStructureItemInline({ elementId, index, value }));
  }

  function editLinearStructureItemInline({ elementId, index, value }) {
    const element = findElement(elementId);
    const node = contentLayer.findOne(`#${elementId}`);
    if (!isLinearStructureElement(element) || !node) return;
    const itemNode = findLinearItemNode(node, index);
    if (!itemNode) return;

    const valueRect = itemNode.findOne(".array-item-value-hit");
    if (!valueRect) return;
    const input = documentRef.createElement("input");
    input.className = "cell-editor";
    input.value = value;
    const syncCellEditorStyle = () => {
      const absolute = valueRect.getAbsolutePosition();
      const scale = stage.scaleX() * (node.scaleX() || 1);
      const box = stage.container().getBoundingClientRect();
      input.style.left = `${box.left + absolute.x}px`;
      input.style.top = `${box.top + absolute.y}px`;
      input.style.width = `${valueRect.width() * scale}px`;
      input.style.height = `${valueRect.height() * scale}px`;
      input.style.fontSize = `${20 * scale}px`;
    };
    documentRef.body.appendChild(input);
    activeCellEditorSync = syncCellEditorStyle;
    syncCellEditorStyle();
    input.focus();
    input.select();

    let closed = false;
    const close = (commit) => {
      if (closed) return;
      closed = true;
      const nextValue = input.value;
      windowRef.removeEventListener("pointerdown", handleCellEditorOutsidePointerDown, { capture: true });
      activeCellEditorSync = null;
      input.remove();
      if (!commit) return;
      setElements(getElements().map((item) => (
        item.id === elementId ? updateArrayItemValue(item, index, nextValue) : item
      )));
      renderBoard();
      selectIds([elementId]);
      setActiveLinearItem(elementId, index, { rerender: false });
      pushHistory("已更新线性结构元素");
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });
    input.addEventListener("blur", () => close(true));

    const handleCellEditorOutsidePointerDown = (event) => {
      if (closed) return;
      if (input.contains(event.target)) return;
      setSuppressNextCanvasSelection(container.contains(event.target));
      close(true);
    };
    windowRef.addEventListener("pointerdown", handleCellEditorOutsidePointerDown, { capture: true });
  }

  function editTreeStructureNode({ elementId, nodeId, label }) {
    const element = findElement(elementId);
    if (!element || element.type !== "tree-structure" || element.locked) return;
    renderBoard();
    selectIds([elementId]);
    requestAnimationFrameFn(() => editTreeStructureNodeInline({ elementId, nodeId, label }));
  }

  function editTreeStructureNodeInline({ elementId, nodeId, label }) {
    const element = findElement(elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!element || element.type !== "tree-structure" || !group) return;
    const treeNode = findTreeNodeGroup(group, nodeId);
    if (!treeNode) return;

    const style = element.style ?? {};
    const radius = Number(style.nodeRadius) || 24;
    const absolute = treeNode.getAbsolutePosition();
    const scale = stage.scaleX() * (group.scaleX() || 1);
    const box = stage.container().getBoundingClientRect();
    const input = documentRef.createElement("input");
    input.className = "cell-editor";
    input.value = label;
    input.style.left = `${box.left + absolute.x - radius * scale}px`;
    input.style.top = `${box.top + absolute.y - radius * scale}px`;
    input.style.width = `${radius * 2 * scale}px`;
    input.style.height = `${radius * 2 * scale}px`;
    input.style.borderRadius = "999px";
    input.style.textAlign = "center";
    input.style.fontSize = `${19 * scale}px`;
    documentRef.body.appendChild(input);
    input.focus();
    input.select();

    let closed = false;
    const close = (commit) => {
      if (closed) return;
      closed = true;
      const nextValue = input.value;
      windowRef.removeEventListener("pointerdown", handleTreeEditorOutsidePointerDown, { capture: true });
      input.remove();
      if (!commit) return;
      setElements(getElements().map((item) => (
        item.id === elementId ? updateTreeNodeValue(item, nodeId, nextValue) : item
      )));
      structureInteraction.setActiveTreeNode({ elementId, nodeId });
      renderBoard();
      selectIds([elementId]);
      syncTreeStructurePanelState();
      pushHistory("已更新树节点");
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });
    input.addEventListener("blur", () => close(true));

    const handleTreeEditorOutsidePointerDown = (event) => {
      if (closed) return;
      if (input.contains(event.target)) return;
      setSuppressNextCanvasSelection(container.contains(event.target));
      close(true);
    };
    windowRef.addEventListener("pointerdown", handleTreeEditorOutsidePointerDown, { capture: true });
  }

  function editGraphStructureNode({ elementId, nodeId, label }) {
    const element = findElement(elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    renderBoard();
    selectIds([elementId]);
    requestAnimationFrameFn(() => editGraphStructureNodeInline({ elementId, nodeId, label }));
  }

  function editGraphStructureNodeInline({ elementId, nodeId, label }) {
    const element = findElement(elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!element || element.type !== "graph-structure" || !group) return;
    const graphNode = findGraphNodeGroup(group, nodeId);
    if (!graphNode) return;

    const style = element.style ?? {};
    const radius = Number(style.nodeRadius) || 24;
    const absolute = graphNode.getAbsolutePosition();
    const scale = stage.scaleX() * (group.scaleX() || 1);
    const box = stage.container().getBoundingClientRect();
    const input = documentRef.createElement("input");
    input.className = "cell-editor";
    input.value = label;
    input.style.left = `${box.left + absolute.x - radius * scale}px`;
    input.style.top = `${box.top + absolute.y - radius * scale}px`;
    input.style.width = `${radius * 2 * scale}px`;
    input.style.height = `${radius * 2 * scale}px`;
    input.style.borderRadius = "999px";
    input.style.textAlign = "center";
    input.style.fontSize = `${19 * scale}px`;
    documentRef.body.appendChild(input);
    input.focus();
    input.select();

    let closed = false;
    const close = (commit) => {
      if (closed) return;
      closed = true;
      const nextValue = input.value;
      windowRef.removeEventListener("pointerdown", handleGraphEditorOutsidePointerDown, { capture: true });
      input.remove();
      if (!commit) return;
      setElements(getElements().map((item) => (
        item.id === elementId ? updateGraphNodeLabel(item, nodeId, nextValue) : item
      )));
      structureInteraction.setActiveGraphNode({ elementId, nodeId });
      renderBoard();
      selectIds([elementId]);
      syncGraphStructurePanelState();
      pushHistory("已更新图节点");
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });
    input.addEventListener("blur", () => close(true));

    const handleGraphEditorOutsidePointerDown = (event) => {
      if (closed) return;
      if (input.contains(event.target)) return;
      setSuppressNextCanvasSelection(container.contains(event.target));
      close(true);
    };
    windowRef.addEventListener("pointerdown", handleGraphEditorOutsidePointerDown, { capture: true });
  }

  function editGraphStructureEdge({ elementId, edgeId, weight }) {
    const element = findElement(elementId);
    if (!element || element.type !== "graph-structure" || element.locked) return;
    renderBoard();
    selectIds([elementId]);
    requestAnimationFrameFn(() => editGraphStructureEdgeInline({ elementId, edgeId, weight }));
  }

  function editGraphStructureEdgeInline({ elementId, edgeId, weight }) {
    const element = findElement(elementId);
    const group = contentLayer.findOne(`#${elementId}`);
    if (!element || element.type !== "graph-structure" || !group) return;

    const edges = element.edges ?? [];
    const edge = edges.find((e) => e.id === edgeId);
    const nodes = element.nodes ?? [];
    const sourceNode = nodes.find((n) => n.id === edge?.from);
    const targetNode = nodes.find((n) => n.id === edge?.to);
    if (!sourceNode || !targetNode) return;

    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;
    const absolute = group.getAbsolutePosition();
    const scale = stage.scaleX() * (group.scaleX() || 1);
    const box = stage.container().getBoundingClientRect();

    const input = documentRef.createElement("input");
    input.className = "cell-editor";
    input.value = weight ?? "";
    input.style.left = `${box.left + absolute.x + midX * scale - 30}px`;
    input.style.top = `${box.top + absolute.y + midY * scale - 14}px`;
    input.style.width = "60px";
    input.style.height = `${28 * scale}px`;
    input.style.fontSize = `${14 * scale}px`;
    input.style.borderRadius = "6px";
    input.style.textAlign = "center";
    documentRef.body.appendChild(input);
    input.focus();
    input.select();

    let closed = false;
    const close = (commit) => {
      if (closed) return;
      closed = true;
      const nextWeight = input.value;
      windowRef.removeEventListener("pointerdown", handleEdgeEditorOutsidePointerDown, { capture: true });
      input.remove();
      if (!commit) return;
      setElements(getElements().map((item) => (
        item.id === elementId ? updateGraphEdge(item, edgeId, { weight: nextWeight }) : item
      )));
      renderBoard();
      selectIds([elementId]);
      pushHistory("已更新图边权重");
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });
    input.addEventListener("blur", () => close(true));

    const handleEdgeEditorOutsidePointerDown = (event) => {
      if (closed) return;
      if (input.contains(event.target)) return;
      setSuppressNextCanvasSelection(container.contains(event.target));
      close(true);
    };
    windowRef.addEventListener("pointerdown", handleEdgeEditorOutsidePointerDown, { capture: true });
  }

  function syncActiveCellEditor() {
    activeCellEditorSync?.();
  }

  return {
    editArrayStructureItem,
    editTreeStructureNode,
    editGraphStructureNode,
    editGraphStructureEdge,
    syncActiveCellEditor,
  };
}
