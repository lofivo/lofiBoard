# 实现文档入口

这组文档给后续 AI agent 快速理解 lofiBoard 的实现边界、常见改动路径和测试选择。`CONTEXT.md` 只维护领域术语；这里记录实现结构和开发导航。

## 推荐读取顺序

1. 先读根目录 `AGENTS.md`，确认项目约束、测试优先和禁止 Playwright。
2. 再读根目录 `CONTEXT.md`，统一领域词。
3. 读 `docs/adr/`，确认已经记录的架构决策。
4. 根据任务读取本目录专题：
   - `code-map.md`：不知道该改哪个模块时先读。
   - `state-and-persistence.md`：涉及画板、历史、保存、草稿、导入导出时读。
   - `interaction-flows.md`：涉及指针、选区、拖拽、缩放、文本编辑、工具切换时读。
   - `structures-and-algorithms.md`：涉及数组/栈/队列/图/树、结构浮动控件、数组算法演示时读。
   - `testing-guide.md`：决定补哪些测试、跑哪些测试时读。

## 当前实现总览

应用入口是 `src/app/main.js`，它调用 `createWhiteboardApp(root)`。`src/app/whiteboard-app.js` 是装配入口，负责创建 Konva Stage/Layer、浏览器 DOM 引用、画板会话、controller 实例和跨 controller 的回调接线。

实现分两层：

- `src/<domain>/`：领域和纯逻辑模块，例如画板模型、结构规则、几何计算、工具规则、算法步骤。
- `src/app/<domain>/`：应用 controller，负责 DOM、Konva、画板会话、选区、历史和 controller 协作。

测试目录基本镜像源码目录。改已有功能时先用 `rg` 搜对应测试；没有覆盖就先补测试，再改实现。

## 文档维护规则

- 新增或改动一个跨模块工作流时，同步更新对应专题文档。
- 发现容易复发的项目坑，写进根目录 `AGENTS.md` 的“本项目易犯错误”。
- 领域词变化写 `CONTEXT.md`；实现细节不要写进 `CONTEXT.md`。
- 只有硬逆转、非显而易见、存在真实取舍的决策才新增 ADR。
