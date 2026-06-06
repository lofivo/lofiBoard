# lofiBoard

离线优先、可编辑的网页白板应用。支持无限画布、多种绘图工具、数据结构可视化，以及本地 `.lofibrd` 文件读写。

## Language

**画板 (Board)**:
整个白板的数据模型，包含画布设置、视口状态和所有元素。
_Avoid_: document, file, canvas(数据语境)

**画板会话 (Board Session)**:
用户当前正在编辑的画板状态，包含当前画板、活动文件名、未保存状态、历史恢复点和本地草稿。
_Avoid_: app state, document session, file state

**元素 (Element)**:
画板上的可操作实体。类型包括笔触、文字、便签、图片、矩形、椭圆、线段、箭头、坐标系，以及数组/栈/队列/双端队列/图/树等结构。
_Avoid_: item, node(数据语境), shape

**形状 (Shape)**:
Konva 渲染实例，是元素在 Canvas 上的视觉表现。一个元素可能对应一个或多个形状。
_Avoid_: node, element(渲染语境)

**工具 (Tool)**:
当前激活的操作模式。包括选择、平移、画笔、橡皮、文字、便签、结构、图形等。
_Avoid_: mode, action

**选区 (Selection)**:
当前被选中的元素集合。支持单选、多选（Shift 切换）、框选。
_Avoid_: picked, active

**编辑态 (Edit mode)**:
文本或便签元素正在被内联编辑的状态。编辑态下元素不可拖拽，不可切换选区。
_Avoid_: editing

**图层 (Layer)**:
元素沿 z 轴的堆叠顺序。通过 zIndex 控制。
_Avoid_: level

**结构 (Structure)**:
一类可内部交互的复合元素，包括线性结构（数组/栈/队列/双端队列）和关联结构（图/树）。
_Avoid_: composite, container

**结构交互 (Structure Interaction)**:
结构元素内部的操作流程，包括线性结构单元格选择/拖拽/指针拖拽、数组算法演示、图节点连边、树节点选择/编辑/遍历、结构浮动控件，以及这些操作引发的选区、历史记录和形状同步。
_Avoid_: structure widget logic, algorithm panel logic

**结构运行时投影 (Structure Runtime Projection)**:
结构交互在渲染前附加到结构元素上的临时状态，用来表达当前会话里的活动单元格、拖拽预览、活动树节点、连边状态和算法动画状态；不写入画板文件。
_Avoid_: persisted structure data, render flags

**结构事件 (Structure Event)**:
结构元素内部发生的用户操作或动画操作，例如单元格按下、单元格释放、指针拖拽、图节点点击、树节点编辑、算法播放步进；由形状事件适配后交给结构交互处理。
_Avoid_: raw Konva handler, DOM callback
