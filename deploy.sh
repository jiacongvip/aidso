#!/bin/bash
# ==========================================
# 🚀 AIDSO 一键部署脚本
# ==========================================
# 使用方法：
#   首次部署: bash deploy.sh
#   更新代码: bash deploy.sh
#   强制重建: bash deploy.sh --force
#   指定分支: bash deploy.sh --branch main
# ==========================================

set -e  # 遇到错误立即退出

echo ""
echo "========================================"
echo "   🚀 AIDSO 一键部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# ==========================================
# 1. 解析参数
# ==========================================
FORCE_BUILD=false
GIT_BRANCH=""
GIT_REMOTE="origin"

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_BUILD=true
            shift
            ;;
        --branch|-b)
            GIT_BRANCH="$2"
            shift 2
            ;;
        --remote|-r)
            GIT_REMOTE="$2"
            shift 2
            ;;
        *)
            log_warn "未知参数: $1"
            shift
            ;;
    esac
done

# ==========================================
# 2. 检查 Git 环境并拉取代码
# ==========================================
log_step "步骤 1/7: 检查 Git 环境并拉取代码"

if [ ! -d ".git" ]; then
    log_error "当前目录不是 Git 仓库"
    echo "👉 请确保在项目根目录执行此脚本"
    exit 1
fi

log_info "检测到 Git 仓库"

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    log_warn "检测到本地有未提交的更改"
    read -p "是否继续部署？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "部署已取消"
        exit 0
    fi
    log_warn "继续部署，未提交的更改将被保留"
fi

# 获取当前分支（如果未指定）
if [ -z "$GIT_BRANCH" ]; then
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    log_info "当前分支: $GIT_BRANCH"
else
    log_info "切换到分支: $GIT_BRANCH"
    git checkout "$GIT_BRANCH" 2>/dev/null || log_warn "无法切换到分支 $GIT_BRANCH，使用当前分支"
fi

# 拉取最新代码
log_info "从 $GIT_REMOTE/$GIT_BRANCH 拉取最新代码..."
if git pull "$GIT_REMOTE" "$GIT_BRANCH" 2>/dev/null; then
    log_success "代码拉取成功"
else
    log_warn "Git pull 失败，继续使用本地代码"
fi

# 显示当前版本
CURRENT_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "未知")
log_info "当前代码版本: $CURRENT_COMMIT"

# ==========================================
# 3. 检查 Docker 环境
# ==========================================
log_step "步骤 2/7: 检查 Docker 环境"

if ! command -v docker &> /dev/null; then
    log_error "未检测到 Docker 命令"
    echo "👉 请先安装 Docker:"
    echo "   - 宝塔面板: 软件商店 -> 搜索 'Docker' -> 安装"
    echo "   - 或访问: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker 服务是否运行
if ! docker info &> /dev/null; then
    log_error "Docker 服务未运行"
    echo "👉 请启动 Docker 服务"
    exit 1
fi

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    log_error "未检测到 docker-compose 命令"
    echo "👉 请安装 docker-compose"
    exit 1
fi

log_success "Docker 环境正常，使用: $COMPOSE_CMD"

# ==========================================
# 4. 检查必要文件
# ==========================================
log_step "步骤 3/7: 检查必要文件"

if [ ! -f "docker-compose.yml" ]; then
    log_error "未找到 docker-compose.yml 文件"
    echo "👉 请确保在项目根目录执行此脚本"
    exit 1
fi

if [ ! -d "aidso-interface-replica" ]; then
    log_error "未找到 aidso-interface-replica 目录"
    echo "👉 请确保项目结构完整"
    exit 1
fi

log_success "必要文件检查通过"

# ==========================================
# 5. 停止旧容器并清理
# ==========================================
log_step "步骤 4/7: 停止旧服务并清理"

log_info "停止旧服务..."
$COMPOSE_CMD down 2>/dev/null || true

if [ "$FORCE_BUILD" = true ]; then
    log_info "强制重建模式：清理 Docker 构建缓存..."
    # 删除项目相关镜像
    docker images | grep -E "aidso|aidso-interface-replica" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    # 清理悬空镜像
    docker image prune -f 2>/dev/null || true
    # 清理构建缓存
    docker builder prune -f 2>/dev/null || true
    log_success "缓存清理完成"
else
    log_info "普通模式：仅清理悬空镜像..."
    docker image prune -f 2>/dev/null || true
fi

# ==========================================
# 6. 构建 Docker 镜像
# ==========================================
log_step "步骤 5/7: 构建 Docker 镜像"

log_info "开始构建 Docker 镜像（首次可能需要 3-5 分钟）..."

if [ "$FORCE_BUILD" = true ]; then
    log_info "执行强制重建 (--no-cache)..."
    DOCKER_BUILDKIT=0 $COMPOSE_CMD build --no-cache
else
    log_info "执行增量构建..."
    DOCKER_BUILDKIT=0 $COMPOSE_CMD build
fi

log_success "镜像构建完成"

# ==========================================
# 7. 启动服务
# ==========================================
log_step "步骤 6/7: 启动服务"

log_info "启动所有服务..."
$COMPOSE_CMD up -d

log_success "服务启动命令已执行"

# ==========================================
# 8. 等待服务启动并检查状态
# ==========================================
log_step "步骤 7/7: 检查服务状态"

log_info "等待服务启动（10秒）..."
sleep 10

# 检查容器状态
log_info "检查容器运行状态..."

POSTGRES_STATUS=$(docker inspect -f '{{.State.Running}}' aidso_postgres 2>/dev/null || echo "false")
API_STATUS=$(docker inspect -f '{{.State.Running}}' aidso_api 2>/dev/null || echo "false")
WEB_STATUS=$(docker inspect -f '{{.State.Running}}' aidso_web 2>/dev/null || echo "false")

# 显示容器状态
echo ""
echo "📋 容器状态:"
docker ps -a --filter "name=aidso" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
echo ""

# 检查服务是否正常
if [ "$POSTGRES_STATUS" != "true" ]; then
    log_error "PostgreSQL 容器未运行"
    docker logs aidso_postgres --tail 20 2>/dev/null || echo "无法获取日志"
fi

if [ "$API_STATUS" != "true" ]; then
    log_error "API 容器未运行"
    docker logs aidso_api --tail 20 2>/dev/null || echo "无法获取日志"
fi

if [ "$WEB_STATUS" != "true" ]; then
    log_error "Web 容器未运行"
    docker logs aidso_web --tail 20 2>/dev/null || echo "无法获取日志"
fi

if [ "$POSTGRES_STATUS" = "true" ] && [ "$API_STATUS" = "true" ] && [ "$WEB_STATUS" = "true" ]; then
    log_success "所有服务运行正常"
else
    log_error "部分服务启动失败，请查看上方日志"
    echo ""
    echo "📋 查看详细日志:"
    echo "   PostgreSQL: $COMPOSE_CMD logs postgres"
    echo "   API:        $COMPOSE_CMD logs api"
    echo "   Web:        $COMPOSE_CMD logs web"
    echo "   全部日志:   $COMPOSE_CMD logs -f"
    exit 1
fi

# 等待 API 健康检查
log_info "等待 API 服务就绪..."
for i in {1..30}; do
    if curl -s http://localhost:3005/health > /dev/null 2>&1; then
        log_success "API 服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        log_warn "API 健康检查超时，但容器正在运行"
    else
        sleep 1
    fi
done

# ==========================================
# 9. 显示部署信息
# ==========================================
# 获取服务器 IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || \
            ip addr show | grep -oP 'inet \K[\d.]+' | grep -v '127.0.0.1' | head -1 || \
            echo "localhost")

echo ""
echo "========================================"
echo -e "${GREEN}✅ 部署成功！${NC}"
echo "========================================"
echo ""
echo "🌍 访问地址:"
echo "   前端 Web:  http://${SERVER_IP}:3002"
echo "   后端 API:  http://${SERVER_IP}:3005"
echo "   API 健康:  http://${SERVER_IP}:3005/health"
echo ""
echo "📝 默认账号:"
echo "   管理员:    admin / 111111"
echo ""
echo "📋 常用命令:"
echo "   查看日志:   $COMPOSE_CMD logs -f"
echo "   查看 Web:   $COMPOSE_CMD logs -f web"
echo "   查看 API:   $COMPOSE_CMD logs -f api"
echo "   查看数据库: $COMPOSE_CMD logs -f postgres"
echo "   重启服务:   $COMPOSE_CMD restart"
echo "   停止服务:   $COMPOSE_CMD down"
echo "   更新部署:   bash deploy.sh"
echo "   强制重建:   bash deploy.sh --force"
echo ""
echo "📊 容器管理:"
echo "   查看状态:   docker ps --filter name=aidso"
echo "   进入容器:   docker exec -it aidso_api sh"
echo "   查看资源:   docker stats --filter name=aidso"
echo ""
echo "========================================"
echo ""

