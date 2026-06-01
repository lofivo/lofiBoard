# lofiBoard

vibe的💩，自用

一个离线优先的可编辑网页白板。当前版本使用 Vite + Konva，支持无限画布、对象编辑、画笔、双橡皮、文字/LaTeX、便签、图片、基础图形、坐标系、数据结构可视化、本地白板文件打开/保存、自动草稿、背景模式切换和 PNG 导出。

## 开发

```bash
npm install
npm run dev
```

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

`start.sh`、`start-dev.sh` 和 `serve` 支持环境变量：

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

- 无限画布：滚轮缩放，按住空格或中键拖拽平移。
- 工具：底部图标工具栏提供选择、平移、画笔、片段橡皮、对象橡皮、文字、便签、图片、结构和图形。
- 图形：矩形、椭圆、直线、箭头和坐标系合并在图形工具中，点击图形工具会弹出子工具选择。
- 编辑：单选/框选、多选、移动、缩放、旋转、删除、复制、剪切、粘贴、上移、下移、置顶、置底、分组、取消分组、锁定和解锁。
- 属性栏：会随当前工具或选中对象显示，可配置画笔、图形、文字、便签、坐标系和结构元素。
- 图层：右侧图层面板按层级展示元素，支持选中对象、查看锁定和分组状态。
- 文字：支持字号、字体、颜色、加粗、斜体、下划线、删除线；支持显式或整段 LaTeX 渲染。
- 图片：支持菜单导入图片，也支持直接粘贴或拖拽图片到鼠标指向的白板位置。
- 结构：支持数组、栈、队列、双端队列、图、树和二叉树作为独立结构元素插入和编辑。
- 线性结构：支持手填或随机生成，单击单元格切换当前活动项，双击单元格内联改值，长按单元格进入拖拽重排。
- 线性结构属性栏：支持应用结构、高亮区间、指针显示、0/1 下标切换、下标显示切换，以及数组排序演示。
- 数组算法：支持冒泡排序、选择排序和插入排序的开始、上一步、下一步、播放、重置和结束。
- 图结构：支持加点、连边、点选连边、输入连边、删点、删边、改边、默认有向/无向、节点/边高亮、环形/网格/分层/力导向布局、边表/邻接表/矩阵导入导出。
- 树结构：支持应用结构、节点编辑、遍历高亮；普通树支持层序/前序/后序，二叉树支持前序/中序/后序。
- 样式：支持线条颜色、填充颜色、透明填充、粗细、线型、笔头、文字字号和便签样式。
- 橡皮：片段橡皮支持动态擦除半径，快速移动时扩大，慢下来后回到基础大小。
- 文件：在 Chrome/Edge 中使用 `.lofibrd` JSON 文件原地打开、保存和另存为；浏览器会自动保存本地草稿。
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

## 目录结构

- `src/app/`：应用入口、工作台 HTML 和 Konva 事件编排。
- `src/algorithms/`：数组排序算法步骤生成与校验。
- `src/board/`：白板数据模型、元素工厂、历史记录和 ID 生成。
- `src/canvas/`：Konva 节点适配、几何计算、视图缩放和平移、PNG 导出背景。
- `src/structures/`：数组、栈、队列、双端队列、图、树、二叉树等结构元素模板与编辑纯函数。
- `src/services/`：本地文件、自动草稿、剪贴板、图片/文本导入、LaTeX 渲染和文本覆盖层等浏览器能力封装。
- `src/tools/`：工具行为规则、交互判断和笔触处理。
- `src/ui/`：工具栏、菜单、图标配置、面板状态和可见性规则。
- `tests/`：按 `src/` 对应领域分层组织的 Vitest 测试。
