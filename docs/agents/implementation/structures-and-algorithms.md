# 结构和数组算法

## 结构分层

结构逻辑分两层：

- `src/structures/*`：纯结构规则，负责解析、创建、更新、布局、导出。
- `src/app/structures/*`：应用交互，负责面板、选区、浮动控件、拖拽、编辑、历史和渲染同步。

结构元素包括线性结构、图和树。线性结构包括数组、栈、队列、双端队列；树结构通过 `settings.treeKind` 区分普通树和二叉树。

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

## 图结构

纯逻辑在 `src/structures/graph-structure.js`。支持边列表、邻接表、邻接矩阵导入导出，节点/边增删，节点移动，边方向和权重更新，图布局和高亮。

图结构的节点 id 和 label 要区分。用户看到的是 label，边内部连接用节点 id。

## 树结构

纯逻辑在 `src/structures/tree-structure.js`。支持普通树和二叉树：

- 普通树支持添加子节点、左右兄弟、移动节点、折叠子树、遍历高亮。
- 二叉树限制每个父节点最多左/右两个子节点，并自动布局。
- 根节点通过 `settings.rootId` 记录。

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
- 数组算法纯步骤：`tests/algorithms/array.test.js`
- 数组算法应用会话/面板：`tests/app/algorithms/array/*`
