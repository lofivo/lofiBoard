## AI本项目开发注意事项
1. 本项目使用中文，对话请使用中文，内容尽量言简意赅，避免无用的上下文冗余
2. 在对话过程中你重复出现问题，然后我给你指明了正确方向后，你应该记录到AGENTS.md里，避免后续犯相同错误
3. 每次要实现某个功能或者修复某个问题前，先实现对应的测试用例，然后再实现功能代码，最后确保测试通过；如果没有对应测试用例，就先写一个测试用例来覆盖这个功能，再实现功能代码，最后确保测试通过；如果已经有对应测试用例了，就直接实现功能代码，最后确保测试通过。
4. 每修改一个已有功能，就搜索一下对应测试，看看是否需要更新，如果需要就更新对应测试代码
5. 禁止面向测试用例编程来试图绕过测试！
6. 每次修复BUG时，都应该先补充测试用例覆盖这个BUG，然后再修复，直到测试通过, 确保以后不会再犯同样的错误。
7. 当我使用/grill-me技能，你必须遵守这个技能，不断问我问题确认好边界，对齐需求上下文。

## 本项目易犯错误
6. 文本输入框相关交互要特别注意：默认高度必须是一行；点击文本应进入编辑，只有拖拽才进入选中/移动；文字的编辑框与渲染框尺寸独立保存，进入/退出编辑时必须恢复各自尺寸，不能相互覆盖。
7. 文本输入框编辑态实际高度必须至少覆盖 textarea 的真实 `scrollHeight`，不能用 canvas 文本宽度估算换行行数；内容自动撑高只属于当前编辑会话，不能覆盖用户手动保存的 `editHeight`。
8. 文本元素是 Konva Group 包 Text，调整宽高时必须同步外层 Group 和内部 Text 的尺寸；只改 Group 会导致 Transformer 边框仍按旧的子节点尺寸显示。
9. 文本框左右调整宽度时必须同步重算换行后的高度；缩到最小尺寸要夹住 box 尺寸，不能简单返回旧 box 或使用负 scale/abs scale，否则会闪烁或拖过最小后反向放大。
10. Konva Transformer 在宽高拖成负值时会先切换活动锚点，再进入 `boundBoxFunc`；防止文本框拖过最小后反向放大必须用 `anchorDragBoundFunc` 在锚点位置阶段钳住。
11. 文本编辑态允许输入和调整编辑框；拖拽编辑框边框或控制点时必须保持编辑态，不能提交文字或切换到选中态，并且只能更新编辑框尺寸，不能改动独立保存的渲染框尺寸。编辑态角控制点自由调整宽高，不得等比缩放字号或改变文字样式。
12. 属性栏修改文本字号/字体/样式后，必须同步内部 Konva.Text 的内容、字体和尺寸，并在归一化高度时保留少量垂直余量，避免字体测量误差导致最后一行被裁切。
13. 文本框高度计算遇到无空格长文本时必须逐字符累计换行，不能用整段 token 宽度除以内容宽度粗算，否则最窄宽度和大字号下会少算行数。
14. 线性结构属性栏不要保留“语义快捷操作”和“更多操作”分类；如果需求说去掉分类，应直接移除整个分组及相关 action，不要只按数组类型隐藏。
15. 属性栏标题必须跟随当前单选元素或可配置工具显示具体名称；多选显示“属性”。文字、便签、结构工具未放置元素时不显示属性栏。
16. Konva 元素在 `pointerdown` / `dragstart` 到首次 `dragmove` 之间不能为了选中态、高亮态、控件显示等调用 `renderBoard()` 或重建节点；这会打断 Konva 当前拖拽链路，表现为选中后拖拽只能移动一点点。此类视觉变化应优先原地同步已有节点属性（例如 stroke/strokeWidth）并补回归测试。
17. 普通树节点点击/双击必须由节点自身事件负责选择和编辑；`handleSelectPointerDown` 命中 `.tree-node` 时不能直接 `beginSelectionDrag()`，否则单击会被拖拽链路吞掉，导致无法稳定选中或双击编辑。整树拖拽只应从树结构空白命中区或已选中元素拖拽入口进入。
18. Konva Transformer 的 `shouldOverdrawWholeArea` 不能覆盖线性结构和树结构这类内部可交互元素；否则选中结构后，Transformer 背板会挡住数组元素/树节点，表现为无法继续选择内部节点或双击编辑。
19. LaTeX 文本框不能用整段公式宽度作为最小宽度，否则短公式无法多行；DOM overlay 应允许 `.katex` 换行，但 `.katex .base` 保持 `white-space: nowrap`，让公式按 KaTeX 片段换行且单片段不被拆坏。
20. 修改 `whiteboard-app.js` 初始化顺序、controller 接线或从中抽取 controller 后，必须运行 `tests/app/shell/whiteboard-app-startup.test.js` 或全量测试；只跑子 controller 测试和源码字符串断言无法覆盖 `createWhiteboardApp()` 启动阶段的 TDZ/漏导入错误。
21. 用户要求“补充项目文档/实现文档/方便后续 AI agent 开发”时，不能只更新 `CONTEXT.md` 或 ADR；应维护 `docs/agents/implementation/` 下的实现导览、代码地图、交互流程和测试指南，并同步 `docs/agents/domain.md` 的读取顺序。
22. React 替换遗留 DOM 时，给 `legacyRootRef` 设置 `zIndex`（非 `auto`）会创建层叠上下文，导致遗留 DOM 内所有 `position: fixed` 弹窗（如 `.structure-panel`、`.shape-popover`、`.cell-editor` 等）被困在低层层叠上下文中，被 React 面板遮挡。应使用 `zIndex: "auto"` 不创建层叠上下文，让子元素的 z-index 参与根层叠上下文的排列。
23. Semi `ColorPicker` 用 `trigger="custom"` + `visible` 受控时，`onVisibleChange` 回调在弹窗打开时也会触发（传入 `true`），不能直接将 `onVisibleChange` 设为 toggle 函数，否则打开瞬间被反转导致闪烁消失。应写成 `onVisibleChange: (v) => { if (!v) closeHandler?.(); }`，只在关闭时清空状态，打开回调不做处理。
24. 结构元素内部不要加覆盖整个区域、`listening: true` 且 `fill: "rgba(...,0)"` 的透明命中矩形（如 `graph-blank-hit`）。Konva hit canvas 用 colorKey 绘制命中区，只要 `fill()` 非空就生成命中矩形，透明 fill 也照画；它会盖在内部可交互子节点（图节点/树节点）之上或周围，导致 pointerdown 命中它而非子节点，`isGraphNodeHitTarget` 之类判断返回 false，走到“拖整个结构”分支，表现为新建/选中后拖子节点却拖动了整个结构，多点几次才能命中子节点中心。空白选中/拖动应依赖父 Group 的 bounding box fallback，不要靠透明命中矩形。
25. 图结构节点拖拽用 Konva `dragBoundFunc` 钳制在父元素范围内时，`dragBoundFunc(pos)` 收到的是 stage 绝对坐标，不是相对父 Group 的本地坐标；必须先 `group.getAbsolutePosition()` 转成本地坐标钳制再转回绝对坐标返回，否则节点会一拖就跳到边界并卡死。
26. `refreshEdges` 之类拖拽中重算边端点的逻辑，若用 `getNodePosition` 返回纯 `{x,y}`（无 `id`）对象传给 `getGraphEdgePoints`，其内部 `source.id === target.id` 会因 `undefined === undefined` 恒为 true，把所有边误判为自环渲染成回环曲线，表现为拖节点时边“不跟着动/断成奇怪曲线”。要么给返回对象补 `id`，要么在比较前加 `source.id != null && target.id != null` 守卫。
27. 拖拽图节点应在 `dragstart`（新增 `onGraphNodeDragStart` 回调 → `handleGraphNodeDragStart`）清除 `activeGraphNode`、隐藏节点功能按钮、`syncGraphActiveVisual` 取消蓝色高亮；`moveGraphStructureNode`（dragend）只做元素级 `selectIds([elementId])`，不要重新 `setActiveGraphNode`，这样拖拽过程中及结束后节点选中态/功能按钮都不出现，符合“拖拽=移动意图，非选中意图”。
28. 图结构边框尺寸**只由节点数量决定**（`getGraphMinSize(count, nodeRadius)`，新建/增删/缩放下限三处共用）。`moveGraphNode` **绝不能**再调用 `normalizeStructureBounds`——它在 `minX-radius<0`（节点贴左/上边）时会平移 `element.x/y`，表现为“拖节点导致整张图跟着移动”。增删节点用 `growGraphBoundsToCount` 只增不减；移动节点只改 `node.x/y`。
29. 图结构“拖边框=调节真实尺寸”，节点位置**固定不动**（不随边框等比缩放，只在缩小到出界时钳进 `[r,边长-r]`）。`transform-commit-controller` 的 `graph-structure` 分支把 `scaleX/scaleY` 烘焙进 `width/height`、复位 scale=1、钳出界节点；尺寸不得低于 `getGraphMinSize`。节点圆/标签大小是**独立**维度，由属性栏“节点大小”滑块改 `style.nodeRadius`（`setGraphNodeRadius`），不要混进边框缩放。`dragBoundFunc` 钳节点中心到 `[r, 边长-r]`（不是 `[0, 边长]`）。
30. 属性栏连续滑块（如图“节点大小”）改元素时,拖动中走 `editSelectedStructure(..., { history: false })` 实时预览不写历史,松手用 Semi Slider 的 `onAfterChange` 触发一次 `graph-node-scale-commit` 提交单条历史;否则一次拖拽会塞满撤销栈。
31. **只改模型层修不好 Konva 运行时表现**（模型单测全绿 ≠ 运行时正确，AGENTS.md #16/#20）。图结构边框缩放的真实病灶在渲染层:① `transform-commit` 只更新模型不 `renderBoard`，必须像 `coordinate-plane` 那样加 `transform` 期间的实时 preview(`syncGraphTransformPreview`)——拖动中 `node.scaleX/Y(1)` 复位 + 改真实尺寸,否则节点圆会跟着 scale 放大、松手才靠下次 render 复位。② 图 group 必须有一个**定尺隐形矩形**(`.graph-frame`, `listening:false`, 无 fill/stroke, `width×height`),否则 Konva Transformer 按子节点 `getClientRect` 取框,拖节点往里→选中框收缩。改这类问题必须补“真实 Konva”测试(`konva-elements` 的 `getClientRect` 稳定性、`transform-preview-controller` 的图分支)。
32. React 属性栏的受控控件(Switch/Slider)必须把状态**回灌进 ctx**才能正确显示:`ctx.graphDirected` 之类只读不写的字段会恒为默认值,点完必回弹。正确做法是 `syncGraphStructurePanelState` 把状态写进 `root.dataset.graphDirected`,`App.jsx` 轮询读入 `setGraphDirected` → ctx。“有向图”开关语义是**整图翻转所有边**(`setGraphDirected`),不是只设新边默认。
33. 图结构属性栏“应用结构”(`updateGraphFromInput`)重建顶点/边时必须沿用当前 `style.nodeRadius` 调 `createGraphStructureElement`/`getGraphMinSize`，并把保留的旧节点位置钳进 `[r,width-r]`/`[r,height-r]`。不能按默认半径 26 生成新边框，否则调过节点大小后点击应用会让模型宽高过小或节点初始在框外，随后 Konva `dragBoundFunc` 表现为拖不到边界或拖出边界。此类修复要同时补模型测试和真实 Konva 同步/拖拽边界测试。
34. 右键（及其他指针）目标解析不能只依赖 `stage.getIntersection` 像素命中：元素选中后 Transformer `shouldOverdrawWholeArea` 背板盖在最上层，`getIntersection` 命中背板找不到 `.element` 祖先返回 null，导致右键菜单被误判为 canvas scope（只剩撤销/重做/粘贴）；未填充图形内部也命中不到。应与左键选中共用 `getSelectableElementIdAtWorldPoint(worldPoint, { fallbackNode: intersection })` 包围盒命中。
35. React 工具栏这类包含 SVG 图标的固定浮层不要用 `left: 50%` + `translateX(-50%)` 居中；新增奇数宽度按钮或 1px 分隔线后，整个浮层和内部 SVG 会落在半像素并被变换层栅格化，表现为所有图标一起发虚，调 SVG 大小也无效。应使用 `left/right: 0` + `width: max-content` + `margin: 0 auto` 的非 transform 居中，并让 1px 分隔线放在偶数宽度的布局盒内；此类问题要用真实浏览器检查 `getBoundingClientRect()` 坐标是否为整数。
36. 浮层 chrome（Topbar/ToolDock/StylePanel/LayerPanel/StatusBar/ContextMenu）的边框、底色、模糊、阴影、圆角一律从 `src/ui/tokens.js` 取（`GLASS`/`GLASS_EDGE`/`RADIUS`/`TEXT`/`ACCENT`），不要在组件里再写 `rgba(255,255,255,0.94)`、`0 18px 50px ...`、`borderRadius: 7` 这类字面量。半透明底色由 `styles.css` 的 `--board-surface` / `--board-stroke` 提供，两处必须同步。强调色只有一个（Semi primary），不要引入第二套 indigo。回归测试见 `tests/app/components/chrome-tokens.test.jsx`。
37. jsdom 的 cssstyle 解析不了带 `var()` 的 border 简写：`border: '1px solid var(--x)'` 一旦叠加 `borderRight: 0` 就整条丢失，`borderLeft: '1px solid var(--x)'` 读 `borderLeftWidth` 会拿到空串。需要被测试断言的边框请写长写（`borderLeftWidth/Style/Color`），真实浏览器两种写法都正常。
38. 编辑框持久保存的是用户手动设置的宽高；输入导致的实时自动撑高只属于当前编辑会话，不能覆盖持久编辑框尺寸。提交文字与编辑框调整应合并为一条历史，Escape 必须同时恢复两者。

## Agent skills

### Issue tracker

Issues are tracked on GitHub Issues at `lofivo/lofiBoard`. See `docs/agents/issue-tracker.md`.

### Triage labels

needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.

### Implementation docs

AI agent 进入项目后先读 `docs/agents/implementation/README.md`，再按任务类型读取对应专题文档。
