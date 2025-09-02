#!/bin/bash

# ChatGPT-Next-Web 服务器初始化脚本 (CentOS/RHEL)
# 用于在 CentOS/RHEL 系统上初始化部署环境

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}===== ChatGPT-Next-Web 初始化安装 (CentOS/RHEL) =====${NC}"

# 1. 安装 Node.js 18
echo -e "${GREEN}安装 Node.js 18...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 2. 安装 Git（如果未安装）
echo -e "${GREEN}检查并安装 Git...${NC}"
if ! command -v git &> /dev/null; then
    sudo yum install -y git
fi

# 3. 安装 Yarn
echo -e "${GREEN}安装 Yarn...${NC}"
npm install -g yarn

# 4. 安装 PM2
echo -e "${GREEN}安装 PM2...${NC}"
npm install -g pm2

# 5. 创建项目目录
echo -e "${GREEN}设置项目目录...${NC}"
PROJECT_DIR="/var/www/chatgpt-next-web"
sudo mkdir -p /var/www

# 6. 克隆项目（如果还没有克隆）
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${GREEN}克隆项目...${NC}"
    cd /var/www
    git clone https://github.com/YOUR_USERNAME/ChatGPT-NextWeb.git chatgpt-next-web
else
    echo -e "${YELLOW}项目目录已存在${NC}"
fi

cd $PROJECT_DIR

# 7. 设置脚本权限
echo -e "${GREEN}设置脚本权限...${NC}"
chmod +x scripts/*.sh

# 8. 创建环境变量文件
if [ ! -f .env ]; then
    echo -e "${GREEN}创建环境变量文件...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}请编辑 .env 文件配置环境变量：${NC}"
        echo "nano .env 或 vi .env"
    fi
fi

# 9. 安装依赖
echo -e "${GREEN}安装项目依赖...${NC}"
yarn install --frozen-lockfile

# 10. 构建项目
echo -e "${GREEN}构建项目...${NC}"
yarn build

# 11. 启动服务
echo -e "${GREEN}启动服务...${NC}"
pm2 start ecosystem.config.js
pm2 save

# 12. 设置开机自启
echo -e "${GREEN}设置 PM2 开机自启...${NC}"
pm2 startup systemd -u root --hp /root
pm2 save

# 13. 防火墙设置（如果使用 firewalld）
echo -e "${GREEN}配置防火墙...${NC}"
if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    echo -e "${GREEN}已开放 3000 端口${NC}"
else
    echo -e "${YELLOW}firewalld 未运行，请手动配置防火墙${NC}"
fi

# 显示服务状态
echo -e "${GREEN}===== 安装完成！=====${NC}"
pm2 status

echo -e "${YELLOW}访问地址: http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "${YELLOW}注意事项：${NC}"
echo "1. 请编辑 .env 文件配置环境变量"
echo "2. 使用 ./scripts/update.sh 更新代码"
echo "3. 使用 ./scripts/manage.sh 管理服务"