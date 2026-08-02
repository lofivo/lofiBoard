# lofiBoard

离线优先、可编辑的网页白板应用。支持无限画布、多种绘图工具、数据结构可视化，以及本地 `.lofibrd` 文件读写。

## Language

**画板 (Board)**:
整个白板的数据模型，包含画布设置、视口状态和所有元素。
_Avoid_: document, file, canvas(数据语境)

**画布 (Canvas)**:
用户放置、查看和操作元素的无限工作平面；在交互语境中指可拖拽、缩放、绘制的白板表面。
_Avoid_: board(数据语境), document

**视口 (Viewport)**:
用户当前看到画布的窗口位置和缩放比例。视口描述观看画布的方式，不改变元素自身的位置和尺寸。
_Avoid_: camera, stage state, zoom state

**画板会话 (Board Session)**:
用户当前正在编辑的画板状态，包含当前画板、活动文件名、未保存状态、历史恢复点和本地草稿。
_Avoid_: app state, document session, file state

**本地草稿 (Local Draft)**:
自动保存在浏览器本地、用于恢复未保存画板会话的备份。它不是用户主动保存的 `.lofibrd` 文件。
_Avoid_: autosave file, backup document, persisted board

**元素 (Element)**:
画板上的可操作实体。类型包括笔触、文字、便签、图片、网页、矩形、椭圆、线段、箭头、坐标系，以及数组/二维数组/栈/队列/双端队列/图/树等结构。
_Avoid_: item, node(数据语境), shape

**形状 (Shape)**:
Konva 渲染实例，是元素在 Canvas 上的视觉表现。一个元素可能对应一个或多个形状。
_Avoid_: node, element(渲染语境)

**形状渲染 (Shape Rendering)**:
将元素和结构运行时投影同步为画板上的形状表现的过程。
_Avoid_: render loop, node sync, canvas redraw

**工具 (Tool)**:
当前激活的操作模式。包括选择、平移、画笔、橡皮、文字、便签、结构、图形等。
_Avoid_: mode, action

**临时绘制 (Draft Interaction)**:
用户按下指针后、提交为元素之前的临时画布操作，例如图形预览或框选范围。临时绘制不属于画板内容，只有提交后才变成元素或选区。
_Avoid_: draft(本地草稿语境), pending element, preview state

**交互状态 (Interaction State)**:
用户当前正在进行的低层交互阶段，例如空闲、平移、绘制、擦除、拖拽、缩放、编辑或结构交互。交互状态不同于工具；同一个工具可能进入多个交互状态。
_Avoid_: tool, mode, ui state

**选区 (Selection)**:
当前被选中的元素集合。支持单选、多选（Shift 切换）、框选。
_Avoid_: picked, active

**编辑态 (Edit mode)**:
文本或便签元素正在被内联编辑的状态。编辑态下元素不可拖拽，不可切换选区。
_Avoid_: editing

**编辑框 (Editing Box)**:
文字元素进入编辑态时用于输入源文本的可调区域；LaTeX 文字持久保留编辑宽度，供后续再次编辑时恢复，编辑高度则由当前宽度、字号和源文本的真实排版自动贴合。编辑框尺寸与渲染框尺寸相互独立，其实际高度必须刚好完整容纳源文本，不保留人为留白。
_Avoid_: 编辑态边框, textarea 尺寸

**渲染框 (Render Box)**:
文字元素在非编辑态下包围最终展示内容的区域；其宽度与编辑框宽度相互独立并由文字元素持久保留，其高度始终贴合最终展示内容，不保留人为留白。渲染框以文字元素左上角为固定起点。
_Avoid_: 非编辑态边框, textarea 尺寸

**图层 (Layer)**:
元素沿 z 轴的堆叠顺序。通过 zIndex 控制。
_Avoid_: level

**结构 (Structure)**:
一类复合元素，包括线性结构（数组/栈/队列/双端队列）、二维数组和关联结构（图/树）。
_Avoid_: composite, container

**二维数组 (Matrix Structure)**:
按行列组织单元格的独立结构元素。输入文本用换行或分号分隔行、逗号分隔列；`row` / `column` 是单元格内部零基坐标，显示下标可从 0 或 1 开始。
_Avoid_: matrix(图结构的邻接矩阵语境), table, grid

**结构交互 (Structure Interaction)**:
结构元素内部的操作流程，包括线性结构单元格选择/拖拽/指针拖拽、二维数组单元格编辑与行列调整、数组算法演示、图节点连边、树节点选择/编辑/遍历、结构浮动控件，以及这些操作引发的选区、历史记录和形状同步。
_Avoid_: structure widget logic, algorithm panel logic

**结构运行时投影 (Structure Runtime Projection)**:
结构交互在渲染前附加到结构元素上的临时状态，用来表达当前会话里的活动单元格、拖拽预览、活动树节点、连边状态和算法动画状态；不写入画板文件。
_Avoid_: persisted structure data, render flags

**结构事件 (Structure Event)**:
结构元素内部发生的用户操作或动画操作，例如单元格按下、单元格释放、指针拖拽、图节点点击、树节点编辑、算法播放步进；由形状事件适配后交给结构交互处理。
_Avoid_: raw Konva handler, DOM callback

**数组算法会话 (Array Algorithm Session)**:
针对某个数组结构正在演示的排序过程，包含算法选择、步骤位置、播放状态、动画状态和错误状态。数组算法会话属于当前画板会话的临时交互信息，不写入画板文件。
_Avoid_: persisted algorithm data, array state, animation flags
