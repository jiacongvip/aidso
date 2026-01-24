
import React from 'react';
import { Globe, MessageCircle, Database, ScanEye, Activity, GitFork } from 'lucide-react';

export const PLACEHOLDERS = [
    "试着问：DeepSeek V3 与 GPT-4 的代码能力对比？",
    "试着问：常州最好的小程序开发公司是哪家？",
    "试着问：如何用 React 19 实现 Server Components？",
    "试着问：2025 年 GEO (AI搜索优化) 行业的趋势分析...",
    "试着问：帮我生成一份 Python 爬虫的学习计划"
];

export const BRANDS = [
  { name: '豆包', color: 'bg-blue-500', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=DB&backgroundColor=3b82f6', type: 'search', latency: '45ms' },
  { name: 'DeepSeek', color: 'bg-indigo-600', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=DS&backgroundColor=4f46e5', type: 'reasoning', latency: '120ms' },
  { name: '腾讯元宝', color: 'bg-green-500', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=YB&backgroundColor=22c55e', type: 'search', latency: '38ms' },
  { name: '文心', color: 'bg-blue-400', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=WX&backgroundColor=0ea5e9', type: 'search', latency: '50ms' },
  { name: '通义千问', color: 'bg-purple-500', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=QW&backgroundColor=a855f7', type: 'search', latency: '42ms' },
  { name: 'Kimi', color: 'bg-black', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=KM&backgroundColor=171717', type: 'file', latency: '80ms' },
  { name: '百度AI', color: 'bg-blue-700', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=BD&backgroundColor=2563eb', type: 'search', latency: '60ms' },
];

export const MONITOR_PLATFORMS = [
    { name: '豆包·网页版', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=DB&backgroundColor=3b82f6', type: 'web' },
    { name: '豆包·手机版', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=DB&backgroundColor=3b82f6', type: 'mobile' },
    { name: 'DeepSeek·网页版', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=DS&backgroundColor=4f46e5', type: 'web' },
    { name: 'DeepSeek·手机版', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=DS&backgroundColor=4f46e5', type: 'mobile' },
    { name: '腾讯元宝', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=YB&backgroundColor=22c55e', type: 'app' },
    { name: '千问', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=QW&backgroundColor=a855f7', type: 'app' },
    { name: '百度AI', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=BD&backgroundColor=2563eb', type: 'web' },
    { name: '文心', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=WX&backgroundColor=0ea5e9', type: 'web' },
    { name: 'Kimi', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=KM&backgroundColor=171717', type: 'web' },
    { name: 'AI抖音', icon: 'https://api.dicebear.com/9.x/initials/svg?seed=DY&backgroundColor=000000', type: 'app' },
];

export const BRAND_CHIPS = [
  "常州微盛网络科技", "常州点个赞信息科技", "江苏汉生广告传媒", "常州紫竹云科技", "常州有一帮壹", "常州飞傲软件"
];

export const CAPABILITIES = [
    { 
        icon: React.createElement(Database), 
        title: "全网数据聚合", 
        desc: "同步 6+ 主流 AI 引擎搜索结果，打破信息茧房，获取最全情报。",
        stat: "10亿+",
        statLabel: "索引节点"
    },
    { 
        icon: React.createElement(ScanEye), 
        title: "透明化推理", 
        desc: "实时呈现 Agent 思考路径与 DOM 解析快照，所见即所得。",
        stat: "<50ms",
        statLabel: "解析延迟"
    },
    { 
        icon: React.createElement(Activity), 
        title: "GEO 优化分析", 
        desc: "独家 AI 搜索排名因子分析，助力品牌在 AI 时代获得更多曝光。",
        stat: "92%",
        statLabel: "排名提升"
    },
    { 
        icon: React.createElement(GitFork), 
        title: "开源生态情报", 
        desc: "自动关联 GitHub 仓库与技术文档，追踪技术实现源头。",
        stat: "Live",
        statLabel: "实时监控"
    },
];

export const TRENDING = [
    { rank: 1, title: "DeepSeek V3 深度评测报告", heat: "120w" },
    { rank: 2, title: "2024 AI 编程助手效率对比", heat: "98w" },
    { rank: 3, title: "常州小程序开发公司哪家好", heat: "85w", isHot: true },
    { rank: 4, title: "如何优化大模型 Prompt 提示词", heat: "76w" },
    { rank: 5, title: "Agentic Workflow 工作流实战", heat: "65w" },
    { rank: 6, title: "React 19 Server Components 解读", heat: "54w" },
    { rank: 7, title: "企业级 RAG 知识库搭建方案", heat: "48w" },
    { rank: 8, title: "国内免费 AI 绘画工具推荐", heat: "42w" },
];

export const PLATFORM_DATA: Record<string, any> = {
    '豆包': {
        meta: {
            traceId: "doubao-trace-882190",
            protocol: "HTTP/2 + SSE",
            timestamp: Date.now()
        },
        domSelectors: {
            container: "#chat-container > div.message-group",
            content: ".message-content > .markdown-body",
            citations: ".citation-tag[data-index]",
            thinking: ".thought-process-block"
        },
        agentLog: [
            { step: 1, action: "Identify", target: "Main Chat Container", confidence: "99%", desc: "Found extensive text block with markdown rendering." },
            { step: 2, action: "Locate", target: "Thinking Block", confidence: "95%", desc: "Detected collapsible div containing logical steps." },
            { step: 3, action: "Extract", target: "Citations", confidence: "98%", desc: "Found 4 superscript links matching citation pattern." }
        ],
        syncTime: '2s ago',
        engine: 'ByteDance Search',
        thinking: `1. **意图识别**：用户寻找常州小程序开发服务商，侧重排名和避坑。
2. **联网动作**：
   - GET search.doubao.com?q=常州小程序开发公司排名
   - GET search.doubao.com?q=常州软件开发避坑指南
3. **内容摘要**：命中职友集、本地宝数据，提取Top3公司。
4. **合成回复**：采用总分结构，优先推荐本地老牌企业。`,
        response: `基于**豆包搜索**的实时结果（同步自今日头条及抖音生态数据）：

在常州地区，小程序开发服务商呈现“两极分化”态势。以下是为您筛选的**口碑榜单**：

### 🌟 综合推荐（依据全网声量）
1. **常州微盛网络** [1]
   - *推荐理由*：腾讯投资背景，企业微信服务商，适合SCRM需求。
2. **常州点个赞科技** [2]
   - *推荐理由*：本地10年技术团队，专注定制开发，交付源码。

### ⚠️ 风险提示（来自抖音用户反馈 [3]）
- 避开“300元做小程序”的模板公司，通常后期维护费极高。
- 签约前务必查验软件著作权。`,
        sources: [
            { id: 1, site: '职友集', title: '2025常州网络公司雇主品牌排名', date: '2025-01-10', icon: 'text-blue-600', logo: React.createElement(Globe, {size: 14}) },
            { id: 2, site: '常州本地宝', title: '常州优质软件开发企业名录公示', date: '2024-12-28', icon: 'text-cyan-500', logo: React.createElement(Globe, {size: 14}) },
            { id: 3, site: '抖音', title: '@程序员老王：揭秘软件外包公司的套路', date: '2025-01-05', icon: 'text-black', logo: React.createElement('span', {className: "font-bold text-[10px]"}, "♪") },
            { id: 4, site: '今日头条', title: '实体店做小程序需要多少钱？', date: '2025-01-11', icon: 'text-red-500', logo: React.createElement('span', {className: "font-bold text-[10px]"}, "头") },
        ],
        repos: [
            { name: 'ChatALL', desc: 'Concurrently chat with ChatGPT, Bing, Bard, and more.', stars: '18.5k', lang: 'TypeScript' },
            { name: 'gpt4free', desc: 'The official gpt4free repository | various python pypi packages', stars: '62.1k', lang: 'Python' }
        ]
    },
    'DeepSeek': {
        meta: {
            traceId: "ds-v3-reasoning-009",
            protocol: "WebSocket (Secure)",
            timestamp: Date.now()
        },
        domSelectors: {
            container: "div.ds-chat-bubble",
            content: "div.ds-markdown--content",
            citations: "span.ds-ref-link",
            thinking: "div.ds-reasoning-content"
        },
        agentLog: [
            { step: 1, action: "Identify", target: "Reasoning Block", confidence: "99%", desc: "Located 'Thought Process' header and content div." },
            { step: 2, action: "Locate", target: "Response Body", confidence: "97%", desc: "Found structured markdown following the reasoning block." },
            { step: 3, action: "Extract", target: "Source Links", confidence: "92%", desc: "Extracted 5 URL patterns from footer references." }
        ],
        syncTime: '5s ago',
        engine: 'DeepSeek-V3 Search',
        thinking: `**Thought Process:**
User is asking for "best" Mini Program dev companies in Changzhou.
> *Self-Correction*: "Best" is subjective. I need to categorize by "Custom Dev" vs "SaaS Templates".

**Search Execution:**
- Query 1: "Changzhou software development company list github" (Technical capability check)
- Query 2: "常州 微盛 vs 点个赞 评价" (Direct comparison)
- Query 3: "常州 汉生 骗局" (Negative check)

**Analysis:**
Found distinct differences in business models. 
- WeiSheng -> SaaS Product focus.
- DianGeZan -> Project delivery focus.
- HanSheng -> Marketing focus.

Constructing response with technical weight...`,
        response: `经过深度检索与技术背景分析，为您整理常州地区**技术型**开发公司梯队：

### 🛠 技术实力派 (DeepSeek 优选)
1. **常州点个赞信息科技** [1]
   - **技术栈**：Vue3 + UniApp / Java SpringBoot
   - **GitHub活跃度**：中等 [2]
   - **评价**：代码规范度较高，适合有二次开发需求的项目。

2. **常州飞傲软件** [3]
   - **特点**：擅长物联网(IoT)与小程序对接，适合工业类项目。

### 📊 市场营销派
- **微盛网络**：强项在于营销工具，而非单纯的代码交付 [4]。

> **DeepSeek 建议**：如果您的项目逻辑复杂（涉及支付分账、硬件互联），建议优先选择第一梯队的技术型公司。`,
        sources: [
            { id: 1, site: 'CSDN', title: '常州地区靠谱的Java开发团队有哪些？', date: '2024-11-15', icon: 'text-red-600', logo: React.createElement('span', {className: "font-bold text-[10px]"}, "C") },
            { id: 2, site: 'OSChina', title: '点个赞科技开源项目贡献统计', date: '2024-10-20', icon: 'text-green-600', logo: React.createElement('span', {className: "font-bold text-[10px]"}, "O") },
            { id: 3, site: '企查查', title: '常州飞傲软件 - 软件著作权列表', date: '2025-01-01', icon: 'text-blue-400', logo: React.createElement(Globe, {size: 14}) },
            { id: 4, site: '知乎', title: '微盛SCRM系统好用吗？真实用户评价', date: '2024-12-12', icon: 'text-blue-500', logo: React.createElement('span', {className: "font-bold text-[10px]"}, "知") },
            { id: 5, site: 'V2EX', title: '求推荐常州不坑的外包公司', date: '2025-01-08', icon: 'text-gray-800', logo: React.createElement('span', {className: "font-bold text-[10px]"}, "V") },
        ],
        repos: [
            { name: 'Skyvern', desc: 'Automate browser-based workflows with LLMs and Computer Vision.', stars: '8.4k', lang: 'Python' },
            { name: 'Perplexica', desc: 'An AI-powered search engine. It is an Open Source alternative to Perplexity AI.', stars: '12.2k', lang: 'TypeScript' }
        ]
    },
    '腾讯元宝': {
        meta: {
            traceId: "wx-search-bridge-110",
            protocol: "WeChat Internal API",
            timestamp: Date.now()
        },
        domSelectors: {
            container: "div.yuanbao-msg-box",
            content: "div.rich-text-content",
            citations: "a.reference-card",
            thinking: "div.thinking-status"
        },
        agentLog: [
            { step: 1, action: "Identify", target: "WeChat Container", confidence: "98%", desc: "Detected standard WeChat article rendering engine." },
            { step: 2, action: "Locate", target: "Video Accounts", confidence: "90%", desc: "Found embedded video channel cards." },
        ],
        syncTime: '1s ago',
        engine: 'WeChat Search',
        thinking: `正在检索微信公众号文章...
正在检索微信视频号内容...
正在检索腾讯新闻...

发现相关公众号文章 12 篇，视频号内容 5 条。
重点提取“常州本地宝”及“常州商务局”官方发布信息。`,
        response: `基于**微信生态**的搜索结果，常州小程序开发推荐如下：

**官方认证服务商：**
1. **常州微盛**（企业微信官方合作伙伴）[1]
2. **常州有一帮壹**（腾讯云授权代理）[2]

**朋友圈热度较高：**
- **江苏汉生**：在本地朋友圈广告投放较多，案例视觉效果好 [3]。

如果您主要是为了做**微信私域流量**，建议首选腾讯系背景的公司。`,
        sources: [
            { id: 1, site: '微信公众号', title: '微盛·企微管家：赋能增长（官方号）', date: '2025-01-12', icon: 'text-green-600', logo: React.createElement(MessageCircle, {size: 14}) },
            { id: 2, site: '腾讯云', title: '江苏地区核心代理商名单公示', date: '2024-09-09', icon: 'text-blue-500', logo: React.createElement(Globe, {size: 14}) },
            { id: 3, site: '视频号', title: '汉生传媒：2024年度优秀案例展播', date: '2025-01-05', icon: 'text-orange-500', logo: React.createElement('span', {className: "font-bold text-[10px]"}, "▶") },
        ],
        repos: [
            { name: 'Wechat-UOS', desc: 'Wechat Desktop Protocol Reverse Engineering.', stars: '3.1k', lang: 'Go' }
        ]
    }
};
