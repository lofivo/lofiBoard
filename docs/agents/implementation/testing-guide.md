# 测试指南

项目测试栈是 Vitest。功能修改应补足与风险匹配的回归测试，并优先把纯规则放在不依赖浏览器的模块中验证。

## 基本命令

- 全量测试：`npm test`
- 单个测试文件：`npm test -- tests/path/to/file.test.js`
- 当前自动化测试不包含 Playwright；需要真实浏览器验证时，确认操作命中 React 可见控件，而不是 `legacyRootRef` 内为引擎保留的同名 DOM 控件。

## 按改动选择测试

- 修改 `src/app/whiteboard-app.js` 初始化、controller 接线或抽取 controller：运行 `tests/app/shell/whiteboard-app-startup.test.js`，必要时全量。
- 修改画板模型、元素默认值、序列化：运行 `tests/board/model.test.js`、`tests/board/element-factory.test.js`、相关应用测试。
- 修改历史：运行 `tests/board/history.test.js` 和触发历史的应用 controller 测试。
- 修改文本编辑/测量/LaTeX：运行 `tests/app/editing/*`、`tests/services/text-overlay*`、`tests/services/latex.test.js`、`tests/tools/interaction-rules.test.js`、`tests/canvas/konva-elements.test.js`；涉及字体加载或应用装配时还要运行 `tests/app/shell/whiteboard-app-startup.test.js`。
- 修改选区、拖拽、Transformer、对齐：运行 `tests/app/selection/*` 和 `tests/tools/interaction-state-machine.test.js`。
- 修改工具、画笔、橡皮、图形预览：运行 `tests/app/tools/*`、`tests/tools/stroke-engine.test.js`、`tests/tools/behavior.test.js`、`tests/canvas/geometry.test.js`。
- 修改结构：运行 `tests/structures/*` 和 `tests/app/structures/*`。
- 修改结构模板随机初始化或树遍历：运行 `tests/structures/templates.test.js`、`tests/app/structures/panel-controller.test.js`、`tests/app/components/StructurePanel.test.jsx`、`tests/app/components/StylePanel.test.jsx` 和 `tests/app/shell/shell.test.js`。
- 修改二维数组解析、尺寸、持久化、单元格编辑或属性栏：运行 `tests/structures/templates.test.js`、`tests/board/model.test.js`、`tests/canvas/konva-elements.test.js`、`tests/app/structures/cell-editor-controller.test.js`、`tests/app/components/StylePanel.test.jsx` 和 `tests/app/shell/whiteboard-app-startup.test.js`。
- 修改图结构属性栏、有向图开关、节点大小或结构输入桥接：运行 `tests/structures/templates.test.js`、`tests/app/structures/inspector-sync-controller.test.js`，并按涉及组件运行 `tests/app/components/*`。
- 修改数组算法：运行 `tests/algorithms/array.test.js` 和 `tests/app/algorithms/array/*`。
- 修改 React 外壳、React 面板、右键菜单或 `commands` / `getUiState` 门面桥接：运行对应 `tests/app/App.*.test.jsx`、`tests/app/components/*`，必要时补 `tests/app/inspector/*` 或 `tests/app/structures/*`。
- 修改属性栏/面板/图层：运行 `tests/app/inspector/*`、`tests/app/panels/*`、`tests/app/components/*`、`tests/ui/panel-state.test.js`。
- 修改导入导出/剪贴板/草稿：运行 `tests/app/import-export/*`、`tests/app/clipboard/*`、`tests/services/clipboard.test.js`、`tests/services/draft-storage.test.js`、`tests/services/image-import.test.js`。
- 修改视口：运行 `tests/canvas/viewport.test.js`、`tests/app/viewport/*`。

## 搜索测试

改已有功能前先搜索对应测试：

```sh
rg "关键词|函数名|用户可见文案" tests src
```

如果源码已有测试但断言不覆盖新行为，先更新测试。没有测试就新增与源码目录镜像的测试文件。

## 测试风格

- 纯逻辑优先测纯模块，例如 `src/structures/*`、`src/tools/*`、`src/board/*`。
- 应用 controller 通过依赖注入的 fake collaborator 测行为，不要启动浏览器。
- 对 Konva 相关行为，优先测试 controller 如何调用 fake node/layer/transformer，以及状态如何提交到元素。
- 对 React 外壳组件，测试组件展示和桥接调用；画板事实状态仍要在遗留 controller 或纯逻辑测试里断言。
- 对 bug 修复，测试名要描述复现条件和期望结果。
- 对历史和持久化，断言稳定画板数据，不要断言临时运行时状态被保存。

## 高风险回归点

- 文本编辑框和渲染框尺寸必须独立保存；编辑框自动撑高不能覆盖手动尺寸，渲染框高度必须以 DOM/KaTeX 实际内容为准。
- 结构内部可交互元素不能被 Transformer 背板挡住。
- `pointerdown` 到首次 `dragmove` 之间不要重建正在拖拽的 Konva node。
- 数组算法运行中不能允许线性结构内容被同时编辑。
- 保存画板前不能把结构运行时投影、算法 marker、选区或工具状态写入文件。
- 二维数组改尺寸要保留仍在范围内的单元格及其 id；显示/隐藏下标后元素中心不能漂移，锁定后不能双击编辑单元格。
- React 受控控件必须能从 `getUiState()` 回灌，并经 `commands.*` 门面闭环进入引擎 controller；不要恢复 `querySelector` + `.click()` / 合成事件的旧桥接。
- 删除引擎读取的 DOM 或修改属性 store 时，要补真实走 `stage.eventHandlers.pointerdown → pointermove → pointerup` 的绘制路径测试，避免只验证组件表面状态而漏掉应用接线。
