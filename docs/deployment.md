# 生产部署

lofiBoard 是 Vite 构建的纯前端应用。生产环境推荐让 Nginx 直接托管 `dist/` 静态文件；只有在你明确想用本仓库的 `start.sh` 管理本机 preview 服务时，才需要 Nginx 反向代理到 `127.0.0.1:4173`。

## 推荐方案：Nginx 托管静态文件

服务器上准备 Node.js 与 Nginx 后执行：

```bash
git clone <repo-url> /var/www/lofibrd/app
cd /var/www/lofibrd/app
npm ci
DEPLOY_DIR=/var/www/lofibrd/dist npm run deploy:static
```

复制并修改 Nginx 配置：

```bash
sudo cp deploy/nginx/lofibrd-static.conf /etc/nginx/sites-available/lofibrd.conf
sudo ln -s /etc/nginx/sites-available/lofibrd.conf /etc/nginx/sites-enabled/lofibrd.conf
sudo nginx -t
sudo systemctl reload nginx
```

需要修改的字段：

- `server_name board.example.com;`：替换成你的域名。
- `root /var/www/lofibrd/dist;`：替换成你的实际 `dist/` 目录。

这个方案不需要常驻 Node 进程。发布新版时重新执行：

```bash
cd /var/www/lofibrd/app
git pull
npm ci
DEPLOY_DIR=/var/www/lofibrd/dist npm run deploy:static
sudo systemctl reload nginx
```

## 可选方案：Nginx 反代 preview 服务

如果你希望使用仓库脚本启动本机 preview 服务：

```bash
cd /var/www/lofibrd/app
npm ci
HOST=127.0.0.1 PORT=4173 npm run start
```

然后复制反代配置：

```bash
sudo cp deploy/nginx/lofibrd-proxy.conf /etc/nginx/sites-available/lofibrd.conf
sudo ln -s /etc/nginx/sites-available/lofibrd.conf /etc/nginx/sites-enabled/lofibrd.conf
sudo nginx -t
sudo systemctl reload nginx
```

`vite preview` 是生产构建的本地预览服务，适合内网、临时部署或小流量场景。公网生产环境优先使用静态托管方案。

## systemd 管理 preview

如果选择反代 preview，可以用 systemd 管理前台 `vite preview` 进程：

```bash
sudo cp deploy/lofibrd-preview.service /etc/systemd/system/lofibrd-preview.service
sudo systemctl daemon-reload
sudo systemctl enable --now lofibrd-preview
sudo systemctl status lofibrd-preview
```

使用前需要按实际路径修改 service 文件：

- `WorkingDirectory=/var/www/lofibrd/app`
- `Environment=HOST=127.0.0.1`
- `Environment=PORT=4173`

## 本项目脚本

```bash
npm run dev          # 本地 Vite 开发服务
npm run build        # 构建 dist/
npm run preview      # 本地预览 dist/
npm run preview:host # 固定 127.0.0.1:4173 预览 dist/
npm run serve        # 前台运行 preview，供 systemd 使用
npm run start        # 后台构建并启动 preview，写入 .runtime/preview.pid
npm run stop         # 停止后台 preview
npm run start:dev    # 后台启动开发服务
npm run stop:dev     # 停止后台开发服务
npm run deploy:static # 构建并同步 dist/ 到 DEPLOY_DIR
npm test             # 运行 Vitest
```

`start.sh` 支持环境变量：

```bash
HOST=127.0.0.1 PORT=4173 npm run start
```

后台日志在 `.runtime/preview.log`。

静态发布脚本支持环境变量：

```bash
DEPLOY_DIR=/var/www/lofibrd/dist npm run deploy:static
```

`deploy:static` 会让目标目录与本次 `dist/` 完全一致：使用 `rsync` 时带 `--delete`，没有 `rsync` 时会先清空目标目录。`DEPLOY_DIR` 必须指向专用的静态产物目录，不能指向仓库或包含其他文件的共享目录。

开发服务同样支持 `HOST` / `PORT`，日志和进程信息写入 `.runtime/`：

```bash
HOST=0.0.0.0 PORT=5173 npm run start:dev
npm run stop:dev
```

其他维护脚本：

```bash
npm run deploy:build # 安装依赖并构建 dist/
npm run bench:render # 运行渲染基准脚本
```
