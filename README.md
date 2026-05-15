# lofiBoard

vibe的💩，自用

一个离线优先的可编辑网页白板。当前版本使用 Vite + Konva，支持无限画布、对象选择、画笔、双橡皮、文字、基础形状、本地白板文件打开/保存、背景模式切换和 PNG 导出。

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
npm run start        # 后台构建并启动本地 preview 服务，默认 127.0.0.1:4173
npm run stop         # 停止后台 preview 服务
npm run start:dev    # 后台启动开发服务，默认 127.0.0.1:5173
npm run stop:dev     # 停止后台开发服务
npm run deploy:static # 构建并同步 dist/ 到 DEPLOY_DIR
```

`start.sh` 和 `start-dev.sh` 支持环境变量：

```bash
HOST=127.0.0.1 PORT=4173 npm run start
HOST=0.0.0.0 PORT=5173 npm run start:dev
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
- 工具：底部图标工具栏提供选择、平移、画笔、片段橡皮、对象橡皮、文字、便签和图形。
- 图形：矩形、椭圆、线段、箭头合并在图形工具中，点击图形工具会弹出子工具选择。
- 编辑：单选/框选、多选、移动、缩放、旋转、删除、置顶、置底，上下文属性面板会随工具或选中对象显示。
- 线性结构：支持数组、栈、队列、双端队列作为独立结构元素插入和编辑。
- 线性结构交互：单击单元格切换当前活动项，双击单元格内联改值，长按单元格进入拖拽重排，拖动中会显示抬升动画、让位动画和插入落点。
- 线性结构属性面板：提供面板内表单直接完成改值、插入、删除、交换、移动、高亮、下标显示切换和语义快捷操作，不再依赖浏览器弹窗。
- 样式：支持线条颜色、填充颜色、透明填充、粗细和文字字号。
- 橡皮：片段橡皮支持动态擦除半径，快速移动时扩大，慢下来后回到基础大小。
- 文件：在 Chrome/Edge 中使用 `.lofibrd` JSON 文件原地打开、保存和另存为。
- 导入：支持菜单导入图片，也支持直接粘贴或拖拽图片/纯文本到鼠标指向的白板位置。
- 菜单：点击左上角白板名称，可新建、打开、保存、另存为、导出 PNG、清空画布、切换背景、重置视图。
- 背景：支持点阵和纯白背景，设置会保存进 `.lofibrd` 文件。
- 导出：将当前视图按当前背景模式导出为 PNG。

## 快捷键

- `Ctrl+S`：保存
- `Ctrl+Shift+S`：另存为
- `Ctrl+O`：打开
- `Ctrl+Z`：撤销
- `Ctrl+Y`：重做
- `Delete` / `Backspace`：删除选中对象
- `Space`：按住平移画布
- `V`：选择
- `H`：平移
- `B`：画笔
- `E`：片段橡皮
- `O`：对象橡皮
- `T`：文字
- `N`：便签
- `R`：矩形
- `L`：线段
- `A`：箭头

## 目录结构

- `src/app/`：应用入口、工作台 HTML 和 Konva 事件编排。
- `src/board/`：白板数据模型、元素工厂、历史记录和 ID 生成。
- `src/canvas/`：Konva 节点适配、几何计算、视图缩放和平移、PNG 导出背景。
- `src/structures/`：数组、栈、队列、双端队列、图、树等结构元素模板与编辑纯函数。
- `src/services/`：本地文件、剪贴板、图片/文本导入等浏览器能力封装。
- `src/tools/`：工具行为规则、交互判断和笔触处理。
- `src/ui/`：工具栏、菜单、图标配置和面板状态规则。
- `tests/`：按 `src/` 对应领域分层组织的 Vitest 测试。
