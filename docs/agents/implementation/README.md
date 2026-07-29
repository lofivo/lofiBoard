# 实现文档入口

这组文档给后续 AI agent 快速理解 lofiBoard 的实现边界、常见改动路径和测试选择。`CONTEXT.md` 只维护领域术语；这里记录实现结构和开发导航。

## 推荐读取顺序

1. 先读根目录 `AGENTS.md`，确认项目级操作约束。
2. 再读根目录 `CONTEXT.md`，统一领域词。
3. 读 `docs/adr/`，确认已经记录的架构决策。
4. 根据任务读取本目录专题：
   - `code-map.md`：不知道该改哪个模块时先读。
   - `state-and-persistence.md`：涉及画板、历史、保存、草稿、导入导出时读。
   - `interaction-flows.md`：涉及指针、选区、拖拽、缩放、文本编辑、工具切换时读。
   - `structures-and-algorithms.md`：涉及数组/二维数组/栈/队列/图/树、结构浮动控件、数组算法演示时读。
   - `whiteboard-interaction-maturity-audit.md`：评估白板是否达到现代成熟交互、拆交互验收项或规划 P0/P1 改进时读。
   - `testing-guide.md`：决定补哪些测试、跑哪些测试时读。
5. 涉及 React 面板、工具栏、右键菜单、图层面板或结构属性栏时，先读 `code-map.md` 的 React 外壳桥接说明，再读对应专题。

## 当前实现总览

应用入口是 `src/app/main.jsx`，它渲染 React 外壳。`src/app/App.jsx` 在 `legacyRootRef` 内调用 `createWhiteboardApp(root)`；`src/app/whiteboard-app.js` 是白板引擎的装配入口，负责创建 Konva Stage/Layer、浏览器 DOM 引用、画板会话、controller 实例和跨 controller 的回调接线。

实现分两层：

- `src/<domain>/`：领域和纯逻辑模块，例如画板模型、结构规则、几何计算、工具规则、算法步骤。
- `src/app/<domain>/`：应用 controller，负责 DOM、Konva、画板会话、选区、历史和 controller 协作。

React 组件承载可见 chrome，真实画板状态、历史和 Konva 运行时仍由引擎 controller 管理。React 与引擎之间主要通过写门面 `app.commands.*` 和读门面 `app.getUiState()` 协作，详见 `code-map.md` 的 React 外壳桥接。

结构元素目前包含数组、二维数组、栈、队列、双端队列、图、树和二叉树。二维数组的模型、属性栏命令和单元格编辑链路见 `structures-and-algorithms.md`。

测试目录基本镜像源码目录。改已有功能时先用 `rg` 搜对应测试；没有覆盖就先补测试，再改实现。

## 文档维护规则

- 新增或改动一个跨模块工作流时，同步更新对应专题文档。
- 可复用的实现约束和易错点写进对应专题文档；只有对所有 agent 都生效的操作规则才写进根目录 `AGENTS.md`。
- 领域词变化写 `CONTEXT.md`；实现细节不要写进 `CONTEXT.md`。
- 只有硬逆转、非显而易见、存在真实取舍的决策才新增 ADR。
