# 代码地图

## 顶层目录

- `src/app/main.jsx`：React 浏览器入口，导入样式并渲染 `App`。
- `src/app/App.jsx`：React 外壳。创建 `legacyRootRef`，在其中调用 `createWhiteboardApp(root)`，隐藏被 React 替换的遗留 DOM，并把遗留白板状态桥接到 React context。
- `src/app/whiteboard-app.js`：应用装配入口。这里创建 Stage/Layer、状态变量、所有 controller，并把跨模块回调接起来。
- `src/board/`：画板数据模型、元素工厂、历史栈、ID。
- `src/canvas/`：Konva 形状创建/同步、几何计算、视口适配、导出背景。
- `src/tools/`：与具体 DOM 无关的工具行为、交互规则、笔触输入和交互状态机。
- `src/structures/`：结构元素的纯逻辑，包括线性结构、图、树、结构工厂和结构交互运行时。
- `src/algorithms/`：算法步骤生成，目前主要是数组排序。
- `src/services/`：文件、剪贴板、图片导入、本地草稿、LaTeX 和文本 overlay 服务。
- `src/ui/`：工具栏、菜单、上下文菜单、面板等 UI 配置和轻量状态。
- `src/styles.css`：全局样式、面板状态、文本 overlay、结构控件等样式入口。

## React 外壳桥接

React 组件位于 `src/app/components/*`。它们主要负责展示和用户输入，不直接拥有画板模型。真实状态仍在 `createWhiteboardApp()` 创建的遗留 controller、Konva node 和 board session 中。

桥接方向分三类：

- 遗留白板到 React：`App.jsx` 定时读取 `legacyRoot.dataset.*`、`[data-*]` 文本和 `legacyRoot._getLayersData()` / `_getSelectedIds()`，写入 `WhiteboardContext`。属性栏模式、选区能力、结构类型、图有向状态、当前工具、背景、缩放、文件名和状态栏都走这个方向。
- React 到遗留白板 action：工具切换、菜单命令、缩放、背景、结构属性栏按钮等通过点击遗留 DOM 上的 `[data-action]`、`[data-tool]`、`[data-context-action]` 等入口触发，最终仍由 controller 改模型和历史。
- React 到属性控件：颜色、线宽、字体、坐标系等连续属性通过 `syncPropertyToInput()` 写 `[data-control]` 隐藏 input，并派发 `input` / `change` 事件，让已有属性栏 controller 处理选区样式和历史。

维护约束：

- 不要把 React state 当成画板事实来源。React 受控控件必须能从遗留 controller 回灌，例如 `root.dataset.graphDirected` 经 `App.jsx` 同步到 `ctx.graphDirected` 后驱动 Switch。
- `legacyRootRef` 的容器必须保持 `zIndex: "auto"`，避免创建层叠上下文把遗留 `position: fixed` 弹窗压到 React 面板下。
- 新增 React 面板控件时，优先复用已有 `data-action` / `data-control` 桥接；只有确实没有遗留入口时，再在对应 controller 暴露窄方法。

## `src/app/` 分区

- `components/`：React 外壳组件，包括顶栏、工具停靠栏、属性栏、结构面板、图层面板、状态栏和右键菜单。
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
- 改 React 属性栏或结构面板：先看 `src/app/App.jsx` 的桥接状态，再看 `src/app/components/StylePanel.jsx` / `StructurePanel.jsx`，最后看对应 `src/app/inspector/*` 或 `src/app/structures/*` controller。
- 改保存/草稿/历史：看 `src/app/shell/board-session/*`、`src/board/history.js`、`src/services/file.js`、`src/services/draft-storage.js`。

## 命名约定

- 数据模型叫元素，不叫 shape/node。
- Konva 实例叫形状或 node，不叫元素。
- `controller.js` 通常是无 DOM 或聚合 controller；`dom-controller.js` 管 DOM；`action-controller.js` 管用户命令；`markup.js` 只生成标记。
