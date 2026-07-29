# 白板交互成熟度审计

本文件记录 lofiBoard 按“单人离线白板 + 教学/算法可视化工具”定位的交互成熟度标准、当前代码线索和可执行改进项。它用于后续 AI agent 做交互修复、补测试或拆 issue，不替代具体实现文档。

最近核对：2026-07-29。当前结构能力已包含二维数组；全量基线为 110 个测试文件、1000 个测试通过。下文其他测试数字表示对应改动完成时的验证结果。

## 产品边界

- 一等场景：桌面端单人离线使用，支持鼠标、键盘、触控板、数位板/数位屏和压感笔迹。
- 一等对象：普通白板对象、文本/便签/LaTeX、图片、基础图形、坐标系、数组/二维数组/栈/队列/双端队列、图、树和二叉树。
- 不纳入当前成熟度目标：多人协作、账户、云同步、权限、实时光标、评论、移动端触屏完整编辑、完整幻灯片系统。
- 教学能力定位：结构元素先是可编辑白板对象，算法演示是选中结构上的轻量播放器。

## 成熟度标准

### 核心白板

- 选择工具是对象编辑中心：单击选中、双击编辑、拖拽移动、框选多选、Transformer 缩放/旋转、右键就地操作。
- 放置类工具行为稳定：默认情况下，文字/便签创建后进入编辑并在提交后回选择，结构和图片插入后选中新对象并回选择；开启“放置后保持当前工具”时继续使用当前放置工具，`Escape` 回选择。
- 多选支持整体移动、删除、复制、剪切、粘贴、层级、锁定、分组、取消分组、缩放和旋转。
- 编组后默认像单个对象操作，组内编辑必须有明确入口，不能被普通拖拽误触发。
- 锁定对象不能被编辑或对象橡皮删除，但应能被识别并通过图层或选区入口解锁。

### 文本和便签

- 新建后直接进入编辑；已选中文本再次点击或双击进入编辑。
- 编辑态输入优先，工具快捷键、拖拽链路、属性栏刷新不能打断输入。
- 编辑框和渲染框独立：编辑态恢复 `editWidth` 并按源码自动贴合高度，非编辑态保留 `width` 并按最终内容自动贴合 `height`。
- 编辑态拖拽左右/上下/角锚点时保持编辑；宽度或字号变化后，编辑高度必须按 textarea 实际内容重新贴合。
- Enter、失焦和外部点击把文字与编辑框尺寸合并提交；Escape 同时恢复两者。
- LaTeX 作为文本能力的一部分，不能破坏普通文本换行、最小宽度和一行默认高度；退出编辑后边框必须覆盖 KaTeX 实际内容，字体加载完成后允许再次校正。

### 视口和输入设备

- 滚轮/触控板缩放以指针位置为中心；空格、中键和平移工具行为一致。
- 双指平移/缩放控制视口，不应误选对象、误开始绘制或触发浏览器页面缩放。
- 数位板/数位屏绘制时 pointer capture 稳定，不丢移动事件，不被框选、结构命中或浏览器默认行为打断。
- 压感是一等笔触模型：pressure 要贯穿绘制、保存、打开、复制、粘贴、撤销、重做、橡皮切分和 PNG 导出。
- 鼠标或无压感设备使用稳定中间 pressure，不能产生随机粗细。

### 结构和算法

- 结构元素是“普通白板对象 + 内部可编辑对象”。
- 点结构空白或边框操作外层结构；点内部单元格/节点操作内部对象。
- Transformer 背板、透明命中区、选区入口不能挡住结构内部节点。
- 拖外框调整结构尺寸或显示范围；拖内部节点只改内部布局，不能移动外层结构。
- 二维数组支持批量应用二维文本、调整行列数、0/1 下标和下标显隐；双击单元格可编辑，锁定后内部编辑入口关闭。
- 所有结构模板都提供手填和随机生成；随机图必须连通，随机二维数组按受限阶数生成方阵。
- 普通树中序遍历采用“第一个子树 → 根 → 其余子树”，二叉树采用“左子树 → 根 → 右子树”。
- 算法播放只作用于选中的结构元素；播放中的临时 marker 不写入保存文件。
- 算法播放过程不写满撤销栈，停止或完成时只提交稳定结果。

### 属性栏、右键和图层

- 无选中时显示当前工具默认样式；单选时显示对象真实属性；多选只显示可批量修改的共同属性。
- React 属性栏显示值必须从遗留 controller/模型回灌，不能只依赖 React 本地 state。
- 右键对象时菜单作用于当前对象/选区；右键空白画布时显示画布级操作。
- 图层面板应与画布选区、层级顺序、分组和锁定状态一致。

### 历史、文件和性能

- 持久状态变化进入撤销栈；hover、活动节点、菜单开关、播放中的临时 marker 不进入撤销栈。
- 连续拖拽提交一次历史；连续滑块实时预览，松手提交一次历史。
- `.lofibrd` 打开、保存、另存为、自动草稿、图片/文本导入和 PNG 导出构成本地完整工作流。
- 性能按课堂/个人复杂白板验收：上百普通对象、长压感笔迹、几十节点结构仍可编辑；PNG 导出可以慢，但不能错误或卡死。

## 当前代码线索

- 指针分发入口：`src/app/shell/stage-pointer-controller.js`。
- 工具状态和交互状态：`src/app/tools/controller.js`、`src/tools/interaction-state-machine.js`。
- 选区、拖拽、缩放和吸附：`src/app/selection/*`。
- 文本编辑：`src/app/editing/controller.js`、`src/app/editing/text-element-measure.js`、`src/services/text-overlay-controller.js`。
- 压感和笔触输入：`src/tools/stroke-engine.js`、`src/app/tools/drawing-interaction-controller.js`、`src/canvas/geometry.js`、`src/canvas/konva-elements.js`。
- 结构内部交互：`src/app/structures/*`、`src/structures/*`。
- 二维数组：`src/structures/matrix-structure.js`、`src/app/structures/cell-editor-controller.js`、`src/app/components/StylePanel.jsx`、`src/canvas/konva-elements.js`。
- React 外壳回灌：`src/app/App.jsx`、`src/app/components/StylePanel.jsx`、`src/app/WhiteboardContext.jsx`。
- 右键和图层：`src/app/context-menu/*`、`src/app/components/LayerPanel.jsx`。
- 文件和草稿：`src/app/shell/board-session/*`、`src/services/file.js`、`src/services/draft-storage.js`。

## 已观察到的覆盖

- 压感输入已有测试覆盖：`tests/tools/stroke-engine.test.js` 验证 pressure 归一化、平滑时保留 pressure、pointer capture 和 pen/touch 默认行为拦截。
- 绘制链路已有测试覆盖：`tests/app/shell/stage-pointer-controller.test.js` 验证只接收活动 pointer 的 pen 移动并传递 pressure。
- 压感渲染已有测试覆盖：`tests/canvas/konva-elements.test.js` 验证压力变化笔触使用自定义 Shape，均匀压力保留 Konva Line，虚线/点线压力预览可绘制。
- 橡皮切分会插值 pressure：`src/canvas/geometry.js` 的 `getPointAtRatio()` 会为切分点插值 pressure。
- 复制粘贴使用深拷贝：`src/services/clipboard.js` 通过 `clone()` 保留元素内部数据，理论上包括 stroke points pressure。
- 多选、分组、锁定、图层、右键均已有 controller 和测试入口，但仍需要按成熟度清单做组合验收。
- 二维数组已有解析/创建/调整、画板归一化、表格渲染、对角表头、属性栏桥接和单元格编辑测试；后续需继续关注大尺寸矩阵的交互性能。

## P0 完成状态

截至本次审计，P0 已完成为“已有实现通过回归测试，且缺口处补齐测试证据”：

- 压感笔触全链路：已补 `normalize/serialize`、复制粘贴、橡皮切分插值回归测试。
- 结构内外交互边界：已有图节点拖拽、图框定尺、图透明命中区禁用、树节点点击/双击、线性结构单元格事件等覆盖；已补树空白命中区位于节点下方的回归测试。
- 二维数组交互边界：已有属性栏命令、尺寸/下标更新、单元格双击编辑、锁定保护、选区恢复和表头渲染覆盖。
- 文本编辑与渲染尺寸分离：已有 `editWidth` / `editHeight` 兼容旧文件、textarea `scrollHeight`、编辑锚点分轴调整、提交/取消事务、DOM/KaTeX 实际高度、字体加载重测、宽度/字号缩放预览，以及真实 Konva Text/Group/hit area 尺寸同步覆盖。
- 属性栏回灌一致性：已有 legacy input/dataset 到 React context 的桥接覆盖；已补图有向状态从 root dataset 回灌到 React context 的回归测试。

本轮验证命令：

```sh
npm test -- tests/board/model.test.js tests/services/clipboard.test.js tests/canvas/geometry.test.js tests/canvas/konva-elements.test.js tests/app/shell/stage-pointer-controller.test.js tests/app/structures tests/app/selection/transformer-controller.test.js tests/app/editing tests/services/text-overlay-controller.test.js tests/tools/interaction-rules.test.js tests/app/App.style-controls.test.jsx tests/app/components/StructurePanel.test.jsx tests/app/inspector
```

结果：36 个测试文件通过，349 个测试通过。

## P1 完成状态

### P1: 触控板视口体验（已完成首轮）

本轮完成：

- 触控板捏合类 wheel 事件（`ctrlKey`/`metaKey`）继续按指针位置缩放。
- 细粒度触控板双指滚动改为平移视口，不再误触缩放。
- 粗粒度鼠标滚轮仍保持原有缩放行为，避免破坏已有“滚轮缩放”工作流。
- 触控板平移会同步网格、工具光标、文本 overlay、浮动控件、缩放显示和本地草稿。

验证命令：

```sh
npm test -- tests/app/shell/shell.test.js tests/app/shell/ui-events-controller.test.js tests/app/shell/stage-pointer-controller.test.js tests/app/viewport/controller.test.js
```

结果：4 个测试文件通过，151 个测试通过。

### P1: 右键和图层一致性（已完成首轮）

本轮完成：

- 右键对象时保留对象菜单，菜单动作按当前对象/选区启用。
- 右键空白画布时切换为画布菜单，只显示撤销、重做、粘贴这类画布级动作，避免对象操作误作用于已有选区。
- 图层面板显示锁定和分组状态，并通过 `aria-label` 暴露给辅助技术。
- 图层数据桥接补充 `groupId`，确保 React 图层面板能显示分组状态。

验证命令：

```sh
npm test -- tests/app/App.context-menu.test.jsx tests/app/context-menu tests/app/components/ContextMenu.test.jsx tests/app/components/LayerPanel.test.jsx tests/app/panels/layer/controller.test.js tests/board/model.test.js tests/app/shell/stage-pointer-controller.test.js tests/app/shell/shell.test.js
```

结果：9 个测试文件通过，171 个测试通过。

### P1: 右键和图层一致性（第二轮完成）

本轮完成：

- 修复 React 图层桥接 diff 只比较 `id`/`name` 的缺陷：`toggle-lock`、`group`/`ungroup` 等只改状态不改顺序的操作，现在会正确刷新图层面板的锁定/分组徽章（`tests/app/App.layer-bridge.test.jsx`）。
- 补真实 `createWhiteboardApp()` 集成回归：图层面板数据最顶层元素排最前、`level` 与 z 顺序一致；`bring-forward` 等层级操作后面板顺序同步。
- 验证锁定元素解锁链路：图层面板入口可选中锁定元素，右键菜单 `toggle-lock` 可用并能解锁（成熟度标准“锁定对象应能通过图层或选区入口解锁”）。

### P1: 对齐吸附和视觉反馈（已完成首轮）

本轮完成：

- 拖动中实时吸附：Konva 原生节点拖拽（单选/多选/分组整体拖动）在 `dragmove` 阶段吸附，不再是松手时无反馈跳变。
- 参考线视觉反馈：吸附命中时在 `overlayLayer` 绘制横/纵虚线参考线，位置即吸附对齐线，跨越当前可视区域；拖拽结束、取消或按下 Alt 时清除。
- 吸附规则明确化：吸附目标排除所有随拖拽移动的元素（多选/分组展开后的成员）；锁定元素（即使被选中）不随拖拽移动，保持为有效静止参照。
- 按住 `Alt` 临时禁用吸附，便于精细移动（键盘状态经 `keyboard-controller` 跟踪，接入 `isSnapDisabled`）。
- 选区包围盒指针拖拽路径（`beginSelectionDrag`：文本/便签、已选中元素、Transformer 背板、结构空白命中区）同样实时吸附并显示参考线；吸附对象为移动中选区的并集包围盒。

验证命令：

```sh
npm test -- tests/app/App.layer-bridge.test.jsx tests/app/components/LayerPanel.test.jsx tests/app/shell/whiteboard-app-startup.test.js tests/app/selection/alignment-snap-controller.test.js tests/app/selection/drag-controller.test.js tests/app/shell/keyboard-controller.test.js
```

结果：6 个测试文件通过，35 个测试通过；当轮全量 `npm test` 868 个测试通过。

## 验收证据与持续回归

### P0: 压感笔触全链路回归（已完成）

目标：确认 pressure 作为笔触模型字段在所有持久和编辑路径中不丢失。

需要补充或确认：

- `serializeBoard()` / `normalizeBoard()` 对 stroke points pressure 的 round-trip 测试。
- `createClipboardSnapshot()` / `createPastedElements()` 对 stroke pressure 的复制粘贴测试。
- `splitStrokeByEraser()` 对非均匀 pressure 笔触切分后的端点和插值 pressure 测试。
- PNG 导出对自定义 pressure Shape 的路径不退化为等宽线的测试或手测清单。

建议测试入口：

- `tests/board/model.test.js`
- `tests/services/clipboard.test.js`
- `tests/canvas/geometry.test.js`
- `tests/canvas/konva-elements.test.js`
- `tests/app/import-export/export-png-controller.test.js`

### P0: 结构内外交互边界（已完成）

目标：结构内部节点/单元格不会被外层选区、Transformer 背板或透明命中区吞事件。

需要补充或确认：

- 线性结构：单击单元格选中内部项，长按/拖动单元格只触发重排，不移动外层结构。
- 二维数组：双击只编辑目标单元格；调整行列和下标显示后保持中心位置；锁定结构不进入编辑。
- 图结构：拖图节点只移动节点，结束后不显示节点功能按钮；拖外框只调真实尺寸。
- 树结构：节点点击/双击由节点自身处理，普通树节点不会被框选链路吞掉。
- 锁定结构：外层和内部编辑入口都不可用。

建议测试入口：

- `tests/app/structures/*`
- `tests/structures/templates.test.js`
- `tests/board/model.test.js`
- `tests/canvas/konva-elements.test.js`
- `tests/app/selection/transformer-controller.test.js`
- `tests/app/shell/stage-pointer-controller.test.js`

### P0: 文本编辑框与渲染框分离（已完成）

目标：文字编辑框和最终渲染框独立持久化，编辑框可自由调宽高，退出编辑后渲染高度完整贴合普通文本或 LaTeX 的实际内容。

需要补充或确认：

- 新建空文本默认一行高度。
- 旧文件缺少编辑框字段时从渲染框尺寸回填。
- 编辑中按 textarea `scrollHeight` 实时增长，但只保存用户手动编辑尺寸。
- 左右、上下和角锚点按轴更新编辑框，交互期间不退出编辑。
- 提交不改渲染宽度，Escape 不写历史；非编辑态宽度缩放不改编辑框尺寸。
- DOM overlay 在 KaTeX HTML 写入后测量，覆盖公式子节点溢出并排除旋转外接框误差；字体加载后重测。
- 测量结果同步 Konva.Text、Group 和 hit area；长无空格文本与短公式仍可按既有规则换行。

建议测试入口：

- `tests/app/editing/*`
- `tests/services/text-overlay-controller.test.js`
- `tests/tools/interaction-rules.test.js`
- `tests/canvas/konva-elements.test.js`

### P0: 属性栏回灌一致性（已完成）

目标：属性栏控件显示的是模型事实，不是 React 本地假状态。

需要补充或确认：

- 单选不同类型对象时标题、控件值、禁用态正确切换。
- 多选混合对象时只显示共同可编辑属性。
- 图结构有向开关、节点大小、结构输入都从 legacy root dataset/input 回灌。
- Slider 拖动中预览不写历史，松手只提交一次历史。

建议测试入口：

- `tests/app/App.style-controls.test.jsx`
- `tests/app/components/StructurePanel.test.jsx`
- `tests/app/inspector/*`
- `tests/app/structures/inspector-sync-controller.test.js`

### P1: 触控板视口体验（已完成首轮）

目标：触控板双指操作稳定控制视口，不误触对象编辑。

需要补充或确认：

- 缩放中心跟随指针位置。
- 双指平移不触发选择、框选或绘制。
- 浏览器页面缩放和页面滚动在画布区域被拦截。
- 缩放时文本 overlay、结构浮动控件、选区框同步。

建议测试入口：

- `tests/app/viewport/controller.test.js`
- `tests/app/shell/stage-pointer-controller.test.js`
- `tests/tools/interaction-rules.test.js`

### P1: 右键和图层一致性（第二轮完成）

目标：右键菜单和图层面板成为复杂画布的可靠操作入口。

需要补充或确认：

- 右键对象会先选中对象或保留当前选区，再显示对象操作。（已覆盖）
- 右键空白画布显示画布级操作，避免误显示对象操作。（已覆盖）
- 图层点击、右键、锁定显示、分组显示和画布选区同步。（已覆盖，含锁定/分组状态变化刷新）
- 层级操作与图层顺序一致。（已覆盖，含真实 app 集成测试）

建议测试入口：

- `tests/app/App.context-menu.test.jsx`
- `tests/app/App.layer-bridge.test.jsx`
- `tests/app/context-menu/*`
- `tests/app/components/LayerPanel.test.jsx`
- `tests/app/panels/layer/controller.test.js`
- `tests/app/shell/whiteboard-app-startup.test.js`
- `tests/board/model.test.js`

### P1: 对齐吸附和视觉反馈（已完成首轮）

目标：轻量吸附可预期，不妨碍精细移动。

需要补充或确认：

- 拖动对象时参考线和吸附结果一致。（已覆盖：dragmove 实时吸附 + overlay 参考线）
- 多选、分组、锁定对象参与吸附规则明确。（已覆盖：随拖拽移动的元素不作吸附目标，锁定元素保持静止参照）
- 按键临时禁用吸附。（已覆盖：按住 Alt 禁用并清除参考线）
- 选区包围盒指针拖拽路径的吸附与参考线已覆盖（文本/便签/已选形状/结构空白区）。

建议测试入口：

- `tests/app/selection/alignment-snap-controller.test.js`
- `tests/app/selection/drag-controller.test.js`
- `tests/app/shell/keyboard-controller.test.js`

### P2: 教学增强

目标：不改变白板对象模型的前提下增强授课表达。

候选项：

- 轻量演示模式：隐藏 UI、锁定编辑、视图书签或镜头跳转。
- 算法步骤说明：旁路面板或可插入注释，不写进结构本体语义。
- 导出选区、模板导入、教学素材复用。

## 后续审计顺序

1. 新功能先对照本页成熟度标准确认是否扩大已有交互边界。
2. 优先回归数据一致性：文件、草稿、剪贴板、撤销栈和结构运行时投影。
3. 再回归高冲突交互：结构内部命中、文本编辑、Transformer、触控板和右键菜单。
4. 最后验证性能与真实浏览器行为，尤其是长笔触、大尺寸二维数组和多节点图/树。

发现缺口时先补能稳定复现的测试，再修改实现；仅真实浏览器可观察的行为要在变更说明中列出人工验收条件。
