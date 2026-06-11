## AI本项目开发注意事项
1. 本项目使用中文，对话请使用中文，内容尽量言简意赅，避免无用的上下文冗余
2. 在对话过程中你重复出现问题，然后我给你指明了正确方向后，你应该记录到AGENTS.md里，避免后续犯相同错误
3. 每次要实现某个功能或者修复某个问题前，先实现对应的测试用例，然后再实现功能代码，最后确保测试通过；如果没有对应测试用例，就先写一个测试用例来覆盖这个功能，再实现功能代码，最后确保测试通过；如果已经有对应测试用例了，就直接实现功能代码，最后确保测试通过。
4. 每修改一个已有功能，就搜索一下对应测试，看看是否需要更新，如果需要就更新对应测试代码
5. 禁止面向测试用例编程来试图绕过测试！
6. 每次修复BUG时，都应该先补充测试用例覆盖这个BUG，然后再修复，直到测试通过, 确保以后不会再犯同样的错误。

## 本项目易犯错误
6. 文本输入框相关交互要特别注意：默认高度必须是一行；点击文本应进入编辑，只有拖拽才进入选中/移动；选中态和编辑态渲染必须共用同一套尺寸规则，避免边框在输入、退出编辑、再次选中时变化。
7. 文本输入框编辑态高度必须跟随 textarea 的真实 `scrollHeight` 实时更新，不能用 canvas 文本宽度估算换行行数，否则会出现输入中越界、失焦后才修正的尺寸不一致问题。
8. 文本元素是 Konva Group 包 Text，调整宽高时必须同步外层 Group 和内部 Text 的尺寸；只改 Group 会导致 Transformer 边框仍按旧的子节点尺寸显示。
9. 文本框左右调整宽度时必须同步重算换行后的高度；缩到最小尺寸要夹住 box 尺寸，不能简单返回旧 box 或使用负 scale/abs scale，否则会闪烁或拖过最小后反向放大。
10. Konva Transformer 在宽高拖成负值时会先切换活动锚点，再进入 `boundBoxFunc`；防止文本框拖过最小后反向放大必须用 `anchorDragBoundFunc` 在锚点位置阶段钳住。
11. 文本编辑态只负责输入；一旦拖拽边框或控制点，必须先提交并退出编辑态，再交给选中态 Transformer 处理缩放，避免编辑态临时字体/边框状态和最终元素状态不一致。
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

## Agent skills

### Issue tracker

Issues are tracked on GitHub Issues at `lofivo/lofiBoard`. See `docs/agents/issue-tracker.md`.

### Triage labels

needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.

### Implementation docs

AI agent 进入项目后先读 `docs/agents/implementation/README.md`，再按任务类型读取对应专题文档。
