#!/bin/bash

# ChatGPT-Next-Web 服务管理脚本
# 提供各种服务管理命令

PROJECT_DIR="/var/www/chatgpt-next-web"
APP_NAME="chatgpt-next-web"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 显示帮助
show_help() {
    echo -e "${BLUE}ChatGPT-Next-Web 服务管理命令${NC}"
    echo ""
    echo "用法: ./manage.sh [命令]"
    echo ""
    echo "命令:"
    echo "  start     - 启动服务"
    echo "  stop      - 停止服务"
    echo "  restart   - 重启服务"
    echo "  status    - 查看服务状态"
    echo "  logs      - 查看实时日志"
    echo "  update    - 拉取最新代码并重启"
    echo "  build     - 仅构建项目"
    echo "  clean     - 清理缓存和日志"
    echo "  backup    - 备份环境配置"
    echo "  help      - 显示此帮助信息"
}

# 启动服务
start_service() {
    echo -e "${GREEN}启动服务...${NC}"
    cd $PROJECT_DIR
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}服务已启动${NC}"
}

# 停止服务
stop_service() {
    echo -e "${YELLOW}停止服务...${NC}"
    pm2 stop $APP_NAME
    echo -e "${YELLOW}服务已停止${NC}"
}

# 重启服务
restart_service() {
    echo -e "${GREEN}重启服务...${NC}"
    pm2 restart $APP_NAME
    echo -e "${GREEN}服务已重启${NC}"
}

# 查看状态
show_status() {
    echo -e "${BLUE}服务状态:${NC}"
    pm2 status $APP_NAME
    echo ""
    echo -e "${BLUE}资源使用:${NC}"
    pm2 monit $APP_NAME
}

# 查看日志
show_logs() {
    echo -e "${BLUE}实时日志 (Ctrl+C 退出):${NC}"
    pm2 logs $APP_NAME --lines 50
}

# 更新部署
update_deploy() {
    cd $PROJECT_DIR
    ./scripts/update.sh
}

# 构建项目
build_only() {
    echo -e "${GREEN}构建项目...${NC}"
    cd $PROJECT_DIR
    yarn build
    echo -e "${GREEN}构建完成${NC}"
}

# 清理缓存
clean_cache() {
    echo -e "${YELLOW}清理缓存和日志...${NC}"
    cd $PROJECT_DIR
    
    # 清理 Next.js 缓存
    rm -rf .next
    
    # 清理日志（保留最近7天）
    find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # 清理 node_modules（可选）
    read -p "是否清理 node_modules? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf node_modules
        echo -e "${YELLOW}已清理 node_modules，请运行 yarn install 重新安装${NC}"
    fi
    
    echo -e "${GREEN}清理完成${NC}"
}

# 备份配置
backup_config() {
    echo -e "${GREEN}备份环境配置...${NC}"
    cd $PROJECT_DIR
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # 备份环境变量
    [ -f .env ] && cp .env $BACKUP_DIR/
    
    # 备份 PM2 配置
    [ -f ecosystem.config.js ] && cp ecosystem.config.js $BACKUP_DIR/
    
    # 备份 package.json
    cp package.json $BACKUP_DIR/
    
    echo -e "${GREEN}配置已备份到: $BACKUP_DIR${NC}"
}

# 主程序
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    update)
        update_deploy
        ;;
    build)
        build_only
        ;;
    clean)
        clean_cache
        ;;
    backup)
        backup_config
        ;;
    help|"")
        show_help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac