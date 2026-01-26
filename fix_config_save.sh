#!/bin/bash
# ==========================================
# 🔧 修复配置保存问题
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
echo "   🔧 修复配置保存问题"
echo "========================================"
echo ""

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# 1. 拉取最新代码
log_info "步骤 1/4: 拉取最新代码..."
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || log_warn "Git pull 失败，继续..."

# 2. 确保配置文件存在
log_info "步骤 2/5: 检查配置文件..."
if [ ! -f "aidso-interface-replica/server/config.json" ]; then
    log_warn "config.json 不存在，创建默认文件..."
    cat > aidso-interface-replica/server/config.json << 'EOF'
{
  "newApi": {
    "models": {},
    "baseUrl": "",
    "apiKey": "",
    "model": "deepseek-chat"
  },
  "billing": {
    "dailyUnitsByPlan": {
      "FREE": 2,
      "PRO": 100,
      "ENTERPRISE": 1000
    },
    "searchMultiplier": {
      "quick": 1,
      "deep": 2
    },
    "modelUnitPrice": {}
  },
  "system": {
    "maintenanceMode": false,
    "signupEnabled": true
  }
}
EOF
    log_success "已创建默认 config.json"
fi

if [ ! -f "aidso-interface-replica/server/permissions.json" ]; then
    log_warn "permissions.json 不存在，创建默认文件..."
    cat > aidso-interface-replica/server/permissions.json << 'EOF'
[
  { "plan": "FREE", "features": ["search"] },
  { "plan": "PRO", "features": ["search", "agent", "optimization"] },
  { "plan": "ENTERPRISE", "features": ["search", "agent", "optimization", "monitoring", "api"] }
]
EOF
    log_success "已创建默认 permissions.json"
fi

# 3. 修复文件权限
log_info "步骤 3/5: 修复文件权限..."
chmod 666 aidso-interface-replica/server/config.json 2>/dev/null || log_warn "无法修改 config.json 权限"
chmod 666 aidso-interface-replica/server/permissions.json 2>/dev/null || log_warn "无法修改 permissions.json 权限"
log_success "文件权限已修复"

# 4. 重新构建并启动服务
log_info "步骤 4/5: 重新构建 API 容器（应用最新代码）..."
$COMPOSE_CMD build api
log_success "API 容器构建完成"

log_info "步骤 5/5: 重启服务..."
$COMPOSE_CMD down
$COMPOSE_CMD up -d

log_info "等待服务启动..."
sleep 10

# 4. 验证
log_info "验证修复..."
if docker ps | grep -q aidso_api; then
    log_success "API 容器已启动"
    
    # 测试写入
    if docker exec aidso_api sh -c "echo 'test' > /app/config.json.test && rm /app/config.json.test 2>&1"; then
        log_success "容器内写入权限正常"
    else
        log_warn "容器内写入权限可能有问题"
    fi
    
    # 检查配置文件路径
    log_info "检查容器内配置文件路径..."
    docker exec aidso_api sh -c "ls -la /app/config.json /app/permissions.json 2>&1" || log_warn "无法检查容器内文件"
    
    # 检查容器内实际使用的路径（通过查看日志）
    log_info "检查服务器启动日志中的配置文件路径..."
    docker logs aidso_api 2>&1 | grep -i "CONFIG_FILE\|PERMISSIONS_FILE" | tail -5 || log_warn "未找到路径日志"
else
    log_error "API 容器未启动"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ 修复完成！${NC}"
echo "========================================"
echo ""
echo "📋 下一步："
echo "   1. 等待服务完全启动（约 10-20 秒）"
echo "   2. 刷新浏览器页面"
echo "   3. 再次尝试保存配置"
echo ""
echo "📝 如果还是失败，查看日志："
echo "   docker-compose logs -f api"
echo ""

