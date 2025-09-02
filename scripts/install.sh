#!/bin/bash

# ChatGPT-Next-Web 快速安装脚本
# 自动检测系统类型并安装

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检测系统类型
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        VER=$(lsb_release -sr)
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS=$(echo $DISTRIB_ID | tr '[:upper:]' '[:lower:]')
        VER=$DISTRIB_RELEASE
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
    else
        OS=$(uname -s)
    fi
    
    echo -e "${GREEN}检测到系统: $OS${NC}"
}

# CentOS/RHEL 安装
install_centos() {
    echo -e "${GREEN}===== CentOS/RHEL 系统安装 =====${NC}"
    
    # 安装 Node.js
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs git
    
    # 安装 Yarn 和 PM2
    npm install -g yarn pm2
}

# Ubuntu/Debian 安装
install_debian() {
    echo -e "${GREEN}===== Ubuntu/Debian 系统安装 =====${NC}"
    
    # 更新包管理器
    sudo apt update
    
    # 安装 Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs git
    
    # 安装 Yarn 和 PM2
    npm install -g yarn pm2
}

# 主安装流程
main_install() {
    # 检测系统
    detect_os
    
    # 根据系统类型安装依赖
    case "$OS" in
        centos|rhel|fedora|rocky|almalinux)
            install_centos
            ;;
        ubuntu|debian)
            install_debian
            ;;
        *)
            echo -e "${RED}不支持的系统: $OS${NC}"
            echo "请手动安装 Node.js 18, Git, Yarn 和 PM2"
            exit 1
            ;;
    esac
    
    # 创建项目目录
    echo -e "${GREEN}创建项目目录...${NC}"
    PROJECT_DIR="/var/www/chatgpt-next-web"
    sudo mkdir -p /var/www
    
    # 克隆项目
    if [ ! -d "$PROJECT_DIR" ]; then
        echo -e "${GREEN}克隆项目...${NC}"
        echo -e "${YELLOW}请输入你的 GitHub 仓库地址:${NC}"
        read -p "仓库地址 (如: https://github.com/username/ChatGPT-NextWeb.git): " REPO_URL
        
        cd /var/www
        git clone "$REPO_URL" chatgpt-next-web
    fi
    
    cd $PROJECT_DIR
    
    # 设置脚本权限
    chmod +x scripts/*.sh
    
    # 创建环境变量文件
    if [ ! -f .env ]; then
        echo -e "${GREEN}创建环境变量文件...${NC}"
        if [ -f .env.example ]; then
            cp .env.example .env
        else
            # 创建基础 .env 文件
            cat > .env << EOF
# OpenAI API 配置
OPENAI_API_KEY=your_openai_api_key
CODE=your_access_code
PORT=3000
NODE_ENV=production
EOF
        fi
        echo -e "${YELLOW}请编辑 .env 文件配置你的 API 密钥:${NC}"
        echo "vi .env"
    fi
    
    # 安装依赖
    echo -e "${GREEN}安装依赖...${NC}"
    yarn install --frozen-lockfile
    
    # 构建项目
    echo -e "${GREEN}构建项目...${NC}"
    yarn build
    
    # 启动服务
    echo -e "${GREEN}启动服务...${NC}"
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    # 防火墙配置提示
    echo -e "${YELLOW}===== 安装完成！=====${NC}"
    echo -e "${GREEN}服务状态:${NC}"
    pm2 status
    
    echo ""
    echo -e "${YELLOW}重要提示：${NC}"
    echo "1. 编辑环境变量: vi $PROJECT_DIR/.env"
    echo "2. 重启服务: pm2 restart chatgpt-next-web"
    echo "3. 查看日志: pm2 logs chatgpt-next-web"
    echo "4. 更新代码: cd $PROJECT_DIR && ./scripts/update.sh"
    echo ""
    echo -e "${GREEN}访问地址: http://$(hostname -I | awk '{print $1}'):3000${NC}"
    echo -e "${YELLOW}如果无法访问，请检查防火墙是否开放 3000 端口${NC}"
}

# 执行安装
main_install