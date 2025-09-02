#!/bin/bash

# ChatGPT-Next-Web 手动部署脚本
# 用于在服务器上手动拉取最新代码并部署

set -e  # 遇到错误立即退出

# 配置
PROJECT_DIR="/var/www/chatgpt-next-web"
REPO_URL="https://github.com/YOUR_USERNAME/ChatGPT-NextWeb.git"  # 替换为你的仓库地址
BRANCH="main"
NODE_VERSION="18"  # Node.js 版本
ENV_FILE="$PROJECT_DIR/.env"  # 环境变量文件

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查并安装依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_warning "Node.js 未安装，正在安装..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # 检查 Yarn
    if ! command -v yarn &> /dev/null; then
        log_warning "Yarn 未安装，正在安装..."
        npm install -g yarn
    fi
    
    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安装，正在安装..."
        npm install -g pm2
    fi
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
}

# 初次部署
initial_deploy() {
    log_info "开始初次部署..."
    
    # 创建项目目录
    sudo mkdir -p $(dirname $PROJECT_DIR)
    cd $(dirname $PROJECT_DIR)
    
    # 克隆仓库
    log_info "克隆仓库..."
    git clone $REPO_URL $(basename $PROJECT_DIR)
    cd $PROJECT_DIR
    
    # 切换到指定分支
    git checkout $BRANCH
    
    # 安装依赖
    log_info "安装依赖..."
    yarn install --frozen-lockfile
    
    # 构建项目
    log_info "构建项目..."
    yarn build
    
    # 启动应用
    log_info "启动应用..."
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
}

# 更新部署
update_deploy() {
    log_info "开始更新部署..."
    
    cd $PROJECT_DIR
    
    # 拉取最新代码
    log_info "拉取最新代码..."
    git fetch origin
    git reset --hard origin/$BRANCH
    
    # 安装/更新依赖
    log_info "更新依赖..."
    yarn install --frozen-lockfile
    
    # 构建项目
    log_info "构建项目..."
    yarn build
    
    # 重启应用
    log_info "重启应用..."
    pm2 restart chatgpt-next-web
    pm2 save
}

# 主函数
main() {
    log_info "ChatGPT-Next-Web 部署脚本"
    
    # 检查依赖
    check_dependencies
    
    # 判断是初次部署还是更新
    if [ -d "$PROJECT_DIR" ]; then
        update_deploy
    else
        initial_deploy
    fi
    
    # 显示应用状态
    log_info "应用状态："
    pm2 status
    
    log_info "部署完成！"
    log_info "访问地址: http://$(hostname -I | awk '{print $1}'):3000"
}

# 执行主函数
main