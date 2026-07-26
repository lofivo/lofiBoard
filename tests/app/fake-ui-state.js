import { DEFAULT_PROPERTY_CONTROLS } from "../../src/app/inspector/property-controls/controller.js";

// createWhiteboardApp 被 mock 掉的 App 测试用它造 getUiState() 返回值。
// 字段少一个 React 就读到 undefined,所以这里保持和引擎实现同形。
export function createFakeUiState(overrides = {}) {
  return {
    tool: "pen",
    keepToolActive: false,
    zoom: 1,
    backgroundMode: "plain",
    fileName: "未命名白板",
    status: "就绪",
    stylePanelTitle: "属性",
    panelMode: "hidden",
    activeShape: "rect",
    structureSelection: "none",
    graphDirected: false,
    selectionCaps: {
      text: false,
      sticky: false,
      drawing: false,
      stroke: false,
      fillShape: false,
      arrow: false,
      coordinate: false,
    },
    properties: {
      ...DEFAULT_PROPERTY_CONTROLS,
      textBold: false,
      textItalic: false,
      textUnderline: false,
      textStrike: false,
    },
    layers: [],
    selectedIds: [],
    ...overrides,
  };
}
