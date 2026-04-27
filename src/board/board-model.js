export const BOARD_VERSION = 1;
export const APP_NAME = "lofiBoard";

const DEFAULT_VIEWPORT = Object.freeze({ x: 0, y: 0, scale: 1 });
const DEFAULT_CANVAS = Object.freeze({ backgroundMode: "dots" });
const BACKGROUND_MODES = new Set(["dots", "plain"]);

const ELEMENT_DEFAULTS = {
  stroke: {
    x: 0,
    y: 0,
    points: [],
    stroke: "#111827",
    strokeWidth: 6,
    rotation: 0,
  },
  text: {
    x: 0,
    y: 0,
    text: "双击编辑文字",
    fontSize: 28,
    fontFamily: "Inter, system-ui, sans-serif",
    fill: "#111827",
    width: 260,
    rotation: 0,
  },
  sticky: {
    x: 0,
    y: 0,
    width: 220,
    height: 160,
    text: "",
    fontSize: 22,
    fontFamily: "Inter, system-ui, sans-serif",
    fill: "#fef08a",
    textFill: "#1f2937",
    rotation: 0,
  },
  image: {
    x: 0,
    y: 0,
    width: 320,
    height: 220,
    src: "",
    rotation: 0,
  },
  rect: {
    x: 0,
    y: 0,
    width: 160,
    height: 100,
    stroke: "#111827",
    strokeWidth: 3,
    fill: "transparent",
    rotation: 0,
  },
  ellipse: {
    x: 0,
    y: 0,
    radiusX: 80,
    radiusY: 50,
    stroke: "#111827",
    strokeWidth: 3,
    fill: "transparent",
    rotation: 0,
  },
  line: {
    x: 0,
    y: 0,
    points: [0, 0, 160, 0],
    stroke: "#111827",
    strokeWidth: 4,
    rotation: 0,
  },
  arrow: {
    x: 0,
    y: 0,
    points: [0, 0, 160, 0],
    stroke: "#111827",
    fill: "#111827",
    strokeWidth: 4,
    rotation: 0,
  },
};

export function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function createEmptyBoard() {
  return {
    version: BOARD_VERSION,
    app: APP_NAME,
    canvas: { ...DEFAULT_CANVAS },
    viewport: { ...DEFAULT_VIEWPORT },
    elements: [],
  };
}

export function normalizeBoard(input) {
  if (!input || typeof input !== "object") {
    throw new Error("白板文件不是有效的 JSON 对象");
  }

  if (input.version !== BOARD_VERSION) {
    throw new Error(`不支持的白板版本：${input.version ?? "未知"}`);
  }

  const viewport = {
    x: Number(input.viewport?.x ?? DEFAULT_VIEWPORT.x),
    y: Number(input.viewport?.y ?? DEFAULT_VIEWPORT.y),
    scale: Number(input.viewport?.scale ?? DEFAULT_VIEWPORT.scale),
  };
  const requestedBackgroundMode = input.canvas?.backgroundMode ?? DEFAULT_CANVAS.backgroundMode;
  const canvas = {
    backgroundMode: BACKGROUND_MODES.has(requestedBackgroundMode)
      ? requestedBackgroundMode
      : DEFAULT_CANVAS.backgroundMode,
  };

  const elements = Array.isArray(input.elements)
    ? input.elements.map(normalizeElement).sort((a, b) => a.zIndex - b.zIndex)
    : [];

  return {
    version: BOARD_VERSION,
    app: APP_NAME,
    canvas,
    viewport,
    elements,
  };
}

export function normalizeElement(element, fallbackIndex = 0) {
  if (!element || typeof element !== "object") {
    throw new Error("白板元素格式无效");
  }

  const defaults = ELEMENT_DEFAULTS[element.type];
  if (!defaults) {
    throw new Error(`不支持的白板元素类型：${element.type}`);
  }

  return {
    ...clone(defaults),
    ...clone(element),
    id: String(element.id),
    type: element.type,
    zIndex: Number(element.zIndex ?? fallbackIndex),
  };
}

export function serializeBoard(board, viewport) {
  const normalized = normalizeBoard({
    ...board,
    version: BOARD_VERSION,
    viewport,
  });

  return clone(normalized);
}

export function reorderElements(elements) {
  return elements
    .map((element, index) => ({ ...element, zIndex: index }))
    .sort((a, b) => a.zIndex - b.zIndex);
}
