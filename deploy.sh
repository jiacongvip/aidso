#!/bin/bash
# ==========================================
# 🚀 AIDSO 一键部署脚本
# ==========================================
# 使用方法：
#   首次部署: bash deploy.sh
#   更新代码: bash deploy.sh
#   强制重建: bash deploy.sh --force
#   指定分支: bash deploy.sh --branch main
#   导出数据: bash deploy.sh --export-data
#   导入数据: bash deploy.sh --import-data data_export_*.tar.gz
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
EXPORT_DATA=false
IMPORT_DATA=""

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
        --export-data)
            EXPORT_DATA=true
            shift
            ;;
        --import-data)
            IMPORT_DATA="$2"
            shift 2
            ;;
        *)
            log_warn "未知参数: $1"
            shift
            ;;
    esac
done

# ==========================================
# 2. 处理数据导出/导入
# ==========================================
if [ "$EXPORT_DATA" = true ]; then
    log_step "导出数据"
    
    EXPORT_DIR="data_export_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$EXPORT_DIR"
    log_success "创建导出目录: $EXPORT_DIR"
    
    # 导出数据库
    if docker ps | grep -q aidso_postgres; then
        log_info "导出数据库..."
        if docker exec aidso_postgres pg_dump -U admin -d aidso_db > "$EXPORT_DIR/database.sql" 2>/dev/null; then
            log_success "数据库导出完成"
        else
            log_warn "数据库导出失败"
        fi
    else
        log_warn "数据库容器未运行，跳过数据库导出"
    fi
    
    # 导出配置文件
    if [ -f "aidso-interface-replica/server/config.json" ]; then
        cp "aidso-interface-replica/server/config.json" "$EXPORT_DIR/config.json"
        log_success "配置文件已导出"
    fi
    
    if [ -f "aidso-interface-replica/server/permissions.json" ]; then
        cp "aidso-interface-replica/server/permissions.json" "$EXPORT_DIR/permissions.json"
        log_success "权限文件已导出"
    fi
    
    # 打包
    TAR_FILE="${EXPORT_DIR}.tar.gz"
    if tar -czf "$TAR_FILE" "$EXPORT_DIR" 2>/dev/null; then
        log_success "打包完成: $TAR_FILE"
        log_info "文件大小: $(du -h "$TAR_FILE" | cut -f1)"
        rm -rf "$EXPORT_DIR"
    fi
    
    echo ""
    echo "========================================"
    echo -e "${GREEN}✅ 数据导出完成！${NC}"
    echo "========================================"
    echo ""
    echo "📦 导出文件: $TAR_FILE"
    echo "📋 下一步：上传到服务器并运行: bash deploy.sh --import-data $TAR_FILE"
    echo ""
    exit 0
fi

if [ -n "$IMPORT_DATA" ]; then
    log_step "导入数据"
    
    # 解压（如果是压缩包）
    EXPORT_DIR=""
    if [ -f "$IMPORT_DATA" ] && [[ "$IMPORT_DATA" == *.tar.gz ]]; then
        log_info "解压 $IMPORT_DATA..."
        EXPORT_DIR="${IMPORT_DATA%.tar.gz}"
        tar -xzf "$IMPORT_DATA" 2>/dev/null || {
            log_error "解压失败"
            exit 1
        }
    elif [ -d "$IMPORT_DATA" ]; then
        EXPORT_DIR="$IMPORT_DATA"
    else
        log_error "未找到导出文件或目录: $IMPORT_DATA"
        exit 1
    fi
    
    # 备份现有数据
    BACKUP_DIR="data_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    log_info "备份现有数据到: $BACKUP_DIR"
    
    if docker ps | grep -q aidso_postgres; then
        docker exec aidso_postgres pg_dump -U admin -d aidso_db > "$BACKUP_DIR/database.sql" 2>/dev/null || true
    fi
    
    [ -f "aidso-interface-replica/server/config.json" ] && cp "aidso-interface-replica/server/config.json" "$BACKUP_DIR/config.json" || true
    [ -f "aidso-interface-replica/server/permissions.json" ] && cp "aidso-interface-replica/server/permissions.json" "$BACKUP_DIR/permissions.json" || true
    
    # 导入数据库
    if [ -f "$EXPORT_DIR/database.sql" ]; then
        log_warn "⚠️  导入数据库将覆盖现有数据！"
        read -p "确认继续？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if docker ps | grep -q aidso_postgres; then
                log_info "等待数据库就绪..."
                for i in {1..30}; do
                    docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1 && break
                    sleep 1
                done
                
                log_info "导入数据库..."
                if docker exec -i aidso_postgres psql -U admin -d aidso_db < "$EXPORT_DIR/database.sql" 2>&1; then
                    log_success "数据库导入完成"
                else
                    log_error "数据库导入失败"
                fi
            fi
        else
            log_info "已取消数据库导入"
        fi
    fi
    
    # 导入配置文件
    [ -f "$EXPORT_DIR/config.json" ] && [ -f "aidso-interface-replica/server/config.json" ] && \
        cp "$EXPORT_DIR/config.json" "aidso-interface-replica/server/config.json" && \
        log_success "配置文件已导入"
    
    [ -f "$EXPORT_DIR/permissions.json" ] && [ -f "aidso-interface-replica/server/permissions.json" ] && \
        cp "$EXPORT_DIR/permissions.json" "aidso-interface-replica/server/permissions.json" && \
        log_success "权限文件已导入"
    
    log_info "备份文件位置: $BACKUP_DIR"
    log_success "数据导入完成，继续部署流程..."
    echo ""
fi

# ==========================================
# 3. 检查 Git 环境并拉取代码
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
# 4. 检查 Docker 环境
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
# 5. 检查必要文件
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
# 6. 停止旧容器并清理
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
# 7. 构建 Docker 镜像
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
# 8. 启动服务
# ==========================================
log_step "步骤 6/7: 启动服务"

log_info "启动所有服务..."
$COMPOSE_CMD up -d

log_success "服务启动命令已执行"

# ==========================================
# 8. 等待服务启动并检查状态
# ==========================================
log_step "步骤 7/10: 检查服务状态"

log_info "等待服务启动..."
sleep 5

# 检查容器状态
log_info "检查容器运行状态..."

POSTGRES_STATUS=$(docker inspect -f '{{.State.Running}}' aidso_postgres 2>/dev/null || echo "false")
API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
WEB_STATUS=$(docker inspect -f '{{.State.Running}}' aidso_web 2>/dev/null || echo "false")

# 检查 API 容器是否在重启循环
if [ "$API_STATUS" = "restarting" ]; then
    log_error "API 容器正在重启循环中，这通常意味着启动命令失败"
    log_info "查看 API 容器日志..."
    docker logs aidso_api --tail 50 2>&1 | head -30
    echo ""
    log_info "尝试修复：停止容器并手动执行初始化..."
    
    # 停止 API 容器
    $COMPOSE_CMD stop api 2>/dev/null || true
    sleep 2
    
    # 等待数据库就绪
    log_info "等待数据库就绪..."
    for i in {1..60}; do
        if docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1; then
            log_success "数据库已就绪"
            break
        fi
        sleep 1
    done
    
    # 手动执行迁移和种子数据（使用 run 而不是 exec，因为容器已停止）
    log_info "手动执行数据库迁移..."
    if $COMPOSE_CMD run --rm api npx prisma migrate deploy 2>&1; then
        log_success "数据库迁移完成"
    else
        log_warn "迁移执行可能失败，继续..."
    fi
    
    log_info "手动执行种子数据..."
    if $COMPOSE_CMD run --rm api npx ts-node prisma/seed_admin.ts 2>&1; then
        log_success "种子数据执行完成"
    else
        log_warn "种子数据执行可能失败，继续..."
    fi
    
    # 重新启动 API 容器（使用简化的启动命令）
    log_info "重新启动 API 容器..."
    $COMPOSE_CMD up -d api
    sleep 5
    
    # 重新检查状态
    API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
fi

# 等待数据库就绪
if [ "$POSTGRES_STATUS" = "true" ]; then
    log_info "等待数据库就绪..."
    for i in {1..60}; do
        if docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1; then
            log_success "数据库已就绪"
            break
        fi
        if [ $i -eq 60 ]; then
            log_warn "数据库启动超时，但继续检查..."
        else
            sleep 1
        fi
    done
fi

# 等待 API 容器完全启动（不再重启）
if [ "$API_STATUS" != "running" ]; then
    log_info "等待 API 容器完全启动..."
    for i in {1..60}; do
        API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
        if [ "$API_STATUS" = "running" ]; then
            log_success "API 容器已启动"
            break
        fi
        if [ "$API_STATUS" = "restarting" ]; then
            if [ $i -eq 60 ]; then
                log_error "API 容器一直在重启，查看详细日志..."
                docker logs aidso_api --tail 50 2>&1
                log_error "请检查 docker-compose.yml 中的启动命令"
                exit 1
            fi
            log_info "API 容器正在重启，等待中... ($i/60)"
            sleep 2
        else
            sleep 1
        fi
    done
fi

# 更新状态变量
API_STATUS=$(docker inspect -f '{{.State.Running}}' aidso_api 2>/dev/null || echo "false")

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
log_info "等待 API 服务就绪（这可能需要更长时间，因为需要执行数据库迁移）..."
for i in {1..60}; do
    if curl -s http://localhost:3005/health > /dev/null 2>&1; then
        log_success "API 服务已就绪"
        break
    fi
    if [ $i -eq 60 ]; then
        log_warn "API 健康检查超时，但容器正在运行"
        log_info "查看 API 日志以了解详情..."
        docker logs aidso_api --tail 30 2>/dev/null || true
    else
        sleep 2
    fi
done

# ==========================================
# 9. 检查并修复数据库初始化
# ==========================================
log_step "步骤 8/10: 检查并修复数据库初始化"

if [ "$POSTGRES_STATUS" = "true" ] && [ "$API_STATUS" = "true" ]; then
    log_info "检查数据库初始化状态..."
    sleep 3
    
    # 检查数据库连接
    DB_READY=false
    for i in {1..30}; do
        if docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1; then
            DB_READY=true
            log_success "数据库连接正常"
            break
        fi
        sleep 1
    done
    
    if [ "$DB_READY" = false ]; then
        log_error "数据库未就绪，跳过数据库检查"
    else
        # 检查数据库表是否存在
        TABLE_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
        
        if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" != "0" ]; then
            log_success "数据库表已创建 ($TABLE_COUNT 个表)"
        else
            log_warn "数据库表未创建，正在执行迁移..."
            log_info "执行 Prisma 迁移..."
            
            # 等待 API 容器完全就绪
            sleep 3
            
            # 尝试执行迁移
            MIGRATE_OUTPUT=$(docker exec aidso_api npx prisma migrate deploy 2>&1 || echo "ERROR")
            if echo "$MIGRATE_OUTPUT" | grep -qi "error\|fail" && ! echo "$MIGRATE_OUTPUT" | grep -qi "already applied\|no pending"; then
                log_warn "迁移执行可能失败，尝试使用 run 方式..."
                $COMPOSE_CMD run --rm api npx prisma migrate deploy 2>&1 || log_warn "迁移执行失败"
            else
                log_success "数据库迁移完成"
            fi
            
            sleep 2
            # 重新检查表数量
            TABLE_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
            if [ "$TABLE_COUNT" != "0" ]; then
                log_success "数据库表已创建 ($TABLE_COUNT 个表)"
            else
                log_warn "数据库表仍未创建，查看日志..."
                docker logs aidso_api --tail 30 2>/dev/null | grep -i "migrate\|error" || true
            fi
        fi
        
        # 检查是否有用户
        if [ "$TABLE_COUNT" != "0" ]; then
            USER_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
            if [ -n "$USER_COUNT" ] && [ "$USER_COUNT" != "0" ]; then
                log_success "数据库初始化完成，已有 $USER_COUNT 个用户"
            else
                log_warn "数据库中没有用户，正在初始化管理员账号..."
                sleep 2
                
                SEED_OUTPUT=$(docker exec aidso_api npx ts-node prisma/seed_admin.ts 2>&1 || echo "ERROR")
                if echo "$SEED_OUTPUT" | grep -qi "error\|fail" && ! echo "$SEED_OUTPUT" | grep -qi "already exists\|duplicate"; then
                    log_warn "种子数据执行可能失败，尝试使用 run 方式..."
                    $COMPOSE_CMD run --rm api npx ts-node prisma/seed_admin.ts 2>&1 || log_warn "种子数据执行失败"
                else
                    log_success "管理员账号初始化完成"
                    log_info "默认账号: admin / 111111"
                fi
            fi
        fi
        
        # 确保 Prisma Client 已生成
        log_info "检查 Prisma Client..."
        if docker exec aidso_api test -d /app/node_modules/.prisma 2>/dev/null; then
            log_success "Prisma Client 已生成"
        else
            log_warn "Prisma Client 未生成，正在生成..."
            if docker exec aidso_api npx prisma generate 2>&1; then
                log_success "Prisma Client 生成完成"
            fi
        fi
    fi
fi

# ==========================================
# 10. 检查 API 健康状态并修复
# ==========================================
log_step "步骤 9/10: 检查 API 健康状态"

# 如果 API 健康检查失败，尝试重启并重新检查
API_HEALTH_OK=false
log_info "等待 API 服务就绪（这可能需要更长时间，因为需要执行数据库迁移）..."
for i in {1..60}; do
    if curl -s http://localhost:3005/health > /dev/null 2>&1; then
        API_HEALTH_OK=true
        log_success "API 服务已就绪"
        break
    fi
    if [ $i -eq 60 ]; then
        log_warn "API 健康检查超时"
    else
        sleep 2
    fi
done

if [ "$API_HEALTH_OK" = false ] && [ "$API_STATUS" = "true" ]; then
    log_warn "API 健康检查失败，尝试重启 API 服务..."
    $COMPOSE_CMD restart api
    
    # 等待容器重新启动
    sleep 5
    for i in {1..30}; do
        API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
        if [ "$API_STATUS" = "running" ]; then
            break
        fi
        sleep 2
    done
    
    # 再次检查健康状态
    for i in {1..30}; do
        if curl -s http://localhost:3005/health > /dev/null 2>&1; then
            log_success "API 服务已就绪"
            API_HEALTH_OK=true
            break
        fi
        sleep 2
    done
fi

if [ "$API_HEALTH_OK" = true ]; then
    log_success "API 服务已就绪"
else
    log_warn "API 健康检查超时，但容器正在运行"
    log_info "查看 API 日志以了解详情..."
    docker logs aidso_api --tail 50 2>&1 | head -30
    echo ""
    log_info "如果 API 容器一直在重启，可能需要检查启动命令"
fi

# ==========================================
# 11. 验证登录接口并自动修复
# ==========================================
if [ "$API_HEALTH_OK" = true ]; then
    log_step "步骤 10/10: 验证登录接口"
    log_info "测试登录接口..."
    
    sleep 2
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3005/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"admin","password":"111111"}' 2>&1 || echo "ERROR")
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "登录接口正常，返回 200"
    elif [ "$HTTP_CODE" = "401" ]; then
        log_warn "登录接口返回 401（可能是密码错误或用户不存在）"
        log_info "如果这是首次部署，请确认管理员账号已初始化"
    elif [ "$HTTP_CODE" = "500" ]; then
        log_error "登录接口返回 500（服务器错误）"
        log_info "尝试自动修复..."
        
        # 检查数据库表
        TABLE_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
        if [ "$TABLE_COUNT" = "0" ]; then
            log_info "数据库表不存在，执行迁移..."
            $COMPOSE_CMD run --rm api npx prisma migrate deploy 2>&1 || true
            sleep 2
        fi
        
        # 检查用户
        USER_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
        if [ "$USER_COUNT" = "0" ]; then
            log_info "数据库中没有用户，执行种子数据..."
            $COMPOSE_CMD run --rm api npx ts-node prisma/seed_admin.ts 2>&1 || true
            sleep 2
        fi
        
        # 重启 API 并重新测试
        log_info "重启 API 服务..."
        $COMPOSE_CMD restart api
        sleep 5
        
        # 重新测试
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3005/api/auth/login \
          -H 'Content-Type: application/json' \
          -d '{"email":"admin","password":"111111"}' 2>&1 || echo "ERROR")
        
        HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "修复成功！登录接口现在返回 200"
        else
            log_warn "修复后仍返回状态码: $HTTP_CODE"
            log_info "请查看 API 日志: $COMPOSE_CMD logs -f api"
        fi
    else
        log_warn "登录接口返回状态码: $HTTP_CODE"
    fi
    echo ""
fi

# ==========================================
# 12. 显示部署信息
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

