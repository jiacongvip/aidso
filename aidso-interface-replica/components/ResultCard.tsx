
import React from 'react';
import { MessageCircle, ChevronDown, Trash2, Flame, Globe } from 'lucide-react';
import { getCurrentTime } from '../utils';
import { BRANDS } from '../data';
import type { Task } from '../contexts/TaskContext';

export const MetricItem = ({ label, value, sub, icon, isFire, className }: { label: string, value: string | React.ReactNode, sub?: string, icon?: React.ReactNode, isFire?: boolean, className?: string }) => (
    <div className={`flex flex-col items-center justify-between py-1 px-6 border-l border-gray-100 first:border-l-0 min-h-[56px] ${className}`}>
        <div className="flex items-center gap-1.5 h-full">
            {icon && icon}
            {isFire ? (
                 <div className="flex items-center gap-1 text-red-500 font-bold text-xl md:text-2xl drop-shadow-sm tabular-nums">
                    <Flame size={20} fill="currentColor" className="animate-pulse-slow" />
                    {value}
                 </div>
            ) : (
                <div className="text-xl font-bold text-gray-800 tabular-nums tracking-tight">{value}</div>
            )}
        </div>
        <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap mt-auto">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{sub}</div>}
    </div>
);

interface ResultCardProps {
    task: Task;
    onOpenDetail: () => void;
    onDelete?: () => void;
}

export const ResultCard = ({ task, onOpenDetail, onDelete }: ResultCardProps) => {
    const { date, time } = getCurrentTime();

    return (
        <div className="w-full max-w-5xl mx-auto mt-6 bg-white rounded-2xl shadow-card ring-1 ring-black/5 overflow-hidden group hover:ring-purple-100 transition-all duration-300 animate-slide-up">
            {/* Card Header */}
            <div className="flex flex-col md:flex-row items-stretch"> 
                
                {/* Left Side: Title and Buttons */}
                <div className="flex-1 flex flex-col justify-center px-6 py-4 md:py-5 gap-3 min-w-0">
                    {/* Row 1: Title */}
                    <div className="flex items-center">
                         <h2 className="text-lg md:text-[19px] font-bold text-gray-900 leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                            <span className="text-brand-purple mr-1">[{task.searchType === 'quick' ? '快速' : '深度'}]</span>
                            {task.keyword}
                        </h2>
                        {task.status === 'failed' && (
                            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 text-red-600 bg-red-50">
                                失败
                            </span>
                        )}
                    </div>
                    {task.result?.summary && (
                        <div className="text-xs text-gray-500 truncate">
                            {task.result.summary}
                        </div>
                    )}
                    {!task.result?.summary && task.status === 'failed' && task.logs?.length > 0 && (
                        <div className="text-xs text-red-500 truncate">
                            {task.logs[task.logs.length - 1]}
                        </div>
                    )}

                    {/* Row 2: Action Buttons (Inline) */}
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onOpenDetail}
                            className="bg-brand-purple text-white px-3.5 py-1.5 rounded-full text-xs font-bold hover:bg-brand-hover shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 active:scale-[0.98] whitespace-nowrap"
                        >
                            <MessageCircle size={14} strokeWidth={2.5} />
                            查看AI对话
                        </button>
                        <button className="bg-gray-50 text-brand-purple border border-gray-100 hover:bg-purple-50 hover:border-purple-100 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 active:scale-[0.98] whitespace-nowrap">
                            收起结果 <ChevronDown size={14} className="rotate-180" />
                        </button>
                        
                        <div className="w-px h-3 bg-gray-200 mx-1"></div>
                        
                        <button 
                            onClick={onDelete}
                            className="group/del flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-[0.98] whitespace-nowrap"
                        >
                            <Trash2 size={14} className="transition-transform group-hover/del:scale-110" />
                            <span>删除</span>
                        </button>
                    </div>
                </div>

                {/* Right Side: Metrics */}
                <div className="hidden md:flex items-stretch justify-end gap-0 border-l border-gray-100/50 pl-2">
                    
                    {/* Problem Type */}
                    <div className="flex flex-col items-center justify-between px-6 border-l border-gray-100 first:border-0 min-h-[60px] py-3">
                        <div className="bg-purple-50 text-brand-purple text-[10px] font-bold px-1.5 py-1 rounded flex flex-col items-center justify-center leading-none h-[34px] w-[34px] border border-purple-100/50 mt-1">
                            <span className="scale-90 block">推荐</span>
                            <span className="scale-90 block mt-[1px]">建议</span>
                        </div>
                        <span className="text-[10px] text-gray-300 mt-auto">问题类型</span>
                    </div>

                    {/* Heat */}
                    <MetricItem label="热度值" value="16" isFire className="py-3" />

                    {/* Brand Add */}
                    <div className="flex flex-col items-center justify-between px-6 border-l border-gray-100 min-h-[60px] group cursor-pointer py-3">
                        <div className="h-[34px] flex items-center mt-1">
                            <div className="border border-dashed border-purple-300 text-purple-600 text-[11px] font-bold px-3 rounded-lg flex items-center gap-1 h-8 group-hover:bg-purple-50 group-hover:border-purple-400 transition-all active:scale-95 shadow-sm hover:shadow-purple-100">
                                <span className="text-base leading-none relative -top-[1px]">+</span>
                                <span className="whitespace-nowrap tracking-wide">添加品牌词</span>
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-300 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">点击添加</span>
                    </div>

                    {/* Cited Sites */}
                    <MetricItem label="引用网站" value="13" className="py-3" />

                    {/* Cited Articles */}
                    <MetricItem label="引用文章" value="23" className="py-3" />

                    {/* Time - Optimized */}
                    <div className="flex flex-col items-center justify-between px-6 border-l border-gray-100 min-h-[60px] ml-2 py-3 bg-gray-50/30">
                        <div className="flex flex-col items-center justify-center h-[34px] mt-1">
                            <div className="tabular-nums font-bold text-gray-700 text-sm tracking-tight">{time.slice(0, 5)}</div>
                            <div className="tabular-nums text-[9px] text-gray-400 font-medium leading-none mt-0.5">{date.slice(5)}</div>
                        </div>
                        <span className="text-[10px] text-gray-300 mt-auto">搜索时间</span>
                    </div>

                </div>
            </div>

            {/* Platform Table Header */}
            <div className="bg-gray-50/80 border-y border-gray-100 px-6 py-3 grid grid-cols-12 gap-4 text-xs text-gray-500 font-semibold tracking-wide uppercase">
                <div className="col-span-6 md:col-span-2">AI对话平台</div>
                <div className="hidden md:block col-span-2 text-center">提及次数/排名</div>
                <div className="hidden md:block col-span-2 text-center">情感倾向</div>
                <div className="hidden md:block col-span-3">引用来源</div>
                <div className="col-span-6 md:col-span-3 text-right md:text-left">提及品牌</div>
            </div>

            {task.selectedModels.map((modelName) => {
                const brand = BRANDS.find((b) => b.name === modelName);
                return (
                    <div key={modelName} className="px-6 py-4 grid grid-cols-12 gap-4 text-sm items-center hover:bg-purple-50/30 transition-colors cursor-pointer group/row">
                        <div className="col-span-6 md:col-span-2 flex items-center gap-3">
                            {brand?.icon ? (
                                <img src={brand.icon} className="w-7 h-7 rounded-full shadow-sm ring-2 ring-transparent group-hover/row:ring-purple-100 transition-all" alt={modelName} />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200"></div>
                            )}
                            <span className="text-gray-700 font-medium group-hover/row:text-brand-purple transition-colors">{modelName}</span>
                        </div>
                        <div className="hidden md:block col-span-2 text-center text-gray-400 font-medium tabular-nums">- / -</div>
                        <div className="hidden md:block col-span-2 text-center text-gray-400 font-medium tabular-nums">-</div>
                        <div className="hidden md:flex col-span-3 items-center gap-2 overflow-hidden">
                            <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100/50 px-2 py-1 rounded-md whitespace-nowrap border border-gray-100 tabular-nums">
                                <Globe size={10} className="text-blue-500"/> - (0)
                            </div>
                        </div>
                        <div className="col-span-6 md:col-span-3 text-xs text-gray-500 truncate font-medium text-right md:text-left">
                            -
                        </div>
                    </div>
                );
            })}
            
            <div className="bg-white py-4 text-center text-xs text-gray-400 font-medium tracking-wide">
                ~ 没有更多了 ~
            </div>
        </div>
    );
};
