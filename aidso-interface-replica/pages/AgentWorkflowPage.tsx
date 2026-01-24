import React, { useState } from 'react';
import { 
  Bot, Search, Loader2, Globe, BarChart3, CheckCircle2, 
  FileText, ExternalLink, Sparkles, Zap, Minimize2, ArrowRight, MessageSquare,
  ChevronDown, ChevronRight, Link as LinkIcon, Maximize2, GitFork, Star, GitBranch, Database, RefreshCw,
  LayoutDashboard, Users, Layers, Cpu, AlertTriangle, TrendingUp, PieChart, BookOpen, Megaphone, Gift, Tag
} from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import { TargetSite, StrategyStep } from '../utils';

// Component for Model Evidence Chain
const ModelEvidenceSection = ({ task }: { task: any }) => {
    const [expandedModel, setExpandedModel] = useState<string | null>(null);

    const toggleModel = (name: string) => {
        setExpandedModel(expandedModel === name ? null : name);
    };

    // 从任务结果中获取平台数据
    const platformData = task?.result?.platformData || {};
    const modelNames = Object.keys(platformData);
    
    // 如果没有数据，显示加载状态
    if (modelNames.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8 text-center">
                <div className="text-gray-400">正在收集模型证据链...</div>
            </div>
        );
    }
    
    // 默认展开第一个模型
    if (!expandedModel && modelNames.length > 0) {
        setExpandedModel(modelNames[0]);
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand-purple" />
                    多模型证据链
                </h3>
                <span className="text-xs font-bold bg-purple-50 text-brand-purple px-2 py-1 rounded-md border border-purple-100">
                    {modelNames.length} 来源同步
                </span>
            </div>
            
            <div className="divide-y divide-gray-100">
                {modelNames.map((modelName) => {
                    const data = platformData[modelName];
                    const isExpanded = expandedModel === modelName;

                    if (!data) return null;

                    return (
                        <div key={modelName} className="group">
                            {/* Accordion Header */}
                            <div 
                                onClick={() => toggleModel(modelName)}
                                className={`w-full px-6 py-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-purple-50/30' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full border ${isExpanded ? 'border-brand-purple shadow-sm bg-purple-50' : 'border-gray-200 bg-white'}`}>
                                        <Bot className={`w-5 h-5 ${isExpanded ? 'text-brand-purple' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900 flex items-center gap-2">
                                            {modelName}
                                            <span className="text-[10px] text-gray-400 font-normal bg-white border border-gray-200 px-1.5 py-0.5 rounded-md shadow-sm">
                                                {data.engine || 'AI模型'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 flex items-center gap-2">
                                            <span className="flex items-center gap-1">
                                                <RefreshCw size={8} className={isExpanded ? "animate-spin" : ""} style={{animationDuration: '3s'}} />
                                                已同步
                                            </span>
                                            <span className="w-0.5 h-2 bg-gray-300"></span>
                                            <span>{data.sources?.length || 0} 引用</span>
                                            <span className="w-0.5 h-2 bg-gray-300"></span>
                                            <span>{data.brands?.length || 0} 品牌</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-purple' : ''}`}>
                                    <ChevronDown size={18} />
                                </div>
                            </div>

                            {/* Accordion Body */}
                            {isExpanded && (
                                <div className="px-6 pb-6 pt-2 animate-slide-up">
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        
                                        {/* Left: Response & Thinking */}
                                        <div className="flex-1 min-w-0 space-y-4">
                                            {/* Thinking Block */}
                                            {data.thinking && (
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 group-hover:border-purple-100 transition-colors">
                                                    <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
                                                        <span className="flex items-center gap-1.5">
                                                            <Zap size={12} className="text-yellow-500" />
                                                            深度思考 (Chain of Thought)
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-mono max-h-[120px] overflow-y-auto custom-scrollbar">
                                                        {data.thinking}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Response Text */}
                                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-brand-purple/20">
                                                {/* Simple parser to highlight [x] citations */}
                                                {(data.response || '暂无响应').split(/(\[\d+\])/g).map((part: string, i: number) => {
                                                    if (part.match(/^\[\d+\]$/)) {
                                                        return <span key={i} className="text-brand-purple font-bold cursor-pointer hover:underline mx-0.5 bg-purple-50 px-1 rounded text-xs align-top">{part}</span>;
                                                    }
                                                    return part.split(/(\*\*.*?\*\*)/g).map((subPart, j) => {
                                                        if (subPart.startsWith('**') && subPart.endsWith('**')) {
                                                            return <strong key={`${i}-${j}`} className="font-bold text-gray-900">{subPart.slice(2, -2)}</strong>;
                                                        }
                                                        return subPart;
                                                    });
                                                })}
                                            </div>
                                            
                                            {/* Brands Section */}
                                            {data.brands && data.brands.length > 0 && (
                                                <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                                                    <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-2">
                                                        <Gift size={12} className="text-orange-500" />
                                                        提及品牌 ({data.brands.length})
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {data.brands.map((brand: string, idx: number) => (
                                                            <span key={idx} className="bg-white text-orange-700 px-2 py-1 rounded text-xs font-medium border border-orange-200">
                                                                {brand}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Sources (Compact) */}
                                        <div className="w-full lg:w-[280px] flex-shrink-0 bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                                            <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-3">
                                                <LinkIcon size={12} />
                                                引用来源 ({data.sources?.length || 0})
                                            </h4>
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                                {(data.sources || []).length > 0 ? (
                                                    data.sources.map((source: any, idx: number) => (
                                                        <a 
                                                            key={idx}
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-start gap-2 group/source hover:border-brand-purple/30 transition-colors cursor-pointer block"
                                                        >
                                                            <div className="mt-0.5 text-[10px] text-gray-400 font-mono w-3">{idx + 1}.</div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-medium text-gray-900 truncate" title={source.title}>{source.title}</div>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <span className="text-xs">🌐</span>
                                                                    <span className="text-[10px] text-gray-500 truncate">{source.site || source.domain}</span>
                                                                </div>
                                                            </div>
                                                            <ExternalLink size={10} className="text-gray-300 group-hover/source:text-brand-purple mt-1 flex-shrink-0" />
                                                        </a>
                                                    ))
                                                ) : (
                                                    <div className="text-xs text-gray-400 text-center py-4">暂无引用来源</div>
                                                )}
                                            </div>
                                            
                                            {data.repos && (
                                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                                    <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-2">
                                                        <GitFork size={12} />
                                                        开源情报
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {data.repos.map((repo: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between text-[10px] bg-white px-2 py-1.5 rounded border border-gray-200">
                                                                <span className="font-medium text-brand-purple truncate max-w-[120px]">{repo.name}</span>
                                                                <span className="flex items-center gap-0.5 text-gray-500">
                                                                    <Star size={8} /> {repo.stars}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const AgentWorkflowPage = () => {
  const [keywordInput, setKeywordInput] = useState('');
  const [reportTab, setReportTab] = useState<'overview' | 'competitors' | 'content' | 'technical'>('overview');
  const [rightPanelTab, setRightPanelTab] = useState<'report' | 'chat'>('report'); // 右侧面板切换
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const { activeTaskId, tasks, addTask, minimizeTask } = useTasks();

  const activeTask = tasks.find(t => t.id === activeTaskId);

  const handleStart = async () => {
    if (!keywordInput.trim()) return;
    try {
      await addTask({ keyword: keywordInput.trim(), searchType: 'deep', models: ['DeepSeek'] });
      setKeywordInput('');
    } catch (err: any) {
      alert(err?.message || '创建任务失败');
    }
  };

  // 处理追问
  const handleFollowUpQuestion = async () => {
    if (!followUpQuestion.trim() || !activeTask) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: followUpQuestion,
      timestamp: Date.now()
    };
    
    // 立即添加用户消息并切换到对话标签
    setChatHistory(prev => [...prev, userMessage]);
    setRightPanelTab('chat'); // 自动切换到对话视图
    const currentQuestion = followUpQuestion;
    setFollowUpQuestion(''); // 清空输入框
    setIsAsking(true);
    
    try {
      const result = activeTask.result;
      const platformData = result?.platformData || {};
      
      // 构建上下文：包含原始查询和所有模型的回答
      const context = `原始查询: ${activeTask.keyword}\n\n`;
      const modelResponses = Object.entries(platformData).map(([model, data]: [string, any]) => {
        return `${model} 的分析:\n${data.response}\n\n提及品牌: ${data.brands?.join(', ') || '无'}\n`;
      }).join('\n---\n\n');
      
      const fullContext = context + modelResponses;
      
      // 调用后端 AI 接口
      const response = await fetch('/api/ai/follow-up', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          context: fullContext,
          question: currentQuestion,
          originalKeyword: activeTask.keyword,
          chatHistory: chatHistory // 传递历史对话
        })
      });
      
      if (!response.ok) {
        throw new Error('追问失败');
      }
      
      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer || '暂无回答',
        timestamp: Date.now()
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);
      
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，追问失败：' + (err.message || '未知错误'),
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  };

  // 1. Initial State (No Active Task) - Search Interface
  if (!activeTask) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4 sm:px-6 lg:px-8 -mt-16">
          <div className="max-w-4xl mx-auto w-full space-y-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-brand-purple text-xs font-bold border border-purple-100 mb-4 animate-fade-in">
                 <Sparkles size={12} />
                 <span>AI 深度调研 Agent</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                全网投放<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-blue-600">深度调研</span>
              </h1>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
                输入产品或话题，Agent 将模拟人类浏览行为，分析多模型共识，挖掘高价值引流渠道，并生成可落地的投放策略。
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-purple-900/5 p-2 md:p-3 transition-all duration-300 border border-gray-100 hover:border-purple-200 max-w-2xl mx-auto">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                    placeholder="例如：'AI 写作工具推广' 或 'SaaS 私有化部署'"
                    className="block w-full pl-11 pr-4 py-3 bg-transparent border-none text-lg focus:ring-0 placeholder-gray-400"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleStart}
                  disabled={!keywordInput.trim()}
                  className="bg-brand-purple hover:bg-brand-hover shadow-lg hover:shadow-brand-purple/30 px-6 py-3 rounded-xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                >
                  开始调研
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1.5"><Bot size={14}/> 多模型交叉验证</div>
                <div className="flex items-center gap-1.5"><Globe size={14}/> 全网渠道挖掘</div>
                <div className="flex items-center gap-1.5"><FileText size={14}/> 自动生成策略</div>
            </div>
          </div>
        </div>
    );
  }

  const result: any = activeTask.result;
  const analysis: any = (result && (result.analysis || result)) || null;
  const sites: any[] = Array.isArray(result?.sites) ? result.sites : [];
  const strategy: any[] = Array.isArray(result?.strategy) ? result.strategy : [];

  // 2. Split Layout (Active Task)
  return (
    <div className="fixed inset-0 top-16 flex bg-gray-50 overflow-hidden z-30">
        
        {/* Left Panel: Chat Interface (Fixed Width) */}
        <div className="w-[420px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2.5 font-bold text-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                        <Bot size={18} />
                    </div>
                    <div>
                        <div className="text-sm">Agent 思考流</div>
                        <div className="text-[10px] font-normal text-gray-400 flex items-center gap-1">
                             <span className={`w-1.5 h-1.5 rounded-full ${activeTask.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                             {activeTask.status === 'running' ? '正在执行' : '已完成'}
                        </div>
                    </div>
                </div>
                <button onClick={minimizeTask} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" title="挂起任务">
                    <Minimize2 size={18} />
                </button>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#fafafa]">
                {/* User Message */}
                <div className="flex justify-end animate-scale-in origin-bottom-right">
                    <div className="bg-brand-purple text-white px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[90%] shadow-md shadow-purple-900/10 text-sm leading-relaxed">
                        {activeTask.keyword}
                    </div>
                </div>

                {/* System/Agent Logs Stream */}
                <div className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                        <Bot size={16} className="text-brand-purple" />
                    </div>
                    <div className="space-y-3 max-w-[90%]">
                        {/* Initial "Thinking" State */}
                        <div className="text-xs font-bold text-gray-400 mb-1 ml-1">AI Agent</div>
                        
                        {activeTask.logs.map((log, i) => (
                             <div key={i} className="bg-white border border-gray-100 p-3.5 rounded-2xl rounded-tl-sm shadow-sm text-sm text-gray-600 animate-slide-up flex items-start gap-2.5 leading-relaxed group hover:border-purple-100 transition-colors">
                                <div className="mt-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-purple-50 text-brand-purple flex-shrink-0">
                                    <Loader2 size={10} className={`${activeTask.status === 'running' && i === activeTask.logs.length - 1 ? 'animate-spin' : ''}`} />
                                </div>
                                <span>{log}</span>
                             </div>
                        ))}

                        {activeTask.status === 'running' && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 pl-4 pt-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        )}

                        {activeTask.status === 'completed' && (
                             <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 p-4 rounded-2xl rounded-tl-sm shadow-sm text-sm text-gray-800 animate-scale-in origin-left flex flex-col gap-2">
                                <div className="flex items-center gap-2 font-bold text-green-700">
                                    <CheckCircle2 size={16} />
                                    <span>调研完成</span>
                                </div>
                                <p className="text-gray-600">已为您生成全网投放调研报告，包含模型共识分析、推荐渠道及执行策略。</p>
                                <div className="flex gap-2 mt-1">
                                    <button className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg font-bold shadow-sm hover:bg-green-50 transition-colors">
                                        查看右侧报告 👉
                                    </button>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Input Area (Follow-up Questions) */}
            <div className="p-4 border-t border-gray-100 bg-white">
                 <div className="relative">
                    <input 
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isAsking && activeTask.status === 'completed' && handleFollowUpQuestion()}
                        disabled={activeTask.status === 'running' || isAsking}
                        placeholder={activeTask.status === 'running' ? "Agent 正在思考中..." : isAsking ? "AI 正在回答..." : "基于调研结果提问，如：给我什么建议？"}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all disabled:opacity-60 disabled:cursor-not-allowed pr-10"
                    />
                    <button 
                        onClick={handleFollowUpQuestion}
                        disabled={activeTask.status === 'running' || isAsking || !followUpQuestion.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-purple text-white rounded-lg hover:bg-brand-hover transition-colors shadow-sm disabled:opacity-50 disabled:bg-gray-300"
                    >
                        {isAsking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    </button>
                 </div>
                 <div className="text-[10px] text-gray-400 text-center mt-2">
                    Agent 内容由 AI 生成，请仔细甄别
                 </div>
            </div>
        </div>

        {/* Right Panel: Results Canvas (Flexible Width) */}
        <div className="flex-1 bg-gray-50/50 overflow-y-auto relative custom-scrollbar">
             {/* Background Pattern */}
             <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#7c3aed 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

             <div className="max-w-5xl mx-auto p-8 space-y-8 min-h-full">
                 
                 {/* Canvas Header with Tab Switcher */}
                 <div className="flex items-center justify-between animate-fade-in-down">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <FileText size={24} className="text-brand-purple" />
                                {activeTask.keyword}
                            </h1>
                            <p className="text-sm text-gray-500">生成时间：{new Date(activeTask.startTime).toLocaleString()}</p>
                        </div>
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                            <button
                                onClick={() => setRightPanelTab('report')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                    rightPanelTab === 'report'
                                    ? 'bg-brand-purple text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <FileText size={16} />
                                调研报告
                            </button>
                            <button
                                onClick={() => setRightPanelTab('chat')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 relative ${
                                    rightPanelTab === 'chat'
                                    ? 'bg-brand-purple text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <MessageSquare size={16} />
                                深度追问
                                {chatHistory.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {chatHistory.filter(m => m.role === 'user').length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:text-brand-purple hover:border-purple-200 hover:shadow-md transition-all shadow-sm flex items-center gap-2">
                            <ExternalLink size={16} /> 
                            导出 PDF
                        </button>
                    </div>
                 </div>

                 {/* Content Area - Switch between Report and Chat */}
                 {rightPanelTab === 'report' && activeTask.result && (
                     /* Original Report Content */
                     <div className="space-y-6 animate-slide-up">
                        
                        {/* 1. New GEO Analysis Dashboard (Tabbed) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-2 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 py-2">
                                    <BarChart3 className="w-5 h-5 text-brand-purple" />
                                    GEO 深度诊断报告
                                </h3>
                                {/* Tab Navigation */}
                                <div className="flex bg-gray-200/50 p-1 rounded-lg">
                                    {[
                                        { id: 'overview', label: '总览', icon: LayoutDashboard },
                                        { id: 'competitors', label: '竞争格局', icon: Users },
                                        { id: 'content', label: '内容诊断', icon: Layers },
                                        { id: 'technical', label: '优化策略', icon: Cpu },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setReportTab(tab.id as any)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                reportTab === tab.id 
                                                ? 'bg-white text-brand-purple shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                            }`}
                                        >
                                            <tab.icon size={14} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-6 min-h-[400px]">
                                {reportTab === 'overview' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                                        {/* Left: Market Sentiment & Phase 1 Metrics */}
                                        <div className="space-y-6">
                                            <div className="bg-gradient-to-br from-brand-purple to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg shadow-purple-900/20">
                                                <div className="relative z-10">
                                                    <div className="text-white/80 text-xs font-bold mb-1 flex items-center gap-1">
                                                        <TrendingUp size={12} /> 市场情绪指数
                                                    </div>
                                                    <div className="text-5xl font-extrabold mb-4 tracking-tight">{analysis.sentiment}</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(analysis.topKeywords || []).slice(0, 3).map((kw: string, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-[10px] backdrop-blur-sm border border-white/10">
                                                                #{kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Zap className="absolute right-[-20px] top-[-20px] text-white/10 w-32 h-32" />
                                            </div>

                                            {/* Phase 1: Visibility (占位) */}
                                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                                <h4 className="font-bold text-blue-900 text-xs mb-3 flex items-center gap-1.5">
                                                    <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px]">1</span>
                                                    一阶段：关键词占位
                                                </h4>
                                                <div className="space-y-4">
                                                    <div>
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-gray-500">品牌提及率</span>
                                                            <span className="font-bold text-gray-900">{analysis.geoMetrics?.brandMentionRate}%</span>
                                                            </div>
                                                            <div className="w-full bg-blue-100 rounded-full h-1.5">
                                                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${analysis.geoMetrics?.brandMentionRate}%` }}></div>
                                                            </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-gray-500">品牌产品绑定率</span>
                                                            <span className="font-bold text-gray-900">{analysis.geoMetrics?.productBindingRate}%</span>
                                                        </div>
                                                        <div className="w-full bg-blue-100 rounded-full h-1.5">
                                                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${analysis.geoMetrics?.productBindingRate}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Phase 2 Metrics & SOV */}
                                        <div className="lg:col-span-2 space-y-6">
                                            
                                            {/* Phase 2: Conversion (排名) */}
                                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                                <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-brand-purple text-xs">2</span>
                                                    二阶段：排名强化与决策
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                        <div className="text-2xl font-bold text-gray-900 mb-1">{analysis.geoMetrics?.topRankingRate}%</div>
                                                        <div className="text-xs text-gray-500">排名前列占比 (Top 3)</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                        <div className="text-2xl font-bold text-gray-900 mb-1">{analysis.geoMetrics?.citationRate}%</div>
                                                        <div className="text-xs text-gray-500">引用结构化内容比率</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                        <div className="text-2xl font-bold text-gray-900 mb-1">{analysis.geoMetrics?.semanticConsistency}%</div>
                                                        <div className="text-xs text-gray-500">语义标签一致性</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* SOV Chart */}
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                    <h4 className="font-bold text-gray-900 text-xs mb-3 flex items-center gap-1.5">
                                                        <PieChart size={12} /> AI 引擎曝光份额 (SOV)
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {analysis.aiVisibilityBreakdown?.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex items-center gap-3">
                                                                <span className="text-[10px] font-bold text-gray-500 w-20 truncate">{item.engine}</span>
                                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-brand-purple/80 rounded-full" style={{ width: `${item.score}%` }}></div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-900 w-8 text-right">{item.score}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Core Value / Outcome */}
                                                <div className="bg-green-50/50 rounded-xl p-4 border border-green-100 flex flex-col justify-center">
                                                    <h4 className="font-bold text-green-800 text-xs mb-3 flex items-center gap-1.5">
                                                        <CheckCircle2 size={12} /> GEO 核心价值预估
                                                    </h4>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-[10px] text-green-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            流量抢占：预计构建 3-5 个高价值流量入口
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-green-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            舆情控制：消除负面，纠正错误信息
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-green-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            心智占领：缩短用户触达路径
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {reportTab === 'competitors' && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-gray-900 text-sm">AI 搜索前三名竞品分析</h4>
                                            <button className="text-xs text-brand-purple font-bold hover:underline">查看完整榜单</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {analysis.competitors?.map((comp: any, idx: number) => (
                                                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                        <Users size={64} />
                                                    </div>
                                                    <div className="relative z-10">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 border border-gray-200">
                                                                {comp.name[0]}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 text-sm">{comp.name}</div>
                                                                <div className="text-xs text-gray-400">{comp.url}</div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mb-4">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-gray-500">AI 可见度</span>
                                                                <span className="font-bold text-brand-purple">{comp.aiVisibility}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                                <div className="h-1.5 bg-brand-purple rounded-full" style={{ width: `${comp.aiVisibility}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap gap-1">
                                                                {comp.strengths.map((s: string, i: number) => (
                                                                    <span key={i} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                                                                        + {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {comp.weaknesses.map((w: string, i: number) => (
                                                                    <span key={i} className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">
                                                                        - {w}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* New Section: GEO Process */}
                                        <div className="mt-8 pt-6 border-t border-gray-100">
                                            <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                                <GitBranch size={14} className="text-brand-purple" />
                                                GEO 优化推进事宜
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                {analysis.geoProcess?.map((step: any, idx: number) => (
                                                    <div key={idx} className="relative group">
                                                        <div className={`p-4 rounded-xl border transition-all ${
                                                            step.status === 'completed' ? 'bg-green-50 border-green-200' :
                                                            step.status === 'in_progress' ? 'bg-blue-50 border-blue-200 shadow-sm' :
                                                            'bg-gray-50 border-gray-200 opacity-60'
                                                        }`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                                    step.status === 'completed' ? 'bg-green-200 text-green-700' :
                                                                    step.status === 'in_progress' ? 'bg-blue-200 text-blue-700' :
                                                                    'bg-gray-200 text-gray-500'
                                                                }`}>{step.step}</span>
                                                                {step.status === 'completed' && <CheckCircle2 size={14} className="text-green-600" />}
                                                                {step.status === 'in_progress' && <Loader2 size={14} className="text-blue-600 animate-spin" />}
                                                            </div>
                                                            <h5 className="font-bold text-xs text-gray-900 mb-1">{step.title}</h5>
                                                            <p className="text-[10px] text-gray-500 leading-tight">{step.desc}</p>
                                                        </div>
                                                        {idx < 3 && (
                                                            <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 text-gray-300">
                                                                <ChevronRight size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* New Section: AI Creation Scenarios */}
                                        <div className="mt-8">
                                            <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                                <Sparkles size={14} className="text-pink-500" />
                                                AI 辅助自由创作应用场景
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {analysis.aiCreationScenarios?.map((scenario: any, idx: number) => (
                                                    <div key={idx} className="bg-gradient-to-br from-pink-50 to-white border border-pink-100 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="p-2 bg-white rounded-lg shadow-sm text-pink-500 group-hover:scale-110 transition-transform">
                                                                {scenario.icon === 'BookOpen' && <BookOpen size={16} />}
                                                                {scenario.icon === 'Megaphone' && <Megaphone size={16} />}
                                                                {scenario.icon === 'Gift' && <Gift size={16} />}
                                                            </div>
                                                            <h5 className="font-bold text-sm text-gray-900">{scenario.title}</h5>
                                                        </div>
                                                        <p className="text-xs text-gray-500 leading-relaxed pl-1">{scenario.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {reportTab === 'content' && (
                                    <div className="animate-fade-in">
                                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                                            <AlertTriangle className="text-orange-500 mt-0.5" size={16} />
                                            <div>
                                                <h4 className="text-sm font-bold text-orange-800 mb-1">内容覆盖度预警</h4>
                                                <p className="text-xs text-orange-600 leading-relaxed">
                                                    AI 模型在回答该关键词时，倾向于引用包含“成本分析”和“安全合规”的内容，而您的内容库中这部分相对薄弱。
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {analysis.contentGaps?.map((gap: any, idx: number) => (
                                                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-6 hover:border-brand-purple/30 transition-colors">
                                                    <div className="w-1/3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`w-2 h-2 rounded-full ${
                                                                gap.importance === 'High' ? 'bg-red-500' : 'bg-yellow-500'
                                                            }`}></span>
                                                            <h5 className="font-bold text-gray-900 text-sm">{gap.topic}</h5>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                            重要性: {gap.importance === 'High' ? '高' : '中'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-xs mb-1.5">
                                                            <span className="text-gray-500">当前覆盖度</span>
                                                            <span className="font-bold text-gray-900">{gap.currentCoverage}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                                            <div 
                                                                className={`h-2 rounded-full ${gap.currentCoverage < 30 ? 'bg-red-400' : 'bg-yellow-400'}`} 
                                                                style={{ width: `${gap.currentCoverage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    <div className="w-1/3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                        <span className="font-bold text-gray-700 block mb-0.5">💡 优化建议:</span>
                                                        {gap.suggestion}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {reportTab === 'technical' && (
                                    <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                                                <Search size={14} className="text-blue-500" />
                                                关键词衍生挖掘
                                            </h4>
                                            <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-gray-100 text-gray-500 font-medium">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left">关键词</th>
                                                            <th className="px-3 py-2 text-right">搜索量</th>
                                                            <th className="px-3 py-2 text-center">难度</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {analysis.keywordExpansion?.map((kw: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-white transition-colors">
                                                                <td className="px-3 py-2 font-medium text-gray-700">{kw.term}</td>
                                                                <td className="px-3 py-2 text-right text-gray-500">{kw.volume}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                        kw.difficulty > 70 ? 'bg-red-50 text-red-600' :
                                                                        kw.difficulty > 40 ? 'bg-yellow-50 text-yellow-600' :
                                                                        'bg-green-50 text-green-600'
                                                                    }`}>
                                                                        {kw.difficulty}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                                                <Cpu size={14} className="text-brand-purple" />
                                                技术优化策略
                                            </h4>
                                            <div className="space-y-6">
                                                {['Crawlable', 'Understandable', 'Citeable'].map((cat) => {
                                                    const categoryTactics = analysis.geoTactics?.filter((t: any) => t.category === cat);
                                                    if (!categoryTactics?.length) return null;

                                                    const catConfig = {
                                                        Crawlable: { label: '可抓取 (Crawlable)', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                                                        Understandable: { label: '可理解 (Understandable)', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                                                        Citeable: { label: '可引用 (Citeable)', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' }
                                                    }[cat as string] || { label: cat, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' };

                                                    return (
                                                        <div key={cat} className="space-y-2">
                                                            <h5 className={`text-xs font-bold ${catConfig.color} flex items-center gap-1.5`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${catConfig.color.replace('text-', 'bg-')}`}></span>
                                                                {catConfig.label}
                                                            </h5>
                                                            <div className="space-y-2">
                                                                {categoryTactics.map((tactic: any, idx: number) => (
                                                                    <div key={idx} className={`bg-white border ${catConfig.border} rounded-xl p-3 shadow-sm hover:border-brand-purple/30 transition-colors group cursor-pointer`}>
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <h5 className="font-bold text-xs text-gray-800 group-hover:text-brand-purple transition-colors flex items-center gap-2">
                                                                                {tactic.icon === 'Code' && <Cpu size={12} />}
                                                                                {tactic.icon === 'Link' && <LinkIcon size={12} />}
                                                                                {tactic.icon === 'MessageCircle' && <MessageSquare size={12} />}
                                                                                {tactic.icon === 'FileText' && <FileText size={12} />}
                                                                                {tactic.title}
                                                                            </h5>
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                                                tactic.impact === 'High' ? 'bg-brand-purple/10 text-brand-purple' : 'bg-gray-100 text-gray-500'
                                                                            }`}>
                                                                                {tactic.impact === 'High' ? '高优' : '中优'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-500 leading-relaxed">{tactic.desc}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Target Sites Table */}
                        <ModelEvidenceSection task={activeTask} />

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-blue-500" />
                                    推荐投放渠道
                                </h3>
                                <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                                    TOP {sites.length}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">平台名称</th>
                                            <th className="px-6 py-4 font-bold">类型</th>
                                            <th className="px-6 py-4 font-bold">相关度</th>
                                            <th className="px-6 py-4 font-bold">建议动作</th>
                                            <th className="px-6 py-4 font-bold">推荐理由</th>
                                            <th className="px-6 py-4 font-bold">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {sites.map((site: TargetSite) => (
                                            <tr key={site.id} className="hover:bg-purple-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{site.name}</div>
                                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{site.url}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                        site.type === 'Forum' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        site.type === 'Blog' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        site.type === 'Social' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        'bg-gray-50 text-gray-700 border-gray-100'
                                                    }`}>
                                                        {site.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-brand-purple rounded-full" style={{ width: `${site.relevance}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-600">{site.relevance}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-800">{site.action}</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 max-w-xs text-xs leading-relaxed">
                                                    {site.reason}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button className="text-gray-400 hover:text-brand-purple p-2 rounded-full hover:bg-purple-50 transition-colors">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 3. Execution Strategy Timeline */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-8">
                                <FileText className="w-5 h-5 text-green-600" />
                                执行策略流
                            </h3>
                            <div className="relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-brand-purple via-purple-200 to-transparent"></div>
                                
                                <div className="space-y-8">
                                    {strategy.map((step: StrategyStep, idx: number) => (
                                        <div key={idx} className="relative pl-12 group">
                                            {/* Number Bubble */}
                                            <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border-2 border-brand-purple text-brand-purple flex items-center justify-center font-bold z-10 shadow-sm group-hover:scale-110 transition-transform group-hover:shadow-purple-200">
                                                {step.step}
                                            </div>
                                            {/* Content Card */}
                                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 group-hover:bg-white group-hover:shadow-md group-hover:border-purple-100 transition-all">
                                                <h4 className="font-bold text-gray-900 mb-2 text-lg">{step.title}</h4>
                                                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                     </div>
                 )}
                 
                 {/* Chat View */}
                 {rightPanelTab === 'chat' && (
                     /* Chat View */
                     <div className="space-y-6 animate-fade-in">
                         {/* Chat History */}
                         {chatHistory.length === 0 ? (
                             /* Empty State */
                             <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-12 text-center">
                                 <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                     <MessageSquare size={40} className="text-brand-purple" />
                                 </div>
                                 <h3 className="text-xl font-bold text-gray-900 mb-3">开始深度追问</h3>
                                 <p className="text-gray-500 mb-8 max-w-md mx-auto">
                                     基于左侧调研结果，您可以提出任何问题，AI 将结合所有模型的分析给出专业建议
                                 </p>
                                 
                                 {/* 示例问题 */}
                                 <div className="text-sm text-gray-600 mb-4 font-medium">💡 试试这些问题：</div>
                                 <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                                     {[
                                         '如果我也做这个品牌，能给我什么建议？',
                                         '这些品牌的共同特点是什么？',
                                         '我应该在哪些平台投放？',
                                         '竞争对手的优势在哪里？',
                                         '如何制定差异化策略？',
                                         '目标用户群体有哪些特征？'
                                     ].map((q, idx) => (
                                         <button
                                             key={idx}
                                             onClick={() => setFollowUpQuestion(q)}
                                             className="text-sm bg-purple-50 hover:bg-purple-100 text-brand-purple px-4 py-2.5 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors font-medium"
                                         >
                                             {q}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         ) : (
                             /* Chat Messages */
                             <div className="space-y-6">
                                 {chatHistory.map((msg, idx) => (
                                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                         {msg.role === 'assistant' && (
                                             <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center flex-shrink-0 mr-3 shadow-md">
                                                 <Bot size={20} className="text-white" />
                                             </div>
                                         )}
                                         <div className={`max-w-[75%] ${msg.role === 'user' ? 'bg-brand-purple text-white' : 'bg-white text-gray-800 border border-gray-200'} rounded-2xl p-5 shadow-sm`}>
                                             {msg.role === 'assistant' && (
                                                 <div className="text-xs font-bold text-brand-purple mb-2 flex items-center gap-1">
                                                     <Sparkles size={12} />
                                                     AI 建议
                                                 </div>
                                             )}
                                             <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'font-medium' : ''}`}>
                                                 {msg.content}
                                             </div>
                                             <div className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                                                 {new Date(msg.timestamp).toLocaleTimeString()}
                                             </div>
                                         </div>
                                         {msg.role === 'user' && (
                                             <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 ml-3 shadow-sm">
                                                 <Users size={20} className="text-gray-600" />
                                             </div>
                                         )}
                                     </div>
                                 ))}
                                 
                                 {/* Loading Indicator */}
                                 {isAsking && (
                                     <div className="flex justify-start animate-fade-in">
                                         <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center flex-shrink-0 mr-3 shadow-md">
                                             <Bot size={20} className="text-white" />
                                         </div>
                                         <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                             <div className="flex items-center gap-2 text-gray-400">
                                                 <Loader2 size={16} className="animate-spin" />
                                                 <span className="text-sm">AI 正在思考...</span>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         )}
                     </div>
                 )}
                 
                 {/* Empty State (For Report when no result) */}
                 {!activeTask.result && rightPanelTab === 'report' && (
                     <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 space-y-6 animate-fade-in">
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand-purple/20 blur-2xl rounded-full animate-pulse-slow"></div>
                            <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center relative z-10 border border-gray-100">
                                <Bot size={48} className="text-brand-purple animate-bounce-subtle" />
                            </div>
                            {/* Orbiting Icons */}
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 bg-white p-2 rounded-lg shadow-sm animate-float" style={{animationDelay: '0s'}}>
                                <Search size={16} className="text-blue-500" />
                            </div>
                            <div className="absolute bottom-0 left-0 -ml-4 -mb-4 bg-white p-2 rounded-lg shadow-sm animate-float" style={{animationDelay: '1s'}}>
                                <BarChart3 size={16} className="text-green-500" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-gray-900">Agent 正在深度调研中...</h3>
                            <p className="text-sm text-gray-500">正在分析全网数据、对比模型共识、挖掘潜在渠道</p>
                        </div>
                     </div>
                 )}
             </div>
        </div>
    </div>
  );
};
