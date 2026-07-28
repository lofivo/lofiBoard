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

已有选区时，空闲指针进入选区的整体包围框会临时按选择交互处理：显示选择光标，按下可拖拽当前选区，右键使用对象菜单；移出选区后恢复当前工具。该规则不改变工具栏里的活动工具，平移和已经开始的绘制/拖拽仍按当前交互状态优先。

工具栏最左侧的锁按钮控制“放置后保持当前工具”，也可用 `Q` 切换。状态由引擎工具 controller 持有，经 `getUiState().keepToolActive` 回灌 React 工具栏。关闭时，文字、便签、图形和结构放置完成后切回选择工具；开启时保留当前工具。画笔和橡皮本身就是连续工具，不受该回退规则影响。

锁按钮后用竖向分隔线与常用工具隔开。矩形、椭圆、直线和箭头直接显示在主工具栏；“更多工具”弹层只保留坐标系。React 按钮通过 `commands.selectShapeTool()` 切换活动图形。

当当前属性栏存在唯一、明确的大小属性时，`+` / `-` 由 `keyboard-controller` 调用 `size-shortcut-controller` 调整该属性：画笔/图形改粗细，文字/便签改字号，坐标系改单位间距，选中的图结构改节点大小。输入控件编辑态和多选混合属性栏不拦截这组按键；所有数值按属性栏现有步进和上下限处理。

## React 面板交互

React 外壳只替换部分 UI，不替换画板交互内核。`Topbar`、`ToolDock`、`StylePanel`、`StructurePanel`、`LayerPanel`、`ContextMenu` 和 `StatusBar` 通过 `WhiteboardContext` 调用 `App.jsx` 中的桥接函数。

典型流程（AGENTS.md 第 39/40 条的双门面闭环）：

1. 引擎 controller 更新模型、Konva node 和内部状态。
2. `App.jsx` 每 100ms 调一次 `app.getUiState()` 取全量快照，逐字段 diff 后写入 React context；文本缩放等高频预览状态通过 `app.subscribeUiState()` 主动通知，并在下一动画帧合并同步，避免属性栏出现 100ms 的阶梯式延迟。
3. React 组件显示受控控件。
4. 用户操作 React 控件后，组件通过 `ctx.runAction()`、`ctx.setTool()`、`ctx.runContextAction()`、`ctx.setProperty()` 等调用 `app.commands.*`。
5. 引擎 controller 修改画板模型、历史和 Konva node，下一次 `getUiState()` 把新状态带回 React。

改 React 控件时要沿着这条闭环验证：显示值必须能从 `getUiState()` 回灌，用户输入必须经 `commands.*` 进入引擎。只改 React state 会导致控件回弹或画板模型没有变化。不要在 React 里 `querySelector` 遗留 DOM 再 `.click()` 或派发合成事件。

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

文本/便签编辑由 `src/app/editing/controller.js` 控制。编辑态会创建 DOM textarea overlay，并以 textarea 作为可见文字、光标和选区的唯一视觉真值；内部 Konva.Text 在编辑期间隐藏，只保留外层 Group/命中区供 Transformer 调整编辑框。

文本尺寸规则集中在：

- `src/app/editing/text-element-measure.js`
- `src/tools/interaction-rules.js`
- `src/canvas/konva-elements.js`
- `src/services/text-overlay-controller.js`

关键约束：

- 默认文本高度是一行。
- 点击文本进入编辑，拖拽才移动。
- 只有含可渲染 LaTeX 的 `text` 元素分离编辑框与渲染框：`editWidth` 保存源码编辑宽度，`editHeight` 仅保留最后一次自动贴合高度作为兼容缓存，`width` / `height` 保存公式渲染框尺寸；纯文本编辑态与渲染态共用 `width` / `height`，两者都共用元素左上角。
- 新建 LaTeX 的源码编辑框首次输入可按源码收窄，但不会超过初始编辑宽度；长公式源码在框内换行，不按公式渲染宽度或 LaTeX 命令字符数横向撑开。拖入或预填充 LaTeX 时，源码编辑框同样使用默认编辑宽度，不继承扩大的公式渲染宽度。
- 新建 LaTeX 首次提交时，渲染框宽度按公式的可见内容自动贴合，不继承默认源码编辑宽度；后续再次编辑若未调整渲染框，不得改变已有渲染宽度。
- 文字编辑态左右锚点只调整编辑宽度并重排换行；四角和上下锚点等比缩放并修改字号，与选中态语义一致。调整期间保持编辑态且禁用旋转。
- LaTeX 编辑框实际高度只取当前编辑宽度、字号和源码排版得到的 textarea 真实 `scrollHeight`；进入编辑、输入、改宽和缩放字号后都重新贴合，不把旧 `editHeight` 当作最小高度。
- 编辑态不得用透明 textarea 叠加可见 Konva 文本；长文本、多行换行和浏览器选区都必须按 textarea 的真实排版显示，提交或取消后再恢复 Konva/overlay 渲染。
- Enter、失焦或外部点击提交文字与编辑框尺寸为一条历史；Escape 同时恢复两者。
- 非编辑态 `height` 由 DOM overlay 的实际内容高度校正。LaTeX 必须等待 KaTeX HTML 写入后测量，并覆盖超出父行盒的子节点；浏览器字体加载完成后再次测量。
- 文本元素是 Konva Group 包 Text，宽高变化要同步外层 Group、hit area 和内部 Text。
- 非编辑态宽度缩放先用 Canvas 测量即时预览，再用 DOM 实际高度修正；Canvas/启发式高度只作 DOM 尚不可用时的兜底。
- 便签继续使用原有固定尺寸语义，不使用 `editWidth` / `editHeight`。

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
