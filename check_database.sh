#!/bin/bash
# ==========================================
# 🔍 快速检查数据库安装状态
# ==========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

echo ""
echo "========================================"
echo "   🔍 数据库安装状态检查"
echo "========================================"
echo ""

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# 1. 检查数据库容器
echo "1. 检查数据库容器..."
POSTGRES_RUNNING=$(docker inspect -f '{{.State.Running}}' aidso_postgres 2>/dev/null || echo "false")

if [ "$POSTGRES_RUNNING" = "true" ]; then
    log_success "PostgreSQL 容器正在运行"
else
    log_error "PostgreSQL 容器未运行"
    echo ""
    echo "   解决方案："
    echo "   docker-compose up -d postgres"
    echo ""
    exit 1
fi

# 2. 检查数据库连接
echo ""
echo "2. 检查数据库连接..."
if docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1; then
    log_success "数据库连接正常"
else
    log_error "无法连接到数据库"
    echo ""
    echo "   查看数据库日志："
    echo "   docker-compose logs postgres"
    echo ""
    exit 1
fi

# 3. 检查数据库表
echo ""
echo "3. 检查数据库表..."
TABLE_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLE_COUNT" != "0" ] && [ -n "$TABLE_COUNT" ]; then
    log_success "数据库表已创建 ($TABLE_COUNT 个表)"
    
    # 列出所有表
    echo ""
    echo "   数据库表列表："
    docker exec aidso_postgres psql -U admin -d aidso_db -c "\dt" 2>/dev/null | grep -v "Row\|---\|public" | grep -v "^$" || true
else
    log_error "数据库表未创建"
    echo ""
    echo "   解决方案："
    echo "   docker exec aidso_api npx prisma migrate deploy"
    echo ""
    exit 1
fi

# 4. 检查用户表
echo ""
echo "4. 检查用户数据..."
if docker exec aidso_postgres psql -U admin -d aidso_db -c "\d users" > /dev/null 2>&1; then
    log_success "users 表存在"
    
    USER_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$USER_COUNT" != "0" ] && [ -n "$USER_COUNT" ]; then
        log_success "数据库中有 $USER_COUNT 个用户"
        
        # 显示用户列表
        echo ""
        echo "   用户列表："
        docker exec aidso_postgres psql -U admin -d aidso_db -c "SELECT email, role FROM users LIMIT 5;" 2>/dev/null || true
    else
        log_warn "数据库中没有用户"
        echo ""
        echo "   解决方案："
        echo "   docker exec aidso_api npx ts-node prisma/seed_admin.ts"
        echo ""
    fi
else
    log_error "users 表不存在"
    echo ""
    echo "   解决方案："
    echo "   docker exec aidso_api npx prisma migrate deploy"
    echo ""
    exit 1
fi

# 5. 检查 API 容器
echo ""
echo "5. 检查 API 容器..."
API_RUNNING=$(docker inspect -f '{{.State.Running}}' aidso_api 2>/dev/null || echo "false")

if [ "$API_RUNNING" = "true" ]; then
    log_success "API 容器正在运行"
    
    # 检查 API 日志中的错误
    echo ""
    echo "   最近 API 日志（错误信息）："
    docker logs aidso_api --tail 20 2>&1 | grep -i "error\|fail\|migrate" || echo "   未发现明显错误"
else
    log_error "API 容器未运行"
    echo ""
    echo "   解决方案："
    echo "   docker-compose up -d api"
    echo ""
fi

echo ""
echo "========================================"
echo "   检查完成"
echo "========================================"
echo ""

# 总结
if [ "$POSTGRES_RUNNING" = "true" ] && [ "$TABLE_COUNT" != "0" ]; then
    log_success "数据库已正确安装和初始化"
    echo ""
    echo "如果登录仍然失败，请运行："
    echo "   bash troubleshoot.sh"
else
    log_error "数据库未正确安装或初始化"
    echo ""
    echo "请运行修复脚本："
    echo "   bash fix_login_500.sh"
fi

echo ""

