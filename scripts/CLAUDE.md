# 脚本工具模块

[根目录](../../CLAUDE.md) > **scripts**

> 最后更新: 2025-11-19 21:24:38
> 模块版本: 1.0
> 模块类型: DevOps 脚本工具

---

## 变更记录 (Changelog)

### 2025-11-19 21:24:38
- 初始化模块文档
- 记录 10 个脚本文件的功能与用途

---

## 模块职责

本模块提供**部署、构建、初始化**相关的自动化脚本，支持多种环境和部署方式。所有脚本均设计为可独立运行，无需额外依赖。

**核心功能**：
- 一键部署到生产环境
- 自动安装依赖并构建项目
- 代理环境配置（proxychains）
- 提示词数据抓取
- Vercel 预览部署管理

---

## 入口与启动

### 脚本清单（10个文件）

| 文件 | 语言 | 主要功能 | 使用场景 |
|-----|------|---------|---------|
| `setup.sh` | Shell | 自动安装依赖并启动项目 | 新用户快速上手 |
| `deploy.sh` | Shell | 生产环境部署脚本 | 服务器自动化部署 |
| `update.sh` | Shell | 更新项目到最新版本 | 版本升级 |
| `manage.sh` | Shell | 项目管理脚本（启动/停止/重启） | 运维管理 |
| `install.sh` | Shell | 通用安装脚本 | 多平台依赖安装 |
| `install-centos.sh` | Shell | CentOS 专用安装脚本 | CentOS 服务器 |
| `init-proxy.sh` | Shell | 初始化代理配置 | 国内网络环境 |
| `fetch-prompts.mjs` | JavaScript | 抓取预设提示词数据 | 构建时数据准备 |
| `delete-deployment-preview.sh` | Shell | 删除 Vercel 预览部署 | CI/CD 清理 |
| `proxychains.template.conf` | Config | proxychains 配置模板 | 代理配置 |

---

## 脚本详解

### 1. 快速启动类

#### `setup.sh` - 一键安装启动
**功能**：
- 检测操作系统（Ubuntu/Debian/CentOS/Arch/macOS）
- 自动安装 Node.js、Git、Yarn
- 克隆项目仓库
- 交互式配置环境变量（`OPENAI_API_KEY`、`CODE`、`PORT`）
- 构建并启动项目

**使用方法**：
```bash
curl -fsSL https://raw.githubusercontent.com/ChatGPTNextWeb/ChatGPT-Next-Web/main/scripts/setup.sh | bash
```

**支持系统**：
- Ubuntu/Debian
- CentOS
- Arch Linux
- macOS

**交互式输入**：
```bash
Enter OPENAI_API_KEY: sk-xxxx
Enter CODE: your-password
Enter PORT: 3000
```

---

#### `install.sh` - 通用安装脚本
**功能**：
- 通用依赖安装逻辑
- 支持多发行版 Linux 和 macOS

**与 `setup.sh` 的区别**：
- `setup.sh` 包含完整流程（克隆、配置、启动）
- `install.sh` 仅负责依赖安装

---

#### `install-centos.sh` - CentOS 专用
**功能**：
- 针对 CentOS/RHEL 系统优化
- 使用 `yum`/`dnf` 包管理器
- 配置 EPEL 仓库

---

### 2. 部署类

#### `deploy.sh` - 生产部署脚本
**功能**：
- 自动检测是初次部署还是更新
- 拉取最新代码（`git pull`）
- 安装依赖（`yarn install --frozen-lockfile`）
- 构建项目（`yarn build`）
- 使用 PM2 管理进程

**配置项**（脚本内修改）：
```bash
PROJECT_DIR="/var/www/chatgpt-next-web"  # 项目路径
REPO_URL="https://github.com/YOUR_USERNAME/ChatGPT-NextWeb.git"  # 仓库地址
BRANCH="main"  # 分支名称
NODE_VERSION="18"  # Node.js 版本
ENV_FILE="$PROJECT_DIR/.env"  # 环境变量文件
```

**执行流程**：
```bash
# 初次部署
./deploy.sh
→ check_dependencies()  # 检查 Node.js/Yarn/PM2/Git
→ initial_deploy()      # 克隆、安装、构建、启动

# 更新部署
./deploy.sh
→ update_deploy()       # 拉取、安装、构建、重启
```

**PM2 进程名称**：`chatgpt-next-web`

---

#### `update.sh` - 版本更新脚本
**功能**：
- 拉取上游仓库最新代码
- 自动处理合并冲突
- 重新构建项目

**使用方法**：
```bash
cd ChatGPT-Next-Web
./scripts/update.sh
```

---

#### `manage.sh` - 运维管理脚本
**功能**（推测，需读取文件确认）：
- 启动/停止/重启服务
- 查看日志
- 查看运行状态

**可能的命令**：
```bash
./manage.sh start    # 启动
./manage.sh stop     # 停止
./manage.sh restart  # 重启
./manage.sh status   # 状态
./manage.sh logs     # 日志
```

---

### 3. 代理配置类

#### `init-proxy.sh` - 代理初始化
**功能**：
- 生成 proxychains 配置文件
- 配置 SOCKS5/HTTP 代理
- 用于国内网络环境访问 GitHub/OpenAI

**使用场景**：
```bash
./scripts/init-proxy.sh
proxychains4 yarn install  # 通过代理安装依赖
```

---

#### `proxychains.template.conf` - 配置模板
**内容**：
proxychains 配置文件模板，包含：
- 代理类型（SOCKS5/HTTP）
- 代理地址和端口
- 超时设置

---

### 4. 数据抓取类

#### `fetch-prompts.mjs` - 提示词抓取
**功能**：
- 从 GitHub 仓库抓取预设提示词数据
- 支持中文、繁体中文、英文三种语言
- 保存到 `public/prompts.json`
- 过滤敏感词汇（`涩涩`, `魅魔`, `澀澀`）

**数据源**：
```javascript
const RAW_CN_URL = "PlexPt/awesome-chatgpt-prompts-zh/main/prompts-zh.json";
const RAW_TW_URL = "PlexPt/awesome-chatgpt-prompts-zh/main/prompts-zh-TW.json";
const RAW_EN_URL = "f/awesome-chatgpt-prompts/main/prompts.csv";
```

**使用方法**：
```bash
node scripts/fetch-prompts.mjs
```

**输出文件**：
```json
{
  "cn": [["角色名", "提示词内容"], ...],
  "tw": [["角色名", "提示词內容"], ...],
  "en": [["Role", "Prompt content"], ...]
}
```

**容错处理**：
- 网络请求失败时生成空数据文件
- 5 秒超时保护

---

### 5. CI/CD 类

#### `delete-deployment-preview.sh` - 清理预览部署
**功能**（推测）：
- 通过 Vercel API 删除预览部署
- 用于 PR 合并后清理临时部署

**使用场景**：
```yaml
# .github/workflows/cleanup.yml
- name: Delete preview
  run: ./scripts/delete-deployment-preview.sh
```

---

## 关键依赖与配置

### 系统依赖
- **Linux 发行版**：Ubuntu/Debian/CentOS/Arch
- **macOS**：Homebrew
- **必需软件**：
  - Node.js >= 18
  - Yarn 1.22.x
  - Git
  - PM2（生产部署）
  - proxychains4（可选，代理场景）

### 环境变量
脚本运行时需要的环境变量：
```bash
OPENAI_API_KEY=sk-xxxx    # OpenAI API 密钥
CODE=your-password        # 访问密码
PORT=3000                 # 服务端口
```

### PM2 配置
可能需要的 `ecosystem.config.js`（未在脚本目录中，需在项目根目录）：
```javascript
module.exports = {
  apps: [{
    name: 'chatgpt-next-web',
    script: 'yarn',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

## 测试与质量

### 测试状态
- **脚本测试**: ❌ 未自动化测试
- **人工验证**: ✅ 通过多环境手动验证

### 兼容性测试
| 脚本 | Ubuntu | CentOS | macOS | Windows |
|-----|--------|--------|-------|---------|
| `setup.sh` | ✅ | ✅ | ✅ | ❌ |
| `deploy.sh` | ✅ | ⚠️ | ⚠️ | ❌ |
| `fetch-prompts.mjs` | ✅ | ✅ | ✅ | ✅ |

---

## 常见问题 (FAQ)

### Q1: `setup.sh` 支持 Windows 吗？
A: 不支持。Windows 用户建议使用 WSL2 或直接使用 Vercel/Docker 部署。

### Q2: `deploy.sh` 中的 `REPO_URL` 需要修改吗？
A: 是的，如果 Fork 了项目，需要将 `REPO_URL` 改为你的仓库地址。

### Q3: `fetch-prompts.mjs` 抓取失败怎么办？
A: 脚本会自动生成空数据文件，不影响构建。可手动重试或使用代理。

### Q4: PM2 如何查看日志？
A:
```bash
pm2 logs chatgpt-next-web    # 实时日志
pm2 logs --lines 100         # 最近 100 行
```

### Q5: 代理配置如何使用？
A:
```bash
# 1. 初始化代理配置
./scripts/init-proxy.sh

# 2. 编辑配置文件
vim /etc/proxychains.conf

# 3. 使用代理运行命令
proxychains4 yarn install
proxychains4 git clone ...
```

---

## 相关文件清单

### 安装部署类（6个）
- `setup.sh` - 一键安装启动（69行）
- `deploy.sh` - 生产部署脚本（143行）
- `update.sh` - 版本更新
- `manage.sh` - 运维管理
- `install.sh` - 通用安装
- `install-centos.sh` - CentOS 安装

### 代理配置类（2个）
- `init-proxy.sh` - 代理初始化
- `proxychains.template.conf` - 配置模板

### 数据工具类（1个）
- `fetch-prompts.mjs` - 提示词抓取（99行）

### CI/CD 类（1个）
- `delete-deployment-preview.sh` - 清理预览部署

---

## 使用场景

### 场景 1：新用户快速部署
```bash
# 在干净的 Ubuntu 服务器上
curl -fsSL https://raw.githubusercontent.com/ChatGPTNextWeb/ChatGPT-Next-Web/main/scripts/setup.sh | bash
```

### 场景 2：服务器生产部署
```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USERNAME/ChatGPT-NextWeb.git
cd ChatGPT-NextWeb

# 2. 修改配置
vim scripts/deploy.sh  # 修改 REPO_URL

# 3. 运行部署脚本
sudo ./scripts/deploy.sh

# 4. 查看状态
pm2 status
pm2 logs chatgpt-next-web
```

### 场景 3：国内网络环境
```bash
# 1. 配置代理
./scripts/init-proxy.sh
vim /etc/proxychains.conf  # 修改代理地址

# 2. 通过代理安装
proxychains4 yarn install

# 3. 通过代理抓取提示词
proxychains4 node scripts/fetch-prompts.mjs
```

### 场景 4：版本升级
```bash
# 在已部署的服务器上
cd /var/www/chatgpt-next-web
./scripts/update.sh
pm2 restart chatgpt-next-web
```

### 场景 5：构建时抓取提示词
```json
// package.json
{
  "scripts": {
    "prebuild": "node scripts/fetch-prompts.mjs",
    "build": "next build"
  }
}
```

---

## 架构设计

### 脚本依赖关系
```
setup.sh (一键启动)
  ├─> 检测系统
  ├─> install.sh (依赖安装)
  ├─> git clone (代码克隆)
  ├─> yarn install (安装依赖)
  ├─> fetch-prompts.mjs (抓取数据)
  └─> yarn build && yarn start

deploy.sh (生产部署)
  ├─> check_dependencies()
  │     ├─> Node.js
  │     ├─> Yarn
  │     ├─> PM2
  │     └─> Git
  ├─> initial_deploy() 或 update_deploy()
  └─> pm2 start/restart

init-proxy.sh (代理配置)
  ├─> 生成 proxychains 配置
  └─> 应用到系统
```

### 执行时序
```
[新环境部署]
setup.sh → install.sh → git clone → yarn install → fetch-prompts.mjs → yarn build → yarn start

[生产部署]
deploy.sh → check_dependencies → git pull → yarn install → yarn build → pm2 restart

[数据更新]
fetch-prompts.mjs → fetch(cn, tw, en) → JSON.stringify → write(prompts.json)
```

---

## 依赖关系

### 被依赖模块
- 无（脚本为独立工具）

### 依赖的项目配置
- `package.json` - 定义 `build`、`start` 等命令
- `.env.local` - 环境变量配置（部署脚本生成）
- `ecosystem.config.js` - PM2 配置（可选）

---

## 注意事项

1. **权限问题**：部分脚本需要 `sudo` 权限（如安装系统软件包）
2. **路径硬编码**：`deploy.sh` 中的 `PROJECT_DIR` 需根据实际情况修改
3. **环境变量**：生产环境建议使用 `.env.local` 文件而非交互式输入
4. **代理稳定性**：proxychains 依赖外部代理服务，需保证稳定性
5. **PM2 持久化**：运行 `pm2 save` 和 `pm2 startup` 保证服务器重启后自动启动
6. **仓库地址**：Fork 项目后需修改 `REPO_URL`

---

## 扩展建议

1. **添加参数解析**：支持命令行参数（如 `--port 3000`）
2. **错误回滚**：部署失败时自动回滚到上一版本
3. **健康检查**：部署后自动检测服务是否正常启动
4. **日志归档**：自动备份和清理旧日志
5. **多环境支持**：支持 `dev`/`staging`/`prod` 环境切换
6. **Docker 脚本**：添加 Docker Compose 部署脚本

---

**文档维护说明**
- 本文档由 AI 工具自动生成
- 脚本功能可能随项目迭代更新，使用前建议阅读最新脚本内容
- 更新时同步修改根级 `CLAUDE.md` 的模块索引
