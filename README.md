# aidso

本项目包含前端（Vite + React）与后端（Express + Prisma + PostgreSQL），并提供 `docker compose` 一键启动。

## 一键启动（推荐）

在仓库根目录执行：

```bash
docker compose up --build
```

启动后访问：

- Web（前端）：`http://localhost:3002`
- API（后端）：`http://localhost:3005/health`

默认管理员账号（首次启动会自动初始化）：

- 账号：`admin`
- 密码：`111111`

入口说明：

- 登录页：`/login`
- 个人中心：登录后点击右上角头像，或直接访问 `/me`
- 后台管理：管理员账号登录后，点击右上角头像进入「个人中心」→「后台管理」，或直接访问 `/admin`（登录页底部也有「管理员入口」）

> 如果你本机环境里设置过其它项目的 `VITE_API_PROXY_TARGET`，可能会导致本项目前端把 `/api/*` 代理到错误地址。
> 本项目使用 `AIDSO_API_PROXY_TARGET` 作为专用代理变量（`docker compose` 已内置），一般不需要你手动设置。

## 新手怎么测试（按步骤来）

1) 先登录/注册

- 打开 `http://localhost:3002/login`
- 管理员：`admin / 111111`（用于进后台配置）
- 普通用户：可在登录页切到「立即注册」创建账号
  
如果你登录/注册提示“网络错误”，通常是后端没启动或 `/api` 代理地址不对：

- 先确认 `http://localhost:3005/health` 能打开
- 再确认前端是通过 `AIDSO_API_PROXY_TARGET` 把 `/api/*` 代理到后端（默认 `http://localhost:3005`，`docker compose` 会自动配置）

2) 后台配置 NewAPI（全站共用一套 KEY）

- 打开 `http://localhost:3002/admin`
- 进入「权限与配置」→「多模型接口配置」
- 在「全站默认」里填写：
  - `Base URL`：例如 `https://api.newapi.com/v1`
  - `API Key`：你的 NewAPI Key（填一次即可）
- 在下面的模型源 Tab 里：
  - 把你要用的模型源切换为「启用」
  - 需要的话填写 `Model Name`
  - 深度任务会用到 `DeepSeek`：建议启用，并把 `Model Name` 设为 `deepseek-chat`（或你 NewAPI 中的对应名称）
- 点「测试连接」确认能通，再点「保存全部配置」

3) 发起任务并查看结果

- 打开 `http://localhost:3002/`
- 选择至少 1 个模型 → 输入关键词 → 点击搜索
- 去 `http://localhost:3002/results` 看结果
- 在结果详情弹窗里切换到「运行记录」，可以看到每个模型调用与 DeepSeek 深度解析的落库记录（TaskModelRun）

4) 品牌监测（V1：品牌词提及追踪）

- 打开 `http://localhost:3002/monitoring`（需企业版权限或管理员）
- 点「管理品牌词」添加品牌词/别名（也可在结果页里添加）
- 后续每次任务完成后，系统会自动在任务结果中匹配品牌词并落库
- 监测页可按模型/情感筛选提及记录，并支持导出 CSV

5) 计费/配额规则（按次数）

- 任务必须登录才能执行
- 免费版默认每天 2 次（以 `Asia/Shanghai` 计算）
- 扣费：`costUnits = Σ(所选模型单价) × 倍率`，深度倍率默认 2
- 在后台「计费与配额」可调整每日次数、倍率、各模型单价

## 用 API 测试（curl）

登录拿 token：

```bash
curl -s http://localhost:3005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"111111"}'
```

创建任务（把 `TOKEN` 替换成上一步返回的 token）：

```bash
curl -s http://localhost:3005/api/tasks \
  -H "Authorization: Bearer TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"keyword":"DeepSeek V3 深度评测","searchType":"deep","models":["DeepSeek","豆包"]}'
```

查看任务与运行记录：

```bash
curl -s http://localhost:3005/api/tasks/TASK_ID -H "Authorization: Bearer TOKEN"
curl -s http://localhost:3005/api/tasks/TASK_ID/runs -H "Authorization: Bearer TOKEN"
```

## 本地开发（非 Docker）

### 1) 启动 PostgreSQL

推荐直接用 Docker 启动数据库（也可以用你本机的 PostgreSQL）：

```bash
docker compose up postgres -d
```

### 2) 启动后端

```bash
cd aidso-interface-replica/server
npm install
export DATABASE_URL="postgresql://admin:password123@localhost:5433/aidso_db?schema=public"
export PORT=3005
npx prisma migrate dev
npx ts-node prisma/seed_admin.ts
npm run dev
```

### 3) 启动前端

```bash
cd aidso-interface-replica
npm install
npm run dev
```

前端默认走 Vite 代理转发 `/api` 到后端（见 `aidso-interface-replica/vite.config.ts`）。
