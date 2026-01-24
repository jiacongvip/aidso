
export const getTodayDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getCurrentTime = () => {
    const date = new Date();
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    return { date: getTodayDate(), time: timeStr };
};

// Agent Mock Data Types & Generator
export interface AnalysisResult {
  summary: string;
  topKeywords: string[];
  sentiment: 'Positive' | 'Neutral' | 'Mixed';
  
  // New GEO fields - Aligned with User's Framework
  geoMetrics: {
    // Phase 1: Visibility (占位)
    brandMentionRate: number; // 品牌提及率
    productBindingRate: number; // 品牌产品绑定率
    
    // Phase 2: Conversion (决策)
    topRankingRate: number; // 排名前列占比
    citationRate: number; // 引用结构化内容比率
    semanticConsistency: number; // 语义标签一致性
  };

  keywordExpansion: {
    term: string;
    volume: string;
    difficulty: number; // 1-100
    intent: string;
  }[];
  geoTactics: {
    title: string;
    desc: string;
    impact: 'High' | 'Medium' | 'Low';
    icon: string;
    category: 'Crawlable' | 'Understandable' | 'Citeable'; // New Categories
  }[];
  rankingFactors: {
    name: string;
    score: number; // 0-100
    status: 'Good' | 'Warning' | 'Critical';
    suggestion: string;
  }[];

  // Enhanced fields
  competitors: {
    name: string;
    url: string;
    aiVisibility: number; // 0-100
    strengths: string[];
    weaknesses: string[];
  }[];
  contentGaps: {
    topic: string;
    importance: 'High' | 'Medium' | 'Low';
    currentCoverage: number; // 0-100
    suggestion: string;
  }[];
  aiVisibilityBreakdown: { engine: string; score: number }[];
  
  // New GEO Optimization Process & Creation Scenarios
  geoProcess: {
    step: number;
    title: string;
    desc: string;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
  aiCreationScenarios: {
    title: string;
    desc: string;
    icon: string;
  }[];
}

export interface TargetSite {
  id: number;
  name: string;
  url: string;
  type: 'Forum' | 'Blog' | 'Social' | 'News';
  authority: number; // 1-100
  relevance: number; // 1-100
  action: string;
  reason: string;
}

export interface StrategyStep {
  step: number;
  title: string;
  desc: string;
}

export const generateMockData = (keyword: string) => {
  const sites: TargetSite[] = [
    { id: 1, name: '知乎 (Zhihu)', url: 'https://zhihu.com', type: 'Forum', authority: 95, relevance: 98, action: '发布深度回答', reason: '多个模型引用了该平台的讨论，用户关注度极高。' },
    { id: 2, name: '掘金 (Juejin)', url: 'https://juejin.cn', type: 'Blog', authority: 88, relevance: 92, action: '发布技术实战文', reason: '技术类关键词在此平台权重很高，易被搜索引擎收录。' },
    { id: 3, name: 'V2EX', url: 'https://v2ex.com', type: 'Forum', authority: 85, relevance: 89, action: '参与相关话题讨论', reason: '极客人群聚集地，适合推广工具类产品。' },
    { id: 4, name: '微信公众号', url: 'https://mp.weixin.qq.com', type: 'Social', authority: 92, relevance: 85, action: '发布行业分析报告', reason: '私域流量沉淀的最佳渠道。' },
    { id: 5, name: 'CSDN', url: 'https://csdn.net', type: 'Blog', authority: 90, relevance: 80, action: '同步技术教程', reason: 'SEO 权重高，长尾流量丰富。' },
  ];

  const analysis: AnalysisResult = {
    summary: `针对关键词 "${keyword}"，我们分析了 GPT-4、Claude 3.5 和 Gemini Pro 的回复。普遍认为该领域目前处于上升期，用户主要关注点在于"落地成本"和"使用体验"。`,
    topKeywords: ['效率工具', '自动化', 'AI落地', '降本增效', '私有化部署'],
    sentiment: 'Positive',
    
    // New Mock Data
    geoMetrics: {
        brandMentionRate: 65,
        productBindingRate: 42,
        topRankingRate: 28,
        citationRate: 35,
        semanticConsistency: 70
    },
    keywordExpansion: [
        { term: keyword + " 教程", volume: "12k", difficulty: 45, intent: "Informational" },
        { term: keyword + " 最佳实践", volume: "8.5k", difficulty: 60, intent: "Commercial" },
        { term: keyword + " 开源替代方案", volume: "5.2k", difficulty: 30, intent: "Transactional" },
        { term: "为什么需要 " + keyword, volume: "3.1k", difficulty: 20, intent: "Informational" },
        { term: keyword + " vs 竞品对比", volume: "2.8k", difficulty: 75, intent: "Commercial" }
    ],
    geoTactics: [
        { title: "结构化数据注入", desc: "在落地页添加 FAQ Schema 和 How-to Schema，提升 AI 爬虫的理解效率。", impact: "High", icon: "Code", category: "Crawlable" },
        { title: "Robots.txt 优化", desc: "确保 AI 爬虫（如 GPTBot）未被屏蔽，并优化抓取配额。", impact: "High", icon: "Code", category: "Crawlable" },
        { title: "对话式内容重构", desc: "将传统说明文改为 Q&A 格式，模拟用户与 AI 的对话场景，增加被引用概率。", impact: "Medium", icon: "MessageCircle", category: "Understandable" },
        { title: "语义标签强化", desc: "使用 H1-H3 清晰标记段落层级，重点段落增加 Strong 标签。", impact: "Medium", icon: "FileText", category: "Understandable" },
        { title: "权威引用建设", desc: "在 arXiv 或 GitHub Readme 中增加指向性链接，提升领域权威性 (E-E-A-T)。", impact: "High", icon: "Link", category: "Citeable" },
        { title: "数据溯源锚点", desc: "在核心数据图表中增加可点击的来源引用，方便 AI 验证真实性。", impact: "High", icon: "Link", category: "Citeable" }
    ],
    rankingFactors: [
        { name: "内容相关性", score: 92, status: "Good", suggestion: "当前内容与关键词高度匹配。" },
        { name: "域名权威性", score: 65, status: "Warning", suggestion: "建议增加 .edu 或 .org 的外链引用。" },
        { name: "用户交互信号", score: 45, status: "Critical", suggestion: "页面停留时间过短，建议增加互动演示模块。" },
        { name: "更新频率", score: 88, status: "Good", suggestion: "保持周更频率即可。" }
    ],
    competitors: [
        { name: "TechFlow AI", url: "techflow.ai", aiVisibility: 85, strengths: ["结构化数据完善", "高频更新"], weaknesses: ["缺乏深度技术案例"] },
        { name: "NextGen Tools", url: "nextgen.io", aiVisibility: 72, strengths: ["GitHub 引用多"], weaknesses: ["移动端体验差"] },
        { name: "SaaS Master", url: "saasmaster.com", aiVisibility: 60, strengths: ["长尾词覆盖广"], weaknesses: ["页面加载慢", "内容陈旧"] }
    ],
    contentGaps: [
        { topic: "私有化部署成本分析", importance: "High", currentCoverage: 20, suggestion: "补充具体的服务器配置清单和价格对比表。" },
        { topic: "API 接入文档", importance: "Medium", currentCoverage: 45, suggestion: "增加 Python 和 Node.js 的代码示例。" },
        { topic: "数据安全合规性", importance: "High", currentCoverage: 10, suggestion: "详细说明 GDPR 和 SOC2 合规情况。" }
    ],
    aiVisibilityBreakdown: [
        { engine: "DeepSeek", score: 92 },
        { engine: "GPT-4", score: 78 },
        { engine: "Claude 3.5", score: 65 },
        { engine: "Perplexity", score: 85 }
    ],
    geoProcess: [
        { step: 1, title: "用户需求洞察", desc: "分析 Top 20 搜索长尾词，挖掘用户真实意图。", status: "completed" },
        { step: 2, title: "关键词拆解训练", desc: "将核心词拆解为 '问题-答案' 对，投喂给私有模型进行微调测试。", status: "in_progress" },
        { step: 3, title: "结构化内容生产", desc: "基于 JSON-LD 标准生成 FAQ 和 How-to 内容。", status: "pending" },
        { step: 4, title: "渠道投放", desc: "分发至知乎、CSDN 及垂直行业论坛。", status: "pending" }
    ],
    aiCreationScenarios: [
        { title: "品牌故事", desc: "生成富有感染力的品牌起源故事，强化用户情感连接。", icon: "BookOpen" },
        { title: "产品宣传", desc: "自动生成多版本产品介绍文案（专业版/通俗版/营销版）。", icon: "Megaphone" },
        { title: "营销活动", desc: "策划节日营销活动方案及配套海报文案。", icon: "Gift" }
    ]
  };

  const strategy: StrategyStep[] = [
    { step: 1, title: '内容铺垫', desc: '在知乎和 V2EX 发布 2-3 篇关于 "痛点分析" 的软文，不直接带广告，引发共鸣。' },
    { step: 2, title: '核心引流', desc: '在掘金发布硬核技术实现文章，文末附带 GitHub 或 试用链接。' },
    { step: 3, title: '口碑发酵', desc: '监控相关关键词，使用 Agent 自动回复潜在用户的疑问，引导至私域。' }
  ];

  return { sites, analysis, strategy };
};
