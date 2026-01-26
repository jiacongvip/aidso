#!/bin/bash
# ==========================================
# 🔍 诊断 API 代理问题
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
echo "   🔍 API 代理问题诊断"
echo "========================================"
echo ""

# 1. 检查 API 容器
echo "1. 检查 API 容器状态..."
API_RUNNING=$(docker inspect -f '{{.State.Running}}' aidso_api 2>/dev/null || echo "false")
if [ "$API_RUNNING" = "true" ]; then
    log_success "API 容器正在运行"
else
    log_error "API 容器未运行"
    echo "   修复: docker-compose up -d api"
    exit 1
fi

# 2. 测试 API 健康检查（从宿主机）
echo ""
echo "2. 测试 API 健康检查（宿主机 -> API）..."
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    log_success "API 健康检查通过（宿主机访问）"
    curl -s http://localhost:3005/health | head -3
else
    log_error "API 健康检查失败（宿主机访问）"
    echo "   查看 API 日志: docker-compose logs api"
fi

# 3. 测试 API 健康检查（从 Web 容器内部）
echo ""
echo "3. 测试 API 健康检查（Web 容器 -> API 容器）..."
if docker exec aidso_web wget -q -O- http://api:3005/health 2>/dev/null; then
    log_success "API 健康检查通过（容器内部访问）"
else
    log_error "API 健康检查失败（容器内部访问）"
    log_info "这可能是网络配置问题"
fi

# 4. 检查 Web 容器环境变量
echo ""
echo "4. 检查 Web 容器环境变量..."
PROXY_TARGET=$(docker exec aidso_web printenv AIDSO_API_PROXY_TARGET 2>/dev/null || echo "未设置")
if [ "$PROXY_TARGET" != "未设置" ]; then
    log_success "AIDSO_API_PROXY_TARGET = $PROXY_TARGET"
else
    log_warn "AIDSO_API_PROXY_TARGET 未设置"
    log_info "应该在 docker-compose.yml 中设置为: http://api:3005"
fi

# 5. 检查 Web 容器日志
echo ""
echo "5. 检查 Web 容器最近日志..."
docker logs aidso_web --tail 20 2>&1 | grep -i "proxy\|api\|error" || echo "   未发现相关日志"

# 6. 检查 API 容器日志
echo ""
echo "6. 检查 API 容器最近日志（错误信息）..."
docker logs aidso_api --tail 30 2>&1 | grep -i "error\|fail\|500" || echo "   未发现明显错误"

# 7. 测试登录接口（直接访问 API）
echo ""
echo "7. 测试登录接口（直接访问 API，绕过代理）..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"111111"}' 2>&1 || echo "ERROR")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    log_success "登录接口正常（直接访问 API），返回 200"
elif [ "$HTTP_CODE" = "500" ]; then
    log_error "登录接口返回 500（直接访问 API）"
    echo "   响应: $BODY" | head -5
    log_info "这是后端问题，不是代理问题"
else
    log_warn "登录接口返回状态码: $HTTP_CODE"
    echo "   响应: $BODY" | head -5
fi

# 8. 测试通过代理访问
echo ""
echo "8. 测试通过前端代理访问..."
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    log_success "前端代理正常，可以访问 /api/health"
    curl -s http://localhost:3002/api/health | head -3
else
    log_error "前端代理失败，无法访问 /api/health"
    log_info "这可能是 Vite 代理配置问题"
fi

echo ""
echo "========================================"
echo "   诊断完成"
echo "========================================"
echo ""
echo "📋 修复建议："
echo ""
if [ "$HTTP_CODE" = "500" ]; then
    echo "   1. 登录接口返回 500，这是后端问题"
    echo "   2. 运行修复脚本: bash fix_login_500.sh"
    echo "   3. 或查看 API 日志: docker-compose logs -f api"
fi

if [ "$PROXY_TARGET" = "未设置" ]; then
    echo "   1. 环境变量未设置，重启 Web 容器:"
    echo "      docker-compose restart web"
fi

echo "   2. 如果代理不工作，尝试重启所有服务:"
echo "      docker-compose restart"
echo ""
echo "   3. 查看完整日志:"
echo "      docker-compose logs -f web"
echo "      docker-compose logs -f api"
echo ""

