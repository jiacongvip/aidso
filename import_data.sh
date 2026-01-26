#!/bin/bash
# ==========================================
# 📥 导入数据到服务器
# ==========================================
# 使用方法：
#   bash import_data.sh data_export_20240101_120000
#   或
#   bash import_data.sh data_export_20240101_120000.tar.gz
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
echo "   📥 导入数据到服务器"
echo "========================================"
echo ""

if [ -z "$1" ]; then
    log_error "请指定导出目录或压缩包"
    echo ""
    echo "使用方法:"
    echo "   bash import_data.sh data_export_20240101_120000"
    echo "   或"
    echo "   bash import_data.sh data_export_20240101_120000.tar.gz"
    exit 1
fi

EXPORT_SOURCE="$1"
EXPORT_DIR=""

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# ==========================================
# 1. 解压（如果是压缩包）
# ==========================================
if [ -f "$EXPORT_SOURCE" ] && [[ "$EXPORT_SOURCE" == *.tar.gz ]]; then
    log_step "步骤 1/5: 解压文件"
    log_info "解压 $EXPORT_SOURCE..."
    
    EXPORT_DIR="${EXPORT_SOURCE%.tar.gz}"
    if tar -xzf "$EXPORT_SOURCE" 2>/dev/null; then
        log_success "解压完成: $EXPORT_DIR"
    else
        log_error "解压失败"
        exit 1
    fi
elif [ -d "$EXPORT_SOURCE" ]; then
    EXPORT_DIR="$EXPORT_SOURCE"
    log_info "使用目录: $EXPORT_DIR"
else
    log_error "未找到导出文件或目录: $EXPORT_SOURCE"
    exit 1
fi

# ==========================================
# 2. 检查必要文件
# ==========================================
log_step "步骤 2/5: 检查文件"

if [ ! -d "$EXPORT_DIR" ]; then
    log_error "导出目录不存在: $EXPORT_DIR"
    exit 1
fi

FILES_FOUND=0

if [ -f "$EXPORT_DIR/database.sql" ]; then
    log_success "找到数据库文件: database.sql"
    FILES_FOUND=$((FILES_FOUND + 1))
else
    log_warn "未找到 database.sql"
fi

if [ -f "$EXPORT_DIR/config.json" ]; then
    log_success "找到配置文件: config.json"
    FILES_FOUND=$((FILES_FOUND + 1))
else
    log_warn "未找到 config.json"
fi

if [ -f "$EXPORT_DIR/permissions.json" ]; then
    log_success "找到权限文件: permissions.json"
    FILES_FOUND=$((FILES_FOUND + 1))
else
    log_warn "未找到 permissions.json"
fi

if [ $FILES_FOUND -eq 0 ]; then
    log_error "未找到任何可导入的文件"
    exit 1
fi

# ==========================================
# 3. 备份现有数据
# ==========================================
log_step "步骤 3/5: 备份现有数据"

BACKUP_DIR="data_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
log_success "创建备份目录: $BACKUP_DIR"

# 备份数据库
if docker ps | grep -q aidso_postgres; then
    log_info "备份现有数据库..."
    if docker exec aidso_postgres pg_dump -U admin -d aidso_db > "$BACKUP_DIR/database.sql" 2>/dev/null; then
        log_success "数据库备份完成"
    else
        log_warn "数据库备份失败（可能数据库为空）"
    fi
fi

# 备份配置文件
if [ -f "aidso-interface-replica/server/config.json" ]; then
    cp "aidso-interface-replica/server/config.json" "$BACKUP_DIR/config.json"
    log_success "配置文件已备份"
fi

if [ -f "aidso-interface-replica/server/permissions.json" ]; then
    cp "aidso-interface-replica/server/permissions.json" "$BACKUP_DIR/permissions.json"
    log_success "权限文件已备份"
fi

# ==========================================
# 4. 导入数据库
# ==========================================
log_step "步骤 4/5: 导入数据库"

if [ -f "$EXPORT_DIR/database.sql" ]; then
    log_info "检查数据库容器..."
    
    if ! docker ps | grep -q aidso_postgres; then
        log_error "数据库容器未运行，请先启动服务: docker-compose up -d"
        exit 1
    fi
    
    log_info "等待数据库就绪..."
    for i in {1..30}; do
        if docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    log_info "导入数据库（这可能需要一些时间）..."
    log_warn "⚠️  这将覆盖现有数据库数据！"
    read -p "确认继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "已取消导入"
        exit 0
    fi
    
    if docker exec -i aidso_postgres psql -U admin -d aidso_db < "$EXPORT_DIR/database.sql" 2>&1; then
        log_success "数据库导入完成"
    else
        log_error "数据库导入失败"
        log_info "备份文件在: $BACKUP_DIR"
        exit 1
    fi
else
    log_info "跳过数据库导入（未找到 database.sql）"
fi

# ==========================================
# 5. 导入配置文件
# ==========================================
log_step "步骤 5/5: 导入配置文件"

# 导入 config.json
if [ -f "$EXPORT_DIR/config.json" ]; then
    if [ -f "aidso-interface-replica/server/config.json" ]; then
        cp "$EXPORT_DIR/config.json" "aidso-interface-replica/server/config.json"
        log_success "配置文件已导入: config.json"
    else
        log_warn "目标配置文件不存在，跳过"
    fi
fi

# 导入 permissions.json
if [ -f "$EXPORT_DIR/permissions.json" ]; then
    if [ -f "aidso-interface-replica/server/permissions.json" ]; then
        cp "$EXPORT_DIR/permissions.json" "aidso-interface-replica/server/permissions.json"
        log_success "权限文件已导入: permissions.json"
    else
        log_warn "目标权限文件不存在，跳过"
    fi
fi

# ==========================================
# 6. 重启服务
# ==========================================
log_step "重启服务使配置生效"

log_info "重启 API 服务..."
$COMPOSE_CMD restart api 2>/dev/null || log_warn "重启失败，请手动重启: docker-compose restart api"

log_info "等待服务启动..."
sleep 5

echo ""
echo "========================================"
echo -e "${GREEN}✅ 导入完成！${NC}"
echo "========================================"
echo ""
echo "📋 备份文件位置: $BACKUP_DIR"
echo ""
echo "📝 下一步："
echo "   1. 检查服务状态: docker-compose ps"
echo "   2. 查看 API 日志: docker-compose logs -f api"
echo "   3. 测试登录: curl -X POST http://localhost:3005/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin\",\"password\":\"111111\"}'"
echo ""

