#!/bin/bash
# ==========================================
# 🔍 查看 API 容器日志和状态
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
echo "   🔍 API 容器日志和状态检查"
echo "========================================"
echo ""

# 1. 检查容器状态
echo "1. 容器状态："
docker ps -a --filter "name=aidso_api" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. 检查容器是否在重启循环
API_STATUS=$(docker inspect -f '{{.State.Status}}' aidso_api 2>/dev/null || echo "unknown")
RESTART_COUNT=$(docker inspect -f '{{.RestartCount}}' aidso_api 2>/dev/null || echo "0")

echo "2. 容器详细信息："
echo "   状态: $API_STATUS"
echo "   重启次数: $RESTART_COUNT"
echo ""

if [ "$API_STATUS" = "restarting" ]; then
    log_error "⚠️  容器正在重启循环中！"
    echo ""
    log_info "这通常意味着容器启动命令失败"
    echo ""
fi

# 3. 查看完整日志
echo "3. API 容器完整日志（最近 100 行）："
echo "========================================"
docker logs aidso_api --tail 100 2>&1
echo "========================================"
echo ""

# 4. 查看错误日志
echo "4. 错误日志（过滤）："
echo "========================================"
docker logs aidso_api --tail 100 2>&1 | grep -i "error\|fail\|exception\|cannot\|unable" || echo "   未发现明显错误关键词"
echo "========================================"
echo ""

# 5. 检查启动命令
echo "5. 容器启动命令："
docker inspect aidso_api --format '{{.Config.Cmd}}' 2>/dev/null || echo "   无法获取"
echo ""

# 6. 检查环境变量
echo "6. 关键环境变量："
docker exec aidso_api printenv | grep -E "DATABASE_URL|PORT|AUTH_SECRET" 2>/dev/null || echo "   无法获取（容器可能未运行）"
echo ""

# 7. 常见问题诊断
echo "7. 常见问题诊断："
echo ""

# 检查数据库连接
if docker exec aidso_postgres pg_isready -U admin -d aidso_db > /dev/null 2>&1; then
    log_success "数据库连接正常"
else
    log_error "数据库连接失败"
fi

# 检查 Prisma 文件
if docker exec aidso_api test -f /app/prisma/schema.prisma 2>/dev/null; then
    log_success "Prisma schema 文件存在"
else
    log_error "Prisma schema 文件不存在"
fi

# 检查 node_modules
if docker exec aidso_api test -d /app/node_modules 2>/dev/null; then
    log_success "node_modules 目录存在"
else
    log_error "node_modules 目录不存在"
fi

echo ""
echo "========================================"
echo "   检查完成"
echo "========================================"
echo ""
echo "📋 修复建议："
echo ""
if [ "$API_STATUS" = "restarting" ]; then
    echo "   1. 查看上方日志，找出具体错误"
    echo "   2. 常见原因："
    echo "      - 数据库迁移失败"
    echo "      - 种子数据执行失败"
    echo "      - Prisma Client 未生成"
    echo "      - 数据库连接失败"
    echo ""
    echo "   3. 尝试手动执行启动命令："
    echo "      docker exec aidso_api sh -c 'npx prisma migrate deploy'"
    echo "      docker exec aidso_api sh -c 'npx ts-node prisma/seed_admin.ts'"
    echo "      docker exec aidso_api sh -c 'npm run dev'"
    echo ""
    echo "   4. 如果问题持续，可能需要："
    echo "      - 检查 docker-compose.yml 中的启动命令"
    echo "      - 重新构建镜像: docker-compose build --no-cache api"
    echo "      - 查看数据库是否正常: docker-compose logs postgres"
fi
echo ""

