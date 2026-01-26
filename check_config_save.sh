#!/bin/bash
# ==========================================
# 🔍 检查配置保存问题
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
echo "   🔍 检查配置保存问题"
echo "========================================"
echo ""

# 1. 检查容器状态
echo "1. 检查 API 容器状态..."
if docker ps | grep -q aidso_api; then
    log_success "API 容器正在运行"
else
    log_error "API 容器未运行"
    exit 1
fi

# 2. 检查文件权限
echo ""
echo "2. 检查配置文件权限..."
echo "   宿主机文件:"
ls -la aidso-interface-replica/server/config.json 2>/dev/null || log_error "配置文件不存在"

echo ""
echo "   容器内文件:"
docker exec aidso_api ls -la /app/config.json 2>/dev/null || log_error "容器内配置文件不存在"

# 3. 检查容器内运行的用户
echo ""
echo "3. 检查容器内运行的用户:"
docker exec aidso_api id 2>/dev/null || log_error "无法获取用户信息"

# 4. 测试写入权限
echo ""
echo "4. 测试写入权限..."
if docker exec aidso_api sh -c "echo 'test' > /app/config.json.test && rm /app/config.json.test 2>&1"; then
    log_success "容器内可以写入文件"
else
    log_error "容器内无法写入文件"
fi

# 5. 检查 volume 挂载
echo ""
echo "5. 检查 volume 挂载..."
docker inspect aidso_api --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Type}}){{println}}{{end}}' | grep config || log_warn "未找到 config.json 的 volume 挂载"

# 6. 查看最近的 API 错误日志
echo ""
echo "6. 查看最近的 API 错误日志（配置相关）:"
docker-compose logs api 2>&1 | grep -i "config\|save\|error\|failed" | tail -20 || echo "   未找到相关日志"

# 7. 测试 API 端点
echo ""
echo "7. 测试配置读取端点..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3005/api/admin/config 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ]; then
    log_success "配置读取端点正常 (200)"
elif [ "$HTTP_CODE" = "401" ]; then
    log_warn "配置读取端点返回 401（需要登录）"
else
    log_error "配置读取端点返回: $HTTP_CODE"
    echo "$RESPONSE" | head -10
fi

echo ""
echo "========================================"
echo "   检查完成"
echo "========================================"
echo ""
echo "📋 如果发现问题："
echo "   1. 确保 volume 挂载正确: docker-compose down && docker-compose up -d"
echo "   2. 检查文件权限: chmod 666 aidso-interface-replica/server/config.json"
echo "   3. 查看详细日志: docker-compose logs -f api"
echo ""

