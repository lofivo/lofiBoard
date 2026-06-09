# 代码地图

## 顶层目录

- `src/app/main.js`：浏览器入口，导入样式并创建白板应用。
- `src/app/whiteboard-app.js`：应用装配入口。这里创建 Stage/Layer、状态变量、所有 controller，并把跨模块回调接起来。
- `src/board/`：画板数据模型、元素工厂、历史栈、ID。
- `src/canvas/`：Konva 形状创建/同步、几何计算、视口适配、导出背景。
- `src/tools/`：与具体 DOM 无关的工具行为、交互规则、笔触输入和交互状态机。
- `src/structures/`：结构元素的纯逻辑，包括线性结构、图、树、结构工厂和结构交互运行时。
- `src/algorithms/`：算法步骤生成，目前主要是数组排序。
- `src/services/`：文件、剪贴板、图片导入、本地草稿、LaTeX 和文本 overlay 服务。
- `src/ui/`：工具栏、菜单、上下文菜单、面板等 UI 配置和轻量状态。
- `src/styles.css`：全局样式、面板状态、文本 overlay、结构控件等样式入口。

## `src/app/` 分区

- `shell/`：应用外壳、DOM 引用、菜单/状态栏/键盘/指针/顶层 action、画板会话 action。
- `tools/`：工具激活、画笔/橡皮交互、图形临时绘制、工具光标。
- `selection/`：选区状态、命中查询、拖拽、Transformer、缩放提交、对齐吸附、剪贴板和图层 action。
- `editing/`：文本/便签编辑态、DOM textarea overlay、文本尺寸测量。
- `rendering/`：元素到形状的同步 controller，以及运行时投影/事件 handler 快照适配。
- `structures/`：结构面板、结构属性栏同步、线性结构拖拽、树/图节点 action、结构浮动控件。
- `algorithms/array/`：数组算法面板状态、播放会话、动画和步骤应用。
- `inspector/`：属性栏模式、属性控件 DOM、选中元素样式 action。
- `panels/`：侧边面板、图层面板、菜单展开状态。
- `viewport/`：缩放、平移、适配内容、背景模式。
- `clipboard/`、`context-menu/`、`import-export/`：对应应用功能 controller。

## 依赖方向

推荐方向：

- `src/app/*` 可以依赖 `src/board`、`src/canvas`、`src/tools`、`src/structures`、`src/services`、`src/ui`。
- `src/<domain>` 纯逻辑模块不应依赖 `src/app/*`。
- controller 之间通过 `createWhiteboardApp()` 注入回调协作，不要让一个 controller 直接导入另一个 controller 的 mutable 状态。

## 常见改动入口

- 新增元素类型：先改 `src/board/model.js` 和 `src/board/element-factory.js`，再改 `src/canvas/konva-elements.js`，最后接入工具/属性栏/测试。
- 改工具行为：从 `src/app/shell/stage-pointer-controller.js` 看指针分发，再进入 `src/app/tools/*` 或 `src/tools/interaction-rules.js`。
- 改选区/拖拽/缩放：优先看 `src/app/selection/*`，再看 `src/tools/interaction-state-machine.js` 和 `src/tools/interaction-rules.js`。
- 改文本编辑：看 `src/app/editing/controller.js`、`src/app/editing/text-element-measure.js`、`src/services/text-overlay-controller.js` 和 `src/tools/interaction-rules.js`。
- 改结构：先看 `src/structures/*` 的纯逻辑，再看 `src/app/structures/*` 的应用交互。
- 改保存/草稿/历史：看 `src/app/shell/board-session/*`、`src/board/history.js`、`src/services/file.js`、`src/services/draft-storage.js`。

## 命名约定

- 数据模型叫元素，不叫 shape/node。
- Konva 实例叫形状或 node，不叫元素。
- `controller.js` 通常是无 DOM 或聚合 controller；`dom-controller.js` 管 DOM；`action-controller.js` 管用户命令；`markup.js` 只生成标记。
