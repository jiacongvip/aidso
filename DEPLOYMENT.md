# 🚀 服务器部署指南

## 前置准备

### 1. 服务器要求
- 操作系统：Linux (Ubuntu/CentOS/Debian 等)
- 内存：建议 2GB 以上
- 磁盘：建议 10GB 以上可用空间
- 已安装 Docker 和 docker-compose

### 2. 检查 Docker 环境

```bash
# 检查 Docker 是否安装
docker --version

# 检查 docker-compose 是否安装
docker-compose --version
# 或
docker compose version
```

如果没有安装 Docker，请先安装：

**Ubuntu/Debian:**
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 安装 docker-compose
apt-get update
apt-get install docker-compose-plugin
```

**CentOS:**
```bash
# 安装 Docker
yum install -y docker
systemctl start docker
systemctl enable docker

# 安装 docker-compose
yum install -y docker-compose-plugin
```

**宝塔面板:**
- 进入 软件商店 -> 搜索 "Docker" -> 安装
- 安装完成后，在终端中验证：`docker --version`

## 部署步骤

### 方式一：首次部署（推荐）

#### 1. SSH 连接到服务器

```bash
ssh root@你的服务器IP
# 或
ssh 用户名@你的服务器IP
```

#### 2. 创建项目目录

```bash
# 创建项目目录（可根据需要修改路径）
mkdir -p /www/wwwroot/aidso
cd /www/wwwroot/aidso
```

#### 3. 克隆代码仓库

```bash
# 使用 HTTPS（推荐，无需配置 SSH）
git clone https://github.com/jiacongvip/aidso.git .

# 或使用 SSH（需要配置 SSH 密钥）
git clone git@github.com:jiacongvip/aidso.git .
```

#### 4. 运行一键部署脚本

```bash
# 给脚本添加执行权限
chmod +x deploy.sh

# 执行部署（首次部署）
bash deploy.sh
```

脚本会自动：
- ✅ 拉取最新代码
- ✅ 检查 Docker 环境
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 检查服务状态

### 方式二：更新部署

如果服务器上已经有代码，只需要更新：

```bash
# 进入项目目录
cd /www/wwwroot/aidso

# 运行部署脚本（会自动拉取最新代码）
bash deploy.sh
```

### 方式三：强制重建

如果遇到问题需要完全重建：

```bash
bash deploy.sh --force
```

## 部署后访问

部署成功后，可以通过以下地址访问：

- **前端 Web**: `http://你的服务器IP:3002`
- **后端 API**: `http://你的服务器IP:3005`
- **API 健康检查**: `http://你的服务器IP:3005/health`

### 默认账号
- **管理员**: `admin` / `111111`

## 常用管理命令

### 查看服务状态
```bash
# 查看所有容器状态
docker ps --filter name=aidso

# 查看服务日志
docker-compose logs -f
# 或
docker compose logs -f

# 查看特定服务日志
docker-compose logs -f web    # 前端日志
docker-compose logs -f api    # 后端日志
docker-compose logs -f postgres  # 数据库日志
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart web
docker-compose restart api
```

### 停止服务
```bash
docker-compose down
```

### 更新代码并重新部署
```bash
# 进入项目目录
cd /www/wwwroot/aidso

# 运行部署脚本（会自动拉取最新代码并重新部署）
bash deploy.sh
```

## 防火墙配置

如果无法访问，请检查服务器防火墙设置：

### 开放端口
```bash
# Ubuntu/Debian (ufw)
ufw allow 3002/tcp
ufw allow 3005/tcp

# CentOS (firewalld)
firewall-cmd --permanent --add-port=3002/tcp
firewall-cmd --permanent --add-port=3005/tcp
firewall-cmd --reload

# 宝塔面板
# 进入 安全 -> 添加端口规则
# 端口: 3002, 3005
# 协议: TCP
```

## 故障排查

### 🔍 使用排查工具（推荐）

项目提供了两个便捷的排查和修复脚本：

```bash
# 1. 全面诊断问题
bash troubleshoot.sh

# 2. 自动修复登录 500 错误
bash fix_login_500.sh
```

### 常见问题

#### 1. 登录提示 HTTP 500 错误

这是最常见的部署问题，通常由以下原因引起：

**原因：**
- 数据库迁移未执行
- Prisma Client 未生成
- 数据库中没有用户（种子数据未执行）
- 数据库连接失败
- API 容器启动时迁移失败

**快速诊断：**
```bash
# 运行诊断脚本
bash diagnose_api.sh

# 或查看 API 日志
docker-compose logs -f api
```

**快速修复：**
```bash
# 方法 1: 使用自动修复脚本（推荐）
bash fix_login_500.sh

# 方法 2: 手动修复
# 1. 确保容器运行
docker-compose up -d

# 2. 等待数据库就绪
sleep 10

# 3. 执行数据库迁移
docker exec aidso_api npx prisma migrate deploy

# 4. 生成 Prisma Client
docker exec aidso_api npx prisma generate

# 5. 初始化管理员账号
docker exec aidso_api npx ts-node prisma/seed_admin.ts

# 6. 重启 API 服务
docker-compose restart api

# 7. 等待服务启动
sleep 5

# 8. 验证修复
curl -X POST http://localhost:3005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"111111"}'
```

**如果仍然返回 500：**
```bash
# 1. 查看详细错误日志
docker-compose logs api | tail -50

# 2. 检查数据库连接
docker exec aidso_postgres psql -U admin -d aidso_db -c "SELECT 1;"

# 3. 检查数据库表
docker exec aidso_postgres psql -U admin -d aidso_db -c "\dt"

# 4. 检查是否有用户
docker exec aidso_postgres psql -U admin -d aidso_db -c "SELECT COUNT(*) FROM users;"

# 5. 如果表不存在，重新执行迁移
docker exec aidso_api npx prisma migrate deploy

# 6. 如果用户不存在，重新执行种子
docker exec aidso_api npx ts-node prisma/seed_admin.ts

# 7. 完全重启所有服务
docker-compose down
docker-compose up -d
```

#### 2. 容器启动失败

```bash
# 查看容器日志
docker-compose logs

# 查看容器状态
docker ps -a

# 检查端口占用
netstat -tulpn | grep -E '3002|3005|5433'

# 查看特定服务日志
docker-compose logs -f api
docker-compose logs -f postgres
```

#### 3. 无法访问服务

- 检查防火墙是否开放端口（3002, 3005）
- 检查容器是否正常运行：`docker ps`
- 检查服务日志：`docker-compose logs -f web`
- 测试 API 健康检查：`curl http://localhost:3005/health`

#### 4. 数据库连接问题

```bash
# 检查数据库容器
docker exec -it aidso_postgres psql -U admin -d aidso_db

# 查看数据库日志
docker-compose logs postgres

# 检查数据库表
docker exec aidso_postgres psql -U admin -d aidso_db -c "\dt"

# 检查用户数量
docker exec aidso_postgres psql -U admin -d aidso_db -c "SELECT COUNT(*) FROM users;"
```

#### 5. 重新部署

如果遇到无法解决的问题，可以完全重建：

```bash
# 停止并删除所有容器和卷
docker-compose down -v

# 清理镜像
docker rmi $(docker images | grep aidso | awk '{print $3}')

# 重新部署
bash deploy.sh --force
```

## 生产环境建议

### 1. 修改默认密码

部署后请立即修改：
- 数据库密码（在 `docker-compose.yml` 中）
- 管理员账号密码（登录后修改）

### 2. 配置域名和 HTTPS

建议使用 Nginx 反向代理并配置 SSL 证书：

```nginx
# Nginx 配置示例
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 数据备份

定期备份数据库：

```bash
# 备份数据库
docker exec aidso_postgres pg_dump -U admin aidso_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker exec -i aidso_postgres psql -U admin aidso_db < backup_20240101.sql
```

## 快速部署命令（一键复制）

```bash
# 首次部署
mkdir -p /www/wwwroot/aidso && cd /www/wwwroot/aidso
git clone https://github.com/jiacongvip/aidso.git .
chmod +x deploy.sh
bash deploy.sh

# 更新部署
cd /www/wwwroot/aidso && bash deploy.sh
```

---

**遇到问题？** 查看日志：`docker-compose logs -f`

