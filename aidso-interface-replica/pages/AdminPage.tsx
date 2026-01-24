

import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Users, Server, FileText, Settings, LogOut, Bell, Search, 
    MoreVertical, Shield, Activity, DollarSign, Database, CheckCircle, XCircle,
    AlertTriangle, RefreshCw, ChevronRight, Terminal, Lock, X, Copy, Eye, 
    BarChart2, Calendar, Key, Globe, Layers, AlertCircle, Save, ToggleLeft, ToggleRight,
    Sliders, Zap, AlertOctagon, RotateCcw
} from 'lucide-react';
import { BRANDS } from '../data';
import { PermissionSettings } from '../components/PermissionSettings';
import { AddUserDrawer } from '../components/AddUserDrawer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { apiFetch } from '../services/api';

type AdminTab = 'overview' | 'users' | 'engines' | 'logs' | 'settings';

// --- Mock Data ---

const MOCK_USERS = [
    { id: 1001, name: 'Alice Chen', email: 'alice@tech.com', plan: '企业版', status: '活跃', joined: '2025-01-02', spent: '¥12,400', apiCalls: 15420, tokenUsage: '1.2B', key: 'sk-live-882...99a' },
    { id: 1002, name: 'Bob Zhang', email: 'bob@dev.io', plan: '开发者版', status: '活跃', joined: '2025-01-05', spent: '¥299', apiCalls: 850, tokenUsage: '45M', key: 'sk-live-771...bb2' },
    { id: 1003, name: 'Charlie Wu', email: 'charlie@gmail.com', plan: '免费版', status: '已停用', joined: '2025-01-08', spent: '¥0', apiCalls: 12, tokenUsage: '0.1M', key: 'sk-live-332...cc1' },
    { id: 1004, name: 'David Liu', email: 'david@agency.net', plan: '开发者版', status: '活跃', joined: '2025-01-10', spent: '¥598', apiCalls: 2100, tokenUsage: '120M', key: 'sk-live-112...dd4' },
    { id: 1005, name: 'Eve Wang', email: 'eve@startup.cc', plan: '免费版', status: '活跃', joined: '2025-01-12', spent: '¥0', apiCalls: 45, tokenUsage: '2M', key: 'sk-live-554...ee5' },
];

const MOCK_API_LOGS = [
    { id: 'REQ-100293', time: '10:42:01', method: 'POST', path: '/v1/search/geo', status: 200, latency: '450ms', user: 'Alice Chen', ip: '192.168.1.10' },
    { id: 'REQ-100294', time: '10:42:05', method: 'GET', path: '/v1/models', status: 200, latency: '20ms', user: 'Bob Zhang', ip: '10.0.0.5' },
    { id: 'REQ-100295', time: '10:43:12', method: 'POST', path: '/v1/analysis', status: 429, latency: '10ms', user: 'Charlie Wu', ip: '172.16.0.1' },
    { id: 'REQ-100296', time: '10:45:00', method: 'POST', path: '/v1/search/stream', status: 500, latency: '5000ms', user: 'System', ip: 'localhost' },
    { id: 'REQ-100297', time: '10:46:22', method: 'POST', path: '/v1/search/geo', status: 200, latency: '380ms', user: 'David Liu', ip: '192.168.1.12' },
];

const MOCK_AUDIT_LOGS = [
    { id: 'LOG-9921', time: '10:42:01', type: 'INFO', module: 'API 网关', msg: '入站流量激增检测' },
    { id: 'LOG-9922', time: '10:42:05', type: 'SUCCESS', module: '认证服务', msg: '管理员 admin 登录后台' },
    { id: 'LOG-9923', time: '10:43:12', type: 'WARN', module: 'DeepSeek', msg: '上游 API 响应延迟 > 2s' },
    { id: 'LOG-9924', time: '10:45:00', type: 'ERROR', module: '计费系统', msg: 'Stripe Webhook 签名验证失败' },
];

const MOCK_NOTIFICATIONS = [
    { id: 1, title: 'API 延迟警告', msg: 'DeepSeek 引擎响应时间 > 2s', time: '2分钟前', type: 'warning' },
    { id: 2, title: '新企业用户', msg: 'TechCorp 订阅了企业版套餐', time: '15分钟前', type: 'success' },
    { id: 3, title: '系统备份完成', msg: '每日全量备份已归档至 S3', time: '1小时前', type: 'info' },
];

// --- Sub-Components ---

const StatCard = ({ title, value, change, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
        <div>
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
            <div className={`text-xs font-bold flex items-center gap-1 ${change.startsWith('+') ? 'text-green-600' : change.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                {change.startsWith('+') ? <Activity size={12} /> : change.startsWith('-') ? <AlertTriangle size={12} /> : null}
                {change} 较上月
            </div>
        </div>
        <div className={`p-3 rounded-lg ${color} text-white shadow-md`}>
            {icon}
        </div>
    </div>
);

const EngineRow: React.FC<{ brand: any; onConfigure: () => void }> = ({ brand, onConfigure }) => {
    const [status, setStatus] = useState<'Online' | 'Maintenance' | 'Degraded'>('Online');
    
    return (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
                <img src={brand.icon} className="w-10 h-10 rounded-full border border-gray-100 group-hover:scale-105 transition-transform" alt={brand.name} />
                <div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                        {brand.name}
                        {status === 'Online' && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100">Healthy</span>}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">协议: {brand.type.toUpperCase()} / 延迟: {brand.latency}</div>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 font-bold uppercase">当前状态</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${status === 'Online' ? 'bg-green-500' : status === 'Maintenance' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                        <select 
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer hover:text-brand-purple"
                        >
                            <option value="Online">运行中</option>
                            <option value="Degraded">性能降级</option>
                            <option value="Maintenance">维护中</option>
                        </select>
                    </div>
                </div>
                
                <div className="h-8 w-px bg-gray-100"></div>
                
                <button 
                    onClick={onConfigure}
                    className="text-gray-400 hover:text-brand-purple p-2 hover:bg-purple-50 rounded-lg transition-all"
                    title="配置引擎参数"
                >
                    <Settings size={18} />
                </button>
            </div>
        </div>
    );
};

// --- Engine Config Drawer ---
const EngineConfigDrawer = ({ brand, onClose }: { brand: any, onClose: () => void }) => {
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4096);
    const [isTesting, setIsTesting] = useState(false);

    const handleTest = () => {
        setIsTesting(true);
        setTimeout(() => setIsTesting(false), 1000);
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-gray-200 z-[60] animate-slide-in-right flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={brand.icon} className="w-10 h-10 rounded-full border border-gray-100" alt={brand.name} />
                    <div>
                        <h3 className="font-bold text-gray-900">{brand.name} 配置</h3>
                        <div className="text-xs text-green-500 font-bold flex items-center gap-1">
                            <Zap size={10} fill="currentColor"/> WebSocket Connected
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Connection */}
                <div className="space-y-4">
                     <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Server size={14} className="text-brand-purple" />
                        连接设置
                     </h4>
                     <div>
                         <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Endpoint</label>
                         <input type="text" defaultValue={`https://api.${brand.name.toLowerCase()}.com/v1`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50 focus:bg-white focus:border-brand-purple outline-none transition-colors" />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Key (Masked)</label>
                         <div className="relative">
                            <input type="password" defaultValue="sk-live-882190xxxxxxxxxxxxxxxx" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50 focus:bg-white focus:border-brand-purple outline-none transition-colors" />
                            <Lock size={14} className="absolute right-3 top-2.5 text-gray-400" />
                         </div>
                     </div>
                </div>

                {/* Parameters */}
                <div className="space-y-6">
                     <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Sliders size={14} className="text-brand-purple" />
                        模型参数 (Parameters)
                     </h4>
                     
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <div className="flex justify-between text-xs mb-2">
                             <label className="font-bold text-gray-600">Temperature (随机性)</label>
                             <span className="font-mono text-brand-purple font-bold">{temperature}</span>
                         </div>
                         <input 
                            type="range" min="0" max="1" step="0.1" 
                            value={temperature} 
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple mb-1" 
                         />
                         <div className="flex justify-between text-[10px] text-gray-400">
                             <span>Precise</span>
                             <span>Creative</span>
                         </div>
                     </div>

                     <div>
                         <label className="text-xs font-bold text-gray-500 mb-1.5 block">Max Tokens (最大输出)</label>
                         <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={maxTokens}
                                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none" 
                             />
                             <span className="text-xs text-gray-400 whitespace-nowrap">tokens</span>
                         </div>
                     </div>
                </div>

                {/* Advanced */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Shield size={14} className="text-brand-purple" />
                        安全策略
                    </h4>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">启用敏感词过滤</span>
                        <div className="w-10 h-5 bg-brand-purple rounded-full relative cursor-pointer">
                            <div className="w-3 h-3 bg-white rounded-full absolute right-1 top-1"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
                <button 
                    onClick={handleTest}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-white hover:border-brand-purple/50 transition-all flex items-center justify-center gap-2"
                >
                    {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                    {isTesting ? 'Testing...' : '测试连接'}
                </button>
                <button className="flex-1 py-2.5 bg-brand-purple text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:bg-brand-hover active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Save size={16} /> 保存配置
                </button>
            </div>
        </div>
    );
};

// --- User Detail Drawer ---
const UserDetailDrawer = ({ user, onClose, onUserUpdated }: { user: any, onClose: () => void, onUserUpdated: (nextUser: any) => void }) => {
    const initialPlanKey = user.planKey || (user.plan === '开发者版' ? 'PRO' : user.plan === '企业版' ? 'ENTERPRISE' : 'FREE');
    const [editingName, setEditingName] = useState(user.name || '');
    const [editingPlan, setEditingPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>(initialPlanKey);
    const [saving, setSaving] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [recharging, setRecharging] = useState(false);

    useEffect(() => {
        setEditingName(user.name || '');
        const nextPlanKey = user.planKey || (user.plan === '开发者版' ? 'PRO' : user.plan === '企业版' ? 'ENTERPRISE' : 'FREE');
        setEditingPlan(nextPlanKey);
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await apiFetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingName, plan: editingPlan })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && data.error) || '保存失败');
            if (data?.user) {
                onUserUpdated({ ...user, ...data.user });
            }
            alert('✅ 已保存');
        } catch (err: any) {
            alert(`❌ 保存失败: ${err?.message || '未知错误'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            const res = await apiFetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && data.error) || '重置失败');
            alert(`✅ 已重置密码\n新密码：${data?.newPassword || '111111'}`);
        } catch (err: any) {
            alert(`❌ 重置失败: ${err?.message || '未知错误'}`);
        }
    };

    const handleRecharge = async () => {
        const amount = parseInt(rechargeAmount);
        if (!amount || amount <= 0) {
            alert('请输入有效的充值点数');
            return;
        }

        setRecharging(true);
        try {
            const res = await apiFetch(`/api/admin/users/${user.id}/recharge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description: `管理员充值 ${amount} 点` })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && data.error) || '充值失败');
            
            alert(`✅ ${data.message || '充值成功'}`);
            setRechargeAmount('');
            // 更新用户点数
            onUserUpdated({ ...user, points: data.points });
        } catch (err: any) {
            alert(`❌ 充值失败: ${err?.message || '未知错误'}`);
        } finally {
            setRecharging(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l border-gray-200 z-[60] animate-slide-in-right overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">用户详情</h3>
                    <p className="text-xs text-gray-400">ID: {user.id}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-8">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-2xl font-bold text-gray-600 border border-gray-100">
                        {(user.name || user.email || '?').charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-lg text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.status === '活跃' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {user.status}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-brand-purple border border-purple-100">
                                {user.plan}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Editable fields */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">用户名称</label>
                        <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">套餐</label>
                        <select
                            value={editingPlan}
                            onChange={(e) => setEditingPlan(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none bg-white"
                        >
                            <option value="FREE">免费版</option>
                            <option value="PRO">开发者版</option>
                            <option value="ENTERPRISE">企业版</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-brand-purple text-white py-2.5 rounded-xl text-sm font-bold hover:bg-brand-hover transition-colors disabled:opacity-60"
                        >
                            {saving ? '保存中...' : '保存'}
                        </button>
                        <button
                            onClick={handleResetPassword}
                            className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                        >
                            重置密码
                        </button>
                    </div>
                    <div className="text-[10px] text-gray-400">重置密码会设置为 111111（demo）。</div>
                </div>

                {/* Points Recharge Section */}
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-200 p-4">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <DollarSign size={14} className="text-orange-600" />
                        点数余额
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-bold text-gray-900">{user.points || 0}</span>
                        <span className="text-sm text-gray-500">点</span>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">充值点数</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={rechargeAmount}
                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                    placeholder="输入点数"
                                    className="flex-1 px-3 py-2 border border-orange-200 rounded-lg text-sm focus:border-orange-400 outline-none bg-white"
                                />
                                <button
                                    onClick={handleRecharge}
                                    disabled={recharging}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-60 whitespace-nowrap"
                                >
                                    {recharging ? '充值中...' : '立即充值'}
                                </button>
                            </div>
                        </div>
                        
                        {/* Quick recharge buttons */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setRechargeAmount('10')}
                                className="flex-1 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-orange-50 transition-colors"
                            >
                                +10
                            </button>
                            <button 
                                onClick={() => setRechargeAmount('50')}
                                className="flex-1 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-orange-50 transition-colors"
                            >
                                +50
                            </button>
                            <button 
                                onClick={() => setRechargeAmount('100')}
                                className="flex-1 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-orange-50 transition-colors"
                            >
                                +100
                            </button>
                            <button 
                                onClick={() => setRechargeAmount('500')}
                                className="flex-1 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-orange-50 transition-colors"
                            >
                                +500
                            </button>
                        </div>
                    </div>
                    
                    <div className="text-[10px] text-gray-500 mt-3">
                        💡 提示：每次执行任务消耗 1 点
                    </div>
                </div>

                {/* API Key Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Key size={12} /> Live API Key
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <code className="text-sm font-mono text-gray-700">{user.key}</code>
                        <button className="text-gray-400 hover:text-brand-purple transition-colors">
                            <Copy size={14} />
                        </button>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2">
                        上次使用: 刚刚 · 创建于: {user.joined}
                    </div>
                </div>

                {/* Usage Stats */}
                <div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart2 size={16} className="text-gray-400" />
                        本月用量统计
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-gray-100 bg-white">
                            <div className="text-xs text-gray-500 mb-1">API 调用次数</div>
                            <div className="text-xl font-bold text-gray-900">{user.apiCalls.toLocaleString()}</div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-gray-100 bg-white">
                            <div className="text-xs text-gray-500 mb-1">Token 消耗量</div>
                            <div className="text-xl font-bold text-gray-900">{user.tokenUsage}</div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '20%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Logs (Mini) */}
                <div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Terminal size={16} className="text-gray-400" />
                        近期调用日志
                    </h4>
                    <div className="space-y-2">
                        {MOCK_API_LOGS.slice(0, 3).map((log, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white text-xs">
                                <div className="flex items-center gap-3">
                                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${log.status === 200 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {log.status}
                                    </span>
                                    <span className="font-mono text-gray-600">{log.method} {log.path}</span>
                                </div>
                                <span className="text-gray-400">{log.time}</span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-3 text-xs text-brand-purple font-bold hover:underline">
                        查看全部历史记录
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- API Payload Detail Modal ---
const ApiLogDetailModal = ({ log, onClose }: { log: any, onClose: () => void }) => {
    if(!log) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
             <div className="relative w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl animate-scale-in flex flex-col max-h-[80vh] overflow-hidden border border-gray-700 text-gray-300 font-mono text-sm">
                 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#252526]">
                     <div>
                         <span className={`px-2 py-1 rounded text-xs font-bold mr-3 ${log.status === 200 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{log.status}</span>
                         <span className="font-bold text-white">{log.method} {log.path}</span>
                     </div>
                     <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18}/></button>
                 </div>
                 <div className="p-6 overflow-y-auto space-y-6">
                     <div>
                         <div className="text-xs uppercase font-bold text-gray-500 mb-2">Metadata</div>
                         <div className="grid grid-cols-2 gap-4 text-xs">
                             <div className="flex justify-between border-b border-gray-800 py-1"><span>Request ID:</span> <span className="text-blue-400">{log.id}</span></div>
                             <div className="flex justify-between border-b border-gray-800 py-1"><span>Time:</span> <span>{log.time}</span></div>
                             <div className="flex justify-between border-b border-gray-800 py-1"><span>Latency:</span> <span className="text-yellow-400">{log.latency}</span></div>
                             <div className="flex justify-between border-b border-gray-800 py-1"><span>Client IP:</span> <span>{log.ip}</span></div>
                         </div>
                     </div>
                     <div>
                         <div className="text-xs uppercase font-bold text-gray-500 mb-2">Request Body</div>
                         <div className="bg-[#000000]/30 p-4 rounded-lg border border-gray-800 overflow-x-auto">
                            <pre className="text-green-300">
{`{
  "query": "常州小程序开发",
  "filters": {
    "geo": "CN-JS-Changzhou",
    "engine": ["deepseek", "doubao"]
  },
  "stream": false
}`}
                            </pre>
                         </div>
                     </div>
                     <div>
                         <div className="text-xs uppercase font-bold text-gray-500 mb-2">Response Body (Preview)</div>
                         <div className="bg-[#000000]/30 p-4 rounded-lg border border-gray-800 overflow-x-auto">
                            <pre className="text-blue-300">
{`{
  "code": 200,
  "data": {
    "items": [ ... ],
    "total": 12
  },
  "trace_id": "trace-8821a-bb9"
}`}
                            </pre>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
};

// --- Main Admin Component ---

export const AdminPage = ({ onExit }: { onExit: () => void }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [usersLoadError, setUsersLoadError] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [isAddUserDrawerOpen, setIsAddUserDrawerOpen] = useState(false);
    
    // Fetch Data from Backend
    useEffect(() => {
        // Fetch Stats
        apiFetch('/api/admin/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Failed to fetch stats", err));

        // Fetch Users
        apiFetch('/api/admin/users')
            .then(async (res) => {
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    const msg = (data && (data.error || data.message)) || `加载失败（HTTP ${res.status}）`;
                    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
                }
                return Array.isArray(data) ? data : [];
            })
            .then((data) => {
                setUsersLoadError('');
                setUsers(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                console.error("Failed to fetch users", err);
                setUsersLoadError(String(err?.message || err || '加载失败'));
                setUsers([]);
            });
    }, []);

    const [logView, setLogView] = useState<'audit' | 'traffic'>('audit');
    
    // New States
    const [selectedEngine, setSelectedEngine] = useState<any>(null);
    const [showNotifications, setShowNotifications] = useState(false);

    // Settings State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [signupEnabled, setSignupEnabled] = useState(true);

    useEffect(() => {
        apiFetch('/api/admin/config')
            .then(res => res.json())
            .then(cfg => {
                setMaintenanceMode(!!cfg?.system?.maintenanceMode);
                setSignupEnabled(cfg?.system?.signupEnabled !== false);
            })
            .catch(() => {});
    }, []);

    const patchSystemConfig = async (patch: { maintenanceMode?: boolean, signupEnabled?: boolean }) => {
        try {
            await apiFetch('/api/admin/config/system', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            });
        } catch (err) {
            console.error('Failed to patch system config', err);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-8 animate-fade-in">
                         {/* System Alert Banner */}
                         <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 rounded-xl p-6 text-white shadow-xl shadow-purple-900/10 flex items-center justify-between relative overflow-hidden">
                             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                             <div className="relative z-10 flex items-center gap-4">
                                 <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner">
                                     <Shield size={24} className="text-green-400" />
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-lg flex items-center gap-2">
                                        系统运行正常
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                     </h3>
                                     <p className="text-purple-200 text-sm">所有服务节点健康，未检测到安全威胁。</p>
                                 </div>
                             </div>
                             <div className="relative z-10 flex gap-6 items-center">
                                 <div className="text-right hidden md:block">
                                     <div className="text-xs text-purple-300 uppercase font-bold tracking-wider">Uptime</div>
                                     <div className="font-mono font-bold text-xl">99.99%</div>
                                 </div>
                                 <div className="w-px h-10 bg-white/10 hidden md:block"></div>
                                 <div className="text-right hidden md:block">
                                     <div className="text-xs text-purple-300 uppercase font-bold tracking-wider">Latency</div>
                                     <div className="font-mono font-bold text-xl text-green-400">42ms</div>
                                 </div>
                             </div>
                         </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="总用户数" value={stats?.totalUsers || "..."} change="+12%" icon={<Users size={20} />} color="bg-blue-600" />
                            <StatCard title="月收入 (MRR)" value={`¥${(stats?.totalRevenue || 0).toLocaleString()}`} change="+8.5%" icon={<DollarSign size={20} />} color="bg-green-600" />
                            <StatCard title="API 调用量" value={stats?.totalApiCalls || "..."} change="+24%" icon={<Server size={20} />} color="bg-purple-600" />
                            <StatCard title="系统健康度" value={`${stats?.systemHealth || 99}%`} change="+0.02%" icon={<Activity size={20} />} color="bg-orange-500" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Recent Activity */}
                            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Activity size={18} className="text-brand-purple"/>
                                        实时搜索流量趋势
                                    </h3>
                                    <select className="text-xs border-gray-200 rounded-lg bg-gray-50 px-2 py-1 outline-none font-medium cursor-pointer hover:bg-gray-100 transition-colors">
                                        <option>最近 24 小时</option>
                                        <option>最近 7 天</option>
                                    </select>
                                </div>
                                <div className="h-64 flex items-end gap-2">
                                    {[35, 45, 30, 60, 75, 50, 65, 80, 70, 90, 85, 60, 50, 40, 55, 70, 65, 80, 95, 100, 85, 70, 60, 50].map((h, i) => (
                                        <div key={i} className="flex-1 bg-purple-100 hover:bg-brand-purple rounded-t transition-colors relative group" style={{ height: `${h}%` }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                                                {h * 10} 请求
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* System Status */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Server size={18} className="text-gray-500"/>
                                    服务组件状态
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { name: '爬虫集群 Cluster A', status: 'Healthy', load: '45%' },
                                        { name: '向量数据库 (Vector DB)', status: 'Healthy', load: '72%' },
                                        { name: '推理 API 网关', status: 'High Load', load: '91%' },
                                        { name: '支付结算系统', status: 'Healthy', load: '12%' },
                                        { name: '消息通知服务', status: 'Maintenance', load: '0%' },
                                    ].map((svc, i) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${svc.status === 'Healthy' ? 'bg-green-500' : svc.status === 'High Load' ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{svc.name}</span>
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono group-hover:text-brand-purple transition-colors">{svc.load}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-8 py-2.5 text-xs font-bold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                                    查看服务网格 (Service Mesh)
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-slide-up relative min-h-[700px] h-full flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">用户管理</h3>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="搜索用户..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-purple w-64" />
                                </div>
                                <button 
                                    onClick={() => setIsAddUserDrawerOpen(true)}
                                    className="bg-brand-purple text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-brand-hover"
                                >
                                    添加用户
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4">用户</th>
                                    <th className="px-6 py-4">状态</th>
                                    <th className="px-6 py-4">套餐计划</th>
                                    <th className="px-6 py-4">点数余额</th>
                                    <th className="px-6 py-4">API 调用量</th>
                                    <th className="px-6 py-4">总消费</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {usersLoadError && (
                                    <tr>
                                        <td className="px-6 py-6 text-center text-sm text-red-600" colSpan={7}>
                                            用户列表加载失败：{usersLoadError}
                                        </td>
                                    </tr>
                                )}
                                {users.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-10 text-center text-sm text-gray-400" colSpan={7}>
                                            暂无用户数据（请确认后端已启动，并使用管理员账号登录后台）
                                        </td>
                                    </tr>
                                )}
                                {users.map((user) => (
                                    <tr 
                                        key={user.id} 
                                        className={`hover:bg-purple-50/50 transition-colors cursor-pointer ${selectedUser?.id === user.id ? 'bg-purple-50' : ''}`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                                                    {(user.name || user.email || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{user.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-gray-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.status === '活跃' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {user.status || '活跃'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-medium ${user.plan === '企业版' ? 'text-brand-purple font-bold' : 'text-gray-600'}`}>
                                                {user.plan || '免费版'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-orange-600">{user.points || 0}</span>
                                                <span className="text-xs text-gray-400">点</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">
                                            {Number(user.apiCalls || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{user.spent}</td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button className="text-gray-400 hover:text-brand-purple p-2 hover:bg-gray-100 rounded-lg transition-all">
                                                <Eye size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if(confirm("确定要删除该用户吗？")) {
                                                        apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
                                                            .then((res) => {
                                                                if (!res.ok) throw new Error('删除失败');
                                                                setUsers(prev => prev.filter(u => u.id !== user.id));
                                                            })
                                                            .catch((err) => alert(err?.message || '删除失败'));
                                                    }
                                                }}
                                                className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <LogOut size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                        
                        {/* Drawer Overlay */}
                        {selectedUser && (
                            <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px] z-50 transition-opacity" onClick={() => setSelectedUser(null)}></div>
                        )}
                        
                        {/* Drawer */}
                        {selectedUser && (
                            <UserDetailDrawer
                                user={selectedUser}
                                onClose={() => setSelectedUser(null)}
                                onUserUpdated={(nextUser) => {
                                    setSelectedUser(nextUser);
                                    setUsers(prev => prev.map(u => u.id === nextUser.id ? nextUser : u));
                                }}
                            />
                        )}
                        
                        {/* Add User Drawer */}
                        <AddUserDrawer 
                            isOpen={isAddUserDrawerOpen} 
                            onClose={() => setIsAddUserDrawerOpen(false)}
                            onSuccess={() => {
                                // Refresh user list
                                apiFetch('/api/admin/users').then(r => r.json()).then(setUsers);
                            }}
                        />
                    </div>
                );
            case 'engines':
                return (
                    <div className="space-y-6 animate-fade-in relative">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">AI 引擎聚合管理</h3>
                                <p className="text-sm text-gray-500">控制前端显示的 AI 引擎状态、模拟延迟及数据源接入。</p>
                            </div>
                            <button className="flex items-center gap-2 text-sm text-brand-purple font-bold hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-purple-100">
                                <RefreshCw size={14} /> 刷新健康检查
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {BRANDS.map((brand, i) => (
                                <EngineRow 
                                    key={i} 
                                    brand={brand} 
                                    onConfigure={() => setSelectedEngine(brand)}
                                />
                            ))}
                        </div>

                        {/* Engine Config Overlay */}
                        {selectedEngine && (
                            <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-[1px] z-50 transition-opacity" onClick={() => setSelectedEngine(null)}></div>
                        )}
                        {selectedEngine && <EngineConfigDrawer brand={selectedEngine} onClose={() => setSelectedEngine(null)} />}
                    </div>
                );
            case 'logs':
                return (
                    <div className="bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-800 flex flex-col min-h-[700px] h-full overflow-hidden animate-scale-in">
                        {/* Logs Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#252526]">
                            <div className="flex items-center gap-4">
                                <div 
                                    onClick={() => setLogView('audit')}
                                    className={`flex items-center gap-2 cursor-pointer transition-colors ${logView === 'audit' ? 'text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <Shield size={16} />
                                    <span>系统审计</span>
                                </div>
                                <div className="w-px h-4 bg-gray-700"></div>
                                <div 
                                    onClick={() => setLogView('traffic')}
                                    className={`flex items-center gap-2 cursor-pointer transition-colors ${logView === 'traffic' ? 'text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <Activity size={16} />
                                    <span>API 流量监控</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Search logs..." className="bg-black/20 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300 outline-none focus:border-gray-500" />
                            </div>
                        </div>

                        {/* Logs Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {logView === 'audit' ? (
                                <div className="space-y-1 font-mono text-xs">
                                    {MOCK_AUDIT_LOGS.map((log) => (
                                        <div key={log.id} className="grid grid-cols-12 gap-4 hover:bg-white/5 p-2 rounded transition-colors cursor-pointer border-b border-gray-800/50">
                                            <span className="col-span-2 text-gray-500">{log.time}</span>
                                            <span className={`col-span-1 font-bold ${log.type === 'INFO' ? 'text-blue-400' : log.type === 'WARN' ? 'text-yellow-400' : log.type === 'ERROR' ? 'text-red-500' : 'text-green-400'}`}>
                                                {log.type}
                                            </span>
                                            <span className="col-span-2 text-purple-300">[{log.module}]</span>
                                            <span className="col-span-7 text-gray-300">{log.msg}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1 font-mono text-xs">
                                     {/* Header Row */}
                                     <div className="grid grid-cols-12 gap-4 px-2 py-2 text-gray-500 font-bold border-b border-gray-700 uppercase tracking-wider">
                                        <span className="col-span-2">Time</span>
                                        <span className="col-span-1">Method</span>
                                        <span className="col-span-3">Path</span>
                                        <span className="col-span-1">Status</span>
                                        <span className="col-span-1">Latency</span>
                                        <span className="col-span-2">User</span>
                                        <span className="col-span-2">IP</span>
                                     </div>
                                     {MOCK_API_LOGS.map((log) => (
                                        <div 
                                            key={log.id} 
                                            onClick={() => setSelectedLog(log)}
                                            className="grid grid-cols-12 gap-4 hover:bg-blue-500/10 p-2 rounded transition-colors cursor-pointer border-b border-gray-800/50 items-center group"
                                        >
                                            <span className="col-span-2 text-gray-500 group-hover:text-gray-300">{log.time}</span>
                                            <span className={`col-span-1 font-bold ${log.method === 'GET' ? 'text-blue-400' : 'text-orange-400'}`}>{log.method}</span>
                                            <span className="col-span-3 text-gray-300 truncate" title={log.path}>{log.path}</span>
                                            <span className={`col-span-1 font-bold ${log.status === 200 ? 'text-green-400' : log.status >= 500 ? 'text-red-500' : 'text-yellow-400'}`}>
                                                {log.status}
                                            </span>
                                            <span className="col-span-1 text-gray-400">{log.latency}</span>
                                            <span className="col-span-2 text-gray-300 truncate">{log.user}</span>
                                            <span className="col-span-2 text-gray-500 text-[10px]">{log.ip}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedLog && <ApiLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
                    </div>
                );
            case 'settings':
                return (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
                        {/* Permission Settings */}
                        <ErrorBoundary title="权限与配置">
                            <PermissionSettings />
                        </ErrorBoundary>

                        {/* General Settings */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Globe size={18} className="text-gray-500" />
                                    通用设置
                                </h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2">站点名称</label>
                                        <input type="text" defaultValue="AiGEO 蠕虫系统" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2">管理员邮箱</label>
                                        <input type="text" defaultValue="admin@aigeo.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">维护模式</div>
                                        <div className="text-xs text-gray-500 mt-0.5">开启后，所有非管理员访问将被重定向至维护页面。</div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const next = !maintenanceMode;
                                            setMaintenanceMode(next);
                                            patchSystemConfig({ maintenanceMode: next });
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceMode ? 'bg-brand-purple' : 'bg-gray-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">开放注册</div>
                                        <div className="text-xs text-gray-500 mt-0.5">允许新用户通过前端页面注册账户。</div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const next = !signupEnabled;
                                            setSignupEnabled(next);
                                            patchSystemConfig({ signupEnabled: next });
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${signupEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${signupEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* API Limits */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Server size={18} className="text-gray-500" />
                                    API 速率限制 (Rate Limiting)
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {['免费版 (Free)', '开发者版 (Pro)', '企业版 (Enterprise)'].map((plan, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">{plan}</span>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    defaultValue={i === 0 ? 60 : i === 1 ? 1000 : 10000} 
                                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right" 
                                                />
                                                <span className="text-xs text-gray-400">req/min</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                <button className="bg-brand-purple text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-hover transition-colors shadow-lg flex items-center gap-2">
                                    <Save size={16} /> 保存配置
                                </button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="text-gray-500 flex items-center justify-center h-64">模块开发中...</div>;
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-gray-900 text-white flex flex-col fixed inset-y-0 left-0 z-50 shadow-xl">
                <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-800 bg-gray-900 z-10">
                    <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/50">A</div>
                    <span className="font-bold text-lg tracking-tight">AiGEO 后台</span>
                </div>

                <div className="flex-1 py-6 space-y-1 px-3 overflow-y-auto scrollbar-hide">
                    <div className="text-xs font-bold text-gray-500 px-3 mb-2 uppercase tracking-wider">仪表盘</div>
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <LayoutDashboard size={18} /> 总览
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Users size={18} /> 用户管理
                    </button>
                    
                    <div className="text-xs font-bold text-gray-500 px-3 mt-6 mb-2 uppercase tracking-wider">系统管理</div>
                    <button onClick={() => setActiveTab('engines')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'engines' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Database size={18} /> 引擎中枢
                    </button>
                    <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <FileText size={18} /> 审计日志
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Settings size={18} /> 全局配置
                    </button>
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs text-white shadow-md">AD</div>
                        <div>
                            <div className="text-sm font-bold text-gray-200">Admin User</div>
                            <div className="text-xs text-gray-500">超级管理员</div>
                        </div>
                    </div>
                    <button onClick={onExit} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-xs font-bold transition-colors">
                        <LogOut size={14} /> 退出后台
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm flex-shrink-0 z-40">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="hover:text-gray-900 cursor-pointer">管理后台</span>
                        <ChevronRight size={14} />
                        <span className="font-bold text-gray-900 capitalize">
                            {activeTab === 'overview' ? '总览' : 
                             activeTab === 'users' ? '用户管理' : 
                             activeTab === 'engines' ? '引擎中枢' : 
                             activeTab === 'logs' ? '日志监控' : '全局配置'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Bell 
                                size={20} 
                                className="text-gray-400 hover:text-gray-600 cursor-pointer" 
                                onClick={() => setShowNotifications(!showNotifications)}
                            />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                            
                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
                                    <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-scale-in origin-top-right">
                                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
                                            <span className="text-xs font-bold text-gray-700">系统通知</span>
                                            <span className="text-[10px] text-gray-400 cursor-pointer hover:text-brand-purple">标为已读</span>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {MOCK_NOTIFICATIONS.map((notif) => (
                                                <div key={notif.id} className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.type === 'warning' ? 'bg-red-500' : notif.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-800 mb-0.5">{notif.title}</div>
                                                            <div className="text-xs text-gray-500 leading-tight mb-1">{notif.msg}</div>
                                                            <div className="text-[10px] text-gray-400">{notif.time}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 py-2 border-t border-gray-50 text-center">
                                            <button className="text-xs font-bold text-brand-purple hover:underline">查看全部</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="h-8 w-px bg-gray-100"></div>
                        <a href="#" className="text-sm font-bold text-brand-purple hover:underline flex items-center gap-1">
                            说明文档 <ExternalLinkIcon size={12} />
                        </a>
                    </div>
                </header>

                {/* Viewport */}
                <main className="flex-1 overflow-y-auto p-8 scrollbar-hide bg-[#f3f4f6]">
                    <div className="w-full">
                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                                    {activeTab === 'overview' ? '仪表盘总览' : 
                                    activeTab === 'users' ? '用户账户管理' : 
                                    activeTab === 'engines' ? 'AI 引擎状态控制' : 
                                    activeTab === 'logs' ? '系统日志监控' : '全局系统设置'}
                                </h1>
                                <p className="text-gray-500 text-sm mt-1">管理您的应用状态、数据流向及用户权限。</p>
                            </div>
                            {activeTab === 'users' && (
                                <div className="text-xs text-gray-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                    Total Users: <span className="font-bold text-gray-900">12,450</span>
                                </div>
                            )}
                        </div>
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const ExternalLinkIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);
