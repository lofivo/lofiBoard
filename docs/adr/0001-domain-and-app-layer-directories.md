---
status: accepted
---

# 领域层与应用层目录

`src/<domain>/` 下的领域目录保存纯逻辑、领域规则和可独立测试的模型函数；`src/app/<domain>/` 下的对应目录保存协调 DOM、Konva、选区、画板会话状态和应用接线的 controller。结构、工具和算法等模块需要在可复用行为与应用编排之间保持稳定边界，因此保留这两层。

领域目录已经提供上下文时，文件名不重复领域前缀；跨领域或共享模块保留能说明所有权的限定词。应用目录中多个模块属于同一子概念时，优先建立子目录，文件名只表达角色，例如 `controller.js`、`dom-controller.js`、`action-controller.js` 或 `markup.js`。

源码文件改名不要求同步修改 CSS 类、`data-*` 属性、action id 或持久化画板字段；这些名称属于 UI 或存储契约，只有在单独评估兼容性后才可修改。

`createWhiteboardApp()` 是应用组合根，负责浏览器/Konva 初始化和 controller 接线。抽取出的 controller 通过依赖注入接收协作者，不直接导入可变应用状态。这样既能把启动接线集中在一处，也能测试应用层行为，同时让领域规则继续留在 `src/<domain>/`。
