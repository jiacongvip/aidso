import React, { useState, useEffect } from 'react';
import { Database, Zap, Layers, Sparkles, Bot, ChevronRight, RefreshCw, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchCard } from '../components/SearchCard';
import { CAPABILITIES, TRENDING, PLACEHOLDERS, BRANDS } from '../data';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { estimateCostUnits, getBillingPricing, type BillingPricing } from '../services/billing';

// Heat Bar Component
const HeatBar = ({ value }: { value: string }) => {
    const num = parseInt(value.replace('w', ''));
    const max = 150;
    const percent = Math.min((num / max) * 100, 100);
    
    return (
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            <div 
                className="h-full bg-gradient-to-r from-brand-purple to-purple-400 rounded-full" 
                style={{ width: `${percent}%` }}
            />
        </div>
    );
};

const RealTimeMonitor = () => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const initialLogs = Array.from({ length: 6 }).map((_, i) => ({
            id: `init-${i}`,
            node: `node_${Math.random().toString(16).slice(2, 8)}.json`,
            latency: Math.floor(Math.random() * 50) + 10
        }));
        setLogs(initialLogs);

        const interval = setInterval(() => {
            setLogs(prev => {
                const newLog = {
                    id: Date.now().toString(),
                    node: `node_${Math.random().toString(16).slice(2, 8)}.json`,
                    latency: Math.floor(Math.random() * 50) + 10
                };
                return [newLog, ...prev.slice(0, 5)];
            });
        }, 1200);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex-1 space-y-3 relative z-10 overflow-hidden">
            {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/5 border border-white/5 animate-slide-in-right">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                    <span className="text-gray-300 font-mono">已同步</span>
                    <span className="text-gray-400 truncate flex-1">{log.node}</span>
                    <span className="text-brand-purple font-bold">{log.latency}ms</span>
                </div>
            ))}
        </div>
    );
};

const HomeContent = ({ onSelectTopic }: { onSelectTopic: (topic: string) => void }) => (
    <div className="w-full max-w-6xl mx-auto mt-12 px-4 md:px-0 animate-fade-in pb-12">
        
        {/* Section Header */}
        <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">平台核心能力</h2>
            <p className="text-gray-500 text-sm">构建下一代 AI 搜索引擎的基础设施</p>
        </div>

        {/* Features Grid - Enhanced */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-16">
             {CAPABILITIES.map((cap, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-purple-100/50 hover:-translate-y-1 transition-all duration-300 group cursor-default relative overflow-hidden">
                     {/* Hover Gradient Background */}
                     <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 to-purple-50/0 group-hover:from-purple-50/50 group-hover:to-transparent transition-all duration-500"></div>
                     
                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all text-gray-600 group-hover:text-brand-purple group-hover:scale-110 duration-300">
                                {React.cloneElement(cap.icon as React.ReactElement<any>, { size: 24 })}
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-gray-900 tabular-nums group-hover:text-brand-purple transition-colors">{cap.stat}</div>
                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{cap.statLabel}</div>
                            </div>
                        </div>
                        
                        <h3 className="font-bold text-gray-900 text-base mb-2 group-hover:text-brand-purple transition-colors">{cap.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-600">{cap.desc}</p>
                     </div>
                 </div>
             ))}
        </div>

        {/* Data & Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Trending Table (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-card border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Flame size={120} />
                </div>
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-500">
                            <Flame size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">全网 AI 热搜风向</h3>
                            <p className="text-xs text-gray-400 mt-0.5">实时聚合各平台技术热点</p>
                        </div>
                    </div>
                    <button className="text-xs text-gray-500 hover:text-brand-purple flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                        <RefreshCw size={12} /> 换一换
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 relative z-10">
                    {TRENDING.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => onSelectTopic(item.title)}
                            className="flex items-center gap-4 py-3 border-b border-dashed border-gray-50 last:border-0 hover:bg-gray-50/80 rounded-lg px-2 -mx-2 cursor-pointer group transition-all"
                        >
                            <span className={`text-sm font-bold w-6 text-center tabular-nums ${idx < 3 ? 'text-brand-purple scale-110' : 'text-gray-300'}`}>
                                {item.rank}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-700 font-medium truncate group-hover:text-brand-purple transition-colors mb-0.5">
                                    {item.title}
                                </div>
                                <div className="flex items-center gap-2 md:hidden">
                                     <span className="text-[10px] text-gray-400">{item.heat}</span>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <HeatBar value={item.heat} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Real-time Monitor (1/3 width) */}
            <div className="bg-gray-900 rounded-3xl p-6 shadow-card text-white relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,#7c3aed_0%,transparent_40%)] opacity-20"></div>
                
                <div className="relative z-10 mb-6">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                        <RefreshCw size={16} className="text-green-400 animate-spin" style={{animationDuration: '3s'}} />
                        实时索引监控
                    </h3>
                    <p className="text-xs text-gray-400">正在抓取全网最新数据节点</p>
                </div>

                <RealTimeMonitor />

                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-3xl font-bold mb-1">1,024<span className="text-sm text-gray-500 font-normal ml-1">/s</span></div>
                            <div className="text-[10px] text-gray-400">当前吞吐量 (QPS)</div>
                        </div>
                        <div className="h-10 w-20 flex items-end gap-1">
                            {[40, 70, 50, 90, 60, 80, 45].map((h, i) => (
                                <div key={i} className="flex-1 bg-brand-purple rounded-t-sm" style={{ height: `${h}%`, opacity: 0.5 + (i * 0.1) }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { 
        searchType, setSearchType, selectedBrands, toggleBrand, 
        isSearching, setIsSearching, query, setQuery, setHasSearched 
    } = useSearch();
    const { addToast } = useToast();
    const { addTask } = useTasks();
    
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [pricing, setPricing] = useState<BillingPricing | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        getBillingPricing().then(setPricing);
    }, []);

    const onSearch = async () => {
        if (selectedBrands.length === 0) {
            addToast('请至少选择一个AI模型', 'info');
            return;
        }
        if (!query.trim()) {
            addToast('请输入搜索内容', 'info');
            return;
        }

        if (!user) {
            addToast('请先登录后执行任务', 'info');
            navigate('/login');
            return;
        }
        
        setIsSearching(true);
        setHasSearched(false);
        try {
            await addTask({ keyword: query.trim(), searchType, models: selectedBrands });
            navigate('/results');
        } catch (err: any) {
            addToast(err?.message || '创建任务失败', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col relative overflow-hidden">
             {/* Tech Background - White Mode */}
             <div className="absolute top-0 left-0 w-full h-[700px] bg-white overflow-hidden -z-10">
                {/* Tech Grid - Light Gray */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_80%,transparent_100%)]"></div>
                
                {/* Subtle Glows - Soft Purple & Blue */}
                <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-100/50 rounded-full blur-[100px] mix-blend-multiply animate-pulse-slow"></div>
                <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply animate-pulse-slow" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-[80px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
             </div>

             {/* Navbar is handled by MainLayout, but we need transparent effect?
                 MainLayout renders Navbar. Navbar checks location. 
                 If path is /, Navbar uses isLanding=true (transparent).
                 So we don't need to render Navbar here.
             */}
             
             <div className="flex-1 flex flex-col items-center pt-32 pb-20 px-6 relative z-10">
                 <div className="text-center max-w-4xl mx-auto mb-12 animate-fade-in-up">
                     {/* Badge */}
                     <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-purple-100 shadow-sm text-xs font-bold text-brand-purple mb-8 animate-bounce-in ring-1 ring-purple-50 backdrop-blur-sm">
                        <Sparkles size={12} />
                        <span className="tracking-wide">全新 DeepSeek V3 引擎已接入</span>
                     </div>
                     
                     {/* Headline - High Contrast Dark */}
                     <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
                         打破<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-blue-600">信息茧房</span>，<br className="hidden md:block"/>
                         洞察 AI 搜索全貌。
                     </h1>
                     
                     {/* Subtitle - Gray */}
                     <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
                         国内首个聚合 DeepSeek、豆包、元宝等主流 AI 引擎的实时搜索分析平台。<br className="hidden md:block"/>
                         一键对比不同模型的搜索结果、引用来源与 GEO 排名权重。
                     </p>
                 </div>

                 <SearchCard 
                    searchType={searchType}
                    setSearchType={setSearchType}
                    selectedBrands={selectedBrands}
                    toggleBrand={toggleBrand}
                    onSearch={onSearch}
                    isSearching={isSearching}
                    query={query}
                    setQuery={setQuery}
                    estimatedCostUnits={
                        estimateCostUnits({ models: selectedBrands, searchType, pricing }) ??
                        selectedBrands.length * (searchType === 'deep' ? 2 : 1)
                    }
                    className="shadow-2xl shadow-purple-900/5 ring-1 ring-gray-900/5 backdrop-blur-xl bg-white/80"
                    placeholder={PLACEHOLDERS[placeholderIndex]}
                 />
                 
                 <HomeContent onSelectTopic={(topic) => setQuery(`试着问：${topic}`)} />
             </div>
             
             {/* Footer is handled by MainLayout */}
        </div>
    );
};
