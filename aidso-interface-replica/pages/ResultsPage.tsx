import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { SearchCard } from '../components/SearchCard';
import { ResultCard, MetricItem } from '../components/ResultCard';
import { ResultSkeleton } from '../components/ResultSkeleton';
import { BrandKeywordModal } from '../components/BrandKeywordModal';
import { BRANDS, PLATFORM_DATA } from '../data';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { estimateCostUnits, getBillingPricing, type BillingPricing } from '../services/billing';
import { apiJson } from '../services/api';
import { 
  X, Database, RefreshCw, Activity, Code, LayoutTemplate, 
  Bot, Terminal, Loader2, Trash2, Maximize2, Link as LinkIcon, ChevronRight, 
  GitFork, Star, GitBranch 
} from 'lucide-react';

// 正在执行的任务卡片组件
const RunningTaskCard = ({ task, onOpenBrandKeywords }: { task: any; onOpenBrandKeywords?: () => void }) => {
    const [showProgress, setShowProgress] = useState(false);
    
    const currentTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const currentDate = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-');

    return (
        <div className="w-full max-w-5xl mx-auto mt-6">
            {/* 主卡片 - 类似 ResultCard 样式 */}
            <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/5 overflow-hidden">
                {/* 头部区域 */}
                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                {task.searchType === 'deep' ? '深度' : '快速'}
                            </span>
                            <h2 className="text-lg font-bold text-gray-900">{task.keyword}</h2>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">
                            正在分析中，请稍候...
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                            <button 
                                onClick={() => setShowProgress(!showProgress)}
                                className="flex items-center gap-1.5 bg-brand-purple text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-brand-purple/90 transition-colors"
                            >
                                <Loader2 size={14} className="animate-spin" />
                                {showProgress ? '收起进度' : '查看进度'}
                            </button>
                        </div>
                    </div>

                    {/* 右侧指标区域 */}
                    <div className="flex items-center gap-0 border-l border-gray-100 pl-4">
                        {/* 推荐建议 */}
                        <div className="flex flex-col items-center justify-center px-5 min-w-[70px]">
                            <span className="text-xs text-purple-600 font-medium mb-1 bg-purple-50 px-1.5 py-0.5 rounded">推荐建议</span>
                            <div className="flex items-center gap-1">
                                <Loader2 size={16} className="text-brand-purple animate-spin" />
                            </div>
                            <span className="text-xs text-gray-400 mt-0.5">热度值</span>
                        </div>
                        {/* 添加品牌词 */}
                        <div 
                            className="flex flex-col items-center justify-center px-5 min-w-[70px] border-l border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors rounded"
                            onClick={onOpenBrandKeywords}
                        >
                            <span className="text-xs text-brand-purple font-medium mb-1">+ 添加品牌词</span>
                            <span className="text-2xl font-bold text-gray-300">-</span>
                            <span className="text-xs text-gray-400 mt-0.5">等待中</span>
                        </div>
                        {/* 引用网站 */}
                        <div className="flex flex-col items-center justify-center px-5 min-w-[70px] border-l border-gray-100">
                            <span className="text-2xl font-bold text-gray-300">-</span>
                            <span className="text-xs text-gray-400 mt-0.5">引用网站</span>
                        </div>
                        {/* 引用文章 */}
                        <div className="flex flex-col items-center justify-center px-5 min-w-[70px] border-l border-gray-100">
                            <span className="text-2xl font-bold text-gray-300">-</span>
                            <span className="text-xs text-gray-400 mt-0.5">引用文章</span>
                        </div>
                        {/* 时间 */}
                        <div className="flex flex-col items-center justify-center px-5 min-w-[70px] border-l border-gray-100">
                            <span className="text-lg font-bold text-gray-700">{currentTime}</span>
                            <span className="text-xs text-gray-400 mt-0.5">{currentDate}</span>
                        </div>
                    </div>
                </div>

                {/* 执行状态行 */}
                <div className="bg-gradient-to-r from-purple-50 to-white px-5 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-700">正在执行中</span>
                            </div>
                            <span className="text-sm text-gray-500">|</span>
                            <span className="text-sm text-gray-500">进度: <span className="font-bold text-brand-purple">{task.progress || 0}%</span></span>
                        </div>
                        {/* 模型列表 */}
                        <div className="flex items-center gap-2">
                            {task.selectedModels?.slice(0, 3).map((model: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200">
                                    <Loader2 size={10} className="text-brand-purple animate-spin" />
                                    <span className="text-xs font-medium text-gray-600">{model}</span>
                                </div>
                            ))}
                            {task.selectedModels?.length > 3 && (
                                <span className="text-xs text-gray-400">+{task.selectedModels.length - 3}</span>
                            )}
                        </div>
                    </div>
                    {/* 进度条 */}
                    <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-brand-purple to-purple-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${task.progress || 0}%` }}
                        ></div>
                    </div>
                </div>

                {/* 表头 */}
                <div className="bg-gray-50 px-5 py-2.5 grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 border-y border-gray-100">
                    <div className="col-span-2">AI对话平台</div>
                    <div className="col-span-2 text-center hidden md:block">提及次数/排名</div>
                    <div className="col-span-2 text-center hidden md:block">情感倾向</div>
                    <div className="col-span-3 hidden md:block">引用来源</div>
                    <div className="col-span-3 text-right">提及品牌</div>
                </div>

                {/* 模型行 - 等待状态 */}
                {task.selectedModels?.map((model: string, idx: number) => (
                    <div key={idx} className="px-5 py-3.5 grid grid-cols-12 gap-4 items-center border-b border-gray-50 last:border-b-0">
                        <div className="col-span-6 md:col-span-2 flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center text-xs font-bold text-purple-600">
                                {model.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800 text-sm">{model}</span>
                        </div>
                        <div className="hidden md:flex col-span-2 justify-center">
                            <Loader2 size={14} className="text-gray-400 animate-spin" />
                        </div>
                        <div className="hidden md:flex col-span-2 justify-center">
                            <span className="text-gray-400 text-sm">-</span>
                        </div>
                        <div className="hidden md:block col-span-3">
                            <span className="text-gray-400 text-sm">等待分析...</span>
                        </div>
                        <div className="col-span-6 md:col-span-3 flex justify-end">
                            <span className="text-gray-400 text-sm">-</span>
                        </div>
                    </div>
                ))}

                {/* 底部提示 */}
                <div className="px-5 py-3 bg-gray-50/50 flex justify-center">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        正在获取AI分析结果...
                    </span>
                </div>
            </div>

            {/* 展开的进度详情 */}
            {showProgress && (
                <div className="mt-3 bg-gray-900 rounded-xl p-4 animate-fade-in">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Terminal size={14} className="text-purple-400" />
                        执行日志
                    </h3>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {task.logs && task.logs.length > 0 ? (
                            <div className="space-y-1.5">
                                {task.logs.map((log: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm font-mono">
                                        <span className="text-gray-500 text-xs flex-shrink-0 w-6 text-right">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <span className={`${
                                            log.includes('✅') ? 'text-green-400' :
                                            log.includes('❌') ? 'text-red-400' :
                                            log.includes('⚠️') ? 'text-yellow-400' :
                                            log.includes('🤖') || log.includes('🧠') ? 'text-blue-400' :
                                            log.includes('🔍') || log.includes('🏷️') ? 'text-purple-400' :
                                            'text-gray-300'
                                        }`}>
                                            {log}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 text-gray-400 text-sm mt-2 pl-8">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>等待下一步...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                正在初始化任务...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ResultsPage = () => {
    const navigate = useNavigate();
    const { 
        query, setQuery, searchType, setSearchType, 
        selectedBrands, toggleBrand, isSearching, setIsSearching, 
    } = useSearch();
    const { addToast } = useToast();
    const { user } = useAuth();
    const { tasks, activeTaskId, addTask, deleteTask } = useTasks();

    const activeTask = tasks.find(t => t.id === activeTaskId) || tasks[0] || null;
    const isTaskRunning = !!activeTask && (activeTask.status === 'running' || activeTask.status === 'pending');
    const isTaskCompleted = !!activeTask && activeTask.status === 'completed';
    const isTaskFailed = !!activeTask && activeTask.status === 'failed';
    
    // Local state for results view
    const [showDetail, setShowDetail] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState('豆包');
    const [isSyncing, setIsSyncing] = useState(false);
    const [viewMode, setViewMode] = useState<'preview' | 'json' | 'dom' | 'runs'>('preview');
    const [pricing, setPricing] = useState<BillingPricing | null>(null);
    const [taskRunsById, setTaskRunsById] = useState<Record<string, any[]>>({});
    const [runsLoading, setRunsLoading] = useState(false);
    const [runsError, setRunsError] = useState('');
    const [showBrandKeywordModal, setShowBrandKeywordModal] = useState(false);

    useEffect(() => {
        getBillingPricing().then(setPricing);
    }, []);

    useEffect(() => {
        const first = activeTask?.selectedModels?.[0];
        if (!first) return;
        if (!activeTask?.selectedModels?.includes(selectedPlatform)) {
            setSelectedPlatform(first);
        }
    }, [activeTask?.id]);

    useEffect(() => {
        if (!showDetail) return;
        if (viewMode !== 'runs') return;
        if (!activeTask?.id) return;
        if (taskRunsById[activeTask.id]) return;

        setRunsLoading(true);
        setRunsError('');
        apiJson<any[]>(`/api/tasks/${activeTask.id}/runs`)
            .then(({ res, data }) => {
                if (!res.ok) throw new Error((data as any)?.error || '加载失败');
                if (!Array.isArray(data)) throw new Error('响应格式错误');
                setTaskRunsById((prev) => ({ ...prev, [activeTask.id]: data }));
            })
            .catch((err: any) => {
                setRunsError(err?.message || '加载失败');
            })
            .finally(() => setRunsLoading(false));
    }, [activeTask?.id, showDetail, taskRunsById, viewMode]);

    const handleSearch = async () => {
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
        try {
            await addTask({ keyword: query.trim(), searchType, models: selectedBrands });
            addToast('任务已创建，正在执行中...', 'success');
        } catch (err: any) {
            addToast(err?.message || '创建任务失败', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    // Simulate fetching trace logs when switching platforms
    useEffect(() => {
        if(showDetail) {
            setIsSyncing(true);
            const timer = setTimeout(() => {
                setIsSyncing(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [selectedPlatform, showDetail]);

    // Helper consts for data
    const currentPlatformData =
        (activeTask?.result?.platformData && activeTask.result.platformData[selectedPlatform]) ||
        PLATFORM_DATA[selectedPlatform] ||
        PLATFORM_DATA[activeTask?.selectedModels?.[0] || '豆包'] ||
        PLATFORM_DATA['豆包'];

    return (
        <>
            <div className="flex-1 px-6 relative z-10 pb-20 pt-20">
               <SearchCard 
                    searchType={searchType}
                    setSearchType={setSearchType}
                    selectedBrands={selectedBrands}
                    toggleBrand={toggleBrand}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                    query={query}
                    setQuery={setQuery}
                    estimatedCostUnits={
                        estimateCostUnits({ models: selectedBrands, searchType, pricing }) ??
                        selectedBrands.length * (searchType === 'deep' ? 2 : 1)
                    }
               />
               
               {/* 任务执行状态 - 卡片样式 */}
               {(isSearching || isTaskRunning) && activeTask && (
                   <RunningTaskCard 
                       task={activeTask} 
                       onOpenBrandKeywords={() => setShowBrandKeywordModal(true)}
                   />
               )}

               {/* 初始搜索时的加载状态（还没有 activeTask） */}
               {isSearching && !activeTask && <ResultSkeleton />}
               
	               {!isSearching && (isTaskCompleted || isTaskFailed) && activeTask && (
	                   <ResultCard 
	                        task={activeTask}
	                        onOpenDetail={() => setShowDetail(true)}
	                        onOpenBrandKeywords={() => setShowBrandKeywordModal(true)}
	                   />
	               )}
               
               {!isSearching && !isTaskRunning && !activeTask && (
                    <div className="text-center py-20 text-gray-400">
                        <div className="inline-block p-4 rounded-full bg-gray-100 mb-4">
                            <Trash2 size={24} />
                        </div>
                        <p>暂无任务，请在上方发起搜索</p>
                    </div>
               )}
            </div>

            {/* Detail Modal Overlay - Full Screen Style (Global) */}
            {showDetail && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in overflow-hidden">
                     
                     {/* Close Button Top Right */}
                     <button 
                        onClick={() => setShowDetail(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors z-[110]"
                     >
                        <X size={24} />
                     </button>

                     <div className="w-full h-full max-w-[1600px] flex gap-6">
                         
                         {/* Left Sidebar: Platforms */}
                         <div className="w-[180px] flex flex-col gap-4 py-4 animate-slide-in-right" style={{animationDelay: '0.1s'}}>
                             <div className="text-white/80 font-bold text-sm px-2">对话平台</div>
                             <div className="space-y-3">
                                 {(activeTask?.selectedModels?.length ? activeTask.selectedModels : BRANDS.map(b => b.name)).map((name) => {
                                     const brand = BRANDS.find((b) => b.name === name);
                                     const icon = brand?.icon || BRANDS[0]?.icon;
                                     return (
                                     <div 
                                        key={name}
                                        onClick={() => setSelectedPlatform(name)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedPlatform === name ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-purple-900/20' : 'bg-white text-gray-700 border-white hover:bg-gray-50'}`}
                                     >
                                         <img src={icon} className="w-8 h-8 rounded-full border border-white/20" alt={name} />
                                         <span className="font-bold text-sm">{name}</span>
                                     </div>
                                 );
                                 })}
                             </div>
                         </div>

                         {/* Main Content Area */}
                         <div className="flex-1 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in relative">
                             
                             {/* Loading Overlay for Sync Simulation */}
                             {isSyncing && (
                                 <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-brand-purple animate-fade-in">
                                     <Loader2 size={40} className="animate-spin mb-3" />
                                     <div className="font-bold text-sm">正在同步 {selectedPlatform} 搜索记录...</div>
                                     <div className="text-xs text-gray-500 font-mono mt-1">Downloading trace logs from upstream...</div>
                                 </div>
                             )}

                             {/* Header: Title & Metrics */}
                             <div className="border-b border-gray-100 p-6 pb-2">
                                 <div className="flex items-center justify-between text-sm font-bold text-gray-900 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Database size={14} className="text-brand-purple" />
                                        已同步 {selectedPlatform} 搜索记录
                                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                                            <RefreshCw size={8} className="animate-spin" style={{animationDuration: '3s'}} />
                                            LIVE
                                        </span>
                                    </div>
                                    
                                    {/* View Mode Toggle */}
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setViewMode('preview')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Activity size={14} /> 预览模式
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('json')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'json' ? 'bg-gray-800 text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Code size={14} /> 原始协议
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('dom')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'dom' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <LayoutTemplate size={14} /> 网页快照(DOM)
                                        </button>
                                        <button
                                            onClick={() => setViewMode('runs')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                viewMode === 'runs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Terminal size={14} /> 运行记录
                                        </button>
                                    </div>
                                 </div>
                                 
                                 {/* Title & Metrics Row */}
                                 <div className="flex items-center h-[72px]">
                                     <div className="flex-1 pr-8">
                                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{activeTask?.keyword || query}</h2>
                                     </div>
                                     
                                    {/* Metrics - Horizontal Layout */}
                                    <div className="flex items-center border-l border-gray-100 pl-4 h-full">
                                        <div className="flex flex-col items-center justify-center px-6 min-w-[80px]">
                                           <div className="bg-purple-50 text-brand-purple text-[10px] font-bold px-1.5 py-1 rounded flex flex-col items-center leading-none border border-purple-100/50 mb-1">
                                               <span className="scale-90 block">推荐</span>
                                               <span className="scale-90 block mt-[1px]">建议</span>
                                           </div>
                                           <span className="text-[10px] text-gray-300 mt-auto">问题类型</span>
                                        </div>

                                        <MetricItem 
                                            label="热度值" 
                                            value={(currentPlatformData.brands?.length || 0).toString()} 
                                            isFire 
                                            className="border-none min-h-[50px] py-0" 
                                        />
                                        
                                        <div className="w-px h-8 bg-gray-100"></div>

                                        <div className="flex flex-col items-center justify-center px-6 min-w-[80px]">
                                           <div className="text-base font-bold text-orange-600 tabular-nums">
                                               {currentPlatformData.brands?.length || 0}
                                           </div>
                                           <span className="text-[10px] text-gray-400">品牌词</span>
                                        </div>

                                        <div className="w-px h-8 bg-gray-100"></div>
                                        <MetricItem label="提及次数/排名" value="-/-" className="border-none min-h-[50px] py-0" />
                                        <div className="w-px h-8 bg-gray-100"></div>
                                        <MetricItem label="情感倾向" value="正面" className="border-none min-h-[50px] py-0" />
                                        <div className="w-px h-8 bg-gray-100"></div>
                                        <MetricItem label="引用网站" value={currentPlatformData.sources?.length?.toString() || '0'} className="border-none min-h-[50px] py-0" />
                                        <div className="w-px h-8 bg-gray-100"></div>
                                        <MetricItem label="引用文章" value={currentPlatformData.sources?.length?.toString() || '0'} className="border-none min-h-[50px] py-0" />
                                        <div className="w-px h-8 bg-gray-100"></div>
                                        
                                        <div className="flex flex-col items-center justify-center px-6 min-w-[80px]">
                                            <div className="text-base font-bold text-gray-800 tabular-nums">{activeTask?.usageDate || new Date().toISOString().slice(0, 10)}</div>
                                            <span className="text-[10px] text-gray-400 mt-0.5">搜索时间</span>
                                        </div>
                                    </div>
                                 </div>
                             </div>

                            {/* Brand Chips Row */}
                            <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-3 flex items-center gap-4">
                                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                                    AI对话提及全部品牌 ({currentPlatformData.brands?.length || 0})
                                </span>
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                    {(currentPlatformData.brands || []).map((brand: string, idx: number) => (
                                        <div key={idx} className="bg-brand-purple text-white px-3 py-1 rounded text-[11px] font-bold whitespace-nowrap shadow-sm">
                                            {brand}
                                        </div>
                                    ))}
                                    {(!currentPlatformData.brands || currentPlatformData.brands.length === 0) && (
                                        <span className="text-xs text-gray-400">暂无品牌信息</span>
                                    )}
                                </div>
                            </div>

                             {/* Main Content Area based on View Mode */}
                             {viewMode === 'preview' ? (
                                <div className="flex-1 flex overflow-hidden bg-gray-50/30">
                                 
                                 {/* Left Column: Chat Conversation */}
                                 <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100 pr-4">
                                     <div className="mb-4 flex items-center justify-between">
                                         <h3 className="font-bold text-gray-700 text-sm">对话原文 (已同步 {selectedPlatform})</h3>
                                     </div>
                                     
                                     <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                         {/* Header inside chat bubble */}
                                         <div className="bg-blue-50/50 p-4 border-b border-blue-100/50 flex justify-end">
                                              <div className="bg-white px-4 py-2 rounded-lg text-sm font-bold text-gray-800 shadow-sm border border-gray-100">
                                                  {activeTask?.keyword || query}
                                              </div>
                                         </div>

                                         <div className="p-6">
                                             <div className="flex gap-4">
                                                 <img src={BRANDS.find(b => b.name === selectedPlatform)?.icon || BRANDS[0].icon} className="w-10 h-10 rounded-full border border-gray-100" alt="Avatar" />
                                                 <div className="flex-1">
                                                     <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                                         {selectedPlatform}
                                                         <span className="text-[10px] text-gray-400 font-normal bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                             {currentPlatformData.engine}
                                                         </span>
                                                     </div>
                                                     
                                                     {/* Deep Thinking Block */}
                                                     <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                                                         <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
                                                             <span>深度思考过程 (Trace Log)</span>
                                                             <Maximize2 size={12} className="text-gray-400" />
                                                         </div>
                                                         <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-mono">
                                                             {currentPlatformData.thinking}
                                                         </div>
                                                     </div>

                                                     {/* Main Response Content */}
                                                     <div className="text-sm text-gray-800 leading-relaxed space-y-4 whitespace-pre-wrap">
                                                        {/* Simple parser to highlight [x] citations */}
                                                        {currentPlatformData.response.split(/(\[\d+\])/g).map((part: string, i: number) => {
                                                            if (part.match(/^\[\d+\]$/)) {
                                                                return <span key={i} className="text-brand-purple font-bold cursor-pointer hover:underline mx-0.5">{part}</span>;
                                                            }
                                                            // Handle Bold Text **text**
                                                            return part.split(/(\*\*.*?\*\*)/g).map((subPart, j) => {
                                                                if (subPart.startsWith('**') && subPart.endsWith('**')) {
                                                                    return <strong key={`${i}-${j}`} className="font-bold text-gray-900">{subPart.slice(2, -2)}</strong>;
                                                                }
                                                                return subPart;
                                                            });
                                                        })}
                                                         
                                                         <div className="mt-4 space-y-2">
                                                             <div className="flex gap-2">
                                                                 <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 border border-gray-200">Sync ID:</span>
                                                                 <div className="flex flex-wrap gap-2">
                                                                     <span className="px-2 py-1 bg-white rounded text-xs text-gray-400 border border-gray-200 shadow-sm font-mono">{Math.random().toString(36).substring(7)}</span>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Right Column: Cited Sources */}
                                 <div className="w-[420px] p-6 overflow-y-auto bg-white border-l border-gray-100 pl-4">
                                     <div className="mb-4 flex items-center justify-between">
                                         <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                             <LinkIcon size={14} />
                                             {selectedPlatform} 引用来源
                                         </h3>
                                         <div className="text-xs text-gray-400 cursor-pointer hover:text-brand-purple flex items-center gap-1">
                                             <ChevronRight size={14} className="rotate-90" /> 收起
                                         </div>
                                     </div>

                                     <div className="border border-gray-100 rounded-lg overflow-hidden mb-6">
                                         <table className="w-full text-xs">
                                             <thead className="bg-gray-50 text-gray-500 font-medium">
                                                 <tr>
                                                     <th className="px-3 py-2 text-center w-10">序号</th>
                                                     <th className="px-3 py-2 text-left">站点名称</th>
                                                     <th className="px-3 py-2 text-left">标题</th>
                                                     <th className="px-3 py-2 text-right">发布时间</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-gray-50">
                                                 {currentPlatformData.sources.map((source: any, idx: number) => (
                                                     <tr key={source.id} className="hover:bg-gray-50/50 transition-colors">
                                                         <td className="px-3 py-2.5 text-center text-gray-400 tabular-nums">{idx + 1}</td>
                                                         <td className="px-3 py-2.5">
                                                             <div className="flex items-center gap-1.5 text-gray-600">
                                                                 <div className={`${source.icon}`}>{source.logo}</div>
                                                                 <span className="truncate max-w-[60px]">{source.site}</span>
                                                             </div>
                                                         </td>
                                                         <td className="px-3 py-2.5 text-gray-800 truncate max-w-[120px]" title={source.title}>{source.title}</td>
                                                         <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{source.date}</td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>

                                     {/* Open Source Intelligence Section */}
                                     {currentPlatformData.repos && (
                                        <div className="animate-fade-in">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                                    <GitFork size={14} className="text-gray-500" />
                                                    开源情报 (OSINT)
                                                </h3>
                                                <div className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">
                                                    GITHUB
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {currentPlatformData.repos.map((repo: any, i: number) => (
                                                    <div key={i} className="border border-gray-200 rounded-lg p-3 hover:border-brand-purple hover:shadow-sm transition-all bg-gray-50/50 cursor-pointer group">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-brand-purple text-xs group-hover:underline">{repo.name}</span>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-100">
                                                                <Star size={10} fill="currentColor" className="text-yellow-400" />
                                                                {repo.stars}
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] text-gray-600 leading-tight mb-2 line-clamp-2">{repo.desc}</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                                <div className={`w-2 h-2 rounded-full ${repo.lang === 'Python' ? 'bg-blue-400' : repo.lang === 'TypeScript' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                                                                {repo.lang}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto">
                                                                <GitBranch size={10} />
                                                                master
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                 )}
                                 </div>
                                </div>
                             ) : (
                                viewMode === 'runs' ? (
                                    <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                                <Terminal size={14} className="text-gray-500" />
                                                任务运行记录（数据库 TaskModelRun）
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (!activeTask?.id) return;
                                                    setTaskRunsById((prev) => {
                                                        const next = { ...prev };
                                                        delete next[activeTask.id];
                                                        return next;
                                                    });
                                                }}
                                                className="text-xs font-bold text-brand-purple hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                                            >
                                                刷新
                                            </button>
                                        </div>

                                        {runsLoading ? (
                                            <div className="text-sm text-gray-400">加载中...</div>
                                        ) : runsError ? (
                                            <div className="text-sm text-red-600">{runsError}</div>
                                        ) : activeTask?.id && (taskRunsById[activeTask.id] || []).length > 0 ? (
                                            <div className="space-y-3">
                                                {(taskRunsById[activeTask.id] || []).map((r: any) => (
                                                    <details
                                                        key={r.id}
                                                        className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
                                                    >
                                                        <summary className="cursor-pointer flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-bold text-gray-900 truncate">
                                                                    {r.purpose === 'ANALYSIS' ? 'DeepSeek 深度解析' : r.modelKey}
                                                                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-white">
                                                                        {r.purpose}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">
                                                                    {r.provider || '-'} · {r.modelName || '-'}
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                                                    r.status === 'SUCCEEDED'
                                                                        ? 'bg-green-50 text-green-700 border border-green-100'
                                                                        : r.status === 'FAILED'
                                                                            ? 'bg-red-50 text-red-700 border border-red-100'
                                                                            : r.status === 'RUNNING'
                                                                                ? 'bg-purple-50 text-brand-purple border border-purple-100'
                                                                                : 'bg-gray-50 text-gray-600 border border-gray-200'
                                                                }`}
                                                            >
                                                                {r.status}
                                                            </span>
                                                        </summary>

                                                        <div className="mt-3 space-y-3">
                                                            {(r.startedAt || r.completedAt) && (
                                                                <div className="text-[11px] text-gray-500 font-mono">
                                                                    startedAt: {r.startedAt ? new Date(r.startedAt).toLocaleString() : '-'} ·
                                                                    completedAt: {r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}
                                                                </div>
                                                            )}

                                                            {r.error && (
                                                                <div className="text-xs text-red-600 whitespace-pre-wrap">{r.error}</div>
                                                            )}

                                                            {r.prompt && (
                                                                <div>
                                                                    <div className="text-xs font-bold text-gray-700 mb-1">Prompt</div>
                                                                    <pre className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap text-gray-700">
                                                                        {r.prompt}
                                                                    </pre>
                                                                </div>
                                                            )}

                                                            {r.responseText && (
                                                                <div>
                                                                    <div className="text-xs font-bold text-gray-700 mb-1">Response</div>
                                                                    <pre className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap text-gray-700">
                                                                        {r.responseText}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </details>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400">暂无运行记录</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 p-8 overflow-y-auto bg-gray-900 text-green-400 font-mono text-xs">
                                        <pre>{JSON.stringify(currentPlatformData, null, 2)}</pre>
                                    </div>
                                )
                             )}
                         </div>
                     </div>
                </div>
            )}

            {/* 品牌词管理弹窗 */}
            <BrandKeywordModal 
                isOpen={showBrandKeywordModal}
                onClose={() => setShowBrandKeywordModal(false)}
            />
        </>
    );
};
