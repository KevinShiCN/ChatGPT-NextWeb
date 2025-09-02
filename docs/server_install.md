# 服务器部署文档

## 项目信息
- 项目路径：`/www/wwwroot/chatgpt-next-web`
- 服务端口：3000
- 进程管理：PM2

## 初始化安装步骤（已完成）

### 1. 安装 Node.js 18
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. 安装 Git
```bash
sudo yum install -y git
```

### 3. 安装 Yarn 和 PM2
```bash
npm install -g yarn pm2
```

### 4. 克隆项目
```bash
cd /www/wwwroot
# 使用加速镜像克隆（如果 GitHub 连接超时）
git clone https://gitclone.com/github.com/KevinShiCN/ChatGPT-NextWeb.git chatgpt-next-web
cd chatgpt-next-web
```

### 5. 配置环境变量
```bash
# 方式一：手动创建
cp .env.example .env
vi .env  # 编辑环境变量

# 方式二：从 Vercel 同步（推荐）
npm install -g vercel
vercel login
vercel env pull  # 下载 Vercel 的环境变量到 .env.local
```

### 6. 安装依赖并构建
```bash
yarn install
yarn build
```

### 7. 使用 PM2 启动
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 设置开机自启
```

## 日常操作命令

### 查看服务状态
```bash
pm2 status chatgpt-next-web
```

### 查看日志
```bash
pm2 logs chatgpt-next-web
```

### 重启服务
```bash
pm2 restart chatgpt-next-web
```

### 停止服务
```bash
pm2 stop chatgpt-next-web
```

### 更新项目
```bash
cd /www/wwwroot/chatgpt-next-web

# 拉取最新代码
git pull origin main

# 更新依赖
yarn install

# 重新构建
yarn build

# 重启服务
pm2 restart chatgpt-next-web
```

### 使用脚本更新（推荐）
```bash
cd /www/wwwroot/chatgpt-next-web
chmod +x scripts/update.sh
./scripts/update.sh
```

## 宝塔面板配置

### 1. 添加 Node.js 项目管理

由于宝塔默认不识别 PM2 项目，你需要：

#### 方法一：使用宝塔的 PM2 管理器
1. 在宝塔软件商店搜索"PM2管理器"
2. 安装 PM2 管理器插件
3. 打开 PM2 管理器，应该能看到 `chatgpt-next-web` 项目

#### 方法二：添加为网站并配置反向代理
1. 在宝塔面板添加站点
2. 域名：你的域名
3. 配置反向代理：

在站点设置 → 反向代理 → 添加反向代理：
- 代理名称：chatgpt-next-web
- 目标URL：http://127.0.0.1:3000
- 发送域名：$host

#### 方法三：使用宝塔的进程守护
1. 在宝塔软件商店安装"进程守护管理器"
2. 添加守护进程：
   - 名称：chatgpt-next-web
   - 启动命令：`cd /www/wwwroot/chatgpt-next-web && yarn start`
   - 进程数量：1

### 2. 配置 Nginx（如果使用域名访问）

在站点配置文件中添加：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 3. 配置防火墙

在宝塔安全中放行 3000 端口（如果直接访问）：
1. 宝塔面板 → 安全
2. 添加端口规则：3000

## 监控和维护

### 查看 PM2 进程
```bash
pm2 list
pm2 monit  # 实时监控
```

### 查看资源使用
```bash
pm2 status
```

### 查看错误日志
```bash
pm2 logs chatgpt-next-web --err
```

### 清理日志
```bash
pm2 flush
```

## 环境变量说明

编辑 `/www/wwwroot/chatgpt-next-web/.env` 文件：

```bash
# OpenAI API 配置
OPENAI_API_KEY=你的API密钥
CODE=访问密码

# 可选配置
BASE_URL=API代理地址
PORT=3000
```

## 故障排查

### 如果服务无法启动
```bash
# 查看详细日志
pm2 logs chatgpt-next-web --lines 100

# 检查端口占用
netstat -tlnp | grep 3000

# 重新构建
cd /www/wwwroot/chatgpt-next-web
yarn build
pm2 restart chatgpt-next-web
```

### 如果无法访问
1. 检查防火墙是否开放 3000 端口
2. 检查 Nginx 配置是否正确
3. 检查 PM2 进程是否运行：`pm2 status`

## 性能优化

### 启用集群模式
编辑 `ecosystem.config.js`：
```javascript
instances: 'max',  // 使用所有 CPU 核心
```

然后重启：
```bash
pm2 reload ecosystem.config.js
```

### 设置内存限制
```javascript
max_memory_restart: '1G',  // 内存超过 1G 自动重启
```

## 备份建议

定期备份：
- `.env` 文件（环境变量）
- `ecosystem.config.js`（PM2 配置）
- 数据库（如果有）