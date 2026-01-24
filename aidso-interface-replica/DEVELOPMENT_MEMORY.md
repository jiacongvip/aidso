# 项目开发记忆文档 (Development Memory)

**最后更新时间**: 2026-01-23
**当前状态**: 全栈改造完成 (PostgreSQL + Node.js + React)

## 1. 系统架构变更
我们将原本的纯前端 Mock 系统改造成了全栈应用：
- **前端**: React + Vite + TailwindCSS (运行在 `3002` 端口)
- **后端**: Node.js + Express (运行在 `3001` 端口)
- **数据库**: PostgreSQL (运行在 Docker 容器 `5432` 端口)
- **ORM**: Prisma (用于管理数据库结构和类型安全查询)

## 2. 核心文件结构
```
aidso-interface-replica/
├── src/                # 前端源代码
├── server/             # [新增] 后端源代码
│   ├── src/            # 后端逻辑 (index.ts)
│   ├── prisma/         # 数据库定义
│   │   └── schema.prisma # 数据库表结构 (User, Task, Payment...)
│   ├── docker-compose.yml # 数据库容器配置
│   └── .env            # 后端环境变量 (DB连接串)
└── vite.config.ts      # 配置了 /api 代理转发到后端
```

## 3. 数据库设计 (Schema)
目前已定义的表结构 (`server/prisma/schema.prisma`)：
- **User**: 用户表 (邮箱, 密码, 角色)
- **Task**: 任务表 (关键词, 状态, 进度, 结果 JSON) - *已对接前端*
- **Membership**: 会员表 (订阅计划, 过期时间) - *预留*
- **Payment**: 支付记录表 (金额, 状态, 渠道) - *预留*

## 4. 启动指南 (如何恢复开发)
如果你重新打开项目，请按顺序执行以下命令：

### 第一步：启动数据库 (Docker)
```bash
cd server
docker-compose up -d
```

### 第二步：启动后端服务
```bash
cd server
npm run dev
```
*(后端运行在 http://localhost:3001)*

### 第三步：启动前端
```bash
# 回到项目根目录
npm run dev
```
*(前端运行在 http://localhost:3002)*

## 5. 常用维护命令
- **修改数据库结构后同步**:
  ```bash
  cd server
  npx prisma migrate dev --name <本次修改描述>
  ```
- **查看数据库界面 (Prisma Studio)**:
  ```bash
  cd server
  npx prisma studio
  ```

## 6. 下一步计划 (TODO)
- [ ] 实现用户注册与登录 API (JWT)
- [ ] 对接支付接口 (Stripe/Alipay)
- [ ] 实现会员权限控制 (Middleware)
