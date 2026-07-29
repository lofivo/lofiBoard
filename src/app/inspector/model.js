import { SHAPE_TOOLS, TOOLS } from "../../ui/config.js";
import { isLinearStructureElement } from "../../structures/linear-structure.js";

const ELEMENT_SCHEMA = {
  stroke: { title: "画笔", group: "brush" },
  text: { title: "文字", group: "text" },
  sticky: { title: "标签", group: "sticky" },
  image: { title: "图片", group: "element" },
  rect: { title: "矩形", group: "element" },
  ellipse: { title: "椭圆", group: "element" },
  line: { title: "直线", group: "linear" },
  arrow: { title: "箭头", group: "linear" },
  "coordinate-plane": { title: "坐标系", group: "coordinate" },
  "array-structure": { title: "数组", group: "structure" },
  "matrix-structure": { title: "二维数组", group: "structure" },
  "stack-structure": { title: "栈", group: "structure" },
  "queue-structure": { title: "队列", group: "structure" },
  "deque-structure": { title: "双端队列", group: "structure" },
  "graph-structure": { title: "图", group: "structure" },
  "tree-structure": { title: "树", group: "structure" },
};

const TOOL_PANEL_SCHEMA = {
  [TOOLS.PEN]: { title: "画笔", group: "brush" },
  [TOOLS.TEXT]: { title: "文字", group: "text" },
  [TOOLS.STICKY]: { title: "标签", group: "sticky" },
  [TOOLS.SHAPE]: { title: "图形", group: "tool" },
  [TOOLS.RECT]: { title: "矩形", group: "tool" },
  [TOOLS.ELLIPSE]: { title: "椭圆", group: "tool" },
  [TOOLS.LINE]: { title: "直线", group: "tool" },
  [TOOLS.ARROW]: { title: "箭头", group: "tool" },
  [TOOLS.COORDINATE_PLANE]: { title: "坐标系", group: "coordinate-tool" },
};

const SHAPE_TITLES = {
  [TOOLS.RECT]: "矩形",
  [TOOLS.ELLIPSE]: "椭圆",
  [TOOLS.LINE]: "直线",
  [TOOLS.ARROW]: "箭头",
  [TOOLS.COORDINATE_PLANE]: "坐标系",
};

export function getShapeToolTitle(shapeTool) {
  return SHAPE_TITLES[shapeTool] ?? "图形";
}

function resolveTitle(elementOrTool, activeShapeTool = null) {
  if (typeof elementOrTool === "string") {
    if (elementOrTool === TOOLS.SHAPE && activeShapeTool) {
      return SHAPE_TITLES[activeShapeTool] ?? "图形";
    }
    return TOOL_PANEL_SCHEMA[elementOrTool]?.title ?? "属性";
  }
  if (Array.isArray(elementOrTool)) {
    if (elementOrTool.length !== 1) return "属性";
    const element = elementOrTool[0];
    if (element?.type === "tree-structure") {
      return element.settings?.treeKind === "binary" ? "二叉树" : "树";
    }
    return ELEMENT_SCHEMA[element?.type]?.title ?? "属性";
  }
  return "属性";
}

export function getPropertyPanelTitle(selectedElements) {
  return resolveTitle(selectedElements);
}

export function getToolPropertyPanelTitle(currentTool, activeShapeTool) {
  return resolveTitle(currentTool, activeShapeTool);
}

export function getInspectorTitle(context) {
  if (context.elements) return resolveTitle(context.elements);
  if (context.tool) return resolveTitle(context.tool, context.activeShapeTool);
  return "属性";
}

export function getSelectionPanelMode(selectedElements) {
  if (selectedElements.length > 1) return "multi";
  if (selectedElements.length === 0) return null;
  const types = new Set(selectedElements.map((el) => el.type));
  if (types.size === 1) {
    const [type] = types;
    const schema = ELEMENT_SCHEMA[type];
    if (schema) return schema.group;
  }
  if (selectedElements.every((el) => ["line", "arrow", "stroke"].includes(el.type))) {
    return "linear";
  }
  if (selectedElements.every((el) => isLinearStructureElement(el) || ["matrix-structure", "graph-structure", "tree-structure"].includes(el.type))) {
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

export function canPersistToolPropertyControls(currentTool) {
  return isToolPropertyPanelAvailable(currentTool)
    || currentTool === TOOLS.TEXT
    || currentTool === TOOLS.STICKY;
}

export function getSelectionInspectorCapabilities(elements) {
  return {
    text: elements.some((el) => el.type === "text"),
    sticky: elements.some((el) => el.type === "sticky"),
    stroke: elements.some((el) => el.type === "stroke"),
    drawing: elements.some((el) => ["stroke", "line", "arrow", "rect", "ellipse"].includes(el.type)),
    fillShape: elements.some((el) => ["rect", "ellipse"].includes(el.type)),
    arrow: elements.some((el) => el.type === "arrow"),
    coordinate: elements.some((el) => el.type === "coordinate-plane"),
  };
}

export function getSelectionHydrateSource(elements) {
  return elements.find((el) => ["rect", "ellipse"].includes(el.type))
    ?? elements.find((el) => el.type === "arrow")
    ?? elements.find((el) => el.type === "line")
    ?? elements.find((el) => el.type === "stroke")
    ?? elements.find((el) => el.type === "sticky")
    ?? elements.find((el) => el.type === "text")
    ?? elements.find((el) => el.type === "coordinate-plane");
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
