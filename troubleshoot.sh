#!/bin/bash
# ==========================================
# 🔍 AIDSO 故障排查脚本
# ==========================================
# 用于诊断部署后的问题，特别是 HTTP 500 错误
# ==========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

echo ""
echo "========================================"
echo "   🔍 AIDSO 故障排查工具"
echo "========================================"
echo ""

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# ==========================================
# 1. 检查容器状态
# ==========================================
log_step "1. 检查容器运行状态"
echo ""

POSTGRES_RUNNING=$(docker inspect -f '{{.State.Running}}' aidso_postgres 2>/dev/null || echo "false")
API_RUNNING=$(docker inspect -f '{{.State.Running}}' aidso_api 2>/dev/null || echo "false")
WEB_RUNNING=$(docker inspect -f '{{.State.Running}}' aidso_web 2>/dev/null || echo "false")

if [ "$POSTGRES_RUNNING" = "true" ]; then
    log_success "PostgreSQL 容器运行中"
else
    log_error "PostgreSQL 容器未运行"
fi

if [ "$API_RUNNING" = "true" ]; then
    log_success "API 容器运行中"
else
    log_error "API 容器未运行"
fi

if [ "$WEB_RUNNING" = "true" ]; then
    log_success "Web 容器运行中"
else
    log_error "Web 容器未运行"
fi

echo ""
docker ps -a --filter "name=aidso" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
echo ""

# ==========================================
# 2. 检查 API 日志（最近 50 行）
# ==========================================
log_step "2. 查看 API 服务日志（最近 50 行）"
echo ""
docker logs aidso_api --tail 50 2>&1 || log_error "无法获取 API 日志"
echo ""

# ==========================================
# 3. 检查数据库连接
# ==========================================
log_step "3. 检查数据库连接"
echo ""

if [ "$POSTGRES_RUNNING" = "true" ]; then
    log_info "测试数据库连接..."
    if docker exec aidso_postgres psql -U admin -d aidso_db -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "数据库连接正常"
        
        # 检查表是否存在
        log_info "检查数据库表..."
        TABLE_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
        
        if [ "$TABLE_COUNT" != "0" ] && [ -n "$TABLE_COUNT" ]; then
            log_success "数据库表已创建 ($TABLE_COUNT 个表)"
            
            # 检查 users 表
            if docker exec aidso_postgres psql -U admin -d aidso_db -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
                USER_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
                log_info "用户数量: $USER_COUNT"
                
                if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
                    log_warn "⚠️  数据库中没有用户，这可能是登录失败的原因！"
                    log_info "正在检查种子数据是否执行..."
                else
                    log_success "数据库中有 $USER_COUNT 个用户"
                fi
            else
                log_error "users 表不存在，数据库迁移可能未执行"
            fi
        else
            log_error "数据库表未创建，迁移可能失败"
        fi
    else
        log_error "无法连接到数据库"
    fi
else
    log_error "PostgreSQL 容器未运行，无法检查数据库"
fi

echo ""

# ==========================================
# 4. 检查 API 健康状态
# ==========================================
log_step "4. 检查 API 健康状态"
echo ""

log_info "测试 API 健康检查端点..."
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    log_success "API 健康检查通过"
    curl -s http://localhost:3005/health | head -20
else
    log_error "API 健康检查失败"
    log_info "尝试从容器内部测试..."
    if docker exec aidso_api wget -q -O- http://localhost:3005/health 2>/dev/null; then
        log_warn "API 在容器内部正常，但外部无法访问，可能是端口映射问题"
    else
        log_error "API 在容器内部也无法访问"
    fi
fi

echo ""

# ==========================================
# 5. 检查登录接口
# ==========================================
log_step "5. 测试登录接口"
echo ""

log_info "测试登录接口 /api/auth/login..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"111111"}' 2>&1 || echo "ERROR")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    log_success "登录接口返回 200"
    echo "响应: $BODY" | head -5
elif [ "$HTTP_CODE" = "401" ]; then
    log_warn "登录接口返回 401（认证失败），可能是密码错误或用户不存在"
    echo "响应: $BODY"
elif [ "$HTTP_CODE" = "500" ]; then
    log_error "登录接口返回 500（服务器错误）"
    echo "响应: $BODY"
    log_info "这通常是数据库连接或查询问题，请查看上方的 API 日志"
else
    log_error "登录接口返回异常状态码: $HTTP_CODE"
    echo "响应: $BODY"
fi

echo ""

# ==========================================
# 6. 检查 Prisma 状态
# ==========================================
log_step "6. 检查 Prisma 状态"
echo ""

log_info "检查 Prisma Client 是否生成..."
if docker exec aidso_api test -d /app/node_modules/.prisma 2>/dev/null; then
    log_success "Prisma Client 已生成"
else
    log_warn "Prisma Client 可能未生成"
fi

log_info "检查 Prisma 迁移状态..."
docker exec aidso_api npx prisma migrate status 2>&1 | head -20 || log_warn "无法检查迁移状态"

echo ""

# ==========================================
# 7. 常见问题修复建议
# ==========================================
log_step "7. 修复建议"
echo ""

ISSUES_FOUND=false

if [ "$API_RUNNING" != "true" ]; then
    ISSUES_FOUND=true
    log_warn "问题: API 容器未运行"
    echo "   修复: docker-compose up -d api"
    echo ""
fi

if [ "$POSTGRES_RUNNING" != "true" ]; then
    ISSUES_FOUND=true
    log_warn "问题: PostgreSQL 容器未运行"
    echo "   修复: docker-compose up -d postgres"
    echo ""
fi

if [ "$HTTP_CODE" = "500" ]; then
    ISSUES_FOUND=true
    log_warn "问题: 登录接口返回 500"
    echo "   可能原因:"
    echo "   1. 数据库迁移未执行"
    echo "   2. 数据库连接失败"
    echo "   3. Prisma Client 未生成"
    echo ""
    echo "   修复步骤:"
    echo "   1. 重启 API 容器: docker-compose restart api"
    echo "   2. 查看详细日志: docker-compose logs -f api"
    echo "   3. 手动执行迁移: docker exec aidso_api npx prisma migrate deploy"
    echo "   4. 手动执行种子: docker exec aidso_api npx ts-node prisma/seed_admin.ts"
    echo ""
fi

TABLE_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$TABLE_COUNT" = "0" ] || [ -z "$TABLE_COUNT" ]; then
    ISSUES_FOUND=true
    log_warn "问题: 数据库表未创建"
    echo "   修复: docker exec aidso_api npx prisma migrate deploy"
    echo ""
fi

USER_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    ISSUES_FOUND=true
    log_warn "问题: 数据库中没有用户"
    echo "   修复: docker exec aidso_api npx ts-node prisma/seed_admin.ts"
    echo ""
fi

if [ "$ISSUES_FOUND" = false ]; then
    log_success "未发现明显问题"
    echo ""
    log_info "如果仍然无法登录，请："
    echo "   1. 查看完整 API 日志: docker-compose logs -f api"
    echo "   2. 检查浏览器控制台错误信息"
    echo "   3. 确认前端代理配置正确"
fi

echo ""
echo "========================================"
echo "   排查完成"
echo "========================================"
echo ""

