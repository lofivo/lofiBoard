# 结构和数组算法

## 结构分层

结构逻辑分两层：

- `src/structures/*`：纯结构规则，负责解析、创建、更新、布局、导出。
- `src/app/structures/*`：应用交互，负责面板、选区、浮动控件、拖拽、编辑、历史和渲染同步。

结构元素包括线性结构、二维数组、图和树。线性结构包括数组、栈、队列、双端队列；树结构通过 `settings.treeKind` 区分普通树和二叉树。

结构模板统一支持手填和随机生成。随机数量输入对线性结构表示元素数量，对图/树表示节点数量；二维数组使用独立的行数和列数输入。线性结构、图和树限制为 1 到 64，二维数组的行数和列数分别限制为 1 到 32。

结构模板的“初始结构”和左侧属性栏的结构内容输入框，初始高度统一按对应结构类型的系统预设文本在当前宽度下的真实排版计算。已有或新输入的自定义内容不会继续撑高输入框，超出部分在框内滚动；用户仍可纵向拖拽调整高度。切换结构模板或结构类型时，手动高度重置并按新类型的系统预设重新计算。

## 结构运行时

`src/structures/interaction.js` 存当前会话里的结构运行时状态：

- 活动线性结构单元格。
- 线性结构单元格拖拽状态。
- 线性结构指针拖拽状态。
- 活动树节点。
- 图/树连边状态。
- 数组算法会话和算法面板状态。
- 拖拽后需要抑制的一次点击/选择。

这些状态通过 `projectRuntime(element)` 投影给渲染层，不应该写入 `.lofibrd`。

## 线性结构

纯逻辑在 `src/structures/linear-structure.js`。它负责：

- 输入解析和随机数组初始化。
- 插入、删除、更新、交换、移动 item。
- index 显示选项。
- 高亮、指针和算法 marker。
- 线性结构尺寸和单元格 drop gap 计算。

应用层主要模块：

- `linear-gesture-controller.js`：把线性结构事件分发到选择、单元格拖拽、指针拖拽。
- `linear-item-drag-controller.js`：拖动单元格重排。
- `linear-pointer-drag-controller.js`：拖动指针 marker。
- `linear-panel-sync-controller.js`：属性栏与活动单元格/结构内容同步。
- `linear-runtime.js`：应用层几何辅助。

数组算法锁定时，线性结构单元格不能编辑，避免算法会话和用户编辑互相覆盖。

线性结构属性栏选择“0 下标”或“1 下标”时，会在同一次结构编辑中自动开启下标显示；用户仍可随后通过“隐藏下标”单独关闭显示。

## 二维数组

纯逻辑集中在 `src/structures/matrix-structure.js`：

- 输入使用换行或分号分隔行、逗号分隔列；短行会在右侧补空单元格，导出统一使用换行和逗号。
- `rows` / `columns` 表示尺寸，单元格用稳定 `id`、零基 `row` / `column` 和字符串 `value` 表示。
- 属性栏调整行列数时限制为 1 到 32，保留新范围内原坐标上的单元格，新增位置初始化为空。
- 切换 0/1 下标或下标显隐会围绕元素中心重新计算尺寸。显示下标时，左上角空白表头使用对角线区分行、列标题。
- 随机初始化按指定行数和列数生成二维数组，单元格值沿用线性结构的 0 到 99 随机整数规则。

属性栏通过 `getUiState().matrixStructure` 回灌二维文本、行列数和下标设置，通过 `commands.updateMatrixStructure()` 提交数据、尺寸和显示选项。该流程不依赖遗留 DOM 控件。

单元格编辑由 `src/canvas/konva-elements.js` 把双击/双击触控事件适配为 `onMatrixItemEdit`，再交给 `src/app/structures/cell-editor-controller.js` 创建与单元格对齐的 `.cell-editor`。`Enter` 或失焦提交，`Escape` 取消；提交后更新模型、恢复结构选区并写入一条历史。锁定结构时不得进入单元格编辑。

## 图结构

纯逻辑在 `src/structures/graph-structure.js`。支持边列表、邻接表、邻接矩阵导入导出，节点/边增删，节点移动，边方向和权重更新，图布局和高亮。

随机初始化按节点数生成标签 `1..n` 的无向图：先为每个新节点随机选择一个已有节点形成生成树以保证连通，再按节点规模为尚未连接的点对随机补边。

图结构的节点 id 和 label 要区分。用户看到的是 label，边内部连接用节点 id。

图结构属性栏横跨 React 外壳和引擎 controller：

- React `StylePanel.jsx` 展示图输入、有向图 Switch、节点大小 Slider。
- 图输入和节点大小是尚未迁移到门面的例外，仍直接读写遗留 DOM：`[data-graph-structure-input]`、`[data-graph-node-scale]`（新代码不要模仿）。
- “应用结构”“有向图”“节点大小提交”通过 `ctx.runAction()` → `app.commands.runAction()` 直接调 `src/app/shell/action-controller.js`，由结构 controller 更新模型、历史和渲染。
- `syncGraphStructurePanelState()` 是回灌入口，负责把当前选中图导出到输入框、把有向状态写进 `root.dataset.graphDirected`（经 `getUiState().graphDirected` 到 React Switch）、把当前节点半径换算成 Slider 百分比。

关键约束：

- `ctx.graphDirected` 是显示态，不是模型事实来源；必须由 `root.dataset.graphDirected` 回灌。Switch 点击后应触发 `graph-directed-toggle`，由 `setGraphDirected()` 整图翻转所有边并同步默认方向。
- 节点大小 Slider 拖动中只写 DOM 值并实时预览；提交历史由 `graph-node-scale-commit` 在 `onAfterChange` 触发一次。
- 应用结构重建图时要沿用当前 `style.nodeRadius`，并按当前半径钳制旧节点位置和新边框尺寸。

## 树结构

纯逻辑在 `src/structures/tree-structure.js`。支持普通树和二叉树：

- 普通树支持添加子节点、左右兄弟、移动节点、折叠子树、遍历高亮。
- 二叉树限制每个父节点最多左/右两个子节点，并自动布局。
- 根节点通过 `settings.rootId` 记录。
- 普通树和二叉树都支持中序遍历。普通树采用“第一个子树 → 根 → 其余子树”的广义中序定义；二叉树保持“左子树 → 根 → 右子树”。
- 随机初始化根据节点数创建完全树形输入；二叉树同时记录明确的左右孩子关系。

树节点点击/双击必须由节点自身事件负责，不能在画布选择入口直接吞掉 `.tree-node` 命中。

## 结构浮动控件

结构浮动控件由 `src/app/structures/controls-controller.js` 创建，位置由 `controls-position-controller.js` 同步。活动视觉由 `active-visual-controller.js` 处理。

改变结构内部活动状态时优先原地更新已有 node 或控件位置。只有结构内容真正变化、需要重新布局或重建 handler 时才渲染整个画板。

## 数组算法

排序步骤生成在 `src/algorithms/array.js`，支持冒泡排序、选择排序和插入排序。应用会话在 `src/app/algorithms/array/session-controller.js`。

数组算法会话包含：

- 算法和算法名称。
- 初始值和步骤列表。
- 当前步骤、稳定步骤。
- 播放状态和动画状态。
- 是否已提交历史。
- 错误信息。

播放时，算法会给数组结构写入 marker 作为视觉状态；保存画板前要清理这些运行时 marker。完成或停止并提交稳定结果时才写历史。

## 结构测试入口

- 纯结构规则：`tests/structures/*`
- 结构应用交互：`tests/app/structures/*`
- 二维数组模型与渲染：`tests/structures/templates.test.js`、`tests/board/model.test.js`、`tests/canvas/konva-elements.test.js`
- 二维数组属性栏与命令桥接：`tests/app/components/StylePanel.test.jsx`、`tests/app/shell/whiteboard-app-startup.test.js`
- 数组算法纯步骤：`tests/algorithms/array.test.js`
- 数组算法应用会话/面板：`tests/app/algorithms/array/*`
