import {
  ArrowRight,
  Circle,
  Download,
  Eraser,
  FilePlus,
  FolderOpen,
  Grid2X2,
  Minus,
  MousePointer2,
  PanelTop,
  PenLine,
  RotateCcw,
  Save,
  SaveAll,
  Settings,
  Square,
  Trash2,
  Type,
} from "lucide-static";

export const TOOLS = {
  SELECT: "select",
  PEN: "pen",
  ERASER_STROKE: "eraser-stroke",
  ERASER_OBJECT: "eraser-object",
  TEXT: "text",
  RECT: "rect",
  ELLIPSE: "ellipse",
  LINE: "line",
  ARROW: "arrow",
};

export const SHAPE_TOOLS = new Set([TOOLS.RECT, TOOLS.ELLIPSE, TOOLS.LINE, TOOLS.ARROW]);

export const TOOL_ITEMS = [
  { id: TOOLS.SELECT, label: "选择", icon: MousePointer2 },
  { id: TOOLS.PEN, label: "画笔", icon: PenLine },
  { id: TOOLS.ERASER_STROKE, label: "片段橡皮", icon: Eraser },
  { id: TOOLS.ERASER_OBJECT, label: "对象橡皮", icon: Trash2 },
  { id: TOOLS.TEXT, label: "文字", icon: Type },
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

export const MENU_ICON = Settings;
export const BACKGROUND_ICON = Grid2X2;
export const PANEL_ICON = PanelTop;

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
