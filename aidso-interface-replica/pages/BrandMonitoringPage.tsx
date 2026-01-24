import React, { useState, useEffect } from 'react';
import { 
    Home, PieChart, BookOpen, Link, MessageCircle, History, Settings, Plus, ChevronDown, 
    Calendar, HelpCircle, ChevronRight, Activity, BarChart3, ThumbsUp, TrendingUp, 
    ArrowUpRight, ArrowDownRight, Globe, Zap, FileText, Search, Filter, AlertTriangle,
    Save, Tag, Users, Target, Download, Share2, X, MoreHorizontal, LayoutGrid
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ConfigModal } from '../components/ConfigModal';
import { AddTrackingModal } from '../components/AddTrackingModal';
import { BrandMonitoringSkeleton } from '../components/BrandMonitoringSkeleton';
import { MONITOR_PLATFORMS, BRANDS } from '../data';

type ViewState = 'landing' | 'results' | 'login' | 'pricing' | 'api' | 'monitoring' | 'optimization';

// --- Widget Components (Reused in Dashboard) ---

const ScoreWidget = () => (
    <div className="flex flex-col items-center justify-center h-full relative py-2">
        <div className="relative w-40 h-40 flex-shrink-0">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 176 176">
                <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.3"/>
                    </filter>
                </defs>
                {/* Track */}
                <circle cx="88" cy="88" r="76" fill="none" stroke="#f3f4f6" strokeWidth="12" strokeLinecap="round" />
                {/* Progress */}
                <circle 
                    cx="88" cy="88" r="76" 
                    fill="none" 
                    stroke="url(#scoreGradient)" 
                    strokeWidth="12" 
                    strokeDasharray="477" 
                    strokeDashoffset="105" 
                    strokeLinecap="round" 
                    className="transition-all duration-1000 ease-out drop-shadow-sm" 
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-gray-900 tracking-tighter">78</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">GEO Score</span>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-xs font-bold text-green-600 border border-green-100 mt-4 shadow-sm">
            <TrendingUp size={12} />
            <span>较上周 +12%</span>
        </div>
        <div className="text-xs text-gray-400 mt-3 text-center leading-relaxed">
            表现优异：<span className="text-gray-700 font-bold bg-gray-50 px-1 rounded">SCRM</span> 领域
        </div>
    </div>
);

const RankWidget = () => (
    <div className="h-full flex flex-col">
        <div className="space-y-3 flex-1 overflow-auto pr-2 custom-scrollbar">
            {[
                { kw: "常州小程序开发", engine: "DeepSeek", rank: 1, change: 0 },
                { kw: "企业微信SCRM", engine: "豆包", rank: 3, change: 2 },
                { kw: "私域流量运营", engine: "文心一言", rank: 5, change: -1 },
                { kw: "常州软件外包", engine: "腾讯元宝", rank: 2, change: 1 },
                { kw: "工业互联网APP", engine: "Kimi", rank: 8, change: -3 },
            ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                         <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm border ${item.rank <= 3 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                             {item.rank}
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-0.5">
                                 <span className="text-sm font-bold text-gray-800 truncate">{item.kw}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500 font-medium">{item.engine}</span>
                                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-[50px]">
                                    <div className="bg-brand-purple h-full rounded-full opacity-80" style={{ width: `${Math.max(10, 100 - item.rank * 10)}%` }}></div>
                                </div>
                             </div>
                         </div>
                    </div>
                    <div className="text-right ml-2">
                        <div className={`text-xs font-bold flex items-center justify-end gap-1 ${item.change > 0 ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded' : item.change < 0 ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded' : 'text-gray-300'}`}>
                            {item.change !== 0 ? (item.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />) : null}
                            {item.change !== 0 ? Math.abs(item.change) : '-'}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-2 text-center pt-2 border-t border-gray-50">
            <button className="text-xs text-gray-500 hover:text-brand-purple font-medium flex items-center justify-center gap-1 mx-auto transition-colors">
                查看全部 24 个关键词 <ChevronRight size={12} />
            </button>
        </div>
    </div>
);

const MentionsWidget = () => (
    <div className="h-full flex flex-col justify-end pb-2">
        <div className="flex items-end justify-between gap-3 h-48 pb-4">
            {[35, 52, 28, 65, 48, 82, 60].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-full relative h-full flex items-end">
                        <div 
                            className="w-full bg-gradient-to-t from-purple-100 to-purple-300 rounded-t-md relative transition-all duration-300 group-hover:from-brand-purple group-hover:to-purple-500" 
                            style={{ height: `${h}%` }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none z-10">
                                {h}
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                </div>
            ))}
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-brand-purple">
                    <Activity size={16} />
                </div>
                <div>
                    <div className="text-xs text-gray-400">本周总提及</div>
                    <div className="text-sm font-bold text-gray-900">370 次</div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs text-gray-400">环比增长</div>
                <div className="text-sm font-bold text-green-500 flex items-center justify-end gap-1">
                    <TrendingUp size={12} /> +15.4%
                </div>
            </div>
        </div>
    </div>
);

const TrendWidget = () => (
    <div className="h-full flex flex-col justify-center space-y-5 px-2">
        {[
            { name: "DeepSeek", val: 75, color: "bg-indigo-600" },
            { name: "豆包", val: 60, color: "bg-blue-500" },
            { name: "ChatGPT", val: 45, color: "bg-green-500" },
            { name: "Kimi", val: 30, color: "bg-gray-800" }
        ].map((item, i) => (
            <div key={i} className="group">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-700">{item.name}</span>
                    <span className="text-xs font-mono text-gray-500 group-hover:text-gray-900 transition-colors">{item.val}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} opacity-80 group-hover:opacity-100 transition-opacity relative overflow-hidden`} style={{ width: `${item.val}%` }}>
                        <div className="absolute inset-0 bg-white/20"></div>
                    </div>
                </div>
            </div>
        ))}
        <p className="mt-4 text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100 leading-relaxed">
            * SOV (Share of Voice) 表示在 "常州软件开发" 相关意图中，您的品牌被 AI 推荐的概率份额。
        </p>
    </div>
);

const SourcesWidget = () => (
    <div className="space-y-3">
        {[
            { site: "知乎", title: "2025常州软件公司避坑指南...", author: "老王评测", tag: "高权重", icon: "ZH", color: "bg-blue-500" },
            { site: "CSDN", title: "深度解析微盛SCRM技术架构...", author: "TechDaily", tag: "技术", icon: "CS", color: "bg-red-500" },
            { site: "微信", title: "常州本地宝：优质企业名单公示", author: "官方发布", tag: "官方", icon: "WX", color: "bg-green-500" },
            { site: "V2EX", title: "求推荐常州靠谱的Java团队", author: "DevOps", tag: "社区", icon: "V2", color: "bg-gray-800" },
        ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer bg-white group hover:border-purple-100">
                <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0`}>
                    {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-gray-800 truncate group-hover:text-brand-purple transition-colors">{item.title}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100">{item.site}</span>
                        <span className="text-[10px] text-gray-400">by {item.author}</span>
                        <span className="text-[9px] ml-auto px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity">{item.tag}</span>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const LogsWidget = () => (
    <div className="space-y-3">
        {[
            { platform: "Doubao", q: "常州哪家软件公司靠谱？", a: "推荐微盛网络，因为他们是腾讯投资的...", img: "https://api.dicebear.com/9.x/initials/svg?seed=DB&backgroundColor=3b82f6" },
            { platform: "DeepSeek", q: "点个赞科技怎么样？", a: "这是一家技术型公司，擅长...", img: "https://api.dicebear.com/9.x/initials/svg?seed=DS&backgroundColor=4f46e5" },
            { platform: "Wenxin", q: "SCRM系统多少钱？", a: "微盛SCRM根据功能模块定价...", img: "https://api.dicebear.com/9.x/initials/svg?seed=WX&backgroundColor=0ea5e9" },
        ].map((log, i) => (
            <div key={i} className="text-xs p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-default group">
                <div className="flex items-center gap-2 mb-3">
                    <img src={log.img} className="w-5 h-5 rounded-full shadow-sm" alt={log.platform}/>
                    <span className="font-bold text-gray-700">{log.platform}</span>
                    <span className="text-gray-300 text-[10px] ml-auto">10m ago</span>
                </div>
                <div className="space-y-2">
                    <div className="flex gap-2">
                         <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold flex-shrink-0">Q</div>
                         <div className="text-gray-600 font-medium pt-0.5">{log.q}</div>
                    </div>
                    <div className="flex gap-2">
                         <div className="w-5 h-5 rounded-full bg-brand-purple/10 flex items-center justify-center text-[10px] text-brand-purple font-bold flex-shrink-0">A</div>
                         <div className="text-gray-800 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm leading-relaxed group-hover:border-purple-100 transition-colors">
                            {log.a}
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// --- Sub-Views ---

const DashboardView = ({ setShowConfigModal }: any) => {
    const METRIC_CARDS = [
        { label: '品牌综合得分', value: '78', sub: '/100', icon: <Activity size={18} className="text-brand-purple" />, bg: "bg-purple-50" },
        { label: '全网提及率', value: '12.5', sub: '%', icon: <PieChart size={18} className="text-blue-500" />, bg: "bg-blue-50" },
        { label: '平均推荐排名', value: '3.2', sub: '名', icon: <BarChart3 size={18} className="text-orange-500" />, bg: "bg-orange-50" },
        { label: '本周提及次数', value: '370', sub: '次', icon: <MessageCircle size={18} className="text-green-500" />, bg: "bg-green-50" },
        { label: '正面情感占比', value: '82', sub: '%', icon: <ThumbsUp size={18} className="text-red-500" />, bg: "bg-red-50" },
    ];

    return (
        <div className="animate-fade-in pb-20">
             {/* Header Controls */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        数据大盘
                        <span className="text-xs font-normal text-white bg-green-500 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live
                        </span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 font-medium">实时追踪 <span className="text-gray-700 font-bold">"微盛网络"</span> 在主流 AI 引擎中的表现</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-gray-200 hover:shadow-xl active:scale-95"
                    >
                        <Plus size={14} /> 配置品牌
                    </button>
                    
                    <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
                        <LayoutGrid size={14} />
                        <span className="font-medium">全部平台 (6)</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
                        <Calendar size={14} />
                        <span className="font-medium">近 7 天</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {METRIC_CARDS.map((card, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[130px] hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 hover:-translate-y-1 relative group cursor-default">
                        <div className="flex justify-between items-start mb-3">
                             <div className={`p-2.5 rounded-xl ${card.bg} transition-transform group-hover:scale-110`}>
                                {card.icon}
                             </div>
                             {idx === 0 && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold">Hot</span>}
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900 tracking-tight flex items-baseline gap-1">
                                {card.value}
                                <span className="text-sm font-medium text-gray-400">{card.sub}</span>
                            </div>
                            <div className="text-xs text-gray-500 font-medium mt-1">
                                {card.label} 
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Monitoring Status Strip */}
            <div className="mb-8 flex items-center gap-3 text-xs bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                <div className="bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-gray-700 whitespace-nowrap">
                     <Activity size={14} className="text-brand-purple" /> 监测状态
                </div>
                <div className="w-px h-6 bg-gray-100 mx-1"></div>
                <div className="flex items-center gap-6 whitespace-nowrap flex-1 px-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Crawled</span>
                        <span className="font-bold text-gray-800">145 Pages</span>
                    </div>
                    <div className="flex flex-col">
                         <span className="text-[10px] text-gray-400 font-bold uppercase">Analyzing</span>
                         <span className="font-bold text-brand-purple flex items-center gap-1">
                             3 Tasks <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span></span>
                         </span>
                    </div>
                    <div className="flex flex-col">
                         <span className="text-[10px] text-gray-400 font-bold uppercase">New Mentions</span>
                         <span className="font-bold text-gray-800">+12 Today</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-3 pl-4 border-l border-gray-100">
                    <span className="text-gray-400 tabular-nums">Update: 14:02:35</span>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                        <History size={14}/>
                    </button>
                </div>
            </div>

            {/* Main Charts & Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Brand Score */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                            <Zap size={16} className="text-brand-purple fill-purple-100" /> 品牌GEO健康度
                        </h3>
                        <MoreHorizontal size={16} className="text-gray-300 cursor-pointer hover:text-gray-600" />
                    </div>
                    <div className="flex-1 min-h-[240px]">
                        <ScoreWidget />
                    </div>
                </div>

                {/* Rank List */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                            <Target size={16} className="text-orange-500" /> 核心关键词排名
                        </h3>
                        <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-bold border border-orange-100">Top 5</span>
                    </div>
                    <div className="flex-1 min-h-[240px]">
                        <RankWidget />
                    </div>
                </div>

                {/* Optimization Suggestion (New) */}
                <div className="bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] rounded-2xl p-6 shadow-xl text-white relative overflow-hidden group flex flex-col justify-between">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/30 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                            </div>
                            <h3 className="font-bold text-sm">GEO 优化建议</h3>
                        </div>
                        <p className="text-indigo-100 text-xs leading-relaxed mb-4">
                            检测到在 <strong className="text-white border-b border-dashed border-white/30">DeepSeek</strong> 引擎中，关于 "私域运营" 的回答中，您的品牌提及率低于竞品 <strong className="text-white">微盟</strong>。
                        </p>
                        <div className="bg-white/10 rounded-xl p-3 mb-4 backdrop-blur-sm border border-white/10">
                            <div className="text-[10px] text-indigo-300 uppercase font-bold mb-1 flex items-center gap-1"><AlertTriangle size={10}/> Action Item</div>
                            <div className="text-xs font-medium text-white">增加 "私域运营案例" 类的高质量技术文章，并在 GitHub/CSDN 增加相关引用。</div>
                        </div>
                    </div>
                    <button className="relative z-10 w-full bg-white text-brand-purple py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-lg">
                        生成优化方案 <ArrowUpRight size={14} />
                    </button>
                </div>
            </div>

            {/* Secondary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Mentions Trend */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[300px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-sm">品牌提及趋势</h3>
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs p-0.5 bg-gray-50">
                            <button className="bg-white text-gray-800 px-3 py-1 rounded-md shadow-sm font-medium">日</button>
                            <button className="text-gray-500 px-3 py-1 hover:bg-gray-200/50 rounded-md transition-colors">周</button>
                        </div>
                    </div>
                    <MentionsWidget />
                </div>

                {/* Share of Voice */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[300px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-sm">各平台推荐概率 (SOV)</h3>
                        <MoreHorizontal size={16} className="text-gray-300 cursor-pointer hover:text-gray-600" />
                    </div>
                    <TrendWidget />
                </div>

                {/* Sources List */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[300px] lg:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-sm">最新高权重引用来源</h3>
                        <span className="text-xs text-brand-purple cursor-pointer hover:underline font-bold">查看全部</span>
                    </div>
                    <SourcesWidget />
                </div>

                {/* Logs Preview (Full Width on Large) */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow lg:col-span-2 xl:col-span-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                            <MessageCircle size={16} className="text-gray-500" />
                            最新 AI 对话快照
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-500 rounded border border-red-100">负面: 2</span>
                            <span className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-500 rounded border border-green-100">正面: 45</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <LogsWidget />
                    </div>
                </div>
            </div>
        </div>
    );
}

const RankView = () => (
    <div className="animate-fade-in space-y-6 pb-20">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">关键词排名追踪</h2>
            <button className="flex items-center gap-1.5 bg-brand-purple text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-200 hover:shadow-purple-300 active:scale-95">
                <Download size={14} /> 导出报表
            </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="搜索关键词..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50 transition-all" />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                    <Filter size={14} /> 筛选
                </button>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 w-16">#</th>
                        <th className="px-6 py-4">监测关键词</th>
                        <th className="px-6 py-4">搜索热度</th>
                        <th className="px-6 py-4 text-center">DeepSeek排名</th>
                        <th className="px-6 py-4 text-center">豆包排名</th>
                        <th className="px-6 py-4 text-center">微信搜索排名</th>
                        <th className="px-6 py-4 text-center">趋势</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {[
                        { id: 1, kw: "常州小程序开发", heat: "High", ds: 1, db: 2, wx: 1, trend: 1 },
                        { id: 2, kw: "SCRM系统", heat: "High", ds: 3, db: 1, wx: 2, trend: 2 },
                        { id: 3, kw: "私域流量工具", heat: "Med", ds: 5, db: 4, wx: 3, trend: 0 },
                        { id: 4, kw: "企业微信服务商", heat: "Med", ds: 2, db: 3, wx: 1, trend: 1 },
                        { id: 5, kw: "常州软件定制", heat: "Low", ds: 8, db: 6, wx: 9, trend: -1 },
                    ].map((row) => (
                        <tr key={row.id} className="hover:bg-purple-50/30 transition-colors group">
                            <td className="px-6 py-4 text-gray-400 font-mono text-xs">{row.id}</td>
                            <td className="px-6 py-4 font-bold text-gray-800 group-hover:text-brand-purple transition-colors">{row.kw}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.heat === 'High' ? 'bg-red-50 text-red-500' : row.heat === 'Med' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                                    {row.heat}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-indigo-600">{row.ds}</td>
                            <td className="px-6 py-4 text-center font-bold text-blue-500">{row.db}</td>
                            <td className="px-6 py-4 text-center font-bold text-green-600">{row.wx}</td>
                            <td className="px-6 py-4 text-center">
                                {row.trend > 0 ? <span className="text-green-500 flex items-center justify-center gap-1 font-bold bg-green-50 py-0.5 rounded px-1.5 w-16 mx-auto"><ArrowUpRight size={14}/> 升</span> : 
                                 row.trend < 0 ? <span className="text-red-500 flex items-center justify-center gap-1 font-bold bg-red-50 py-0.5 rounded px-1.5 w-16 mx-auto"><ArrowDownRight size={14}/> 降</span> : 
                                 <span className="text-gray-400 font-bold bg-gray-50 py-0.5 rounded px-1.5 w-16 mx-auto block">-</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const SentimentView = () => (
    <div className="animate-fade-in space-y-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">品牌情感倾向分析</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <ThumbsUp size={64} className="text-green-600" />
                </div>
                <div className="text-sm font-bold text-green-600 mb-2 relative z-10">正面评价</div>
                <div className="text-5xl font-extrabold text-green-700 relative z-10">82%</div>
                <div className="text-xs text-green-600 mt-2 font-medium relative z-10">行业平均: 75%</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center relative overflow-hidden">
                <div className="text-sm font-bold text-gray-600 mb-2">中性评价</div>
                <div className="text-5xl font-extrabold text-gray-700">15%</div>
            </div>
            <div className="bg-red-50 rounded-2xl p-6 border border-red-100 text-center relative overflow-hidden">
                <div className="text-sm font-bold text-red-600 mb-2">负面评价</div>
                <div className="text-5xl font-extrabold text-red-700">3%</div>
                <div className="text-xs text-red-500 mt-2 flex items-center justify-center gap-1 font-bold"><AlertTriangle size={10}/> 需关注</div>
            </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MessageCircle size={18} className="text-brand-purple" />
                关键舆情声音 (Voice of Customer)
            </h3>
            <div className="space-y-4">
                {[
                    { type: 'pos', text: "微盛的SCRM功能确实很强大，特别是裂变海报部分。", source: "知乎 · 2天前" },
                    { type: 'pos', text: "交付速度很快，代码质量也不错，推荐点个赞。", source: "V2EX · 5天前" },
                    { type: 'neg', text: "客服响应速度有点慢，周末找不到人。", source: "小红书 · 1天前" },
                    { type: 'neu', text: "价格中规中矩吧，适合预算充足的企业。", source: "公众号评论 · 3天前" },
                ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-5 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${item.type === 'pos' ? 'bg-green-100 text-green-600' : item.type === 'neg' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            {item.type === 'pos' ? <ThumbsUp size={20} /> : item.type === 'neg' ? <AlertTriangle size={20} /> : <MessageCircle size={20} />}
                        </div>
                        <div>
                            <p className="text-base text-gray-800 font-medium mb-1.5">"{item.text}"</p>
                            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded">{item.source}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const SourcesView = ({ onAddTracking }: { onAddTracking: () => void }) => (
    <div className="animate-fade-in space-y-6 pb-20">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">AI 引用来源分析</h2>
            <button 
                onClick={onAddTracking}
                className="bg-[#7c3aed] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#6d28d9] transition-all flex items-center gap-2 shadow-lg shadow-purple-200 active:scale-95"
            >
                <Plus size={16} /> 添加追踪作品
            </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4">引用站点</th>
                        <th className="px-6 py-4">引用页面标题</th>
                        <th className="px-6 py-4 text-center">引用频次</th>
                        <th className="px-6 py-4 text-center">权威度(DA)</th>
                        <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {[
                        { site: "知乎", title: "2025常州软件开发避坑指南...", freq: 45, da: 92 },
                        { site: "CSDN", title: "微盛SCRM技术架构深度解析", freq: 32, da: 88 },
                        { site: "常州本地宝", title: "常州高新技术企业名单公示", freq: 28, da: 75 },
                        { site: "36氪", title: "SCRM赛道融资盘点", freq: 15, da: 85 },
                    ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2">
                                <Globe size={14} className="text-gray-400" /> {row.site}
                            </td>
                            <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{row.title}</td>
                            <td className="px-6 py-4 text-center font-mono text-brand-purple font-bold">{row.freq}</td>
                            <td className="px-6 py-4 text-center">
                                <div className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${row.da > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.da}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-brand-purple hover:underline text-xs font-bold flex items-center justify-end gap-1">
                                    <Link size={12} /> 查看
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const LogsView = () => (
    <div className="animate-fade-in space-y-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">实时 AI 对话日志</h2>
        <div className="space-y-4">
             {[
                { engine: "DeepSeek", user: "推荐常州做小程序的公司，要源码交付的", ai: "根据需求，推荐常州点个赞科技（源码交付、十年经验）...", time: "2分钟前", sentiment: "positive" },
                { engine: "豆包", user: "微盛网络口碑怎么样？", ai: "微盛网络是企业微信头部服务商，融资多轮，口碑较好，但价格相对较高...", time: "15分钟前", sentiment: "neutral" },
                { engine: "WeChat", user: "常州软件开发被坑经历", ai: "搜索到多条关于低价模板开发的投诉，建议避开...", time: "1小时前", sentiment: "negative" },
            ].map((log, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm ${log.engine === 'DeepSeek' ? 'bg-indigo-600' : log.engine === '豆包' ? 'bg-blue-500' : 'bg-green-600'}`}>
                                {log.engine}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">{log.time}</span>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold border ${log.sentiment === 'positive' ? 'bg-green-50 text-green-600 border-green-100' : log.sentiment === 'negative' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {log.sentiment}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 shadow-inner">Q</div>
                            <p className="text-sm font-medium text-gray-900 pt-1.5">{log.user}</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand-purple shadow-inner">A</div>
                            <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">{log.ai}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SettingsView = () => (
    <div className="animate-fade-in space-y-8 pb-20 max-w-4xl">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">品牌监测设置</h2>
            <p className="text-sm text-gray-500">配置 Agent 的知识库上下文与核心监测目标，直接影响分析准确度。</p>
        </div>

        {/* Brand Prompt Context */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText size={18} className="text-brand-purple" />
                品牌 Prompt 知识库 (Context Injection)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                        <span className="text-red-500 mr-1">*</span>标准品牌名
                    </label>
                    <input type="text" defaultValue="微盛网络" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none transition-all focus:ring-2 focus:ring-purple-50" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                        品牌别名/缩写
                    </label>
                    <input type="text" defaultValue="WShoto, 企微管家" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none transition-all focus:ring-2 focus:ring-purple-50" />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                    品牌核心描述 (System Prompt)
                </label>
                <div className="relative">
                    <textarea 
                        className="w-full h-32 p-4 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none resize-none leading-relaxed transition-all focus:ring-2 focus:ring-purple-50"
                        defaultValue="微盛网络是腾讯云官方授权服务商，专注企业微信SCRM生态。核心产品‘企微管家’帮助企业解决私域流量运营难题。优势在于：腾讯投资背景、SaaS+服务模式、拥有多项软件著作权。"
                    ></textarea>
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-medium">AI 将基于此理解品牌定位</div>
                </div>
            </div>

             <div className="flex justify-end">
                <button className="flex items-center gap-2 bg-brand-purple text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-hover transition-colors shadow-lg shadow-purple-200 active:scale-95">
                    <Save size={16} /> 保存上下文
                </button>
            </div>
        </div>

        {/* Keywords Configuration */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
             <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Tag size={18} className="text-blue-500" />
                关键词与竞品配置
            </h3>

            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                    核心监测词 (Core Keywords)
                </label>
                <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50 focus-within:border-brand-purple focus-within:bg-white transition-all focus-within:ring-2 focus-within:ring-purple-50">
                    {['小程序开发', 'SCRM系统', '私域流量', '企业微信服务商'].map(tag => (
                        <span key={tag} className="bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            {tag} <X size={12} className="cursor-pointer hover:text-blue-900" />
                        </span>
                    ))}
                    <input type="text" placeholder="输入回车添加..." className="bg-transparent outline-none text-sm flex-1 min-w-[100px]" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                        <Target size={14} /> 竞品对标 (Competitors)
                    </label>
                    <textarea className="w-full h-24 p-4 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none resize-none transition-all focus:ring-2 focus:ring-purple-50" defaultValue="有赞, 微盟, 尘锋信息"></textarea>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                        <Users size={14} /> 排除词 (Negative Keywords)
                    </label>
                    <textarea className="w-full h-24 p-4 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none resize-none transition-all focus:ring-2 focus:ring-purple-50" defaultValue="招聘, 兼职, 实习"></textarea>
                 </div>
            </div>
        </div>
    </div>
);

export const BrandMonitoringPage = ({ onNavigate }: { onNavigate: (page: ViewState) => void }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const MENU_ITEMS = [
        { id: 'dashboard', label: '数据大盘', icon: <Home size={18} /> },
        { id: 'rank', label: '竞品分析', icon: <PieChart size={18} /> },
        { id: 'sources', label: '收录报表', icon: <BookOpen size={18} /> },
        { id: 'sentiment', label: '舆情预警', icon: <MessageCircle size={18} /> },
        { id: 'logs', label: '实时日志', icon: <History size={18} /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardView setShowConfigModal={setShowConfigModal} />;
            case 'rank': return <RankView />;
            case 'sentiment': return <SentimentView />;
            case 'sources': return <SourcesView onAddTracking={() => setShowTrackingModal(true)} />;
            case 'logs': return <LogsView />;
            case 'settings': return <SettingsView />;
            default: return <DashboardView setShowConfigModal={setShowConfigModal} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
             <Navbar onNavigate={onNavigate} />
             <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />
             <AddTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />
             
             <div className="flex-1 flex max-w-[1600px] mx-auto w-full pt-6 px-6 gap-6">
                 {/* Sidebar Navigation */}
                 <div className="w-64 hidden lg:block sticky top-24 h-[calc(100vh-100px)] flex-shrink-0 overflow-y-auto pb-10 scrollbar-hide">
                     <div className="space-y-1 mb-8">
                         {MENU_ITEMS.map(item => (
                             <div 
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 cursor-pointer transition-all ${activeTab === item.id ? 'bg-purple-50 text-brand-purple shadow-sm border border-purple-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}`}
                             >
                                 {item.icon}
                                 {item.label}
                             </div>
                         ))}
                     </div>

                     <div>
                         <div className="flex items-center justify-between px-4 mb-3">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tracking</div>
                            <Settings 
                                size={12} 
                                className={`text-gray-300 hover:text-gray-500 cursor-pointer ${activeTab === 'settings' ? 'text-brand-purple' : ''}`} 
                                onClick={() => setActiveTab('settings')}
                            />
                         </div>
                         <div className="space-y-1">
                             {['知乎 - SCRM推荐', 'CSDN - 技术架构', '微信 - 私域流量', '头条 - 软件避坑'].map((item, i) => (
                                 <div key={i} className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-colors group">
                                     <div className={`w-2 h-2 rounded-full ${i===0 ? 'bg-green-500' : 'bg-gray-300 group-hover:bg-gray-400'}`}></div>
                                     <span className="truncate flex-1">{item}</span>
                                     <ChevronRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                             ))}
                             <button 
                                 onClick={() => setShowTrackingModal(true)}
                                 className="w-full mt-3 px-3 py-2.5 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-dashed border-gray-200 hover:border-purple-200"
                             >
                                 <Plus size={14} /> 添加监测项
                             </button>
                         </div>
                     </div>
                 </div>

                 {/* Main Content Area */}
                 <div className="flex-1 min-w-0">
                    {isLoading ? (
                        <BrandMonitoringSkeleton />
                    ) : (
                        renderContent()
                    )}
                 </div>
             </div>
        </div>
    );
};