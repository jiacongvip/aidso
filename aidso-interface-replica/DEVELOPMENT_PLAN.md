# AiGEO 界面复刻项目开发文档

本文档旨在梳理当前项目状态、架构以及后续需要开发和完善的功能点。

## 1. 项目概况

**AiGEO** 是一个 AI 搜索引擎优化与监控平台的界面复刻项目。当前主要侧重于前端 UI 的实现，通过 React + Vite 构建，复刻了包括 Landing Page、监控大屏、搜索结果页等核心界面。

### 1.1 技术栈

- **框架**: React 19
- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS (目前通过 CDN 引入)
- **图标**: Lucide React
- **包管理**: npm

## 2. 当前开发状态

### 2.1 已完成功能
- **UI 界面**:
  - Landing Page (首页)
  - 搜索结果展示页 (ResultCard)
  - 品牌监控看板 (BrandMonitoringPage)
  - 内容优化页 (ContentOptimizationPage)
  - 管理后台 (AdminPage)
  - 登录/注册页 (LoginPage)
- **交互逻辑**:
  - 简单的状态切换 (View State)
  - 模拟的搜索过程 (setTimeout)
  - Toast 提示系统
  - 品牌选择与切换

### 2.2 待完善领域
- **路由管理**: 目前使用 `App.tsx` 中的 `view` 状态进行手动页面切换，缺乏 URL 路由支持。
- **数据层**: 所有数据均为 Hardcoded (硬编码) 在 `data.ts` 或组件内部，缺乏真实 API 交互。
- **构建优化**: Tailwind CSS 目前通过 CDN 在 `index.html` 中引入，不适合生产环境（无法 Tree-shaking，加载慢）。
- **状态管理**: 依赖 Props Drilling 和本地 State，需引入全局状态管理。

## 3. 开发规划 (Roadmap)

### 阶段一：架构重构与基础设施 (Priority: High)

1.  **引入 React Router**
    - 安装 `react-router-dom`。
    - 将 `App.tsx` 中的条件渲染重构为 `<Routes>` 和 `<Route>`。
    - 确保浏览器 URL 与页面状态同步 (e.g., `/search`, `/monitoring`).

2.  **本地化 Tailwind CSS**
    - 移除 `index.html` 中的 CDN 引用。
    - 安装 `tailwindcss`, `postcss`, `autoprefixer`。
    - 生成 `tailwind.config.js` 并迁移 `index.html` 中的自定义配置（颜色、动画等）。
    - 确保样式在 Build 阶段被正确编译和压缩。

3.  **API 客户端封装**
    - 创建 `src/services/api.ts`。
    - 封装 `fetch` 或引入 `axios`。
    - 替换 `setTimeout` 模拟，准备对接真实后端。

### 阶段二：功能实现与数据对接 (Priority: Medium)

1.  **真实搜索功能 (Gemini API)**
    - 利用 `.env.local` 中的 `GEMINI_API_KEY`。
    - 在后端（或通过 Next.js API Routes / Edge Functions，如果是纯前端则需注意 Key 暴露风险）实现对 Gemini API 的调用。
    - 将返回的数据解析并动态填充到 `ResultCard` 组件。

2.  **认证系统**
    - 完善 `LoginPage`。
    - 实现 JWT Token 的存储与管理 (Context + LocalStorage)。
    - 添加路由守卫 (Protected Routes)，如 `AdminPage` 需要登录才能访问。

3.  **动态组件改造**
    - `ResultCard.tsx`: 移除硬编码的 "常州小程序开发公司哪家好"，改为接收 Props。
    - `BrandMonitoringPage`: 数据改为从 API 获取。

### 阶段三：优化与增强 (Priority: Low)

1.  **响应式优化**
    - 检查移动端适配情况，特别是复杂的 Dashboard 表格和图表。
2.  **Loading 状态优化**
    - 使用 `ResultSkeleton` 替换简单的 Loading 文字，提升体验。
3.  **SEO 优化**
    - 添加 `react-helmet-async` 管理 Head 标签 (Title, Meta)。

## 4. 详细开发任务清单

| 任务 ID | 模块 | 描述 | 状态 |
| :--- | :--- | :--- | :--- |
| T-001 | Infra | 安装并配置本地 Tailwind CSS | 待开始 |
| T-002 | Infra | 安装并配置 React Router | 待开始 |
| T-003 | Feat | 封装 API Request 模块 | 待开始 |
| T-004 | UI | 重构 App.tsx 移除 View State | 待开始 |
| T-005 | Logic | 集成 Gemini API 实现真实搜索 | 待开始 |
| T-006 | UI | ResultCard 组件数据动态化 | 待开始 |
| T-007 | Auth | 登录鉴权逻辑实现 | 待开始 |

## 5. 快速开始 (补充)

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 GEMINI_API_KEY

# 启动开发服务器
npm run dev
```
