# 状态、历史和持久化

## 画板模型

画板由 `src/board/model.js` 定义：

- `version`：当前为 `1`。
- `app`：当前为 `lofiBoard`。
- `canvas`：画布设置，目前包含背景模式。
- `viewport`：视口位置和缩放。
- `elements`：按 `zIndex` 排序的元素列表。

`normalizeBoard()` 是读取 `.lofibrd` 的入口，会校验版本、归一化视口、背景和元素。新增持久化字段时要同步默认值、归一化、序列化和测试。

## 元素数据

元素类型在 `src/board/model.js` 的默认值中集中体现，创建入口在 `src/board/element-factory.js`。常见元素：

- 笔触：`stroke`
- 文本：`text`
- 便签：`sticky`
- 图片：`image`
- 图形：`rect`、`ellipse`、`line`、`arrow`、`coordinate-plane`
- 结构：`array-structure`、`stack-structure`、`queue-structure`、`deque-structure`、`graph-structure`、`tree-structure`

新增字段要判断是否写入 `.lofibrd`。纯会话状态不要放进持久化元素字段。

## 画板会话

`src/app/shell/board-session/controller.js` 管当前画板会话：

- 当前画板对象。
- 历史栈。
- 活动文件名和文件句柄。
- dirty 状态。
- 本地草稿保存和恢复。

`src/app/shell/board-session/action-controller.js` 包装会话 action，并在新建、撤销、重做、恢复历史前清理易失状态，例如数组算法播放、交换动画和算法会话。

## 历史

`src/board/history.js` 是纯历史栈，默认限制 80 个状态。应用层通过 `pushHistory(message)` 推入序列化后的画板快照。

需要写历史的操作：

- 添加、删除、移动、缩放、改样式、改文本、改结构内容。
- 切换画布背景、重置视图、适配内容这类改变持久状态的操作。
- 数组算法完成或停止并提交稳定结果时。

不应写历史的状态：

- 选区变化。
- 临时绘制预览。
- 光标、hover、高亮控件位置。
- 结构运行时投影。
- 未提交的文本编辑中间态。

## 本地草稿和文件

本地草稿在 `src/services/draft-storage.js`，文件系统访问在 `src/services/file.js`。会话保存草稿时会先提交当前文本编辑，避免 textarea 中的内容丢失。

`.lofibrd` 保存使用 `serializeBoard(board, viewport)`，导出 PNG 使用 `src/app/import-export/export-png-controller.js`，图片和文本导入使用 `src/app/import-export/import-workflow-controller.js`。

## 易失状态

以下状态属于当前会话，不能写入画板文件：

- `selectedIds`
- `currentTool`、`activeShapeTool`
- 各工具的属性控件快照（颜色、线宽、文字/便签字体与文字样式等）
- `interactionSM` 当前状态
- 文本编辑 DOM overlay
- 线性结构活动单元格、拖拽预览、指针拖拽
- 树活动节点和浮动控件位置
- 数组算法会话、播放 timer、动画 tween

保存前如果结构元素带有数组算法 marker，应清理运行时 marker，保持文件只包含稳定画板内容。

工具属性快照由 `src/app/inspector/property-controls/controller.js` 按工具分别保存，切换工具时先保存旧工具、再恢复新工具。文字和便签虽不进入遗留工具属性面板模式，仍需要保留各自快照；有元素选中时只同步元素样式，不能覆盖工具预设。
