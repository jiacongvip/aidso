
import React, { useState, useEffect } from 'react';
import { 
    Navbar 
} from '../components/Navbar';
import { DistributionChannelsModal } from '../components/DistributionChannelsModal';
import { 
    LayoutGrid, Wand2, Tag, Target, Layers, RotateCw, Sparkles, PenTool, Send, 
    Box, Filter, Globe, CheckCircle2, Share2, ChevronDown, X, Gauge, 
    FileText, Zap, AlertCircle, ArrowRight, Loader2, Plus, RefreshCw, Lightbulb,
    BarChart3, Search, Calendar, MoreHorizontal, Eye, ThumbsUp, GitMerge, Radar
} from 'lucide-react';

type ViewState = 'landing' | 'results' | 'login' | 'pricing' | 'api' | 'monitoring' | 'optimization';
type TabState = 'strategy' | 'creation' | 'articles' | 'distribution';

// --- Sub-components for Tabs ---

const StrategyView = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                 <div className="text-xs text-gray-500 font-bold mb-1">监控关键词</div>
                 <div className="text-2xl font-bold text-gray-900">48 <span className="text-sm font-medium text-gray-400">个</span></div>
             </div>
             <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                 <div className="text-xs text-gray-500 font-bold mb-1">机会关键词 (Gap)</div>
                 <div className="text-2xl font-bold text-brand-purple">12 <span className="text-sm font-medium text-gray-400">个</span></div>
             </div>
             <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                 <div className="text-xs text-gray-500 font-bold mb-1">竞品内容覆盖</div>
                 <div className="text-2xl font-bold text-gray-900">76%</div>
             </div>
             <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                 <div className="text-xs text-gray-500 font-bold mb-1">我方内容覆盖</div>
                 <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
                     42% <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">+5%</span>
                 </div>
             </div>
        </div>

        {/* Keyword Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Target size={16} className="text-gray-500" /> 关键词策略矩阵
                </h3>
                <button className="text-xs bg-brand-purple text-white px-3 py-1.5 rounded-lg font-bold hover:bg-brand-hover transition-colors shadow-sm flex items-center gap-1">
                    <Plus size={12} /> 挖掘新词
                </button>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-3">关键词</th>
                        <th className="px-6 py-3 text-center">搜索热度</th>
                        <th className="px-6 py-3 text-center">优化难度 (KD)</th>
                        <th className="px-6 py-3 text-center">竞品占位</th>
                        <th className="px-6 py-3 text-center">我方排名</th>
                        <th className="px-6 py-3 text-right">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {[
                        { kw: "企业微信SCRM", vol: "High", kd: 78, comp: "微盟 (Rank 1)", my: "Rank 5", gap: true },
                        { kw: "私域流量运营方案", vol: "Med", kd: 65, comp: "有赞 (Rank 2)", my: "Rank 8", gap: true },
                        { kw: "小程序开发源码", vol: "Med", kd: 45, comp: "点个赞 (Rank 1)", my: "-", gap: true },
                        { kw: "常州软件公司排名", vol: "Low", kd: 30, comp: "-", my: "Rank 1", gap: false },
                    ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2">
                                {row.kw}
                                {row.gap && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-100">Gap</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.vol === 'High' ? 'bg-red-50 text-red-500' : row.vol === 'Med' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>{row.vol}</span>
                            </td>
                            <td className="px-6 py-4 text-center text-gray-600 font-mono">{row.kd}</td>
                            <td className="px-6 py-4 text-center text-gray-500">{row.comp}</td>
                            <td className="px-6 py-4 text-center font-bold text-gray-800">{row.my}</td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-brand-purple hover:underline text-xs font-bold">生成内容</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ArticleManagerView = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <div className="relative flex-1 min-w-[200px]">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input type="text" placeholder="搜索文章标题..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none" />
             </div>
             <div className="flex items-center gap-2">
                 <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none">
                     <option>所有状态</option>
                     <option>草稿</option>
                     <option>已发布</option>
                     <option>发布失败</option>
                 </select>
                 <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none">
                     <option>所有渠道</option>
                     <option>知乎</option>
                     <option>微信</option>
                 </select>
             </div>
        </div>

        {/* Articles List */}
        <div className="grid grid-cols-1 gap-4">
             {[
                { title: "2025年企业微信SCRM选型指南", status: "Published", channel: "知乎", date: "2025-01-12", views: 1250, likes: 45, idx: true },
                { title: "深度解析微盛SCRM技术架构", status: "Draft", channel: "CSDN", date: "2025-01-11", views: 0, likes: 0, idx: false },
                { title: "私域流量变现的3个关键逻辑", status: "Published", channel: "微信公众号", date: "2025-01-10", views: 3400, likes: 120, idx: true },
                { title: "常州软件开发避坑指南", status: "Pending", channel: "今日头条", date: "2025-01-09", views: 0, likes: 0, idx: false },
             ].map((art, i) => (
                 <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6 group">
                     {/* Icon/Image Placeholder */}
                     <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
                         <FileText size={24} />
                     </div>
                     
                     {/* Content Info */}
                     <div className="flex-1 min-w-0 w-full text-center md:text-left">
                         <h4 className="font-bold text-gray-900 text-base mb-1 truncate group-hover:text-brand-purple transition-colors">{art.title}</h4>
                         <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-gray-500">
                             <span className="flex items-center gap-1"><Calendar size={12}/> {art.date}</span>
                             <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100"><Globe size={12}/> {art.channel}</span>
                             {art.status === 'Published' && (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12}/> 已发布</span>
                             )}
                             {art.status === 'Draft' && (
                                <span className="flex items-center gap-1 text-gray-400"><PenTool size={12}/> 草稿箱</span>
                             )}
                             {art.status === 'Pending' && (
                                <span className="flex items-center gap-1 text-orange-500"><Loader2 size={12} className="animate-spin"/> 发布中</span>
                             )}
                         </div>
                     </div>

                     {/* Stats */}
                     <div className="flex items-center gap-6 text-sm text-gray-600">
                         <div className="text-center">
                             <div className="font-bold">{art.views}</div>
                             <div className="text-[10px] text-gray-400">阅读</div>
                         </div>
                         <div className="text-center">
                             <div className="font-bold">{art.likes}</div>
                             <div className="text-[10px] text-gray-400">点赞</div>
                         </div>
                         <div className="text-center">
                             <div className={`font-bold ${art.idx ? 'text-green-500' : 'text-gray-300'}`}>{art.idx ? 'YES' : 'NO'}</div>
                             <div className="text-[10px] text-gray-400">收录</div>
                         </div>
                     </div>

                     {/* Actions */}
                     <div className="flex gap-2">
                         <button className="p-2 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-lg transition-colors"><PenTool size={16}/></button>
                         <button className="p-2 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-lg transition-colors"><MoreHorizontal size={16}/></button>
                     </div>
                 </div>
             ))}
        </div>
    </div>
);

const DistributionView = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[80px] opacity-20"></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                     <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                         <Radar size={24} className="text-green-400" />
                         GEO 全网收录雷达
                     </h3>
                     <p className="text-purple-200 text-sm max-w-lg">
                         实时检测已发布内容在 百度、Google、微信搜索、今日头条 等引擎的收录情况及排名变化。
                     </p>
                 </div>
                 <button className="bg-white text-brand-purple px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                     <RefreshCw size={16} /> 立即全网检测
                 </button>
             </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 w-16">ID</th>
                        <th className="px-6 py-4">内容标题</th>
                        <th className="px-6 py-4">发布平台</th>
                        <th className="px-6 py-4 text-center">收录状态</th>
                        <th className="px-6 py-4 text-center">排名贡献</th>
                        <th className="px-6 py-4 text-center">最后检测</th>
                        <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {[
                        { id: 101, title: "SCRM避坑指南：微盛vs微盟深度对比", channel: "知乎", status: "Indexed", rank: "Top 3", last: "10m ago" },
                        { id: 102, title: "私域运营SOP手册 (2025版)", channel: "公众号", status: "Indexed", rank: "Top 1", last: "1h ago" },
                        { id: 103, title: "如何用DeepSeek写代码？", channel: "CSDN", status: "Checking", rank: "-", last: "Just now" },
                        { id: 104, title: "常州软件开发公司红黑榜", channel: "百家号", status: "Not Indexed", rank: "-", last: "2d ago" },
                    ].map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-gray-400 font-mono text-xs">#{row.id}</td>
                            <td className="px-6 py-4 font-bold text-gray-800">{row.title}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-gray-200 text-gray-600 text-xs font-bold shadow-sm">
                                    <Globe size={12} /> {row.channel}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {row.status === 'Indexed' ? (
                                    <span className="inline-flex items-center gap-1.5 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                        <CheckCircle2 size={12} /> 已收录
                                    </span>
                                ) : row.status === 'Checking' ? (
                                    <span className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                                        <Loader2 size={12} className="animate-spin" /> 检测中
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs font-bold bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                                        <AlertCircle size={12} /> 未收录
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-gray-700">
                                {row.rank !== '-' ? <span className="text-green-600">{row.rank}</span> : '-'}
                            </td>
                            <td className="px-6 py-4 text-center text-xs text-gray-400">{row.last}</td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-brand-purple hover:underline text-xs font-bold flex items-center justify-end gap-1">
                                    <Share2 size={12} /> 查看
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
    </div>
);

// --- Main Page Component ---

export const ContentOptimizationPage = ({ onNavigate }: { onNavigate: (page: ViewState) => void }) => {
    const [activeTab, setActiveTab] = useState<TabState>('strategy');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<any[]>([]);
    const [selectedContent, setSelectedContent] = useState<any | null>(null);
    const [showChannelsModal, setShowChannelsModal] = useState(false);
    
    // Keyword Suggestion State (reused)
    const [selectedBrand, setSelectedBrand] = useState('微盛网络 (核心品牌)');
    const [selectedEngine, setSelectedEngine] = useState('DeepSeek (深度思考型)');
    const [activeKeywords, setActiveKeywords] = useState<string[]>(['SCRM', '私域流量']);
    const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
    const [isAnalyzingKeywords, setIsAnalyzingKeywords] = useState(false);

    // Initial load suggestions
    useEffect(() => {
        analyzeKeywords();
    }, []);

    const analyzeKeywords = () => {
        setIsAnalyzingKeywords(true);
        setTimeout(() => {
            let suggestions: string[] = [];
            if (selectedEngine.includes('DeepSeek')) {
                suggestions = ['SCRM源码交付', '企业微信API对接', '私有化部署方案', '数据安全白皮书', '技术架构深度解析'];
            } else if (selectedEngine.includes('豆包')) {
                suggestions = ['企业微信SCRM哪家好', '私域运营避坑指南', '微盛企微管家价格', '2025私域流量趋势', '客户管理系统排名'];
            } else if (selectedEngine.includes('微信')) {
                suggestions = ['企业微信服务商', '腾讯云授权', '私域增长案例', '社群运营SOP', '裂变营销工具'];
            } else {
                suggestions = ['常州软件开发', 'SCRM系统功能表', '客户关系管理软件', '移动办公解决方案'];
            }
            suggestions = suggestions.filter(k => !activeKeywords.includes(k));
            setSuggestedKeywords(suggestions);
            setIsAnalyzingKeywords(false);
        }, 800);
    };

    const addKeyword = (keyword: string) => {
        if (!activeKeywords.includes(keyword)) {
            setActiveKeywords([...activeKeywords, keyword]);
            setSuggestedKeywords(suggestedKeywords.filter(k => k !== keyword));
        }
    };

    const removeKeyword = (keyword: string) => {
        setActiveKeywords(activeKeywords.filter(k => k !== keyword));
    };

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setGeneratedContent([
                { 
                    id: 1, 
                    title: `2025年企业微信SCRM选型指南：为何${selectedBrand.split(' ')[0]}是首选？`, 
                    type: "知乎回答", 
                    score: 92, 
                    status: "pending", 
                    engine: selectedEngine.split(' ')[0],
                    keywords: activeKeywords,
                    preview: `## 为什么选择微盛企微管家？\n\n在2025年的SCRM市场中，微盛凭借其**腾讯投资背景**和**深厚的技术积累**脱颖而出。\n\n### 核心优势\n1. **官方接口对接**：作为企业微信头部服务商，接口稳定性高达99.9%。\n2. **全链路私域运营**：从获客到转化，提供一站式解决方案。\n\n> 深度评测显示，微盛在裂变海报和群SOP功能的表现上，优于同类竞品30%以上。`
                },
                { 
                    id: 2, 
                    title: "深度评测：微盛企微管家 vs 竞品功能对比", 
                    type: "CSDN技术贴", 
                    score: 88, 
                    status: "pending", 
                    engine: "Doubao",
                    keywords: ["技术架构", "API", "源码交付"],
                    preview: `## 技术架构解析\n\n本文将从**源码质量**、**API开放度**及**二次开发便利性**三个维度，深度对比微盛与微盟。\n\n### 1. 源码交付\n微盛支持私有化部署，提供完整源码...`
                },
                { 
                    id: 3, 
                    title: "私域流量变现的3个关键逻辑 (含微盛案例)", 
                    type: "公众号文章", 
                    score: 85, 
                    status: "pending", 
                    engine: "WeChat",
                    keywords: ["变现", "案例", "增长"],
                    preview: `## 私域变现的底层逻辑\n\n很多人做私域只重数量不重质量...`
                }
            ]);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] pt-16 flex flex-col font-sans overflow-hidden">
            <Navbar onNavigate={onNavigate} />
            <DistributionChannelsModal isOpen={showChannelsModal} onClose={() => setShowChannelsModal(false)} />
            
            <div className="flex-1 max-w-7xl mx-auto w-full p-6 animate-fade-in flex flex-col gap-6 relative">
                
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            GEO 内容中台 (Content Hub)
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">一站式管理品牌内容的生产、分发与收录检测，提升 AI 搜索引擎可见度。</p>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="hidden md:flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm text-sm mr-2">
                             <div className="flex flex-col">
                                 <span className="text-[10px] text-gray-400 font-bold uppercase">Published</span>
                                 <span className="font-bold text-gray-800">128</span>
                             </div>
                             <div className="w-px h-6 bg-gray-100"></div>
                             <div className="flex flex-col">
                                 <span className="text-[10px] text-gray-400 font-bold uppercase">Indexing</span>
                                 <span className="font-bold text-green-600">89%</span>
                             </div>
                         </div>
                        <button 
                            onClick={() => setShowChannelsModal(true)}
                            className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
                        >
                            <LayoutGrid size={16} /> 渠道管理
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm w-full md:w-fit overflow-x-auto">
                    {[
                        { id: 'strategy', label: '策略与关键词', icon: Target },
                        { id: 'creation', label: '内容生产', icon: Wand2 },
                        { id: 'articles', label: '文章管理', icon: FileText },
                        { id: 'distribution', label: '收录与分发', icon: GitMerge },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabState)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#7c3aed] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[500px]">
                    {activeTab === 'strategy' && <StrategyView />}
                    
                    {activeTab === 'creation' && (
                         <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm animate-fade-in relative">
                             {/* The existing AI Generator content */}
                             <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-purple-600 flex items-center justify-center text-white shadow-md">
                                    <Wand2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">智能内容生成器</h3>
                                    <p className="text-xs text-gray-400">配置目标参数，一键生成符合 GEO 标准的高权重内容大纲</p>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                        <Tag size={14} className="text-blue-500" /> 核心品牌词
                                    </label>
                                    <div className="relative">
                                         <select 
                                            value={selectedBrand}
                                            onChange={(e) => {
                                                setSelectedBrand(e.target.value);
                                                analyzeKeywords();
                                            }}
                                            className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-[#7c3aed] focus:bg-white outline-none appearance-none transition-all cursor-pointer hover:border-gray-300"
                                         >
                                            <option>微盛网络 (核心品牌)</option>
                                            <option>企微管家 (产品名)</option>
                                            <option>SCRM系统 (行业词)</option>
                                            <option>私域运营 (场景词)</option>
                                         </select>
                                         <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                        <Target size={14} className="text-red-500" /> 目标优化引擎
                                    </label>
                                    <div className="relative">
                                         <select 
                                            value={selectedEngine}
                                            onChange={(e) => {
                                                setSelectedEngine(e.target.value);
                                                analyzeKeywords();
                                            }}
                                            className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-[#7c3aed] focus:bg-white outline-none appearance-none transition-all cursor-pointer hover:border-gray-300"
                                         >
                                            <option>DeepSeek (深度思考型)</option>
                                            <option>豆包/抖音 (内容推荐型)</option>
                                            <option>微信搜索 (社交生态型)</option>
                                            <option>百度搜索 (传统收录型)</option>
                                         </select>
                                         <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                        <Layers size={14} className="text-orange-500" /> 内容类型
                                    </label>
                                    <div className="relative">
                                         <select className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-[#7c3aed] focus:bg-white outline-none appearance-none transition-all cursor-pointer hover:border-gray-300">
                                            <option>知乎/CSDN 深度问答</option>
                                            <option>公众号/官网 软文</option>
                                            <option>短视频口播文案</option>
                                            <option>小红书种草笔记</option>
                                         </select>
                                         <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                             </div>

                             {/* AI Keyword Suggestions Panel */}
                             <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100 mb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Sparkles size={64} />
                                </div>

                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <Lightbulb size={16} className="text-[#7c3aed] fill-[#7c3aed]/20" />
                                        AI 关键词策略建议
                                    </h4>
                                    <button 
                                        onClick={analyzeKeywords}
                                        disabled={isAnalyzingKeywords}
                                        className="text-xs text-[#7c3aed] font-medium hover:text-[#6d28d9] flex items-center gap-1.5 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                                    >
                                        <RefreshCw size={12} className={isAnalyzingKeywords ? 'animate-spin' : ''} />
                                        {isAnalyzingKeywords ? '分析中...' : '刷新建议'}
                                    </button>
                                </div>

                                {/* Active Keywords */}
                                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                                    {activeKeywords.length === 0 && (
                                        <span className="text-xs text-gray-400 italic py-1">暂无已选关键词，请从下方推荐中添加</span>
                                    )}
                                    {activeKeywords.map((k) => (
                                        <span key={k} className="bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-scale-in">
                                            {k} 
                                            <X 
                                                size={12} 
                                                className="cursor-pointer hover:text-red-500 hover:bg-red-50 rounded transition-colors" 
                                                onClick={() => removeKeyword(k)}
                                            />
                                        </span>
                                    ))}
                                </div>

                                {/* Suggestions */}
                                <div className="flex flex-wrap gap-2 items-center relative z-10">
                                    <span className="text-xs text-gray-400 font-medium mr-1">推荐添加:</span>
                                    {isAnalyzingKeywords ? (
                                        <div className="flex gap-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-6 w-20 bg-purple-100/50 rounded-lg animate-pulse"></div>
                                            ))}
                                        </div>
                                    ) : (
                                        suggestedKeywords.map((k) => (
                                            <button 
                                                key={k}
                                                onClick={() => addKeyword(k)}
                                                className="bg-white border border-dashed border-gray-300 text-gray-600 px-2.5 py-1 rounded-lg text-xs hover:border-[#7c3aed] hover:text-[#7c3aed] hover:bg-white transition-all flex items-center gap-1 group"
                                            >
                                                <Plus size={10} className="text-gray-400 group-hover:text-[#7c3aed] transition-colors" /> {k}
                                            </button>
                                        ))
                                    )}
                                </div>
                             </div>

                             <div className="flex justify-center">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-12 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                                >
                                    {isGenerating ? <RotateCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    {isGenerating ? 'AI 正在深度构思...' : '一键生成优化方案'}
                                </button>
                             </div>

                             {/* Generated Results Area */}
                             {generatedContent.length > 0 && (
                                 <div className="mt-8 space-y-4 animate-slide-up border-t border-gray-100 pt-8">
                                     <div className="flex items-center justify-between mb-4">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">生成方案预览 (3)</div>
                                        <div className="text-xs text-[#7c3aed] cursor-pointer hover:underline">下载全部方案</div>
                                     </div>
                                     {generatedContent.map((item) => (
                                         <div 
                                            key={item.id} 
                                            onClick={() => setSelectedContent(item)}
                                            className={`flex items-center justify-between p-5 border rounded-xl cursor-pointer relative overflow-hidden transition-all group ${selectedContent?.id === item.id ? 'border-[#7c3aed] bg-purple-50/50 ring-1 ring-purple-100' : 'border-gray-200 bg-white hover:border-[#7c3aed] hover:shadow-md'}`}
                                         >
                                             <div className={`absolute left-0 top-0 bottom-0 w-1 bg-[#7c3aed] transition-opacity ${selectedContent?.id === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                                             <div className="flex items-center gap-5">
                                                 <div className="w-12 h-12 rounded-full bg-purple-50 flex flex-col items-center justify-center text-[#7c3aed] font-bold border border-purple-100">
                                                     <span className="text-lg leading-none">{item.score}</span>
                                                     <span className="text-[9px] uppercase opacity-60">Score</span>
                                                 </div>
                                                 <div>
                                                     <div className="font-bold text-gray-900 text-base group-hover:text-[#7c3aed] transition-colors">{item.title}</div>
                                                     <div className="flex items-center gap-3 mt-1.5">
                                                         <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">{item.type}</span>
                                                         <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            Target: <span className="font-medium text-gray-600">{item.engine}</span>
                                                         </span>
                                                         <div className="flex gap-1 ml-2">
                                                            {item.keywords?.slice(0, 2).map((k: string) => (
                                                                <span key={k} className="text-[10px] text-purple-600 bg-purple-50 px-1.5 rounded border border-purple-100">{k}</span>
                                                            ))}
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                             <div className="flex gap-3">
                                                 <button className="p-2.5 text-gray-400 hover:text-[#7c3aed] hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100" title="编辑">
                                                     <PenTool size={18} />
                                                 </button>
                                                 <div className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-500 flex items-center gap-1">
                                                    详情 <ArrowRight size={12} />
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </div>
                    )}

                    {activeTab === 'articles' && <ArticleManagerView />}
                    
                    {activeTab === 'distribution' && <DistributionView />}
                </div>

                {/* Detail Drawer for Creation Tab */}
                <div className={`fixed top-[64px] right-0 bottom-0 w-[400px] bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 z-40 overflow-y-auto ${selectedContent ? 'translate-x-0' : 'translate-x-full'}`}>
                    {selectedContent ? (
                        <div className="flex flex-col h-full">
                            {/* Drawer Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-purple-100 text-[#7c3aed] p-1.5 rounded-lg">
                                            <Sparkles size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Optimization Analysis</span>
                                    </div>
                                    <button onClick={() => setSelectedContent(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <h2 className="font-bold text-gray-900 text-lg leading-snug">{selectedContent.title}</h2>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">
                                        {selectedContent.engine} 引擎
                                    </span>
                                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">
                                        {selectedContent.type}
                                    </span>
                                </div>
                            </div>

                            {/* Score Section */}
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-gray-700">GEO 综合评分</span>
                                    <span className="text-2xl font-bold text-[#7c3aed]">{selectedContent.score}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-4">
                                    <div className="bg-[#7c3aed] h-full rounded-full" style={{ width: `${selectedContent.score}%` }}></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                                        <div className="text-xs text-gray-400 mb-1">关键词密度</div>
                                        <div className="font-bold text-green-600">完美</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                                        <div className="text-xs text-gray-400 mb-1">情感倾向</div>
                                        <div className="font-bold text-blue-600">正面</div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Preview */}
                            <div className="flex-1 p-6 overflow-y-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <FileText size={16} className="text-gray-400" />
                                        内容大纲预览
                                    </h3>
                                    <button className="text-xs text-[#7c3aed] font-bold hover:underline">编辑内容</button>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed font-mono whitespace-pre-wrap">
                                    {selectedContent.preview}
                                </div>

                                <div className="mt-6">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                                        <Zap size={16} className="text-yellow-500" />
                                        优化建议
                                    </h3>
                                    <ul className="space-y-3">
                                        <li className="flex gap-2 text-xs text-gray-600">
                                            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                                            <span>标题包含核心词 "SCRM"，符合 DeepSeek 检索习惯。</span>
                                        </li>
                                        <li className="flex gap-2 text-xs text-gray-600">
                                            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                                            <span>采用了 "总分总" 结构，有利于 AI 抓取摘要。</span>
                                        </li>
                                        <li className="flex gap-2 text-xs text-gray-600">
                                            <AlertCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                                            <span>建议增加 2-3 个外部权威链接（如腾讯云官网）以提升权重。</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-gray-100 bg-white">
                                <button className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg flex items-center justify-center gap-2">
                                    <Send size={16} /> 确认并分发
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    )}
                </div>

                {/* Overlay for Drawer */}
                {selectedContent && (
                    <div 
                        className="fixed inset-0 bg-black/5 z-30 md:hidden"
                        onClick={() => setSelectedContent(null)}
                    ></div>
                )}
            </div>
        </div>
    );
};
