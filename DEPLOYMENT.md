# 部署指南 / Deployment Guide (Atlas News Blog)

The app is a classic two-part stack that deploys as **one Node process**:
the Express server both serves the API **and** the built frontend (`client/dist`),
so a single VPS + Nginx is all you need. SQLite + `uploads/` are plain files,
so they persist on the server disk without extra services.

- 前端：React + Vite（构建成静态文件 `client/dist`）
- 后端：Node.js + Express + SQLite（单文件数据库）+ JWT + 本地图片上传
- 推荐：一台云服务器（VPS）+ Nginx + PM2 + HTTPS

---

## 方式一：VPS 部署（推荐，完全可控）

以 Ubuntu 22.04/24.04 为例。全文共 7 步，约 20 分钟。

### 1) 准备服务器

- 购买 VPS（阿里云/腾讯云轻量、DigitalOcean、Vultr、Hetzner 等均可，2C2G 足够）
- 系统选 Ubuntu 22.04/24.04 LTS
- 安全组/防火墙放行 **80、443、22** 端口

### 2) 安装基础软件

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx
node -v   # 应显示 v22.x 或更高
```

### 3) 部署代码（从你的 GitHub 克隆，自带全部数据）

```bash
sudo mkdir -p /var/www && sudo chown $USER /var/www
cd /var/www
git clone https://github.com/Mumen729/webkaifa.git atlas
cd atlas
npm run install:all          # 安装根/后端/前端依赖
npm --prefix client run build # 构建前端 → client/dist
```

### 4) 配置环境变量并改密码

```bash
cp .env.example .env
# 生成一个随机 JWT 密钥并写入 .env 的 JWT_SECRET：
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# 然后编辑 .env：把输出的随机串填到 JWT_SECRET=

# 立即修改后台管理员密码（默认 admin123 必须换掉）：
cd server && node src/change-password.js admin 你的新密码
```

### 5) 用 PM2 常驻运行

```bash
sudo npm i -g pm2
pm2 start /var/www/atlas/server/ecosystem.config.cjs
pm2 save
pm2 startup            # 按提示执行它输出的 sudo 命令，实现开机自启
pm2 status             # 应看到 atlas 为 online
curl http://localhost:3000/api/health   # → {"ok":true}
```

### 6) 配置 Nginx 反代 + 域名

```bash
# 把域名解析到服务器 IP（DNS 加一条 A 记录）
sudo cp /var/www/atlas/deploy/nginx.conf /etc/nginx/sites-available/atlas
sudo nano /etc/nginx/sites-available/atlas   # 把 yourdomain.com 换成你的域名
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 7) 开启 HTTPS（免费证书）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# 自动配置 SSL + 自动续期，之后访问 https://yourdomain.com 即可
```

### 日常运维

```bash
pm2 logs atlas                # 看日志
pm2 restart atlas             # 重启
cd /var/www/atlas && git pull && npm run install:all && npm --prefix client run build && pm2 restart atlas   # 更新代码
node src/crawler.js           # 手动增量抓取新内容（可选）
```

### 备份（数据 = 一个库 + 一个目录）

```bash
tar czf ~/atlas-data-backup.tar.gz /var/www/atlas/server/data /var/www/atlas/server/uploads
# 或用 git：git add -A && git commit && git push  （数据在仓库里，双保险）
```

---

## 方式二：PaaS 平台（更省事，推荐 Railway / Render）

无需自己管理服务器，但 SQLite 与上传文件需要持久化：

- **Railway**：加一个 Volume 挂载到 `server/data` 和 `server/uploads`，启动命令
  `node src/index.js`，工作目录 `server`，`PORT` 自动注入。
- **Render**：Web Service + 挂载磁盘（Persistent Disk）到同样两个目录，
  Build Command 用 `npm --prefix client run build`。
- 两者都要在项目设置里放上环境变量 `JWT_SECRET`。

> 注意：SQLite 在 PaaS 上必须配合持久卷使用，否则重启数据会丢。
> 免费档实例休眠时会暂停，属正常现象。

---

## 上线前安全清单

1. ✅ 修改后台密码：`node src/change-password.js admin <新密码>`
2. ✅ 设置随机 `JWT_SECRET`
3. ✅ 启用 HTTPS（certbot）
4. 可选：后台 `/admin` 加 IP 白名单或访问密码（Nginx 层）
5. 可选：删除或停止公网爬虫（生产环境按需手动 `npm run crawl`）

## 本机联调生产模式（部署前先自测）

```bash
npm --prefix client run build     # 构建前端
PORT=3100 node server/src/index.js  # 用 3100 端口起生产服务
# 打开 http://localhost:3100  → 首页、文章、后台都应为同一进程服务
```
