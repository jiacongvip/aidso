#!/bin/bash
# ==========================================
# 🐳 Nexus AI Docker 一键启动/更新脚本
# ==========================================
# 使用方法：
#   首次部署: bash start_docker.sh
#   更新代码: bash start_docker.sh
#   强制重建: bash start_docker.sh --force
# ==========================================

set -e  # 遇到错误立即退出

echo ""
echo "========================================"
echo "   🐳 Nexus AI Docker 一键启动脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==========================================
# 1. 检查 Docker 环境
# ==========================================
log_info "检查 Docker 环境..."

if ! command -v docker &> /dev/null; then
    log_error "未检测到 Docker 命令"
    echo "👉 请先在宝塔面板 -> 软件商店 -> 搜索 'Docker' 并安装"
    exit 1
fi

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi
log_success "Docker 环境正常，使用: $COMPOSE_CMD"

# ==========================================
# 2. 拉取最新代码（如果是 Git 仓库）
# ==========================================
if [ -d ".git" ]; then
    log_info "检测到 Git 仓库，拉取最新代码..."
    
    # 检查是否有未提交的更改
    if [ -n "$(git status --porcelain)" ]; then
        log_warn "检测到本地有未提交的更改，跳过 git pull"
    else
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || log_warn "Git pull 失败，继续使用本地代码"
    fi
    
    # 显示当前版本
    CURRENT_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "未知")
    log_info "当前代码版本: $CURRENT_COMMIT"
fi

# ==========================================
# 3. 停止旧容器并清理缓存
# ==========================================
log_info "停止旧服务..."
$COMPOSE_CMD down 2>/dev/null || true

log_info "清理 Docker 构建缓存..."
# 删除当前项目的旧镜像（luaiai-app）
docker rmi luaiai-app 2>/dev/null || true
# 清理悬空镜像（无标签的中间层）
docker image prune -f 2>/dev/null || true
# 清理构建缓存
docker builder prune -f 2>/dev/null || true
log_success "缓存清理完成"

# ==========================================
# 4. 检查是否需要重建镜像
# ==========================================
FORCE_BUILD=false
if [ "$1" == "--force" ] || [ "$1" == "-f" ]; then
    FORCE_BUILD=true
    log_info "强制重建模式已启用"
fi

# Docker 部署不需要检查 dist 目录，Docker 会在构建时自动编译
log_info "准备构建 Docker 镜像..."

# ==========================================
# 5. 构建并启动 Docker
# ==========================================
log_info "构建 Docker 镜像 (首次可能需要 2-5 分钟)..."

# 始终使用 --no-cache 确保使用最新代码
# 这样可以避免 Docker 缓存导致的问题
if [ "$FORCE_BUILD" = true ]; then
    log_info "执行强制重建 (--no-cache)..."
    DOCKER_BUILDKIT=0 $COMPOSE_CMD build --no-cache
else
    # 普通构建也加 --no-cache，确保代码更新生效
    DOCKER_BUILDKIT=0 $COMPOSE_CMD build --no-cache
fi

log_info "启动服务..."
$COMPOSE_CMD up -d

# ==========================================
# 6. 等待服务启动
# ==========================================
log_info "等待服务启动..."
sleep 3

# 检查容器状态
APP_STATUS=$(docker inspect -f '{{.State.Running}}' nexus-app 2>/dev/null || echo "false")
DB_STATUS=$(docker inspect -f '{{.State.Running}}' nexus-postgres 2>/dev/null || echo "false")

if [ "$APP_STATUS" != "true" ] || [ "$DB_STATUS" != "true" ]; then
    log_error "服务启动失败！"
    echo ""
    echo "📋 容器状态:"
    docker ps -a --filter "name=nexus" --format "table {{.Names}}\t{{.Status}}"
    echo ""
    echo "📋 应用日志:"
    docker logs nexus-app --tail 20 2>/dev/null || echo "无法获取日志"
    exit 1
fi

# ==========================================
# 7. 检查数据库初始化
# ==========================================
log_info "检查数据库状态..."
sleep 2

# 检查 users 表是否存在
USER_COUNT=$(docker exec nexus-postgres psql -U nexus_user -d nexus_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$USER_COUNT" == "0" ] || [ -z "$USER_COUNT" ]; then
    log_warn "数据库为空，正在初始化..."
    
    # 如果有 init_database.sql 文件，执行它
    if [ -f "init_database.sql" ]; then
        docker exec -i nexus-postgres psql -U nexus_user -d nexus_db < init_database.sql 2>/dev/null
        log_success "数据库初始化完成"
    else
        log_warn "未找到 init_database.sql，请手动初始化数据库"
    fi
else
    log_success "数据库已有 $USER_COUNT 个用户"
fi

# ==========================================
# 8. 显示启动信息
# ==========================================
# 获取服务器 IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "服务器IP")

echo ""
echo "========================================"
echo -e "${GREEN}✅ 服务启动成功！${NC}"
echo "========================================"
echo ""
echo "🌍 访问地址: http://${SERVER_IP}:3001"
echo ""
echo "📝 默认账号:"
echo "   普通用户: test@test.com / 111111"
echo "   管理员:   admin@admin.com / admin123"
echo ""
echo "📋 常用命令:"
echo "   查看日志:   $COMPOSE_CMD logs -f app"
echo "   重启服务:   $COMPOSE_CMD restart"
echo "   停止服务:   $COMPOSE_CMD down"
echo "   更新代码:   bash start_docker.sh"
echo ""
echo "========================================"
