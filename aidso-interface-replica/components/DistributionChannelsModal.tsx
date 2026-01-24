
import React, { useState } from 'react';
import { X, Plus, CheckCircle2, AlertCircle, RefreshCw, Trash2, Globe, MessageCircle, Link2, Power, ExternalLink, Settings, Shield, Activity, BarChart3 } from 'lucide-react';

interface DistributionChannelsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Channel {
    id: string;
    name: string;
    type: string;
    status: 'connected' | 'disconnected' | 'expired' | 'warning';
    account?: string;
    icon: React.ReactNode;
    color: string;
    quota: { used: number, total: number };
    lastSync: string;
    autoPublish: boolean;
}

export const DistributionChannelsModal = ({ isOpen, onClose }: DistributionChannelsModalProps) => {
    const [channels, setChannels] = useState<Channel[]>([
        { 
            id: 'zhihu', 
            name: '知乎 (Zhihu)', 
            type: '社区问答', 
            status: 'connected', 
            account: 'TechMaster_2025', 
            icon: <img src="https://api.dicebear.com/9.x/initials/svg?seed=ZH&backgroundColor=0084ff" alt="知乎" className="w-full h-full object-cover" />,
            color: 'bg-blue-50',
            quota: { used: 45, total: 100 },
            lastSync: '10分钟前',
            autoPublish: true
        },
        { 
            id: 'wechat', 
            name: '微信公众号', 
            type: '私域生态', 
            status: 'connected', 
            account: '常州微盛官方', 
            icon: <img src="https://api.dicebear.com/9.x/initials/svg?seed=WX&backgroundColor=07c160" alt="微信" className="w-full h-full object-cover" />,
            color: 'bg-green-50',
            quota: { used: 1, total: 4 },
            lastSync: '刚刚',
            autoPublish: false
        },
        { 
            id: 'csdn', 
            name: 'CSDN 博客', 
            type: '技术博客', 
            status: 'expired', 
            account: 'DevOps_Expert', 
            icon: <img src="https://api.dicebear.com/9.x/initials/svg?seed=CS&backgroundColor=fc5531" alt="CSDN" className="w-full h-full object-cover" />,
            color: 'bg-red-50',
            quota: { used: 0, total: 20 },
            lastSync: '3天前',
            autoPublish: false
        },
        { 
            id: 'toutiao', 
            name: '今日头条', 
            type: '新闻资讯', 
            status: 'warning', 
            account: 'AI观察者',
            icon: <img src="https://api.dicebear.com/9.x/initials/svg?seed=TT&backgroundColor=f85959" alt="头条" className="w-full h-full object-cover" />,
            color: 'bg-orange-50',
            quota: { used: 48, total: 50 },
            lastSync: '1小时前',
            autoPublish: true
        },
        { 
            id: 'juejin', 
            name: '稀土掘金', 
            type: '技术社区', 
            status: 'disconnected', 
            icon: <img src="https://api.dicebear.com/9.x/initials/svg?seed=JJ&backgroundColor=1e80ff" alt="掘金" className="w-full h-full object-cover" />,
            color: 'bg-blue-50',
            quota: { used: 0, total: 10 },
            lastSync: '-',
            autoPublish: false
        },
        { 
            id: 'douyin', 
            name: '抖音 (Douyin)', 
            type: '短视频', 
            status: 'connected', 
            account: '微盛·企微管家', 
            icon: <img src="https://api.dicebear.com/9.x/initials/svg?seed=DY&backgroundColor=000000" alt="抖音" className="w-full h-full object-cover" />,
            color: 'bg-gray-100',
            quota: { used: 2, total: 5 },
            lastSync: '2小时前',
            autoPublish: true
        }
    ]);

    const handleConnect = (id: string) => {
        setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'connected', account: 'New_User_01', lastSync: '刚刚' } : c));
    };

    const handleDisconnect = (id: string) => {
        setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'disconnected', account: undefined } : c));
    };

    const toggleAutoPublish = (id: string) => {
        setChannels(prev => prev.map(c => c.id === id ? { ...c, autoPublish: !c.autoPublish } : c));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative w-full max-w-5xl bg-[#f8f9fa] rounded-2xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Globe size={22} className="text-[#7c3aed]" />
                            内容分发矩阵管理
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">集中管理各个内容平台的账号授权、发布配额与自动分发策略。</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-6 text-sm text-gray-500 mr-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                正常: 3
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                失效: 1
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                预警: 1
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {channels.map((channel) => (
                            <div 
                                key={channel.id} 
                                className={`bg-white border rounded-xl p-0 shadow-sm transition-all hover:shadow-lg group relative overflow-hidden ${
                                    channel.status === 'expired' ? 'border-red-200 ring-1 ring-red-100' : 
                                    channel.status === 'warning' ? 'border-orange-200' :
                                    channel.status === 'connected' ? 'border-gray-200 hover:border-purple-200' : 'border-gray-200 border-dashed'
                                }`}
                            >
                                {/* Status Stripe */}
                                <div className={`h-1.5 w-full ${
                                    channel.status === 'connected' ? 'bg-green-500' :
                                    channel.status === 'expired' ? 'bg-red-500' :
                                    channel.status === 'warning' ? 'bg-orange-500' : 'bg-gray-200'
                                }`}></div>

                                <div className="p-5">
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm ${channel.color}`}>
                                                {channel.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                                    {channel.name}
                                                    {channel.status === 'connected' && <CheckCircle2 size={12} className="text-green-500" />}
                                                </h3>
                                                <p className="text-xs text-gray-400">{channel.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button className="p-1.5 text-gray-300 hover:text-gray-600 rounded-md transition-colors">
                                                <Settings size={14} />
                                            </button>
                                            {channel.status === 'connected' && (
                                                <button 
                                                    onClick={() => handleDisconnect(channel.id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    title="断开连接"
                                                >
                                                    <Power size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Account Info / Action */}
                                    <div className="mb-4 min-h-[40px]">
                                        {channel.status === 'connected' || channel.status === 'warning' ? (
                                            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-purple-100 text-brand-purple flex items-center justify-center text-[10px] font-bold">
                                                        {channel.account?.substring(0, 1)}
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{channel.account}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    <Activity size={10} />
                                                    {channel.lastSync}
                                                </div>
                                            </div>
                                        ) : channel.status === 'expired' ? (
                                            <div 
                                                onClick={() => handleConnect(channel.id)}
                                                className="flex items-center justify-between bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 cursor-pointer hover:bg-red-100 transition-colors animate-pulse-slow"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <AlertCircle size={14} />
                                                    授权已过期
                                                </div>
                                                <span className="underline">重新登录</span>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleConnect(channel.id)}
                                                className="w-full flex items-center justify-center gap-2 bg-white text-gray-500 px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 shadow-sm hover:border-[#7c3aed] hover:text-[#7c3aed] transition-all"
                                            >
                                                <Link2 size={14} /> 立即授权连接
                                            </button>
                                        )}
                                    </div>

                                    {/* Stats & Quota */}
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                                <span>API 今日配额</span>
                                                <span className={channel.quota.used / channel.quota.total > 0.9 ? 'text-red-500 font-bold' : ''}>
                                                    {channel.quota.used} / {channel.quota.total}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        channel.quota.used / channel.quota.total > 0.9 ? 'bg-red-500' : 
                                                        channel.quota.used / channel.quota.total > 0.5 ? 'bg-orange-400' : 'bg-green-500'
                                                    }`} 
                                                    style={{ width: `${(channel.quota.used / channel.quota.total) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Shield size={12} /> 自动分发
                                            </span>
                                            <button 
                                                onClick={() => toggleAutoPublish(channel.id)}
                                                disabled={channel.status === 'disconnected'}
                                                className={`w-9 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${channel.autoPublish ? 'bg-[#7c3aed]' : 'bg-gray-200'} ${channel.status === 'disconnected' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${channel.autoPublish ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {channel.status === 'disconnected' && (
                                    <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none"></div>
                                )}
                            </div>
                        ))}

                        {/* Add New Channel */}
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#7c3aed] hover:bg-purple-50/10 transition-colors group h-full min-h-[260px]">
                            <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 mb-4 group-hover:text-[#7c3aed] group-hover:border-[#7c3aed] transition-colors shadow-sm">
                                <Plus size={28} />
                            </div>
                            <h3 className="font-bold text-gray-600 text-sm group-hover:text-[#7c3aed] transition-colors">添加新渠道</h3>
                            <p className="text-xs text-gray-400 mt-2 px-6 leading-relaxed">支持 WordPress, Webhook, 及自定义 CMS API 集成。</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <RefreshCw size={14} className="text-gray-400" />
                        数据自动同步: 每 15 分钟
                    </div>
                    <div className="flex gap-3">
                         <button className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            查看 API 文档
                        </button>
                        <button onClick={onClose} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg active:scale-95">
                            保存配置
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
