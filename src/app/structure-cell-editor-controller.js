import {
  updateArrayItemValue,
  updateTreeNodeValue,
} from "../structures/structure-templates.js";

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
  structureInteraction,
  renderBoard,
  selectIds,
  setActiveLinearItem,
  syncTreeStructurePanelState,
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

  function syncActiveCellEditor() {
    activeCellEditorSync?.();
  }

  return {
    editArrayStructureItem,
    editTreeStructureNode,
    syncActiveCellEditor,
  };
}
