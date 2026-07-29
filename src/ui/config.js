import {
  ArrowRight,
  Bold,
  Binary,
  ChevronDown,
  Clipboard,
  Circle,
  Copy,
  Download,
  Eraser,
  FilePlus,
  FolderOpen,
  Grid2X2,
  Hand,
  Italic,
  LocateFixed,
  Lock,
  Minus,
  MousePointer2,
  Image,
  Layers,
  SendToBack,
  Group,
  Ungroup,
  PanelTop,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  SaveAll,
  Scissors,
  Square,
  Shapes,
  StickyNote,
  Trash2,
  Type,
  Underline,
  Undo2,
  Redo2,
  Strikethrough,
  BringToFront,
} from "lucide-static";
import { STRUCTURE_ITEMS } from "../structures/types.js";

export const TOOLS = {
  SELECT: "select",
  PAN: "pan",
  PEN: "pen",
  ERASER_STROKE: "eraser-stroke",
  ERASER_OBJECT: "eraser-object",
  TEXT: "text",
  STICKY: "sticky",
  STRUCTURE: "structure",
  SHAPE: "shape",
  RECT: "rect",
  ELLIPSE: "ellipse",
  LINE: "line",
  ARROW: "arrow",
  COORDINATE_PLANE: "coordinate-plane",
};

export const SHAPE_TOOLS = new Set([TOOLS.RECT, TOOLS.ELLIPSE, TOOLS.LINE, TOOLS.ARROW, TOOLS.COORDINATE_PLANE]);
export const DEFAULT_SHAPE_TOOL = TOOLS.RECT;

export const TOOL_ITEMS = [
  { action: "toggle-tool-lock", label: "绘制后保持所选的工具栏状态", shortcut: "Q", icon: Lock },
  { id: TOOLS.SELECT, label: "选择", shortcut: "V", icon: MousePointer2 },
  { id: TOOLS.PAN, label: "平移", shortcut: "H", icon: Hand },
  { id: TOOLS.PEN, label: "画笔", shortcut: "B", icon: PenLine },
  { id: TOOLS.ERASER_STROKE, label: "片段橡皮", shortcut: "E", icon: Eraser },
  { id: TOOLS.ERASER_OBJECT, label: "对象橡皮", shortcut: "O", icon: Trash2 },
  { id: TOOLS.TEXT, label: "文字", shortcut: "T", icon: Type },
  { id: TOOLS.STICKY, label: "便签", shortcut: "N", icon: StickyNote },
  { action: "import-image", label: "图片", icon: Image },
  { id: TOOLS.STRUCTURE, label: "结构", shortcut: "S", icon: Binary },
  { shapeId: TOOLS.RECT, label: "矩形", shortcut: "R", icon: Square },
  { shapeId: TOOLS.ELLIPSE, label: "椭圆", icon: Circle },
  { shapeId: TOOLS.LINE, label: "直线", shortcut: "L", icon: Minus },
  { shapeId: TOOLS.ARROW, label: "箭头", shortcut: "A", icon: ArrowRight },
  { id: TOOLS.SHAPE, label: "更多工具", icon: Shapes },
];

export const SHAPE_ITEMS = [
  { id: TOOLS.COORDINATE_PLANE, label: "坐标系", icon: Grid2X2 },
];

export const MAIN_MENU_ITEMS = [
  { action: "new", label: "新建白板", icon: FilePlus },
  { action: "open", label: "打开", icon: FolderOpen },
  { action: "save", label: "保存", icon: Save },
  { action: "save-as", label: "另存为", icon: SaveAll },
  { action: "export", label: "导出 PNG", icon: Download },
  { action: "import-image", label: "导入图片", icon: Image },
  { action: "undo", label: "撤销", icon: Undo2 },
  { action: "redo", label: "重做", icon: Redo2 },
  { action: "group", label: "分组", icon: Group },
  { action: "ungroup", label: "取消分组", icon: Ungroup },
  { action: "toggle-lock", label: "锁定/解锁", icon: Lock },
  { action: "fit-content", label: "适配内容", icon: LocateFixed },
  { action: "clear", label: "清空画布", icon: Trash2 },
  { action: "reset-view", label: "重置视图", icon: RotateCcw },
];

export const MENU_ICON = ChevronDown;
export const BACKGROUND_ICON = Grid2X2;
export const PANEL_ICON = PanelTop;
export const ZOOM_OUT_ICON = Minus;
export const ZOOM_IN_ICON = Plus;
export const TEXT_FORMAT_ICONS = {
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strike: Strikethrough,
};

export const CONTEXT_MENU_ITEMS = [
  { action: "undo", label: "撤销", icon: Undo2 },
  { action: "redo", label: "重做", icon: Redo2 },
  { action: "copy", label: "复制", icon: Copy },
  { action: "cut", label: "剪切", icon: Scissors },
  { action: "paste", label: "粘贴", icon: Clipboard },
  { action: "bring-forward", label: "上移", icon: Layers },
  { action: "send-backward", label: "下移", icon: Layers },
  { action: "bring-front", label: "置顶", icon: BringToFront },
  { action: "send-back", label: "置底", icon: SendToBack },
  { action: "group", label: "分组", icon: Group },
  { action: "ungroup", label: "取消分组", icon: Ungroup },
  { action: "toggle-lock", label: "锁定/解锁", icon: Lock },
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
      const actionAttr = tool.action
        ? `data-tool-action="${tool.action}"`
        : tool.shapeId
          ? `data-shape-tool="${tool.shapeId}"`
          : `data-tool="${tool.id}"`;
      return `
      <button type="button" class="tool-button" ${actionAttr} title="${label}" aria-label="${label}">
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

export function structurePanelMarkup() {
  return `
    <div class="structure-panel-title">结构模板</div>
    <div class="structure-tabs" role="tablist" aria-label="结构类型">
      ${STRUCTURE_ITEMS.map((item) => `
        <button type="button" class="structure-tab" data-structure-type="${item.id}" title="${item.label}" aria-label="${item.label}">
          ${item.label}
        </button>
      `).join("")}
    </div>
    <div class="linear-init-panel" data-linear-init-panel>
      <div class="segmented-control structure-init-mode" role="group" aria-label="结构初始化方式">
        <button type="button" data-array-init-mode="manual">手填结构</button>
        <button type="button" data-array-init-mode="random">随机生成</button>
      </div>
    </div>
    <div class="structure-init-field">
      <label class="structure-input-label" data-structure-input-label>
        初始结构
        <textarea data-structure-input rows="3" spellcheck="false"></textarea>
      </label>
      <label class="structure-count-label" data-array-random-fields hidden>
        元素数量
        <input data-array-random-count type="number" min="1" max="64" step="1" value="5" inputmode="numeric" />
      </label>
      <div data-matrix-random-fields hidden>
        <label class="structure-count-label">
          行数
          <input data-matrix-random-rows type="number" min="1" max="32" step="1" value="3" inputmode="numeric" />
        </label>
        <label class="structure-count-label">
          列数
          <input data-matrix-random-columns type="number" min="1" max="32" step="1" value="3" inputmode="numeric" />
        </label>
      </div>
    </div>
    <div class="structure-actions">
      <button type="button" data-structure-cancel>取消</button>
      <button type="button" data-structure-insert>插入</button>
    </div>
  `;
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
