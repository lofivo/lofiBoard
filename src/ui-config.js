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
  LocateFixed,
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
  Undo2,
  Redo2,
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
  { id: TOOLS.SELECT, label: "选择", shortcut: "V", icon: MousePointer2 },
  { id: TOOLS.PEN, label: "画笔", shortcut: "B", icon: PenLine },
  { id: TOOLS.ERASER_STROKE, label: "片段橡皮", shortcut: "E", icon: Eraser },
  { id: TOOLS.ERASER_OBJECT, label: "对象橡皮", shortcut: "O", icon: Trash2 },
  { id: TOOLS.TEXT, label: "文字", shortcut: "T", icon: Type },
  { id: TOOLS.SHAPE, label: "图形", shortcut: "R / L / A", icon: Shapes },
];

export const SHAPE_ITEMS = [
  { id: TOOLS.RECT, label: "矩形", shortcut: "R", icon: Square },
  { id: TOOLS.ELLIPSE, label: "椭圆", icon: Circle },
  { id: TOOLS.LINE, label: "线段", shortcut: "L", icon: Minus },
  { id: TOOLS.ARROW, label: "箭头", shortcut: "A", icon: ArrowRight },
];

export const MAIN_MENU_ITEMS = [
  { action: "new", label: "新建白板", icon: FilePlus },
  { action: "open", label: "打开", icon: FolderOpen },
  { action: "save", label: "保存", icon: Save },
  { action: "save-as", label: "另存为", icon: SaveAll },
  { action: "export", label: "导出 PNG", icon: Download },
  { action: "undo", label: "撤销", icon: Undo2 },
  { action: "redo", label: "重做", icon: Redo2 },
  { action: "fit-content", label: "适配内容", icon: LocateFixed },
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
    (tool) => {
      const label = formatShortcutLabel(tool);
      return `
      <button type="button" class="tool-button" data-tool="${tool.id}" title="${label}" aria-label="${label}">
        ${icon(tool.icon)}
        <span class="tooltip" role="tooltip">${label}</span>
      </button>
    `;
    },
  ).join("");
}

export function shapePopoverMarkup() {
  return SHAPE_ITEMS.map(
    (shape) => {
      const label = formatShortcutLabel(shape);
      return `
      <button type="button" class="shape-option" data-shape-tool="${shape.id}" title="${label}" aria-label="${label}">
        ${icon(shape.icon)}
        <span>${shape.label}</span>
      </button>
    `;
    },
  ).join("");
}

export function formatShortcutLabel(item) {
  return item.shortcut ? `${item.label} (${item.shortcut})` : item.label;
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
