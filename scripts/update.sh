#!/bin/bash

# ChatGPT-Next-Web 快速更新脚本
# 用于在服务器上快速拉取最新代码并重启服务

set -e

# 配置
PROJECT_DIR="/var/www/chatgpt-next-web"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}===== ChatGPT-Next-Web 更新部署 =====${NC}"

# 进入项目目录
cd $PROJECT_DIR

# 显示当前版本
echo -e "${YELLOW}当前版本:${NC}"
git log --oneline -1

# 拉取最新代码
echo -e "${GREEN}拉取最新代码...${NC}"
git fetch origin
git pull origin main

# 显示更新后版本
echo -e "${YELLOW}更新后版本:${NC}"
git log --oneline -1

# 安装依赖（如果有更新）
echo -e "${GREEN}检查并安装依赖...${NC}"
yarn install --frozen-lockfile

# 构建项目
echo -e "${GREEN}构建项目...${NC}"
yarn build

# 重启服务
echo -e "${GREEN}重启服务...${NC}"
pm2 restart chatgpt-next-web || pm2 start ecosystem.config.js

# 显示服务状态
echo -e "${GREEN}服务状态:${NC}"
pm2 status chatgpt-next-web

echo -e "${GREEN}===== 更新完成！=====${NC}"
echo -e "${YELLOW}访问地址: http://$(hostname -I | awk '{print $1}'):3000${NC}"