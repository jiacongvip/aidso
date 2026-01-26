#!/bin/bash
# ==========================================
# 📤 导出本地数据到服务器
# ==========================================
# 使用方法：
#   bash export_data.sh
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
echo "   📤 导出本地数据"
echo "========================================"
echo ""

# 创建导出目录
EXPORT_DIR="data_export_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"
log_success "创建导出目录: $EXPORT_DIR"

# ==========================================
# 1. 导出数据库数据
# ==========================================
log_step "步骤 1/4: 导出数据库数据"

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# 检查是否使用 Docker
if docker ps | grep -q aidso_postgres; then
    log_info "检测到 Docker 环境，从容器导出数据库..."
    
    DB_FILE="$EXPORT_DIR/database.sql"
    if docker exec aidso_postgres pg_dump -U admin -d aidso_db > "$DB_FILE" 2>/dev/null; then
        log_success "数据库导出完成: $DB_FILE"
    else
        log_error "数据库导出失败"
        exit 1
    fi
else
    log_warn "未检测到 Docker 容器，跳过数据库导出"
    log_info "如果使用本地 PostgreSQL，请手动导出："
    log_info "   pg_dump -U admin -d aidso_db > $EXPORT_DIR/database.sql"
fi

# ==========================================
# 2. 导出配置文件
# ==========================================
log_step "步骤 2/4: 导出配置文件"

# 导出 config.json
if [ -f "aidso-interface-replica/server/config.json" ]; then
    cp "aidso-interface-replica/server/config.json" "$EXPORT_DIR/config.json"
    log_success "配置文件已导出: config.json"
else
    log_warn "未找到 config.json"
fi

# 导出 permissions.json
if [ -f "aidso-interface-replica/server/permissions.json" ]; then
    cp "aidso-interface-replica/server/permissions.json" "$EXPORT_DIR/permissions.json"
    log_success "权限文件已导出: permissions.json"
else
    log_warn "未找到 permissions.json"
fi

# ==========================================
# 3. 导出环境变量配置（如果有）
# ==========================================
log_step "步骤 3/4: 导出环境变量"

if [ -f ".env" ]; then
    cp ".env" "$EXPORT_DIR/.env"
    log_success "环境变量已导出: .env"
elif [ -f "aidso-interface-replica/server/.env" ]; then
    cp "aidso-interface-replica/server/.env" "$EXPORT_DIR/.env"
    log_success "环境变量已导出: .env"
else
    log_info "未找到 .env 文件（这是正常的，环境变量通常在部署时配置）"
fi

# ==========================================
# 4. 创建导入说明
# ==========================================
log_step "步骤 4/4: 创建导入说明"

cat > "$EXPORT_DIR/README.md" << 'EOF'
# 数据导入说明

## 文件说明

- `database.sql` - 数据库完整备份（包含所有表和数据）
- `config.json` - 系统配置文件（API 配置、计费配置等）
- `permissions.json` - 权限配置文件
- `.env` - 环境变量配置（如果有）

## 导入步骤

### 1. 上传文件到服务器

```bash
# 使用 scp 上传整个目录
scp -r data_export_* root@你的服务器IP:/www/wwwroot/aidso.com/

# 或使用其他方式上传
```

### 2. 在服务器上导入数据

```bash
cd /www/wwwroot/aidso.com

# 运行导入脚本
bash import_data.sh data_export_*
```

### 3. 或手动导入

```bash
# 导入数据库
docker exec -i aidso_postgres psql -U admin -d aidso_db < data_export_*/database.sql

# 复制配置文件
cp data_export_*/config.json aidso-interface-replica/server/config.json
cp data_export_*/permissions.json aidso-interface-replica/server/permissions.json

# 重启服务
docker-compose restart api
```

## 注意事项

1. 导入数据库前，建议先备份服务器上的现有数据
2. 配置文件会覆盖服务器上的配置，请确认
3. 导入后需要重启 API 服务使配置生效
EOF

log_success "导入说明已创建: README.md"

# ==========================================
# 5. 打包
# ==========================================
log_step "打包导出文件"

TAR_FILE="${EXPORT_DIR}.tar.gz"
tar -czf "$TAR_FILE" "$EXPORT_DIR" 2>/dev/null || {
    log_warn "tar 命令失败，跳过打包"
    TAR_FILE=""
}

if [ -n "$TAR_FILE" ] && [ -f "$TAR_FILE" ]; then
    log_success "打包完成: $TAR_FILE"
    log_info "文件大小: $(du -h "$TAR_FILE" | cut -f1)"
else
    log_info "未打包，直接使用目录: $EXPORT_DIR"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ 导出完成！${NC}"
echo "========================================"
echo ""
echo "📦 导出内容："
echo "   目录: $EXPORT_DIR"
if [ -n "$TAR_FILE" ]; then
    echo "   压缩包: $TAR_FILE"
fi
echo ""
echo "📋 下一步："
echo "   1. 将 $EXPORT_DIR 或 $TAR_FILE 上传到服务器"
echo "   2. 在服务器上运行: bash import_data.sh $EXPORT_DIR"
echo ""

