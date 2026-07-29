# lofiBoard

一个离线优先的可编辑网页白板，面向个人记录、讲解和数据结构演示。应用基于 React、Semi Design、Konva 和 Vite 构建，画板内容保存在浏览器本地或 `.lofibrd` JSON 文件中。

当前功能覆盖无限画布、对象编辑、压感画笔、双橡皮、文字/LaTeX、便签、图片、基础图形、坐标系、数据结构可视化、自动草稿、背景切换和 PNG 导出。

## 开发

```bash
npm install
npm run dev
```

也可以使用仓库脚本在后台启动和停止开发服务：

```bash
./start-dev.sh
./stop-dev.sh
```

默认开发地址是 `http://127.0.0.1:5173`，后台日志写入 `.runtime/dev.log`。

生产构建：

```bash
npm run build
npm run preview
```

构建产物在 `dist/`，可通过本地或静态服务器离线运行。

常用脚本：

```bash
npm test             # 运行测试
npm run preview      # 预览 dist/
npm run preview:host # 固定 127.0.0.1:4173 预览 dist/
npm run serve        # 前台 preview，供 systemd 使用
npm run start        # 后台构建并启动本地 preview 服务，默认 127.0.0.1:4173
npm run stop         # 停止后台 preview 服务
npm run start:dev    # 后台启动开发服务，默认 127.0.0.1:5173
npm run stop:dev     # 停止后台开发服务
npm run deploy:build  # 构建 dist/
npm run deploy:static # 构建并同步 dist/ 到 DEPLOY_DIR
npm run bench:render  # 运行渲染基准脚本
```

`start.sh`、`start-dev.sh` 和 `serve` 支持 `HOST` / `PORT` 环境变量：

```bash
HOST=127.0.0.1 PORT=4173 npm run start
HOST=0.0.0.0 PORT=5173 npm run start:dev
HOST=127.0.0.1 PORT=4173 npm run serve
```

## 生产部署

推荐生产方式是让 Nginx 直接托管 `dist/` 静态文件，不需要常驻 Node 进程：

```bash
npm ci
sudo mkdir -p /var/www/lofibrd/dist
sudo env DEPLOY_DIR=/var/www/lofibrd/dist npm run deploy:static
sudo cp deploy/nginx/lofibrd-static.conf /etc/nginx/sites-available/lofibrd.conf
sudo ln -s /etc/nginx/sites-available/lofibrd.conf /etc/nginx/sites-enabled/lofibrd.conf
sudo nginx -t
sudo systemctl reload nginx
```

部署前需要修改 `deploy/nginx/lofibrd-static.conf` 里的：

- `server_name board.example.com;`
- `root /var/www/lofibrd/dist;`

如果确实需要 Nginx 反代本机 preview 服务，可以使用：

```bash
HOST=127.0.0.1 PORT=4173 npm run start
sudo cp deploy/nginx/lofibrd-proxy.conf /etc/nginx/sites-available/lofibrd.conf
sudo nginx -t
sudo systemctl reload nginx
```

完整部署说明见 [docs/deployment.md](docs/deployment.md)。

## 功能

- 无限画布：鼠标滚轮缩放，触控板双指平移，捏合缩放；按住空格或中键也可拖拽平移。
- 工具：底部图标工具栏提供选择、平移、画笔、片段橡皮、对象橡皮、文字、便签、图片、结构和图形。
- 图形：矩形、椭圆、直线和箭头直接显示在工具栏；坐标系位于“更多工具”中。
- 编辑：单选/框选、多选、移动、缩放、旋转、删除、复制、剪切、粘贴、上移、下移、置顶、置底、分组、取消分组、锁定和解锁；拖动时支持对齐吸附，按住 `Alt` 可临时禁用。
- 属性栏：会随当前工具或选中对象显示，可配置画笔、图形、文字、便签、坐标系和结构元素。
- 图层：右侧图层面板按层级展示元素，支持选中对象、查看锁定和分组状态。
- 文字：支持字号、字体、颜色、加粗、斜体、下划线、删除线；支持显式或整段 LaTeX 渲染。
- 图片：支持菜单导入图片，也支持直接粘贴或拖拽图片到鼠标指向的白板位置。
- 结构模板：支持数组、二维数组、栈、队列、双端队列、图、树和二叉树作为独立元素插入和编辑；所有模板都支持手填和随机生成。
- 线性结构：支持手填或随机生成，单击单元格切换当前活动项，双击单元格内联改值，长按单元格进入拖拽重排。
- 线性结构属性栏：支持应用结构、高亮区间、指针显示、0/1 下标切换、下标显示切换，以及数组排序演示。
- 二维数组：使用换行或分号分隔行、逗号分隔列；支持 1 到 32 行/列、0/1 下标、下标显隐、批量应用数据和双击单元格编辑；随机模式按 1 到 32 的阶数生成方阵。
- 数组算法：支持冒泡排序、选择排序和插入排序的开始、上一步、下一步、播放、重置和结束。
- 图结构：支持加点、连边、点选连边、输入连边、删点、删边、改边、默认有向/无向、节点/边高亮、环形/网格/分层/力导向布局、边表/邻接表/矩阵导入导出；随机模式按节点数生成连通无向图。
- 树结构：支持应用结构、节点编辑、随机节点生成和遍历高亮；普通树支持层序/前序/中序/后序，二叉树支持前序/中序/后序。
- 样式：支持线条颜色、填充颜色、透明填充、粗细、线型、笔头、文字字号和便签样式。
- 橡皮：片段橡皮支持动态擦除半径，快速移动时扩大，慢下来后回到基础大小。
- 文件：支持 File System Access API 的 Chrome/Edge 可原地打开、保存和另存为 `.lofibrd` JSON 文件；所有浏览器会尝试使用 `localStorage` 自动保存本地草稿。
- 导入：支持直接粘贴或拖拽图片/纯文本到鼠标指向的白板位置。
- 菜单：点击左上角白板名称，可新建、打开、保存、另存为、导出 PNG、导入图片、撤销、重做、分组、取消分组、锁定/解锁、适配内容、清空画布、重置视图。
- 背景：支持点阵和纯白背景，设置会保存进 `.lofibrd` 文件。
- 导出：将当前视图按当前背景模式导出为 PNG。

## 快捷键

- `Ctrl+S`：保存
- `Ctrl+Shift+S`：另存为
- `Ctrl+O`：打开
- `Ctrl+A`：全选白板元素
- `Ctrl+C`：复制选中对象
- `Ctrl+X`：剪切选中对象
- `Ctrl+V`：粘贴剪贴板内容或导入剪贴板图片/文本
- `Ctrl+Z`：撤销
- `Ctrl+Shift+Z`：重做
- `Ctrl+Y`：重做
- `Delete` / `Backspace`：删除选中对象
- `Escape`：关闭菜单/弹层，或回到选择工具/清空选择
- `Space`：按住平移画布
- `Alt`：拖动时临时禁用对齐吸附
- `Q`：切换“放置后保持当前工具”
- `V`：选择
- `H`：平移
- `B`：画笔
- `E`：片段橡皮
- `O`：对象橡皮
- `T`：文字
- `N`：便签
- `S`：结构
- `R`：矩形
- `L`：线段
- `A`：箭头
- `+` / `-`：调整当前属性栏中的粗细、字号、单位间距或图节点大小

## 数据与兼容性

- `.lofibrd` 当前格式版本为 `1`，包含画布背景、视口和全部持久元素；选区、活动工具、编辑框 DOM、结构临时状态和算法播放状态不会写入文件。
- 图片以 Data URL 写入画板数据。图片较多时，`.lofibrd` 文件和浏览器本地草稿会相应增大。
- 原地文件读写依赖 File System Access API，建议使用最新版 Chrome 或 Edge。其他浏览器仍可使用画布、自动草稿和 PNG 导出，但不能通过当前 UI 打开或保存 `.lofibrd` 文件。
- 应用是纯前端项目，构建后不依赖服务端 API；首次安装依赖和构建仍需要 Node.js/npm。

## 目录结构

- `src/app/`：React 外壳（`App.jsx`、`components/`）、白板装配入口（`whiteboard-app.js`）和各应用 controller。
- `src/algorithms/`：数组排序算法步骤生成与校验。
- `src/board/`：白板数据模型、元素工厂、历史记录和 ID 生成。
- `src/canvas/`：Konva 节点适配、几何计算、视图缩放和平移、PNG 导出背景。
- `src/structures/`：数组、二维数组、栈、队列、双端队列、图、树、二叉树等结构元素模板与编辑纯函数。
- `src/services/`：本地文件、自动草稿、剪贴板、图片/文本导入、LaTeX 渲染和文本覆盖层等浏览器能力封装。
- `src/tools/`：工具行为规则、交互判断和笔触处理。
- `src/ui/`：工具栏、菜单、图标配置、面板状态和可见性规则。
- `tests/`：按 `src/` 对应领域分层组织的 Vitest 测试。

## 文档

- [领域词汇](CONTEXT.md)：画板、画布、元素、结构和交互状态等统一术语。
- [实现文档入口](docs/agents/implementation/README.md)：架构、代码地图、状态持久化、交互流程、结构算法和测试导航。
- [架构决策](docs/adr/)：已经接受且需要长期遵守的设计决策。
- [部署说明](docs/deployment.md)：静态托管、Nginx 反代和 systemd 配置。
