export const BOARD_VERSION = 1;
export const APP_NAME = "lofiBoard";

const DEFAULT_VIEWPORT = Object.freeze({ x: 0, y: 0, scale: 1 });
const DEFAULT_CANVAS = Object.freeze({ backgroundMode: "plain" });
const BACKGROUND_MODES = new Set(["dots", "plain"]);

const ARRAY_STRUCTURE_STYLE_DEFAULTS = Object.freeze({
  cellWidth: 72,
  cellHeight: 44,
  indexFill: "#eef2ff",
  valueFill: "#ffffff",
  highlightFill: "#fef3c7",
  pointerFill: "#2563eb",
  stroke: "#111827",
  textFill: "#111827",
  indexTextFill: "#475569",
});

const GRAPH_STRUCTURE_STYLE_DEFAULTS = Object.freeze({
  nodeRadius: 26,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  highlightFill: "#fef3c7",
  edgeHighlightStroke: "#2563eb",
  textFill: "#111827",
});

const TREE_STRUCTURE_STYLE_DEFAULTS = Object.freeze({
  nodeRadius: 24,
  levelGap: 92,
  leafGap: 74,
  stroke: "#94a3b8",
  nodeStroke: "#111827",
  nodeFill: "#f8fafc",
  highlightFill: "#fef3c7",
  textFill: "#111827",
});

const ELEMENT_DEFAULTS = {
  stroke: {
    x: 0,
    y: 0,
    points: [],
    stroke: "#111827",
    strokeWidth: 6,
    opacity: 1,
    lineCap: "round",
    brushStyle: "solid",
    smoothing: 0.45,
    rotation: 0,
  },
  text: {
    x: 0,
    y: 0,
    text: "双击编辑文字",
    fontSize: 28,
    fontFamily: "Inter, system-ui, sans-serif",
    fontStyle: "normal",
    textDecoration: "",
    fill: "#111827",
    align: "left",
    width: 260,
    height: 35,
    padding: 6,
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
    fontStyle: "normal",
    textDecoration: "",
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
  "coordinate-plane": {
    x: 0,
    y: 0,
    width: 480,
    height: 360,
    unitSize: 40,
    origin: { x: 240, y: 180 },
    settings: { showGrid: true, showTicks: true, showLabels: true },
    style: {},
    rotation: 0,
  },
  "array-structure": {
    x: 0,
    y: 0,
    width: 360,
    height: 88,
    items: [],
    settings: { indexBase: 0, showIndexes: true },
    style: {},
    rotation: 0,
  },
  "stack-structure": {
    x: 0,
    y: 0,
    width: 216,
    height: 44,
    items: [],
    settings: { indexBase: 0, showIndexes: false },
    style: {},
    rotation: 0,
  },
  "queue-structure": {
    x: 0,
    y: 0,
    width: 216,
    height: 44,
    items: [],
    settings: { indexBase: 0, showIndexes: false },
    style: {},
    rotation: 0,
  },
  "deque-structure": {
    x: 0,
    y: 0,
    width: 216,
    height: 44,
    items: [],
    settings: { indexBase: 0, showIndexes: false },
    style: {},
    rotation: 0,
  },
  "graph-structure": {
    x: 0,
    y: 0,
    width: 240,
    height: 240,
    nodes: [],
    edges: [],
    settings: {},
    style: {},
    rotation: 0,
  },
  "tree-structure": {
    x: 0,
    y: 0,
    width: 296,
    height: 276,
    nodes: [],
    edges: [],
    settings: {},
    style: {},
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

  const normalized = {
    ...clone(defaults),
    ...clone(element),
    id: String(element.id),
    type: element.type,
    zIndex: Number(element.zIndex ?? fallbackIndex),
  };
  if (normalized.type === "coordinate-plane") {
    normalized.settings = { ...defaults.settings, ...(element.settings ?? {}) };
    normalized.style = { ...defaults.style, ...(element.style ?? {}) };
    if (!element.origin) {
      normalized.origin = {
        x: Number(normalized.width ?? defaults.width) / 2,
        y: Number(normalized.height ?? defaults.height) / 2,
      };
    }
  }
  if (["array-structure", "stack-structure", "queue-structure", "deque-structure"].includes(normalized.type)) {
    normalized.settings = {
      ...defaults.settings,
      ...(element.settings ?? {}),
      indexBase: Number(element.settings?.indexBase ?? defaults.settings.indexBase) === 1 ? 1 : 0,
      showIndexes: element.settings?.showIndexes ?? defaults.settings.showIndexes,
    };
    normalized.style = { ...ARRAY_STRUCTURE_STYLE_DEFAULTS, ...(element.style ?? {}) };
  }
  if (normalized.type === "graph-structure") {
    normalized.settings = { ...defaults.settings, ...(element.settings ?? {}) };
    normalized.style = { ...GRAPH_STRUCTURE_STYLE_DEFAULTS, ...(element.style ?? {}) };
  }
  if (normalized.type === "tree-structure") {
    normalized.settings = { ...defaults.settings, ...(element.settings ?? {}) };
    normalized.style = { ...TREE_STRUCTURE_STYLE_DEFAULTS, ...(element.style ?? {}) };
  }
  return normalized;
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

export function moveElementsByLayer(elements, selectedIds, direction) {
  if (!Array.isArray(elements) || !Array.isArray(selectedIds) || selectedIds.length === 0) {
    return reorderElements(elements ?? []);
  }

  const selectedSet = new Set(selectedIds);
  const ordered = reorderElements(elements);
  const step = Number(direction) >= 0 ? 1 : -1;
  const next = ordered.slice();

  if (step > 0) {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (!selectedSet.has(next[index].id) || selectedSet.has(next[index + 1]?.id)) continue;
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
    }
  } else {
    for (let index = 1; index < next.length; index += 1) {
      if (!selectedSet.has(next[index].id) || selectedSet.has(next[index - 1]?.id)) continue;
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
    }
  }

  return reorderElements(next);
}
