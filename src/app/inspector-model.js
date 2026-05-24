import { SHAPE_TOOLS, TOOLS } from "../ui/ui-config.js";
import { isLinearStructureElement } from "../structures/structure-templates.js";

export function getPropertyPanelTitle(selectedElements) {
  if (selectedElements.length !== 1) return "属性";
  const element = selectedElements[0];
  if (element.type === "tree-structure") return element.settings?.treeKind === "binary" ? "二叉树" : "树";
  const elementTitles = {
    stroke: "画笔",
    text: "文字",
    sticky: "便签",
    image: "图片",
    rect: "矩形",
    ellipse: "椭圆",
    line: "直线",
    arrow: "箭头",
    "coordinate-plane": "坐标系",
    "array-structure": "数组",
    "stack-structure": "栈",
    "queue-structure": "队列",
    "deque-structure": "双端队列",
    "graph-structure": "图",
  };
  return elementTitles[element.type] ?? "属性";
}

export function getToolPropertyPanelTitle(currentTool, activeShapeTool) {
  const toolTitles = {
    [TOOLS.PEN]: "画笔",
    [TOOLS.SHAPE]: getShapeToolTitle(activeShapeTool),
    [TOOLS.RECT]: "矩形",
    [TOOLS.ELLIPSE]: "椭圆",
    [TOOLS.LINE]: "直线",
    [TOOLS.ARROW]: "箭头",
    [TOOLS.COORDINATE_PLANE]: "坐标系",
  };
  return toolTitles[currentTool] ?? "属性";
}

export function getShapeToolTitle(shapeTool) {
  return {
    [TOOLS.RECT]: "矩形",
    [TOOLS.ELLIPSE]: "椭圆",
    [TOOLS.LINE]: "直线",
    [TOOLS.ARROW]: "箭头",
    [TOOLS.COORDINATE_PLANE]: "坐标系",
  }[shapeTool] ?? "图形";
}

export function getSelectionPanelMode(selectedElements) {
  if (selectedElements.length > 1) return "multi";
  if (selectedElements.every((element) => element.type === "text")) return "text";
  if (selectedElements.every((element) => element.type === "sticky")) return "sticky";
  if (selectedElements.every((element) => element.type === "stroke")) return "brush";
  if (selectedElements.every((element) => ["line", "arrow", "stroke"].includes(element.type))) return "linear";
  if (selectedElements.every((element) => element.type === "coordinate-plane")) return "coordinate";
  if (selectedElements.every((element) => isLinearStructureElement(element) || ["graph-structure", "tree-structure"].includes(element.type))) {
    return "structure";
  }
  return "element";
}

export function getToolPanelMode(currentTool, drawingTool) {
  if (currentTool === TOOLS.PEN) return "brush";
  if (drawingTool === TOOLS.COORDINATE_PLANE) return "coordinate-tool";
  if (["line", "arrow"].includes(drawingTool)) return "linear-tool";
  return "tool";
}

export function isToolPropertyPanelAvailable(currentTool) {
  return new Set([TOOLS.PEN, TOOLS.SHAPE, ...SHAPE_TOOLS]).has(currentTool);
}

export function getSelectionInspectorCapabilities(elements) {
  return {
    text: elements.some((element) => element.type === "text"),
    sticky: elements.some((element) => element.type === "sticky"),
    stroke: elements.some((element) => element.type === "stroke"),
    drawing: elements.some((element) => ["stroke", "line", "arrow", "rect", "ellipse"].includes(element.type)),
    fillShape: elements.some((element) => ["rect", "ellipse"].includes(element.type)),
    arrow: elements.some((element) => element.type === "arrow"),
    coordinate: elements.some((element) => element.type === "coordinate-plane"),
  };
}

export function getSelectionHydrateSource(elements) {
  return elements.find((element) => ["rect", "ellipse"].includes(element.type))
    ?? elements.find((element) => element.type === "arrow")
    ?? elements.find((element) => element.type === "line")
    ?? elements.find((element) => element.type === "stroke")
    ?? elements.find((element) => element.type === "sticky")
    ?? elements.find((element) => element.type === "text")
    ?? elements.find((element) => element.type === "coordinate-plane");
}

export function getToolInspectorCapabilities(drawingTool, currentToolName) {
  return {
    text: currentToolName === TOOLS.TEXT,
    sticky: currentToolName === TOOLS.STICKY,
    stroke: currentToolName === TOOLS.PEN,
    drawing: currentToolName === TOOLS.PEN || ["rect", "ellipse", "line", "arrow"].includes(drawingTool),
    fillShape: ["rect", "ellipse"].includes(drawingTool),
    arrow: drawingTool === "arrow",
    coordinate: drawingTool === TOOLS.COORDINATE_PLANE,
  };
}
