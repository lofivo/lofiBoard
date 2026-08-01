import { reorderElements } from "../../../board/model.js";
import { truncateWithEllipsis } from "../../../tools/interaction-rules.js";

export function renderLayerItemsMarkup({ elements, selectedIds = [] }) {
  const orderedElements = reorderElements(elements);
  const layerLevels = new Map(orderedElements.map((element, index) => [element.id, index]));
  return orderedElements.slice().reverse().map((element) => {
    const active = selectedIds.includes(element.id) ? " active" : "";
    const label = getElementLabel(element);
    const meta = [
      element.locked ? "锁定" : "",
      element.groupId ? "分组" : "",
    ].filter(Boolean).join(" · ");
    const level = layerLevels.get(element.id) ?? 0;
    return `
        <button type="button" class="layer-item${active}" data-layer-id="${element.id}" data-layer-level="${level}" title="${escapeHtml(label)}">
          <span class="layer-label">${escapeHtml(label)}</span>
          <span class="layer-meta">${escapeHtml(meta)}</span>
        </button>
      `;
  }).join("");
}

export function getElementLabel(element) {
  const labels = {
    stroke: "笔触",
    webpage: element.src ? `网页：${truncateWithEllipsis(element.src, 18)}` : "网页",
    text: element.text ? `文字：${truncateWithEllipsis(element.text, 10)}` : "文字",
    sticky: element.text ? `便签：${truncateWithEllipsis(element.text, 10)}` : "便签",
    image: "图片",
    rect: "矩形",
    ellipse: "椭圆",
    line: "直线",
    arrow: "箭头",
    "coordinate-plane": "坐标系",
    "array-structure": `数组：${element.items?.length ?? 0} 项`,
    "matrix-structure": `二维数组：${element.rows ?? 0} x ${element.columns ?? 0}`,
    "stack-structure": `栈：${element.items?.length ?? 0} 项`,
    "queue-structure": `队列：${element.items?.length ?? 0} 项`,
    "deque-structure": `双端队列：${element.items?.length ?? 0} 项`,
    "graph-structure": `图：${element.nodes?.length ?? 0} 点 ${element.edges?.length ?? 0} 边`,
    "tree-structure": `树：${element.nodes?.length ?? 0} 节点`,
  };
  return labels[element.type] ?? element.type;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
