
import React, { useState } from 'react';
import { X, FileText, Link, Check, Tag, Target, Users } from 'lucide-react';
import { MONITOR_PLATFORMS } from '../data';

export const ConfigModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl animate-scale-in border border-gray-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex-1 text-center">
                        <h2 className="text-lg font-bold text-brand-purple">品牌监控配置</h2>
                    </div>
                    <div className="absolute right-6 top-4 flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs font-medium text-gray-600">
                            <span className="font-bold">A</span> 1 购买
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Steps */}
                <div className="flex items-center justify-center gap-8 py-4 border-b border-gray-100 text-sm">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-brand-purple text-white flex items-center justify-center text-xs">1</div>
                        基本信息
                    </div>
                    <div className="text-gray-300">{'>>>'}</div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-brand-purple text-white flex items-center justify-center text-xs">2</div>
                        关键词配置
                    </div>
                    <div className="text-gray-300">{'>>>'}</div>
                    <div className="text-gray-400 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs">3</div>
                        开始监测
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 overflow-y-auto">
                    {/* Section 1: Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-brand-purple pl-3">品牌基础信息</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">
                                    <span className="text-red-500 mr-1">*</span>品牌名称
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        defaultValue="微盛网络"
                                        placeholder="请输入品牌名称" 
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-brand-purple focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                                    />
                                    <div className="absolute left-3.5 top-2.5 text-gray-400">
                                        <FileText size={16} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">
                                    品牌官网URL
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        defaultValue="https://www.wshoto.com"
                                        placeholder="请输入官网地址" 
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-brand-purple focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                                    />
                                    <div className="absolute left-3.5 top-2.5 text-gray-400">
                                        <Link size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">
                                品牌/产品介绍 (Prompt Context)
                            </label>
                            <div className="relative">
                                <textarea 
                                    defaultValue="微盛网络是腾讯云官方授权服务商，专注企业微信SCRM生态，提供企微管家等私域流量运营工具。"
                                    placeholder="请输入您的产品服务或品牌描述，这段文字将被注入到 Agent 的 Context 中用于识别品牌意图。" 
                                    className="w-full p-4 border border-gray-200 rounded-lg text-sm focus:border-brand-purple focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400 h-24 resize-none"
                                ></textarea>
                                <div className="absolute right-4 bottom-4 text-xs text-gray-400">42/500</div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Keywords */}
                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-brand-purple pl-3 flex items-center gap-2">
                            SEO & GEO 关键词配置
                            <span className="text-[10px] bg-purple-50 text-brand-purple px-2 py-0.5 rounded-full">AI 重点关注</span>
                        </h3>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">
                                核心监测词 (Core Keywords)
                            </label>
                            <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-200 rounded-lg focus-within:border-brand-purple focus-within:ring-2 focus-within:ring-purple-100 transition-all bg-white">
                                <div className="bg-purple-100 text-brand-purple px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    小程序开发 <X size={12} className="cursor-pointer hover:text-purple-700"/>
                                </div>
                                <div className="bg-purple-100 text-brand-purple px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    SCRM系统 <X size={12} className="cursor-pointer hover:text-purple-700"/>
                                </div>
                                <div className="bg-purple-100 text-brand-purple px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    私域流量 <X size={12} className="cursor-pointer hover:text-purple-700"/>
                                </div>
                                <input type="text" placeholder="输入关键词回车添加" className="flex-1 bg-transparent outline-none text-sm min-w-[120px]" />
                                <Tag size={16} className="text-gray-400" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">AI 将重点追踪这些关键词下的品牌排名与提及率。</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">
                                    竞品对标 (Competitors)
                                </label>
                                <div className="relative">
                                    <div className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg bg-gray-50">
                                        <Target size={16} className="text-gray-400" />
                                        <input type="text" placeholder="如：有赞, 微盟" className="bg-transparent outline-none text-sm w-full" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">
                                    目标受众 (Target Audience)
                                </label>
                                <div className="relative">
                                    <div className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg bg-gray-50">
                                        <Users size={16} className="text-gray-400" />
                                        <input type="text" placeholder="如：电商商家, 实体店主" className="bg-transparent outline-none text-sm w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Platforms */}
                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-900 border-l-4 border-brand-purple pl-3">监测平台范围</h3>
                            <div className="flex items-center gap-2 cursor-pointer group">
                                <div className="w-4 h-4 bg-brand-purple rounded flex items-center justify-center text-white">
                                    <Check size={12} strokeWidth={3} />
                                </div>
                                <span className="text-xs font-bold text-brand-purple">全选主流引擎</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {MONITOR_PLATFORMS.map((platform, idx) => (
                                <div key={idx} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 hover:border-brand-purple cursor-pointer transition-all bg-white relative overflow-hidden group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${idx < 5 ? 'bg-brand-purple border-brand-purple text-white' : 'border-gray-300 bg-white'}`}>
                                        {idx < 5 && <Check size={10} strokeWidth={3} />}
                                    </div>
                                    <img src={platform.icon} className="w-5 h-5 rounded-full" alt={platform.name} />
                                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{platform.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-xl">
                    <div className="text-xs text-gray-500">
                        预计消耗 <span className="font-bold text-gray-900">25</span> 点数/天
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                            取消
                        </button>
                        <button onClick={onClose} className="bg-brand-purple hover:bg-brand-hover text-white font-bold py-2.5 px-8 rounded-lg transition-all shadow-lg shadow-purple-200 active:scale-95 flex items-center gap-2">
                            <Check size={16} /> 启动监测
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
