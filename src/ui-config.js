import {
  ArrowRight,
  ChevronDown,
  Clipboard,
  Circle,
  Copy,
  Download,
  Eraser,
  FilePlus,
  FolderOpen,
  Grid2X2,
  Minus,
  MousePointer2,
  PanelTop,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  SaveAll,
  Scissors,
  Square,
  Shapes,
  Trash2,
  Type,
} from "lucide-static";

export const TOOLS = {
  SELECT: "select",
  PEN: "pen",
  ERASER_STROKE: "eraser-stroke",
  ERASER_OBJECT: "eraser-object",
  TEXT: "text",
  SHAPE: "shape",
  RECT: "rect",
  ELLIPSE: "ellipse",
  LINE: "line",
  ARROW: "arrow",
};

export const SHAPE_TOOLS = new Set([TOOLS.RECT, TOOLS.ELLIPSE, TOOLS.LINE, TOOLS.ARROW]);
export const DEFAULT_SHAPE_TOOL = TOOLS.RECT;

export const TOOL_ITEMS = [
  { id: TOOLS.SELECT, label: "选择", icon: MousePointer2 },
  { id: TOOLS.PEN, label: "画笔", icon: PenLine },
  { id: TOOLS.ERASER_STROKE, label: "片段橡皮", icon: Eraser },
  { id: TOOLS.ERASER_OBJECT, label: "对象橡皮", icon: Trash2 },
  { id: TOOLS.TEXT, label: "文字", icon: Type },
  { id: TOOLS.SHAPE, label: "图形", icon: Shapes },
];

export const SHAPE_ITEMS = [
  { id: TOOLS.RECT, label: "矩形", icon: Square },
  { id: TOOLS.ELLIPSE, label: "椭圆", icon: Circle },
  { id: TOOLS.LINE, label: "线段", icon: Minus },
  { id: TOOLS.ARROW, label: "箭头", icon: ArrowRight },
];

export const MAIN_MENU_ITEMS = [
  { action: "new", label: "新建白板", icon: FilePlus },
  { action: "open", label: "打开", icon: FolderOpen },
  { action: "save", label: "保存", icon: Save },
  { action: "save-as", label: "另存为", icon: SaveAll },
  { action: "export", label: "导出 PNG", icon: Download },
  { action: "clear", label: "清空画布", icon: Trash2 },
  { action: "reset-view", label: "重置视图", icon: RotateCcw },
];

export const MENU_ICON = ChevronDown;
export const BACKGROUND_ICON = Grid2X2;
export const PANEL_ICON = PanelTop;
export const ZOOM_OUT_ICON = Minus;
export const ZOOM_IN_ICON = Plus;

export const CONTEXT_MENU_ITEMS = [
  { action: "copy", label: "复制", icon: Copy },
  { action: "cut", label: "剪切", icon: Scissors },
  { action: "paste", label: "粘贴", icon: Clipboard },
  { action: "delete", label: "删除", icon: Trash2 },
];

export const ZOOM_LEVELS = [
  { value: 4, label: "400%" },
  { value: 2, label: "200%" },
  { value: 1, label: "100%" },
  { value: 0.66, label: "66%" },
  { value: 0.33, label: "33%" },
];

export function icon(svg, className = "icon") {
  return svg.replace("<svg", `<svg class="${className}" aria-hidden="true" focusable="false"`);
}

export function toolButtonsMarkup() {
  return TOOL_ITEMS.map(
    (tool) => `
      <button type="button" class="tool-button" data-tool="${tool.id}" title="${tool.label}" aria-label="${tool.label}">
        ${icon(tool.icon)}
        <span class="tooltip" role="tooltip">${tool.label}</span>
      </button>
    `,
  ).join("");
}

export function shapePopoverMarkup() {
  return SHAPE_ITEMS.map(
    (shape) => `
      <button type="button" class="shape-option" data-shape-tool="${shape.id}" title="${shape.label}" aria-label="${shape.label}">
        ${icon(shape.icon)}
        <span>${shape.label}</span>
      </button>
    `,
  ).join("");
}

export function menuItemsMarkup() {
  return MAIN_MENU_ITEMS.map(
    (item) => `
      <button type="button" class="menu-item" data-action="${item.action}">
        ${icon(item.icon)}
        <span>${item.label}</span>
      </button>
    `,
  ).join("");
}

export function contextMenuMarkup() {
  return CONTEXT_MENU_ITEMS.map(
    (item) => `
      <button type="button" class="context-menu-item" data-context-action="${item.action}">
        ${icon(item.icon)}
        <span>${item.label}</span>
      </button>
    `,
  ).join("");
}

export function zoomMenuMarkup() {
  return ZOOM_LEVELS.map(
    (item) => `
      <button type="button" class="zoom-menu-item" data-zoom-level="${item.value}">
        ${item.label}
      </button>
    `,
  ).join("");
}
