# 核心交互流程

## 指针分发

`src/app/shell/stage-pointer-controller.js` 是画布指针事件的主要分发点。它根据当前工具、空格键、命中目标和交互状态进入不同流程：

- 空格键、平移工具或鼠标中键：进入平移。
- 选择工具：处理 Transformer、元素命中、结构内部命中、框选和选区拖拽。
- 画笔：开始笔触草稿。
- 片段橡皮：按路径切分笔触。
- 对象橡皮：命中元素后删除整个元素。
- 文字/便签：创建元素并进入编辑态。
- 结构工具：打开结构面板。
- 图形工具：开始图形临时绘制。

修改指针流程时要特别注意：`pointerdown` 到首次 `dragmove` 之间不要通过 `renderBoard()` 重建正在被 Konva 拖拽的节点。

## 工具和交互状态

工具在 `src/app/tools/controller.js` 管理，交互状态机在 `src/tools/interaction-state-machine.js`。工具表示用户选择了什么操作模式；交互状态表示当前正在发生什么低层动作。

同一个工具可能进入多个状态。例如选择工具可进入框选、拖拽、缩放、结构交互；画笔工具可进入绘制；文本元素可从选择工具进入编辑态。

## 渲染同步

`src/app/rendering/controller.js` 维护元素 id 到 Konva node 的 registry。渲染同步流程：

1. 将元素通过 `projectRuntimeElement()` 附加结构运行时投影。
2. 根据元素 JSON 和 handler snapshot 判断能否复用现有 node。
3. 能同步就调用 `syncElementNode()`，不能同步就销毁并重建。
4. 将节点移动到 content layer，并按元素顺序置顶。

`src/app/rendering/adapter.js` 负责把当前工具、临时平移、结构活动节点和数组算法锁定状态转成 handler snapshot。结构内部是否可编辑会影响 handler snapshot。

## 选区和 Transformer

选区状态由 `src/app/selection/controller.js` 管，命中查询由 `src/app/selection/hit-query.js` 管。拖拽和缩放拆在多个 controller：

- `drag-controller.js`：选区拖拽和 Konva node drag。
- `transformer-controller.js`：Transformer 节点绑定、锚点和 overdraw。
- `transform-events-controller.js`：记录 transform 事件中的上下文。
- `transform-preview-controller.js`：缩放中的视觉预览。
- `transform-commit-controller.js`：把 node 缩放结果提交回元素。

线性结构和树结构内部可交互时，Transformer 背板不能覆盖整个区域，否则会挡住内部节点。

## 文本和便签编辑

文本/便签编辑由 `src/app/editing/controller.js` 控制。编辑态会隐藏 Konva 文本显示，创建 DOM textarea overlay，并同步 Transformer。

文本尺寸规则集中在：

- `src/app/editing/text-element-measure.js`
- `src/tools/interaction-rules.js`
- `src/canvas/konva-elements.js`
- `src/services/text-overlay-controller.js`

关键约束：

- 默认文本高度是一行。
- 点击文本进入编辑，拖拽才移动。
- 编辑态高度必须跟随 textarea 真实 `scrollHeight`。
- 文本元素是 Konva Group 包 Text，宽高变化要同步外层 Group、hit area 和内部 Text。
- 退出编辑后要归一化文本 box，避免选中态和编辑态尺寸不一致。

## 绘制和橡皮

画笔/橡皮应用层在 `src/app/tools/drawing-interaction-controller.js`，纯输入规则在 `src/tools/stroke-engine.js`，几何切分在 `src/canvas/geometry.js`。

笔触绘制先生成临时 node，结束后才提交为元素。片段橡皮会把笔触切成碎片并重排元素；对象橡皮直接删除命中的未锁定元素。

## 图形临时绘制和框选

`src/app/tools/draft-interaction-controller.js` 同时处理图形预览和框选矩形：

- 图形预览在指针按下时创建临时元素和 node，移动时更新，松开时提交。
- 太小的图形通过 `isTinyElement()` 丢弃。
- 框选矩形不写入元素，只计算与 `.element` node 的 client rect 相交结果。

## 视口

`src/app/viewport/controller.js` 负责缩放、滚轮、网格 CSS 变量、光标和 overlay 同步。`src/app/viewport/action-controller.js` 管适配内容、确保选区可见、重置视图和背景切换。

视口改变要同步文本 overlay、结构浮动控件和本地草稿。
