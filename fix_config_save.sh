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

# 2. 修复文件权限
log_info "步骤 2/4: 修复文件权限..."
chmod 666 aidso-interface-replica/server/config.json 2>/dev/null || log_warn "无法修改 config.json 权限"
chmod 666 aidso-interface-replica/server/permissions.json 2>/dev/null || log_warn "无法修改 permissions.json 权限"
log_success "文件权限已修复"

# 3. 重新构建并启动服务
log_info "步骤 3/4: 重新构建 API 容器（应用最新代码）..."
$COMPOSE_CMD build api
log_success "API 容器构建完成"

log_info "步骤 4/4: 重启服务..."
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

