#!/bin/bash
# ==========================================
# 🔧 修复登录 HTTP 500 错误
# ==========================================
# 自动修复常见的登录 500 错误问题
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
echo "   🔧 修复登录 HTTP 500 错误"
echo "========================================"
echo ""

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# ==========================================
# 1. 确保容器运行
# ==========================================
log_step "步骤 1/5: 确保所有容器运行"
echo ""

log_info "启动所有服务..."
$COMPOSE_CMD up -d

log_info "等待服务启动..."
sleep 5

# 等待 API 容器完全启动（不再重启）
log_info "等待 API 容器完全启动..."
for i in {1..60}; do
    API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
    if [ "$API_STATUS" = "running" ]; then
        log_success "API 容器已启动"
        break
    fi
    if [ "$API_STATUS" = "restarting" ]; then
        if [ $i -eq 60 ]; then
            log_error "API 容器一直在重启，查看日志..."
            docker logs aidso_api --tail 50 2>&1
            log_error "请先解决 API 容器启动问题"
            exit 1
        fi
        log_info "API 容器正在重启，等待中... ($i/60)"
        sleep 2
    else
        sleep 1
    fi
done

# ==========================================
# 2. 检查数据库连接
# ==========================================
log_step "步骤 2/5: 检查数据库连接"
echo ""

log_info "等待数据库就绪..."
for i in {1..30}; do
    if docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1; then
        log_success "数据库已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "数据库启动超时"
        exit 1
    fi
    sleep 1
done

# ==========================================
# 3. 检查 API 容器状态和日志
# ==========================================
log_step "步骤 3/6: 检查 API 容器状态"
echo ""

API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
if [ "$API_STATUS" != "running" ]; then
    log_error "API 容器状态异常: $API_STATUS"
    log_info "查看 API 容器日志..."
    docker logs aidso_api --tail 50 2>&1
    echo ""
    log_error "请先解决 API 容器启动问题，然后重新运行此脚本"
    exit 1
fi

log_info "查看 API 容器最近日志（检查错误）..."
docker logs aidso_api --tail 30 2>&1 | grep -i "error\|fail\|migrate\|seed" || log_info "未发现明显错误"
echo ""

# ==========================================
# 4. 执行数据库迁移
# ==========================================
log_step "步骤 4/6: 执行数据库迁移"
echo ""

log_info "执行 Prisma 迁移..."
# 等待容器完全就绪
sleep 2
if docker exec aidso_api npx prisma migrate deploy 2>&1; then
    log_success "数据库迁移完成"
else
    ERROR_OUTPUT=$(docker exec aidso_api npx prisma migrate deploy 2>&1 || true)
    if echo "$ERROR_OUTPUT" | grep -qi "already applied\|no pending migrations"; then
        log_success "数据库迁移已完成（无待执行迁移）"
    else
        log_warn "迁移执行可能失败，查看输出："
        echo "$ERROR_OUTPUT"
    fi
fi

echo ""

# ==========================================
# 5. 生成 Prisma Client
# ==========================================
log_step "步骤 5/6: 生成 Prisma Client"
echo ""

log_info "生成 Prisma Client..."
sleep 1
if docker exec aidso_api npx prisma generate 2>&1; then
    log_success "Prisma Client 生成完成"
else
    ERROR_OUTPUT=$(docker exec aidso_api npx prisma generate 2>&1 || true)
    if echo "$ERROR_OUTPUT" | grep -qi "already generated"; then
        log_success "Prisma Client 已生成"
    else
        log_warn "Prisma Client 生成可能失败，查看输出："
        echo "$ERROR_OUTPUT" | head -10
    fi
fi

echo ""

# ==========================================
# 6. 初始化管理员账号
# ==========================================
log_step "步骤 6/6: 初始化管理员账号"
echo ""

log_info "检查是否已有用户..."
USER_COUNT=$(docker exec aidso_postgres psql -U admin -d aidso_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    log_info "数据库中没有用户，执行种子数据..."
    sleep 1
    if docker exec aidso_api npx ts-node prisma/seed_admin.ts 2>&1; then
        log_success "管理员账号初始化完成"
        log_info "默认账号: admin / 111111"
    else
        ERROR_OUTPUT=$(docker exec aidso_api npx ts-node prisma/seed_admin.ts 2>&1 || true)
        if echo "$ERROR_OUTPUT" | grep -qi "already exists\|duplicate"; then
            log_success "管理员账号已存在"
        else
            log_warn "种子数据执行可能失败，查看输出："
            echo "$ERROR_OUTPUT" | head -20
        fi
    fi
else
    log_success "数据库已有 $USER_COUNT 个用户"
fi

echo ""

# ==========================================
# 7. 重启 API 服务（如果需要）
# ==========================================
log_step "重启 API 服务"
echo ""

log_info "重启 API 容器以确保所有更改生效..."
$COMPOSE_CMD restart api

log_info "等待 API 容器完全启动..."
for i in {1..60}; do
    API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
    if [ "$API_STATUS" = "running" ]; then
        # 再等待几秒确保服务完全就绪
        sleep 3
        log_success "API 容器已启动"
        break
    fi
    if [ "$API_STATUS" = "restarting" ]; then
        if [ $i -eq 60 ]; then
            log_error "API 容器重启后仍在重启，查看日志..."
            docker logs aidso_api --tail 50 2>&1
            log_error "请检查 API 容器启动命令和配置"
            exit 1
        fi
        log_info "等待 API 容器启动... ($i/60)"
        sleep 2
    else
        sleep 1
    fi
done

# ==========================================
# 7. 验证修复
# ==========================================
log_step "验证修复结果"
echo ""

log_info "测试 API 健康检查..."
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    log_success "API 健康检查通过"
else
    log_warn "API 健康检查失败，但继续测试登录..."
fi

log_info "测试登录接口..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"111111"}' 2>&1 || echo "ERROR")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo ""
if [ "$HTTP_CODE" = "200" ]; then
    log_success "✅ 登录接口修复成功！返回 200"
    echo "响应: $BODY" | head -3
elif [ "$HTTP_CODE" = "401" ]; then
    log_warn "登录接口返回 401（认证失败）"
    echo "   这可能是因为："
    echo "   1. 密码错误（默认应该是 111111）"
    echo "   2. 用户不存在"
    echo ""
    echo "   请尝试："
    echo "   docker exec aidso_api npx ts-node prisma/seed_admin.ts"
elif [ "$HTTP_CODE" = "500" ]; then
    log_error "登录接口仍然返回 500"
    echo ""
    echo "请查看详细日志："
    echo "   docker-compose logs -f api"
    echo ""
    echo "或运行排查脚本："
    echo "   bash troubleshoot.sh"
else
    log_warn "登录接口返回状态码: $HTTP_CODE"
    echo "响应: $BODY"
fi

echo ""
echo "========================================"
echo "   修复完成"
echo "========================================"
echo ""
echo "📋 如果问题仍然存在，请："
echo "   1. 运行排查脚本: bash troubleshoot.sh"
echo "   2. 查看 API 日志: docker-compose logs -f api"
echo "   3. 检查数据库: docker exec aidso_postgres psql -U admin -d aidso_db"
echo ""

