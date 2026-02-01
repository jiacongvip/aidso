

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
import { usePublicConfig } from '../contexts/PublicConfigContext';

type AdminTab =
    | 'overview'
    | 'reports'
    | 'users'
    | 'tasks'
    | 'engines'
    | 'calls'
    | 'billing'
    | 'pageviews'
    | 'logs'
    | 'settings';

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

const formatDurationSeconds = (seconds: number) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${ss}s`;
    return `${ss}s`;
};

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
    const [activityTab, setActivityTab] = useState<'tasks' | 'runs' | 'analysis' | 'points' | 'pageviews'>('tasks');
    const [analytics, setAnalytics] = useState<any>(null);
    const [userTasks, setUserTasks] = useState<any[]>([]);
    const [userRuns, setUserRuns] = useState<any[]>([]);
    const [userPointsLogs, setUserPointsLogs] = useState<any[]>([]);
    const [userPageViews, setUserPageViews] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState('');
    const [taskReport, setTaskReport] = useState<any>(null);
    const [runDetail, setRunDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        setEditingName(user.name || '');
        const nextPlanKey = user.planKey || (user.plan === '开发者版' ? 'PRO' : user.plan === '企业版' ? 'ENTERPRISE' : 'FREE');
        setEditingPlan(nextPlanKey);
    }, [user]);

    const fetchJson = async (url: string) => {
        const res = await apiFetch(url);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const msg = (data && (data.error || data.message)) || `请求失败（HTTP ${res.status}）`;
            throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
        return data;
    };

    const downloadCsv = async (url: string, filename: string) => {
        try {
            const res = await apiFetch(url);
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `下载失败（HTTP ${res.status}）`);
            }
            const blob = await res.blob();
            const href = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        } catch (err: any) {
            alert(`❌ 导出失败: ${err?.message || '未知错误'}`);
        }
    };

    const refreshActivity = async () => {
        setActivityLoading(true);
        setActivityError('');
        try {
            const [a, t, r, p, v] = await Promise.all([
                fetchJson(`/api/admin/users/${user.id}/analytics`),
                fetchJson(`/api/admin/users/${user.id}/tasks?limit=30`),
                fetchJson(`/api/admin/users/${user.id}/runs?limit=50`),
                fetchJson(`/api/admin/users/${user.id}/points-logs?limit=50`),
                fetchJson(`/api/admin/users/${user.id}/pageviews?limit=50`),
            ]);
            setAnalytics(a);
            setUserTasks(Array.isArray(t) ? t : []);
            setUserRuns(Array.isArray(r) ? r : []);
            setUserPointsLogs(Array.isArray(p) ? p : []);
            setUserPageViews(Array.isArray(v) ? v : []);
        } catch (err: any) {
            console.error('Failed to load user activity', err);
            setActivityError(String(err?.message || err || '加载失败'));
            setAnalytics(null);
            setUserTasks([]);
            setUserRuns([]);
            setUserPointsLogs([]);
            setUserPageViews([]);
        } finally {
            setActivityLoading(false);
        }
    };

    useEffect(() => {
        setActivityTab('tasks');
        refreshActivity();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

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
            refreshActivity();
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
            refreshActivity();
        } catch (err: any) {
            alert(`❌ 充值失败: ${err?.message || '未知错误'}`);
        } finally {
            setRecharging(false);
        }
    };

    const openTaskReport = async (taskId: string) => {
        setLoadingDetail(true);
        try {
            const data = await fetchJson(`/api/admin/tasks/${taskId}`);
            setTaskReport(data);
        } catch (err: any) {
            alert(`❌ 获取报告失败: ${err?.message || '未知错误'}`);
        } finally {
            setLoadingDetail(false);
        }
    };

    const openRunDetail = async (runId: string) => {
        setLoadingDetail(true);
        try {
            const data = await fetchJson(`/api/admin/runs/${runId}`);
            setRunDetail(data);
        } catch (err: any) {
            alert(`❌ 获取调用详情失败: ${err?.message || '未知错误'}`);
        } finally {
            setLoadingDetail(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[1120px] bg-white shadow-2xl border-l border-gray-200 z-[60] animate-slide-in-right overflow-y-auto">
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
                        💡 提示：任务成本=勾选模型单价之和 × 模式倍率（深度更高）。超出当日免费额度后将从点数扣除。
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
                        用户行为与计费
                    </h4>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="text-xs text-gray-500">
                                {analytics?.lastActiveAt ? `最后活跃: ${new Date(analytics.lastActiveAt).toLocaleString()}` : '最后活跃: -'}
                            </div>
                            {analytics?.today && (
                                <div className="text-[10px] text-gray-400 mt-1 tabular-nums">
                                    今日免费额度：剩余 {analytics.today.remainingQuotaUnits} / {analytics.today.dailyLimit}（{analytics.today.usageDate} Asia/Shanghai） · 今日扣点 {analytics.today.pointsUnits}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const id = user.id;
                                    if (!id) return;
                                    const base = new URLSearchParams();
                                    base.set('userId', String(id));
                                    base.set('limit', '5000');

                                    if (activityTab === 'tasks') {
                                        downloadCsv(`/api/admin/export/tasks.csv?${base.toString()}`, `user_${id}_tasks_${Date.now()}.csv`);
                                        return;
                                    }
                                    if (activityTab === 'runs') {
                                        base.set('purpose', 'MODEL');
                                        downloadCsv(`/api/admin/export/runs.csv?${base.toString()}`, `user_${id}_runs_${Date.now()}.csv`);
                                        return;
                                    }
                                    if (activityTab === 'analysis') {
                                        base.set('purpose', 'ANALYSIS');
                                        downloadCsv(`/api/admin/export/runs.csv?${base.toString()}`, `user_${id}_analysis_runs_${Date.now()}.csv`);
                                        return;
                                    }
                                    if (activityTab === 'points') {
                                        downloadCsv(`/api/admin/export/points-logs.csv?${base.toString()}`, `user_${id}_points_logs_${Date.now()}.csv`);
                                        return;
                                    }
                                    downloadCsv(`/api/admin/export/pageviews.csv?${base.toString()}`, `user_${id}_pageviews_${Date.now()}.csv`);
                                }}
                                className="text-xs font-bold text-gray-700 hover:underline disabled:opacity-60"
                            >
                                导出 CSV
                            </button>
                            <button
                                onClick={refreshActivity}
                                disabled={activityLoading}
                                className="text-xs font-bold text-brand-purple hover:underline flex items-center gap-1 disabled:opacity-60"
                            >
                                <RefreshCw size={14} className={activityLoading ? 'animate-spin' : ''} /> 刷新
                            </button>
                        </div>
                    </div>

                    {activityError ? (
                        <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-xs text-red-700">
                            {activityError}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl border border-gray-100 bg-white">
                                <div className="text-xs text-gray-500 mb-1">查询记录（任务）</div>
                                <div className="text-xl font-bold text-gray-900 tabular-nums">{analytics?.counts?.tasks ?? '-'}</div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    成本: {analytics?.totals?.costUnits ?? 0} · 扣点: {analytics?.totals?.pointsUnits ?? 0}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-100 bg-white">
                                <div className="text-xs text-gray-500 mb-1">调用记录（模型/分析）</div>
                                <div className="text-xl font-bold text-gray-900 tabular-nums">{analytics?.counts?.runs ?? '-'}</div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    模型: {analytics?.counts?.modelRuns ?? 0} · 分析: {analytics?.counts?.analysisRuns ?? 0}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-100 bg-white">
                                <div className="text-xs text-gray-500 mb-1">扣费记录（点数）</div>
                                <div className="text-xl font-bold text-gray-900 tabular-nums">{analytics?.counts?.pointsLogs ?? '-'}</div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    累计消费: {analytics?.totals?.pointsConsumed ?? 0} · 累计充值: {analytics?.totals?.pointsAdded ?? 0}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-100 bg-white">
                                <div className="text-xs text-gray-500 mb-1">浏览时长（累计）</div>
                                <div className="text-xl font-bold text-gray-900 tabular-nums">
                                    {formatDurationSeconds(analytics?.totals?.browsingDurationSeconds ?? 0)}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    访问次数: {analytics?.counts?.pageViews ?? 0}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {[
                            { key: 'tasks', label: '查询记录' },
                            { key: 'runs', label: '调用记录' },
                            { key: 'analysis', label: '分析记录' },
                            { key: 'points', label: '扣费记录' },
                            { key: 'pageviews', label: '浏览足迹' },
                        ].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setActivityTab(t.key as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    activityTab === (t.key as any)
                                        ? 'bg-brand-purple text-white border-brand-purple'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="mt-3 space-y-2">
                        {activityLoading ? (
                            <div className="p-4 rounded-xl border border-gray-100 bg-white text-xs text-gray-500 flex items-center gap-2">
                                <RefreshCw size={14} className="animate-spin" /> 加载中...
                            </div>
                        ) : activityTab === 'tasks' ? (
                            <div className="space-y-2">
                                {userTasks.length === 0 ? (
                                    <div className="p-4 rounded-xl border border-gray-100 bg-white text-xs text-gray-400">暂无查询记录</div>
                                ) : (
                                    userTasks.map((t) => (
                                        <div key={t.id} className="p-3 rounded-xl border border-gray-100 bg-white">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-gray-900 truncate">{t.keyword}</div>
                                                    <div className="text-[10px] text-gray-400 mt-1">
                                                        {new Date(t.createdAt).toLocaleString()} · {t.searchType === 'deep' ? '深度' : '快速'} ·
                                                        模型 {Array.isArray(t.selectedModels) ? t.selectedModels.length : 0} · 成本 {t.costUnits}（免费 {t.quotaUnits} / 点数 {t.pointsUnits}）
                                                    </div>
                                                    {(t.analysisSummary || t.resultSummary) && (
                                                        <div className="text-[11px] text-gray-600 mt-2 line-clamp-2">
                                                            {t.analysisSummary || t.resultSummary}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            t.status === 'COMPLETED'
                                                                ? 'bg-green-50 text-green-700'
                                                                : t.status === 'FAILED'
                                                                  ? 'bg-red-50 text-red-700'
                                                                  : 'bg-yellow-50 text-yellow-700'
                                                        }`}
                                                    >
                                                        {t.status}
                                                    </span>
                                                    <button
                                                        onClick={() => openTaskReport(t.id)}
                                                        disabled={loadingDetail}
                                                        className="text-[10px] font-bold text-brand-purple hover:underline disabled:opacity-60"
                                                    >
                                                        查看报告
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : activityTab === 'runs' || activityTab === 'analysis' ? (
                            <div className="space-y-2">
                                {userRuns.filter((r) => (activityTab === 'analysis' ? r.purpose === 'ANALYSIS' : r.purpose === 'MODEL')).length === 0 ? (
                                    <div className="p-4 rounded-xl border border-gray-100 bg-white text-xs text-gray-400">
                                        暂无{activityTab === 'analysis' ? '分析' : '调用'}记录
                                    </div>
                                ) : (
                                    userRuns
                                        .filter((r) => (activityTab === 'analysis' ? r.purpose === 'ANALYSIS' : r.purpose === 'MODEL'))
                                        .map((r) => (
                                            <div key={r.id} className="p-3 rounded-xl border border-gray-100 bg-white">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-gray-900 truncate">
                                                            {r.modelKey} · {r.status}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-1">
                                                            {new Date(r.createdAt).toLocaleString()} · {r.provider || '-'}:{r.modelName || '-'} ·
                                                            {r.latencyMs ? `${Math.round(r.latencyMs / 1000)}s` : '-'} · 任务: {r.taskKeyword}
                                                        </div>
                                                        {r.error && <div className="text-[11px] text-red-600 mt-2 line-clamp-2">{r.error}</div>}
                                                        {r.responsePreview && (
                                                            <div className="text-[11px] text-gray-600 mt-2 line-clamp-3 whitespace-pre-wrap">
                                                                {r.responsePreview}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => openRunDetail(r.id)}
                                                        disabled={loadingDetail}
                                                        className="text-[10px] font-bold text-brand-purple hover:underline disabled:opacity-60"
                                                    >
                                                        详情
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        ) : activityTab === 'points' ? (
                            <div className="space-y-2">
                                {userPointsLogs.length === 0 ? (
                                    <div className="p-4 rounded-xl border border-gray-100 bg-white text-xs text-gray-400">暂无扣费记录</div>
                                ) : (
                                    userPointsLogs.map((l) => (
                                        <div key={l.id} className="p-3 rounded-xl border border-gray-100 bg-white">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-gray-900">
                                                        {l.amount > 0 ? `+${l.amount}` : `${l.amount}`} · 余额 {l.balance}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-1">
                                                        {new Date(l.createdAt).toLocaleString()} · {l.type}
                                                    </div>
                                                    {l.description && <div className="text-[11px] text-gray-600 mt-2 line-clamp-2">{l.description}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {userPageViews.length === 0 ? (
                                    <div className="p-4 rounded-xl border border-gray-100 bg-white text-xs text-gray-400">暂无浏览足迹</div>
                                ) : (
                                    userPageViews.map((v) => (
                                        <div key={v.id} className="p-3 rounded-xl border border-gray-100 bg-white">
                                            <div className="text-xs font-bold text-gray-900 break-all">{v.path}</div>
                                            <div className="text-[10px] text-gray-400 mt-1">
                                                {new Date(v.createdAt).toLocaleString()} ·
                                                时长 {typeof v.durationSeconds === 'number' ? formatDurationSeconds(v.durationSeconds) : '-'} ·
                                                session {String(v.sessionId).slice(0, 8)}…
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Report Modal */}
            {taskReport && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setTaskReport(null)}></div>
                    <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="font-bold text-gray-900">分析报告 / 任务详情</div>
                            <button onClick={() => setTaskReport(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="text-xs text-gray-500 mb-2">
                                任务ID: <span className="font-mono text-gray-700">{taskReport.id}</span>
                            </div>
                            <div className="text-sm font-bold text-gray-900 mb-3">{taskReport.keyword}</div>
                            <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(taskReport.result || taskReport, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Run Detail Modal */}
            {runDetail && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setRunDetail(null)}></div>
                    <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="font-bold text-gray-900">调用详情</div>
                            <button onClick={() => setRunDetail(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="text-xs text-gray-500">
                                RunID: <span className="font-mono text-gray-700">{runDetail.id}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                任务: <span className="font-mono text-gray-700">{runDetail.taskId}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                                    <div className="text-gray-500">模型源</div>
                                    <div className="font-bold text-gray-900 mt-1">{runDetail.modelKey}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                                    <div className="text-gray-500">状态</div>
                                    <div className="font-bold text-gray-900 mt-1">{runDetail.status}</div>
                                </div>
                            </div>
                            {runDetail.error && (
                                <div className="p-3 rounded-xl border border-red-100 bg-red-50 text-xs text-red-700 whitespace-pre-wrap">
                                    {runDetail.error}
                                </div>
                            )}
                            {runDetail.prompt && (
                                <div>
                                    <div className="text-xs font-bold text-gray-600 mb-2">Prompt</div>
                                    <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                                        {runDetail.prompt}
                                    </pre>
                                </div>
                            )}
                            {(runDetail.responseText || runDetail.responseJson) && (
                                <div>
                                    <div className="text-xs font-bold text-gray-600 mb-2">Response</div>
                                    <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                                        {typeof runDetail.responseText === 'string'
                                            ? runDetail.responseText
                                            : JSON.stringify(runDetail.responseJson, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
    const { config: publicConfig, refresh: refreshPublicConfig } = usePublicConfig();
    const [users, setUsers] = useState<any[]>([]);
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersLoading, setUsersLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [usersLoadError, setUsersLoadError] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [isAddUserDrawerOpen, setIsAddUserDrawerOpen] = useState(false);

    const [usersQ, setUsersQ] = useState('');
    const [usersPlan, setUsersPlan] = useState<'ALL' | 'FREE' | 'PRO' | 'ENTERPRISE'>('ALL');
    const [usersFrom, setUsersFrom] = useState('');
    const [usersTo, setUsersTo] = useState('');
    const [usersLimit, setUsersLimit] = useState(50);
    const [usersOffset, setUsersOffset] = useState(0);
    
    // Fetch Data from Backend
    useEffect(() => {
        // Fetch Stats
        apiFetch('/api/admin/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Failed to fetch stats", err));
    }, []);

    const [logView, setLogView] = useState<'audit' | 'traffic'>('audit');
    
    // New States
    const [selectedEngine, setSelectedEngine] = useState<any>(null);
    const [showNotifications, setShowNotifications] = useState(false);

    // Global Task Records (All Users)
    const [globalTasks, setGlobalTasks] = useState<any[]>([]);
    const [globalTasksTotal, setGlobalTasksTotal] = useState(0);
    const [globalTasksLoading, setGlobalTasksLoading] = useState(false);
    const [globalTasksError, setGlobalTasksError] = useState('');
    const [tasksQ, setTasksQ] = useState('');
    const [tasksEmail, setTasksEmail] = useState('');
    const [tasksModelKey, setTasksModelKey] = useState('');
    const [tasksStatus, setTasksStatus] = useState<'ALL' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'>('ALL');
    const [tasksSearchType, setTasksSearchType] = useState<'ALL' | 'quick' | 'deep'>('ALL');
    const [tasksFrom, setTasksFrom] = useState('');
    const [tasksTo, setTasksTo] = useState('');
    const [tasksLimit, setTasksLimit] = useState(100);
    const [tasksOffset, setTasksOffset] = useState(0);

    // Global Call Records (All Users)
    const [globalRuns, setGlobalRuns] = useState<any[]>([]);
    const [globalRunsTotal, setGlobalRunsTotal] = useState(0);
    const [globalRunsLoading, setGlobalRunsLoading] = useState(false);
    const [globalRunsError, setGlobalRunsError] = useState('');
    const [callsQ, setCallsQ] = useState('');
    const [callsEmail, setCallsEmail] = useState('');
    const [callsModelKey, setCallsModelKey] = useState('');
    const [callsPurpose, setCallsPurpose] = useState<'ALL' | 'MODEL' | 'ANALYSIS'>('ALL');
    const [callsStatus, setCallsStatus] = useState<'ALL' | 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'>('ALL');
    const [callsFrom, setCallsFrom] = useState('');
    const [callsTo, setCallsTo] = useState('');
    const [callsLimit, setCallsLimit] = useState(100);
    const [callsOffset, setCallsOffset] = useState(0);
    const [globalRunDetail, setGlobalRunDetail] = useState<any>(null);
    const [globalTaskDetail, setGlobalTaskDetail] = useState<any>(null);
    const [globalDetailLoading, setGlobalDetailLoading] = useState(false);

    // Global Billing Records (All Users)
    const [globalPointsLogs, setGlobalPointsLogs] = useState<any[]>([]);
    const [globalPointsTotal, setGlobalPointsTotal] = useState(0);
    const [globalPointsLoading, setGlobalPointsLoading] = useState(false);
    const [globalPointsError, setGlobalPointsError] = useState('');
    const [pointsEmail, setPointsEmail] = useState('');
    const [pointsQ, setPointsQ] = useState('');
    const [pointsType, setPointsType] = useState<'ALL' | 'RECHARGE' | 'CONSUME' | 'ADMIN_ADD' | 'ADMIN_SUB' | 'REFUND'>('ALL');
    const [pointsFrom, setPointsFrom] = useState('');
    const [pointsTo, setPointsTo] = useState('');
    const [pointsLimit, setPointsLimit] = useState(100);
    const [pointsOffset, setPointsOffset] = useState(0);

    // Global Page Views (All Users)
    const [globalPageViews, setGlobalPageViews] = useState<any[]>([]);
    const [globalPageViewsTotal, setGlobalPageViewsTotal] = useState(0);
    const [globalPageViewsLoading, setGlobalPageViewsLoading] = useState(false);
    const [globalPageViewsError, setGlobalPageViewsError] = useState('');
    const [pageViewsEmail, setPageViewsEmail] = useState('');
    const [pageViewsQ, setPageViewsQ] = useState('');
    const [pageViewsFrom, setPageViewsFrom] = useState('');
    const [pageViewsTo, setPageViewsTo] = useState('');
    const [pageViewsLimit, setPageViewsLimit] = useState(100);
    const [pageViewsOffset, setPageViewsOffset] = useState(0);

    // Reports / Rankings
    const [rankings, setRankings] = useState<any>(null);
    const [rankingsLoading, setRankingsLoading] = useState(false);
    const [rankingsError, setRankingsError] = useState('');
    const [rankingsFrom, setRankingsFrom] = useState(() => {
        const d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const [rankingsTo, setRankingsTo] = useState(() => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const [rankingsLimit, setRankingsLimit] = useState(20);

    // Settings State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [siteName, setSiteName] = useState(publicConfig.siteName);

    useEffect(() => {
        apiFetch('/api/admin/config')
            .then(res => res.json())
            .then(cfg => {
                setMaintenanceMode(!!cfg?.system?.maintenanceMode);
                setSignupEnabled(cfg?.system?.signupEnabled !== false);
                const sn = typeof cfg?.system?.siteName === 'string' ? cfg.system.siteName.trim() : '';
                setSiteName(sn || publicConfig.siteName);
            })
            .catch(() => {});
    }, []);

    const patchSystemConfig = async (patch: { maintenanceMode?: boolean, signupEnabled?: boolean, siteName?: string }) => {
        try {
            const res = await apiFetch('/api/admin/config/system', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            });
            if (res.ok) refreshPublicConfig();
        } catch (err) {
            console.error('Failed to patch system config', err);
        }
    };

    const downloadCsv = async (url: string, filename: string) => {
        try {
            const res = await apiFetch(url);
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `下载失败（HTTP ${res.status}）`);
            }
            const blob = await res.blob();
            const href = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        } catch (err: any) {
            alert(`❌ 导出失败: ${err?.message || '未知错误'}`);
        }
    };

    const fetchAdminUsers = async (opts?: { limit?: number; offset?: number }) => {
        setUsersLoading(true);
        setUsersLoadError('');
        try {
            const limit = opts?.limit ?? usersLimit;
            const offset = opts?.offset ?? usersOffset;

            const params = new URLSearchParams();
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            if (usersQ.trim()) params.set('q', usersQ.trim());
            if (usersPlan !== 'ALL') params.set('plan', usersPlan);
            if (usersFrom) params.set('from', usersFrom);
            if (usersTo) params.set('to', usersTo);

            const res = await apiFetch(`/api/admin/users?${params.toString()}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data && (data.error || data.message)) || `加载失败（HTTP ${res.status}）`;
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }

            setUsersTotal(Number(data?.total || 0));
            setUsers(Array.isArray(data?.items) ? data.items : []);
        } catch (err: any) {
            console.error('Failed to fetch users', err);
            setUsers([]);
            setUsersTotal(0);
            setUsersLoadError(String(err?.message || err || '加载失败'));
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchGlobalTasks = async (opts?: { limit?: number; offset?: number }) => {
        setGlobalTasksLoading(true);
        setGlobalTasksError('');
        try {
            const limit = opts?.limit ?? tasksLimit;
            const offset = opts?.offset ?? tasksOffset;

            const params = new URLSearchParams();
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            if (tasksQ.trim()) params.set('q', tasksQ.trim());
            if (tasksEmail.trim()) params.set('email', tasksEmail.trim());
            if (tasksModelKey.trim()) params.set('modelKey', tasksModelKey.trim());
            if (tasksStatus !== 'ALL') params.set('status', tasksStatus);
            if (tasksSearchType !== 'ALL') params.set('searchType', tasksSearchType);
            if (tasksFrom) params.set('from', tasksFrom);
            if (tasksTo) params.set('to', tasksTo);

            const res = await apiFetch(`/api/admin/tasks?${params.toString()}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data && (data.error || data.message)) || `加载失败（HTTP ${res.status}）`;
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            setGlobalTasksTotal(Number(data?.total || 0));
            setGlobalTasks(Array.isArray(data?.items) ? data.items : []);
        } catch (err: any) {
            console.error('Failed to fetch global tasks', err);
            setGlobalTasks([]);
            setGlobalTasksTotal(0);
            setGlobalTasksError(String(err?.message || err || '加载失败'));
        } finally {
            setGlobalTasksLoading(false);
        }
    };

    const fetchGlobalRuns = async (opts?: { limit?: number; offset?: number }) => {
        setGlobalRunsLoading(true);
        setGlobalRunsError('');
        try {
            const limit = opts?.limit ?? callsLimit;
            const offset = opts?.offset ?? callsOffset;

            const params = new URLSearchParams();
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            if (callsQ.trim()) params.set('q', callsQ.trim());
            if (callsEmail.trim()) params.set('email', callsEmail.trim());
            if (callsModelKey.trim()) params.set('modelKey', callsModelKey.trim());
            if (callsPurpose !== 'ALL') params.set('purpose', callsPurpose);
            if (callsStatus !== 'ALL') params.set('status', callsStatus);
            if (callsFrom) params.set('from', callsFrom);
            if (callsTo) params.set('to', callsTo);

            const res = await apiFetch(`/api/admin/runs?${params.toString()}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data && (data.error || data.message)) || `加载失败（HTTP ${res.status}）`;
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            setGlobalRunsTotal(Number(data?.total || 0));
            setGlobalRuns(Array.isArray(data?.items) ? data.items : []);
        } catch (err: any) {
            console.error('Failed to fetch global runs', err);
            setGlobalRuns([]);
            setGlobalRunsTotal(0);
            setGlobalRunsError(String(err?.message || err || '加载失败'));
        } finally {
            setGlobalRunsLoading(false);
        }
    };

    const fetchGlobalPointsLogs = async (opts?: { limit?: number; offset?: number }) => {
        setGlobalPointsLoading(true);
        setGlobalPointsError('');
        try {
            const limit = opts?.limit ?? pointsLimit;
            const offset = opts?.offset ?? pointsOffset;

            const params = new URLSearchParams();
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            if (pointsQ.trim()) params.set('q', pointsQ.trim());
            if (pointsEmail.trim()) params.set('email', pointsEmail.trim());
            if (pointsType !== 'ALL') params.set('type', pointsType);
            if (pointsFrom) params.set('from', pointsFrom);
            if (pointsTo) params.set('to', pointsTo);

            const res = await apiFetch(`/api/admin/points-logs?${params.toString()}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data && (data.error || data.message)) || `加载失败（HTTP ${res.status}）`;
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            setGlobalPointsTotal(Number(data?.total || 0));
            setGlobalPointsLogs(Array.isArray(data?.items) ? data.items : []);
        } catch (err: any) {
            console.error('Failed to fetch global points logs', err);
            setGlobalPointsLogs([]);
            setGlobalPointsTotal(0);
            setGlobalPointsError(String(err?.message || err || '加载失败'));
        } finally {
            setGlobalPointsLoading(false);
        }
    };

    const fetchGlobalPageViews = async (opts?: { limit?: number; offset?: number }) => {
        setGlobalPageViewsLoading(true);
        setGlobalPageViewsError('');
        try {
            const limit = opts?.limit ?? pageViewsLimit;
            const offset = opts?.offset ?? pageViewsOffset;

            const params = new URLSearchParams();
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            if (pageViewsQ.trim()) params.set('q', pageViewsQ.trim());
            if (pageViewsEmail.trim()) params.set('email', pageViewsEmail.trim());
            if (pageViewsFrom) params.set('from', pageViewsFrom);
            if (pageViewsTo) params.set('to', pageViewsTo);

            const res = await apiFetch(`/api/admin/pageviews?${params.toString()}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data && (data.error || data.message)) || `加载失败（HTTP ${res.status}）`;
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            setGlobalPageViewsTotal(Number(data?.total || 0));
            setGlobalPageViews(Array.isArray(data?.items) ? data.items : []);
        } catch (err: any) {
            console.error('Failed to fetch global pageviews', err);
            setGlobalPageViews([]);
            setGlobalPageViewsTotal(0);
            setGlobalPageViewsError(String(err?.message || err || '加载失败'));
        } finally {
            setGlobalPageViewsLoading(false);
        }
    };

    const fetchRankings = async () => {
        setRankingsLoading(true);
        setRankingsError('');
        try {
            const params = new URLSearchParams();
            params.set('limit', String(rankingsLimit));
            if (rankingsFrom) params.set('from', rankingsFrom);
            if (rankingsTo) params.set('to', rankingsTo);

            const res = await apiFetch(`/api/admin/rankings?${params.toString()}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data && (data.error || data.message)) || `加载失败（HTTP ${res.status}）`;
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            setRankings(data);
        } catch (err: any) {
            console.error('Failed to fetch rankings', err);
            setRankings(null);
            setRankingsError(String(err?.message || err || '加载失败'));
        } finally {
            setRankingsLoading(false);
        }
    };

    const openGlobalRunDetail = async (runId: string) => {
        setGlobalDetailLoading(true);
        try {
            const res = await apiFetch(`/api/admin/runs/${runId}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && (data.error || data.message)) || '获取失败');
            setGlobalRunDetail(data);
        } catch (err: any) {
            alert(`❌ 获取调用详情失败: ${err?.message || '未知错误'}`);
        } finally {
            setGlobalDetailLoading(false);
        }
    };

    const openGlobalTaskDetail = async (taskId: string) => {
        setGlobalDetailLoading(true);
        try {
            const res = await apiFetch(`/api/admin/tasks/${taskId}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && (data.error || data.message)) || '获取失败');
            setGlobalTaskDetail(data);
        } catch (err: any) {
            alert(`❌ 获取任务详情失败: ${err?.message || '未知错误'}`);
        } finally {
            setGlobalDetailLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'users') return;
        fetchAdminUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'calls') return;
        fetchGlobalRuns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'tasks') return;
        fetchGlobalTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'billing') return;
        fetchGlobalPointsLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'pageviews') return;
        fetchGlobalPageViews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'reports') return;
        fetchRankings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

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
            case 'reports':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">统计排行</h3>
                                <p className="text-sm text-gray-500">浏览时长 / 扣费 / 模型调用排行（支持时间筛选与导出）。</p>
                            </div>
                            <button
                                onClick={fetchRankings}
                                disabled={rankingsLoading}
                                className="flex items-center gap-2 text-sm text-brand-purple font-bold hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors border border-transparent hover:border-purple-100 disabled:opacity-60"
                            >
                                <RefreshCw size={14} className={rankingsLoading ? 'animate-spin' : ''} /> 刷新
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">开始日期</label>
                                    <input
                                        type="date"
                                        value={rankingsFrom}
                                        onChange={(e) => setRankingsFrom(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">结束日期</label>
                                    <input
                                        type="date"
                                        value={rankingsTo}
                                        onChange={(e) => setRankingsTo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Top N</label>
                                    <select
                                        value={rankingsLimit}
                                        onChange={(e) => setRankingsLimit(Number.parseInt(e.target.value, 10) || 20)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    >
                                        {[10, 20, 50, 100].map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const d = new Date();
                                            const pad = (n: number) => String(n).padStart(2, '0');
                                            const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                                            setRankingsFrom(s);
                                            setRankingsTo(s);
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                        今天
                                    </button>
                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
                                            const pad = (n: number) => String(n).padStart(2, '0');
                                            const f = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
                                            const t = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                                            setRankingsFrom(f);
                                            setRankingsTo(t);
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                        近 7 天
                                    </button>
                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
                                            const pad = (n: number) => String(n).padStart(2, '0');
                                            const f = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
                                            const t = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                                            setRankingsFrom(f);
                                            setRankingsTo(t);
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                        近 30 天
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRankingsFrom('');
                                            setRankingsTo('');
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                        全部
                                    </button>
                                </div>
                                <button
                                    onClick={fetchRankings}
                                    disabled={rankingsLoading}
                                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
                                >
                                    查询
                                </button>
                            </div>

                            {rankingsError && (
                                <div className="mt-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg px-4 py-3">
                                    {rankingsError}
                                </div>
                            )}
                        </div>

                        {/* Browsing Ranking */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-gray-900">浏览时长排行</div>
                                    <div className="text-xs text-gray-500 mt-0.5">按累计停留时长排序</div>
                                </div>
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set('kind', 'browsing');
                                        params.set('limit', '5000');
                                        if (rankingsFrom) params.set('from', rankingsFrom);
                                        if (rankingsTo) params.set('to', rankingsTo);
                                        downloadCsv(`/api/admin/export/rankings.csv?${params.toString()}`, `ranking_browsing_${Date.now()}.csv`);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    导出 CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-left">排名</th>
                                            <th className="px-4 py-3 text-left">用户</th>
                                            <th className="px-4 py-3 text-left">套餐</th>
                                            <th className="px-4 py-3 text-left">浏览时长</th>
                                            <th className="px-4 py-3 text-left">访问次数</th>
                                            <th className="px-4 py-3 text-left">最近活跃</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rankingsLoading ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
                                                    加载中...
                                                </td>
                                            </tr>
                                        ) : (rankings?.browsing || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                                    暂无数据
                                                </td>
                                            </tr>
                                        ) : (
                                            (rankings?.browsing || []).map((r: any, idx: number) => (
                                                <tr key={r.userId} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-bold text-gray-700 tabular-nums">#{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">{r.user?.email || '-'}</div>
                                                        <div className="text-[10px] text-gray-400">ID: {r.userId}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold">{r.user?.plan || 'FREE'}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">
                                                        {formatDurationSeconds(r.durationSeconds || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">{r.pageViews || 0}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                        {r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleString() : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Billing Ranking */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-gray-900">扣费排行</div>
                                    <div className="text-xs text-gray-500 mt-0.5">按点数扣费（pointsUnits）排序</div>
                                </div>
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set('kind', 'billing');
                                        params.set('limit', '5000');
                                        if (rankingsFrom) params.set('from', rankingsFrom);
                                        if (rankingsTo) params.set('to', rankingsTo);
                                        downloadCsv(`/api/admin/export/rankings.csv?${params.toString()}`, `ranking_billing_${Date.now()}.csv`);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    导出 CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-left">排名</th>
                                            <th className="px-4 py-3 text-left">用户</th>
                                            <th className="px-4 py-3 text-left">套餐</th>
                                            <th className="px-4 py-3 text-left">任务数</th>
                                            <th className="px-4 py-3 text-left">成本</th>
                                            <th className="px-4 py-3 text-left">扣点</th>
                                            <th className="px-4 py-3 text-left">最近任务</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rankingsLoading ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
                                                    加载中...
                                                </td>
                                            </tr>
                                        ) : (rankings?.billing || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                                    暂无数据
                                                </td>
                                            </tr>
                                        ) : (
                                            (rankings?.billing || []).map((r: any, idx: number) => (
                                                <tr key={r.userId} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-bold text-gray-700 tabular-nums">#{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">{r.user?.email || '-'}</div>
                                                        <div className="text-[10px] text-gray-400">ID: {r.userId}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold">{r.user?.plan || 'FREE'}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">{r.tasks || 0}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">
                                                        {r.costUnits}（免费 {r.quotaUnits} / 点数 {r.pointsUnits}）
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold tabular-nums whitespace-nowrap text-red-600">
                                                        {r.pointsUnits || 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                        {r.lastTaskAt ? new Date(r.lastTaskAt).toLocaleString() : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Model Usage Ranking */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-gray-900">模型调用排行</div>
                                    <div className="text-xs text-gray-500 mt-0.5">按调用次数排序（含模型调用 + 深度分析）</div>
                                </div>
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set('kind', 'models');
                                        params.set('limit', '5000');
                                        if (rankingsFrom) params.set('from', rankingsFrom);
                                        if (rankingsTo) params.set('to', rankingsTo);
                                        downloadCsv(`/api/admin/export/rankings.csv?${params.toString()}`, `ranking_models_${Date.now()}.csv`);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    导出 CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-left">排名</th>
                                            <th className="px-4 py-3 text-left">模型源</th>
                                            <th className="px-4 py-3 text-left">总次数</th>
                                            <th className="px-4 py-3 text-left">模型</th>
                                            <th className="px-4 py-3 text-left">分析</th>
                                            <th className="px-4 py-3 text-left">成功</th>
                                            <th className="px-4 py-3 text-left">失败</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rankingsLoading ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
                                                    加载中...
                                                </td>
                                            </tr>
                                        ) : (rankings?.models || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                                    暂无数据
                                                </td>
                                            </tr>
                                        ) : (
                                            (rankings?.models || []).map((r: any, idx: number) => (
                                                <tr key={r.modelKey} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-bold text-gray-700 tabular-nums">#{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">{r.modelKey}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold tabular-nums whitespace-nowrap">{r.totalRuns || 0}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">{r.modelRuns || 0}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">{r.analysisRuns || 0}</td>
                                                    <td className="px-4 py-3 text-xs font-bold tabular-nums whitespace-nowrap text-green-700">{r.succeeded || 0}</td>
                                                    <td className="px-4 py-3 text-xs font-bold tabular-nums whitespace-nowrap text-red-600">{r.failed || 0}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
	            case 'users':
	                return (
	                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-slide-up relative min-h-[700px] h-full flex flex-col">
	                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
	                            <div>
	                                <h3 className="font-bold text-gray-900">用户管理</h3>
	                                <div className="text-xs text-gray-500 mt-1">支持筛选、分页、导出；点击用户可查看完整行为与计费明细。</div>
	                                <div className="text-[11px] text-gray-400 mt-1 tabular-nums">共 {usersTotal.toLocaleString()} 条</div>
	                            </div>
	                            <div className="flex gap-2">
	                                <button
	                                    onClick={() => {
	                                        const params = new URLSearchParams();
	                                        params.set('limit', '5000');
	                                        if (usersQ.trim()) params.set('q', usersQ.trim());
	                                        if (usersPlan !== 'ALL') params.set('plan', usersPlan);
	                                        if (usersFrom) params.set('from', usersFrom);
	                                        if (usersTo) params.set('to', usersTo);
	                                        downloadCsv(`/api/admin/export/users.csv?${params.toString()}`, `users_${Date.now()}.csv`);
	                                    }}
	                                    className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
	                                >
	                                    导出 CSV
	                                </button>
	                                <button
	                                    onClick={fetchAdminUsers}
	                                    disabled={usersLoading}
	                                    className="flex items-center gap-2 text-sm text-brand-purple font-bold hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-purple-100 disabled:opacity-60"
	                                >
	                                    <RefreshCw size={14} className={usersLoading ? 'animate-spin' : ''} /> 刷新
	                                </button>
	                                <button
	                                    onClick={() => setIsAddUserDrawerOpen(true)}
	                                    className="bg-brand-purple text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-brand-hover"
	                                >
	                                    添加用户
	                                </button>
	                            </div>
	                        </div>

	                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
	                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
	                                <div className="md:col-span-3">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">关键词（姓名/邮箱）</label>
	                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
	                                        <Search size={14} className="text-gray-400" />
	                                        <input
	                                            value={usersQ}
	                                            onChange={(e) => setUsersQ(e.target.value)}
	                                            placeholder="例如：张三 / user@example.com"
	                                            className="w-full bg-transparent outline-none text-sm"
	                                        />
	                                    </div>
	                                </div>
	                                <div className="md:col-span-1">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">套餐</label>
	                                    <select
	                                        value={usersPlan}
	                                        onChange={(e) => setUsersPlan(e.target.value as any)}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    >
	                                        <option value="ALL">全部</option>
	                                        <option value="FREE">免费版</option>
	                                        <option value="PRO">开发者版</option>
	                                        <option value="ENTERPRISE">企业版</option>
	                                    </select>
	                                </div>
	                                <div className="md:col-span-1">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">开始日期</label>
	                                    <input
	                                        type="date"
	                                        value={usersFrom}
	                                        onChange={(e) => setUsersFrom(e.target.value)}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    />
	                                </div>
	                                <div className="md:col-span-1">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">结束日期</label>
	                                    <input
	                                        type="date"
	                                        value={usersTo}
	                                        onChange={(e) => setUsersTo(e.target.value)}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    />
	                                </div>
	                            </div>

	                            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
	                                <div className="md:col-span-1">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">每页</label>
	                                    <select
	                                        value={usersLimit}
	                                        onChange={(e) => {
	                                            const next = Number.parseInt(e.target.value, 10) || 50;
	                                            setUsersLimit(next);
	                                            setUsersOffset(0);
	                                            fetchAdminUsers({ limit: next, offset: 0 });
	                                        }}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    >
	                                        {[20, 50, 100].map((n) => (
	                                            <option key={n} value={n}>
	                                                {n}
	                                            </option>
	                                        ))}
	                                    </select>
	                                </div>
	                                <div className="md:col-span-1 flex items-end gap-2">
	                                    <button
	                                        onClick={() => {
	                                            const next = Math.max(0, usersOffset - usersLimit);
	                                            setUsersOffset(next);
	                                            fetchAdminUsers({ offset: next });
	                                        }}
	                                        disabled={usersLoading || usersOffset <= 0}
	                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
	                                    >
	                                        上一页
	                                    </button>
	                                    <button
	                                        onClick={() => {
	                                            const next = usersOffset + usersLimit;
	                                            setUsersOffset(next);
	                                            fetchAdminUsers({ offset: next });
	                                        }}
	                                        disabled={usersLoading || usersOffset + usersLimit >= usersTotal}
	                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
	                                    >
	                                        下一页
	                                    </button>
	                                </div>
	                            </div>

	                            <div className="mt-4 flex items-center justify-between">
	                                <div className="text-xs text-gray-500 tabular-nums">
	                                    {usersLoadError ? (
	                                        <span className="text-red-600 font-bold">加载失败：{usersLoadError}</span>
	                                    ) : (
	                                        <span>
	                                            共 {usersTotal.toLocaleString()} 条 · 第 {Math.floor(usersOffset / usersLimit) + 1} /{' '}
	                                            {Math.max(1, Math.ceil(usersTotal / usersLimit))} 页
	                                        </span>
	                                    )}
	                                </div>
	                                <div className="flex items-center gap-2">
	                                    <button
	                                        onClick={() => {
	                                            setUsersQ('');
	                                            setUsersPlan('ALL');
	                                            setUsersFrom('');
	                                            setUsersTo('');
	                                            setUsersOffset(0);
	                                            fetchAdminUsers({ offset: 0 });
	                                        }}
	                                        disabled={usersLoading}
	                                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
	                                    >
	                                        重置
	                                    </button>
	                                    <button
	                                        onClick={() => {
	                                            setUsersOffset(0);
	                                            fetchAdminUsers({ offset: 0 });
	                                        }}
	                                        disabled={usersLoading}
	                                        className="bg-brand-purple text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:bg-brand-hover active:scale-95 transition-all disabled:opacity-60"
	                                    >
	                                        查询
	                                    </button>
	                                </div>
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
	                                {usersLoadError ? (
	                                    <tr>
	                                        <td className="px-6 py-10 text-center text-sm text-red-600" colSpan={7}>
	                                            用户列表加载失败：{usersLoadError}
	                                        </td>
	                                    </tr>
	                                ) : usersLoading ? (
	                                    <tr>
	                                        <td className="px-6 py-10 text-center text-sm text-gray-400" colSpan={7}>
	                                            <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
	                                            加载中...
	                                        </td>
	                                    </tr>
	                                ) : users.length === 0 ? (
	                                    <tr>
	                                        <td className="px-6 py-10 text-center text-sm text-gray-400" colSpan={7}>
	                                            暂无用户数据
	                                        </td>
	                                    </tr>
	                                ) : (
	                                    users.map((user) => (
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
	                                                                if (selectedUser?.id === user.id) setSelectedUser(null);
	                                                                setUsersOffset(0);
	                                                                fetchAdminUsers({ offset: 0 });
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
	                                    ))
	                                )}
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
	                                setUsersOffset(0);
	                                fetchAdminUsers({ offset: 0 });
	                            }}
	                        />
	                    </div>
	                );
            case 'tasks':
                return (
                    <div className="space-y-5 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">全站任务记录</h3>
                                <p className="text-sm text-gray-500">展示所有用户的任务、结果摘要与计费信息，可检索与导出。</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set('limit', '5000');
                                        if (tasksQ.trim()) params.set('q', tasksQ.trim());
                                        if (tasksEmail.trim()) params.set('email', tasksEmail.trim());
                                        if (tasksModelKey.trim()) params.set('modelKey', tasksModelKey.trim());
                                        if (tasksStatus !== 'ALL') params.set('status', tasksStatus);
                                        if (tasksSearchType !== 'ALL') params.set('searchType', tasksSearchType);
                                        if (tasksFrom) params.set('from', tasksFrom);
                                        if (tasksTo) params.set('to', tasksTo);
                                        downloadCsv(`/api/admin/export/tasks.csv?${params.toString()}`, `tasks_${Date.now()}.csv`);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    导出 CSV
                                </button>
                                <button
                                    onClick={fetchGlobalTasks}
                                    disabled={globalTasksLoading}
                                    className="flex items-center gap-2 text-sm text-brand-purple font-bold hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors border border-transparent hover:border-purple-100 disabled:opacity-60"
                                >
                                    <RefreshCw size={14} className={globalTasksLoading ? 'animate-spin' : ''} /> 刷新
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">关键词（任务/用户/模型）</label>
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            value={tasksQ}
                                            onChange={(e) => setTasksQ(e.target.value)}
                                            placeholder="例如：上海 / DeepSeek / 用户邮箱"
                                            className="w-full bg-transparent outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">用户邮箱</label>
                                    <input
                                        value={tasksEmail}
                                        onChange={(e) => setTasksEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">模型源</label>
                                    <input
                                        value={tasksModelKey}
                                        onChange={(e) => setTasksModelKey(e.target.value)}
                                        placeholder="DeepSeek / 通义千问"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">状态</label>
                                    <select
                                        value={tasksStatus}
                                        onChange={(e) => setTasksStatus(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                    >
                                        <option value="ALL">全部</option>
                                        <option value="COMPLETED">完成</option>
                                        <option value="FAILED">失败</option>
                                        <option value="RUNNING">进行中</option>
                                        <option value="PENDING">排队</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">模式</label>
                                    <select
                                        value={tasksSearchType}
                                        onChange={(e) => setTasksSearchType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                    >
                                        <option value="ALL">全部</option>
                                        <option value="quick">快速</option>
                                        <option value="deep">深度</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">开始日期</label>
                                    <input
                                        type="date"
                                        value={tasksFrom}
                                        onChange={(e) => setTasksFrom(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">结束日期</label>
                                    <input
                                        type="date"
                                        value={tasksTo}
                                        onChange={(e) => setTasksTo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">每页</label>
                                    <select
                                        value={tasksLimit}
                                        onChange={(e) => {
                                            const next = Number.parseInt(e.target.value, 10) || 100;
                                            setTasksLimit(next);
                                            setTasksOffset(0);
                                            fetchGlobalTasks({ limit: next, offset: 0 });
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    >
                                        {[50, 100, 200].map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1 flex items-end gap-2">
                                    <button
                                        onClick={() => {
                                            const next = Math.max(0, tasksOffset - tasksLimit);
                                            setTasksOffset(next);
                                            fetchGlobalTasks({ offset: next });
                                        }}
                                        disabled={globalTasksLoading || tasksOffset <= 0}
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        上一页
                                    </button>
                                    <button
                                        onClick={() => {
                                            const next = tasksOffset + tasksLimit;
                                            setTasksOffset(next);
                                            fetchGlobalTasks({ offset: next });
                                        }}
                                        disabled={globalTasksLoading || tasksOffset + tasksLimit >= globalTasksTotal}
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        下一页
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-xs text-gray-400 tabular-nums">
                                    {globalTasksError ? (
                                        <span className="text-red-600 font-bold">{globalTasksError}</span>
                                    ) : (
                                        <>
                                            <span>
                                                共 {globalTasksTotal.toLocaleString()} 条 · 第{' '}
                                                {Math.floor(tasksOffset / tasksLimit) + 1} /{' '}
                                                {Math.max(1, Math.ceil(globalTasksTotal / tasksLimit))} 页
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setTasksQ('');
                                            setTasksEmail('');
                                            setTasksModelKey('');
                                            setTasksStatus('ALL');
                                            setTasksSearchType('ALL');
                                            setTasksFrom('');
                                            setTasksTo('');
                                            setTasksOffset(0);
                                            fetchGlobalTasks({ offset: 0 });
                                        }}
                                        disabled={globalTasksLoading}
                                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        重置
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTasksOffset(0);
                                            fetchGlobalTasks({ offset: 0 });
                                        }}
                                        disabled={globalTasksLoading}
                                        className="bg-brand-purple text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:bg-brand-hover active:scale-95 transition-all disabled:opacity-60"
                                    >
                                        查询
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-left">时间</th>
                                            <th className="px-4 py-3 text-left">用户</th>
                                            <th className="px-4 py-3 text-left">状态</th>
                                            <th className="px-4 py-3 text-left">模式</th>
                                            <th className="px-4 py-3 text-left">成本</th>
                                            <th className="px-4 py-3 text-left">模型</th>
                                            <th className="px-4 py-3 text-left">关键词</th>
                                            <th className="px-4 py-3 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {globalTasksLoading ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
                                                    加载中...
                                                </td>
                                            </tr>
                                        ) : globalTasks.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                                                    暂无任务记录
                                                </td>
                                            </tr>
                                        ) : (
                                            globalTasks.map((t) => (
                                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">{t.user?.email || '-'}</div>
                                                        <div className="text-[10px] text-gray-400">ID: {t.user?.id ?? '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold">
                                                        <span
                                                            className={`px-2 py-0.5 rounded ${
                                                                t.status === 'COMPLETED'
                                                                    ? 'bg-green-50 text-green-700'
                                                                    : t.status === 'FAILED'
                                                                      ? 'bg-red-50 text-red-700'
                                                                      : t.status === 'RUNNING'
                                                                        ? 'bg-yellow-50 text-yellow-700'
                                                                        : 'bg-gray-50 text-gray-700'
                                                            }`}
                                                        >
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold">
                                                        <span className={`px-2 py-0.5 rounded ${t.searchType === 'deep' ? 'bg-purple-50 text-brand-purple' : 'bg-blue-50 text-blue-700'}`}>
                                                            {t.searchType === 'deep' ? '深度' : '快速'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">
                                                        {t.costUnits}（免费 {t.quotaUnits} / 点数 {t.pointsUnits}）
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700">
                                                        <div className="font-bold">{Array.isArray(t.selectedModels) ? t.selectedModels.length : 0} 个</div>
                                                        <div className="text-[10px] text-gray-400 truncate max-w-[160px]" title={Array.isArray(t.selectedModels) ? t.selectedModels.join('、') : ''}>
                                                            {Array.isArray(t.selectedModels) ? t.selectedModels.join('、') : '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[360px] truncate" title={t.keyword}>
                                                        {t.keyword}
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => openGlobalTaskDetail(t.id)}
                                                            disabled={globalDetailLoading}
                                                            className="text-xs font-bold text-brand-purple hover:underline disabled:opacity-60 mr-3"
                                                        >
                                                            报告
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setCallsQ(t.id);
                                                                setCallsEmail('');
                                                                setCallsModelKey('');
                                                                setCallsPurpose('ALL');
                                                                setCallsStatus('ALL');
                                                                setCallsFrom('');
                                                                setCallsTo('');
                                                                setCallsOffset(0);
                                                                setActiveTab('calls');
                                                            }}
                                                            className="text-xs font-bold text-gray-700 hover:underline"
                                                        >
                                                            调用
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
            case 'calls':
                return (
                    <div className="space-y-5 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">全站调用记录</h3>
                                <p className="text-sm text-gray-500">汇总所有用户的模型调用与深度分析调用明细（可筛选/追溯）。</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set('limit', '5000');
                                        if (callsQ.trim()) params.set('q', callsQ.trim());
                                        if (callsEmail.trim()) params.set('email', callsEmail.trim());
                                        if (callsModelKey.trim()) params.set('modelKey', callsModelKey.trim());
                                        if (callsPurpose !== 'ALL') params.set('purpose', callsPurpose);
                                        if (callsStatus !== 'ALL') params.set('status', callsStatus);
                                        if (callsFrom) params.set('from', callsFrom);
                                        if (callsTo) params.set('to', callsTo);
                                        downloadCsv(`/api/admin/export/runs.csv?${params.toString()}`, `runs_${Date.now()}.csv`);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    导出 CSV
                                </button>
                                <button
                                    onClick={fetchGlobalRuns}
                                    disabled={globalRunsLoading}
                                    className="flex items-center gap-2 text-sm text-brand-purple font-bold hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors border border-transparent hover:border-purple-100 disabled:opacity-60"
                                >
                                    <RefreshCw size={14} className={globalRunsLoading ? 'animate-spin' : ''} /> 刷新
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">关键词（任务/用户/模型）</label>
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            value={callsQ}
                                            onChange={(e) => setCallsQ(e.target.value)}
                                            placeholder="例如：上海 / deepseek / user@example.com"
                                            className="w-full bg-transparent outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">用户邮箱</label>
                                    <input
                                        value={callsEmail}
                                        onChange={(e) => setCallsEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">模型源</label>
                                    <input
                                        value={callsModelKey}
                                        onChange={(e) => setCallsModelKey(e.target.value)}
                                        placeholder="DeepSeek / 通义千问"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 md:col-span-1">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">用途</label>
                                        <select
                                            value={callsPurpose}
                                            onChange={(e) => setCallsPurpose(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                        >
                                            <option value="ALL">全部</option>
                                            <option value="MODEL">模型</option>
                                            <option value="ANALYSIS">分析</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">状态</label>
                                        <select
                                            value={callsStatus}
                                            onChange={(e) => setCallsStatus(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-brand-purple outline-none bg-gray-50"
                                        >
                                            <option value="ALL">全部</option>
                                            <option value="SUCCEEDED">成功</option>
                                            <option value="FAILED">失败</option>
                                            <option value="RUNNING">进行中</option>
                                            <option value="PENDING">排队</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">开始日期</label>
                                    <input
                                        type="date"
                                        value={callsFrom}
                                        onChange={(e) => setCallsFrom(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">结束日期</label>
                                    <input
                                        type="date"
                                        value={callsTo}
                                        onChange={(e) => setCallsTo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">每页</label>
                                    <select
                                        value={callsLimit}
                                        onChange={(e) => {
                                            const next = Number.parseInt(e.target.value, 10) || 100;
                                            setCallsLimit(next);
                                            setCallsOffset(0);
                                            fetchGlobalRuns({ limit: next, offset: 0 });
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    >
                                        {[50, 100, 200].map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1 flex items-end gap-2">
                                    <button
                                        onClick={() => {
                                            const next = Math.max(0, callsOffset - callsLimit);
                                            setCallsOffset(next);
                                            fetchGlobalRuns({ offset: next });
                                        }}
                                        disabled={globalRunsLoading || callsOffset <= 0}
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        上一页
                                    </button>
                                    <button
                                        onClick={() => {
                                            const next = callsOffset + callsLimit;
                                            setCallsOffset(next);
                                            fetchGlobalRuns({ offset: next });
                                        }}
                                        disabled={globalRunsLoading || callsOffset + callsLimit >= globalRunsTotal}
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        下一页
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-xs text-gray-400 tabular-nums">
                                    {globalRunsError ? (
                                        <span className="text-red-600 font-bold">{globalRunsError}</span>
                                    ) : (
                                        <>
                                            <span>
                                                共 {globalRunsTotal.toLocaleString()} 条 · 第{' '}
                                                {Math.floor(callsOffset / callsLimit) + 1} /{' '}
                                                {Math.max(1, Math.ceil(globalRunsTotal / callsLimit))} 页
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setCallsQ('');
                                            setCallsEmail('');
                                            setCallsModelKey('');
                                            setCallsPurpose('ALL');
                                            setCallsStatus('ALL');
                                            setCallsFrom('');
                                            setCallsTo('');
                                            setCallsOffset(0);
                                            fetchGlobalRuns({ offset: 0 });
                                        }}
                                        disabled={globalRunsLoading}
                                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        重置
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCallsOffset(0);
                                            fetchGlobalRuns({ offset: 0 });
                                        }}
                                        disabled={globalRunsLoading}
                                        className="bg-brand-purple text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:bg-brand-hover active:scale-95 transition-all disabled:opacity-60"
                                    >
                                        查询
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-left">时间</th>
                                            <th className="px-4 py-3 text-left">用户</th>
                                            <th className="px-4 py-3 text-left">用途</th>
                                            <th className="px-4 py-3 text-left">模型源</th>
                                            <th className="px-4 py-3 text-left">状态</th>
                                            <th className="px-4 py-3 text-left">耗时</th>
                                            <th className="px-4 py-3 text-left">任务关键词</th>
                                            <th className="px-4 py-3 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {globalRunsLoading ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
                                                    加载中...
                                                </td>
                                            </tr>
                                        ) : globalRuns.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                                                    暂无调用记录
                                                </td>
                                            </tr>
                                        ) : (
                                            globalRuns.map((r) => (
                                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">
                                                            {r.user?.email || '-'}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">ID: {r.user?.id ?? '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold">
                                                        <span className={`px-2 py-0.5 rounded ${r.purpose === 'ANALYSIS' ? 'bg-purple-50 text-brand-purple' : 'bg-blue-50 text-blue-700'}`}>
                                                            {r.purpose === 'ANALYSIS' ? '分析' : '模型'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">{r.modelKey}</div>
                                                        <div className="text-[10px] text-gray-400">{r.provider || '-'}:{r.modelName || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold">
                                                        <span
                                                            className={`px-2 py-0.5 rounded ${
                                                                r.status === 'SUCCEEDED'
                                                                    ? 'bg-green-50 text-green-700'
                                                                    : r.status === 'FAILED'
                                                                      ? 'bg-red-50 text-red-700'
                                                                      : r.status === 'RUNNING'
                                                                        ? 'bg-yellow-50 text-yellow-700'
                                                                        : 'bg-gray-50 text-gray-700'
                                                            }`}
                                                        >
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                                                        {typeof r.latencyMs === 'number' ? `${Math.round(r.latencyMs / 1000)}s` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[360px] truncate" title={r.taskKeyword}>
                                                        {r.taskKeyword}
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => openGlobalRunDetail(r.id)}
                                                            disabled={globalDetailLoading}
                                                            className="text-xs font-bold text-brand-purple hover:underline disabled:opacity-60 mr-3"
                                                        >
                                                            详情
                                                        </button>
                                                        <button
                                                            onClick={() => openGlobalTaskDetail(r.taskId)}
                                                            disabled={globalDetailLoading}
                                                            className="text-xs font-bold text-gray-700 hover:underline disabled:opacity-60"
                                                        >
                                                            任务
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'billing':
                return (
                    <div className="space-y-5 animate-fade-in">
                        <div className="flex items-center justify-between">
	                            <div>
	                                <h3 className="text-lg font-bold text-gray-900">全站扣费记录</h3>
	                                <p className="text-sm text-gray-500">汇总所有用户的点数变动日志（扣费/充值/退款/管理员调整）。</p>
	                                <div className="text-[11px] text-gray-400 mt-1 tabular-nums">共 {globalPointsTotal.toLocaleString()} 条</div>
	                            </div>
	                            <div className="flex items-center gap-2">
	                                <button
	                                    onClick={() => {
	                                        const params = new URLSearchParams();
	                                        params.set('limit', '5000');
	                                        if (pointsQ.trim()) params.set('q', pointsQ.trim());
	                                        if (pointsEmail.trim()) params.set('email', pointsEmail.trim());
	                                        if (pointsType !== 'ALL') params.set('type', pointsType);
	                                        if (pointsFrom) params.set('from', pointsFrom);
	                                        if (pointsTo) params.set('to', pointsTo);
	                                        downloadCsv(`/api/admin/export/points-logs.csv?${params.toString()}`, `points_logs_${Date.now()}.csv`);
	                                    }}
	                                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
	                                >
                                    导出 CSV
                                </button>
                                <button
                                    onClick={fetchGlobalPointsLogs}
                                    disabled={globalPointsLoading}
                                    className="flex items-center gap-2 text-sm text-brand-purple font-bold hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors border border-transparent hover:border-purple-100 disabled:opacity-60"
                                >
                                    <RefreshCw size={14} className={globalPointsLoading ? 'animate-spin' : ''} /> 刷新
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">描述关键词</label>
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            value={pointsQ}
                                            onChange={(e) => setPointsQ(e.target.value)}
                                            placeholder="例如：执行任务 / 管理员充值"
                                            className="bg-transparent outline-none text-sm w-full"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">用户邮箱</label>
                                    <input
                                        value={pointsEmail}
                                        onChange={(e) => setPointsEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">类型</label>
                                    <select
                                        value={pointsType}
                                        onChange={(e) => setPointsType(e.target.value as any)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    >
                                        <option value="ALL">全部</option>
                                        <option value="CONSUME">消费</option>
                                        <option value="RECHARGE">充值</option>
                                        <option value="REFUND">退款</option>
                                        <option value="ADMIN_ADD">管理员增加</option>
                                        <option value="ADMIN_SUB">管理员扣除</option>
                                    </select>
	                                </div>
	                            </div>
	
	                            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
	                                <div className="md:col-span-2">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">开始日期</label>
	                                    <input
	                                        type="date"
	                                        value={pointsFrom}
	                                        onChange={(e) => setPointsFrom(e.target.value)}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    />
	                                </div>
	                                <div className="md:col-span-2">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">结束日期</label>
	                                    <input
	                                        type="date"
	                                        value={pointsTo}
	                                        onChange={(e) => setPointsTo(e.target.value)}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    />
	                                </div>
	                                <div className="md:col-span-1">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">每页</label>
	                                    <select
	                                        value={pointsLimit}
	                                        onChange={(e) => {
	                                            const next = Number.parseInt(e.target.value, 10) || 100;
	                                            setPointsLimit(next);
	                                            setPointsOffset(0);
	                                            fetchGlobalPointsLogs({ limit: next, offset: 0 });
	                                        }}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    >
	                                        {[50, 100, 200].map((n) => (
	                                            <option key={n} value={n}>
	                                                {n}
	                                            </option>
	                                        ))}
	                                    </select>
	                                </div>
	                                <div className="md:col-span-1 flex items-end gap-2">
	                                    <button
	                                        onClick={() => {
	                                            const next = Math.max(0, pointsOffset - pointsLimit);
	                                            setPointsOffset(next);
	                                            fetchGlobalPointsLogs({ offset: next });
	                                        }}
	                                        disabled={globalPointsLoading || pointsOffset <= 0}
	                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
	                                    >
	                                        上一页
	                                    </button>
	                                    <button
	                                        onClick={() => {
	                                            const next = pointsOffset + pointsLimit;
	                                            setPointsOffset(next);
	                                            fetchGlobalPointsLogs({ offset: next });
	                                        }}
	                                        disabled={globalPointsLoading || pointsOffset + pointsLimit >= globalPointsTotal}
	                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
	                                    >
	                                        下一页
	                                    </button>
	                                </div>
	                            </div>

	                            <div className="mt-4 flex items-center justify-between">
	                                <div className="text-xs text-gray-400 tabular-nums">
	                                    {globalPointsError ? (
	                                        <span className="text-red-600 font-bold">{globalPointsError}</span>
	                                    ) : (
	                                        <span>
	                                            共 {globalPointsTotal.toLocaleString()} 条 · 第 {Math.floor(pointsOffset / pointsLimit) + 1} /{' '}
	                                            {Math.max(1, Math.ceil(globalPointsTotal / pointsLimit))} 页
	                                        </span>
	                                    )}
	                                </div>
	                                <div className="flex items-center gap-2">
	                                    <button
	                                        onClick={() => {
	                                            setPointsQ('');
	                                            setPointsEmail('');
	                                            setPointsType('ALL');
	                                            setPointsFrom('');
	                                            setPointsTo('');
	                                            setPointsOffset(0);
	                                            fetchGlobalPointsLogs({ offset: 0 });
	                                        }}
	                                        disabled={globalPointsLoading}
	                                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
	                                    >
	                                        重置
	                                    </button>
	                                    <button
	                                        onClick={() => {
	                                            setPointsOffset(0);
	                                            fetchGlobalPointsLogs({ offset: 0 });
	                                        }}
	                                        disabled={globalPointsLoading}
	                                        className="bg-brand-purple text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:bg-brand-hover active:scale-95 transition-all disabled:opacity-60"
	                                    >
	                                        查询
	                                    </button>
	                                </div>
	                            </div>
	                        </div>
	
	                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
	                            <div className="overflow-x-auto">
	                                <table className="w-full text-sm text-left">
	                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
	                                        <tr>
                                            <th className="px-4 py-3 text-left">时间</th>
                                            <th className="px-4 py-3 text-left">用户</th>
                                            <th className="px-4 py-3 text-left">类型</th>
                                            <th className="px-4 py-3 text-left">变动</th>
                                            <th className="px-4 py-3 text-left">余额</th>
                                            <th className="px-4 py-3 text-left">描述</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {globalPointsLoading ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
                                                    加载中...
                                                </td>
                                            </tr>
                                        ) : globalPointsLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                                    暂无扣费记录
                                                </td>
                                            </tr>
                                        ) : (
                                            globalPointsLogs.map((l) => (
                                                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                        {l.createdAt ? new Date(l.createdAt).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">{l.user?.email || '-'}</div>
                                                        <div className="text-[10px] text-gray-400">ID: {l.userId}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold">{l.type}</td>
                                                    <td className="px-4 py-3 text-xs font-bold tabular-nums whitespace-nowrap">
                                                        <span className={l.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                                                            {l.amount > 0 ? `+${l.amount}` : `${l.amount}`}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">{l.balance}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[420px] truncate" title={l.description || ''}>
                                                        {l.description || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'pageviews':
                return (
                    <div className="space-y-5 animate-fade-in">
                        <div className="flex items-center justify-between">
	                            <div>
	                                <h3 className="text-lg font-bold text-gray-900">全站浏览足迹</h3>
	                                <p className="text-sm text-gray-500">汇总所有用户的页面访问路径与停留时长（用于分析留存与使用习惯）。</p>
	                                <div className="text-[11px] text-gray-400 mt-1 tabular-nums">共 {globalPageViewsTotal.toLocaleString()} 条</div>
	                            </div>
	                            <div className="flex items-center gap-2">
	                                <button
	                                    onClick={() => {
	                                        const params = new URLSearchParams();
	                                        params.set('limit', '5000');
	                                        if (pageViewsQ.trim()) params.set('q', pageViewsQ.trim());
	                                        if (pageViewsEmail.trim()) params.set('email', pageViewsEmail.trim());
	                                        if (pageViewsFrom) params.set('from', pageViewsFrom);
	                                        if (pageViewsTo) params.set('to', pageViewsTo);
	                                        downloadCsv(`/api/admin/export/pageviews.csv?${params.toString()}`, `pageviews_${Date.now()}.csv`);
	                                    }}
	                                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
	                                >
                                    导出 CSV
                                </button>
                                <button
                                    onClick={fetchGlobalPageViews}
                                    disabled={globalPageViewsLoading}
                                    className="flex items-center gap-2 text-sm text-brand-purple font-bold hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors border border-transparent hover:border-purple-100 disabled:opacity-60"
                                >
                                    <RefreshCw size={14} className={globalPageViewsLoading ? 'animate-spin' : ''} /> 刷新
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">路径关键词</label>
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            value={pageViewsQ}
                                            onChange={(e) => setPageViewsQ(e.target.value)}
                                            placeholder="例如：/results /monitoring"
                                            className="bg-transparent outline-none text-sm w-full"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">用户邮箱</label>
                                    <input
                                        value={pageViewsEmail}
                                        onChange={(e) => setPageViewsEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
	                                </div>
	                            </div>
	
	                            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
	                                <div className="md:col-span-2">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">开始日期</label>
	                                    <input
	                                        type="date"
	                                        value={pageViewsFrom}
	                                        onChange={(e) => setPageViewsFrom(e.target.value)}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    />
	                                </div>
	                                <div className="md:col-span-2">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">结束日期</label>
	                                    <input
	                                        type="date"
	                                        value={pageViewsTo}
	                                        onChange={(e) => setPageViewsTo(e.target.value)}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    />
	                                </div>
	                                <div className="md:col-span-1">
	                                    <label className="block text-xs font-bold text-gray-700 mb-1">每页</label>
	                                    <select
	                                        value={pageViewsLimit}
	                                        onChange={(e) => {
	                                            const next = Number.parseInt(e.target.value, 10) || 100;
	                                            setPageViewsLimit(next);
	                                            setPageViewsOffset(0);
	                                            fetchGlobalPageViews({ limit: next, offset: 0 });
	                                        }}
	                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
	                                    >
	                                        {[50, 100, 200].map((n) => (
	                                            <option key={n} value={n}>
	                                                {n}
	                                            </option>
	                                        ))}
	                                    </select>
	                                </div>
	                                <div className="md:col-span-1 flex items-end gap-2">
	                                    <button
	                                        onClick={() => {
	                                            const next = Math.max(0, pageViewsOffset - pageViewsLimit);
	                                            setPageViewsOffset(next);
	                                            fetchGlobalPageViews({ offset: next });
	                                        }}
	                                        disabled={globalPageViewsLoading || pageViewsOffset <= 0}
	                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
	                                    >
	                                        上一页
	                                    </button>
	                                    <button
	                                        onClick={() => {
	                                            const next = pageViewsOffset + pageViewsLimit;
	                                            setPageViewsOffset(next);
	                                            fetchGlobalPageViews({ offset: next });
	                                        }}
	                                        disabled={globalPageViewsLoading || pageViewsOffset + pageViewsLimit >= globalPageViewsTotal}
	                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
	                                    >
	                                        下一页
	                                    </button>
	                                </div>
	                            </div>

	                            <div className="mt-4 flex items-center justify-between">
	                                <div className="text-xs text-gray-400 tabular-nums">
	                                    {globalPageViewsError ? (
	                                        <span className="text-red-600 font-bold">{globalPageViewsError}</span>
	                                    ) : (
	                                        <span>
	                                            共 {globalPageViewsTotal.toLocaleString()} 条 · 第 {Math.floor(pageViewsOffset / pageViewsLimit) + 1} /{' '}
	                                            {Math.max(1, Math.ceil(globalPageViewsTotal / pageViewsLimit))} 页
	                                        </span>
	                                    )}
	                                </div>
	                                <div className="flex items-center gap-2">
	                                    <button
	                                        onClick={() => {
	                                            setPageViewsQ('');
	                                            setPageViewsEmail('');
	                                            setPageViewsFrom('');
	                                            setPageViewsTo('');
	                                            setPageViewsOffset(0);
	                                            fetchGlobalPageViews({ offset: 0 });
	                                        }}
	                                        disabled={globalPageViewsLoading}
	                                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
	                                    >
	                                        重置
	                                    </button>
	                                    <button
	                                        onClick={() => {
	                                            setPageViewsOffset(0);
	                                            fetchGlobalPageViews({ offset: 0 });
	                                        }}
	                                        disabled={globalPageViewsLoading}
	                                        className="bg-brand-purple text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:bg-brand-hover active:scale-95 transition-all disabled:opacity-60"
	                                    >
	                                        查询
	                                    </button>
	                                </div>
	                            </div>
	                        </div>
	
	                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
	                            <div className="overflow-x-auto">
	                                <table className="w-full text-sm text-left">
	                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
	                                        <tr>
                                            <th className="px-4 py-3 text-left">时间</th>
                                            <th className="px-4 py-3 text-left">用户</th>
                                            <th className="px-4 py-3 text-left">路径</th>
                                            <th className="px-4 py-3 text-left">时长</th>
                                            <th className="px-4 py-3 text-left">Referrer</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {globalPageViewsLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                    <RefreshCw size={16} className="inline-block mr-2 animate-spin" />
                                                    加载中...
                                                </td>
                                            </tr>
                                        ) : globalPageViews.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                                                    暂无浏览足迹
                                                </td>
                                            </tr>
                                        ) : (
                                            globalPageViews.map((v) => (
                                                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                        {v.createdAt ? new Date(v.createdAt).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-900">{v.user?.email || '-'}</div>
                                                        <div className="text-[10px] text-gray-400">ID: {v.userId}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[420px] truncate" title={v.path}>
                                                        {v.path}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-700 tabular-nums whitespace-nowrap">
                                                        {typeof v.durationSeconds === 'number' ? formatDurationSeconds(v.durationSeconds) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[360px] truncate" title={v.referrer || ''}>
                                                        {v.referrer || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                                        <input
                                            type="text"
                                            value={siteName}
                                            onChange={(e) => setSiteName(e.target.value)}
                                            onBlur={() => patchSystemConfig({ siteName })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none"
                                        />
                                        <div className="text-[10px] text-gray-400 mt-1">修改后失焦自动保存</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2">管理员邮箱</label>
                                        <input type="text" defaultValue="admin@qingkuaisou.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none" />
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
                    <span className="font-bold text-lg tracking-tight">{publicConfig.siteName} 后台</span>
                </div>

                <div className="flex-1 py-6 space-y-1 px-3 overflow-y-auto scrollbar-hide">
                    <div className="text-xs font-bold text-gray-500 px-3 mb-2 uppercase tracking-wider">仪表盘</div>
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <LayoutDashboard size={18} /> 总览
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'reports' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <BarChart2 size={18} /> 统计排行
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Users size={18} /> 用户管理
                    </button>
                    <button onClick={() => setActiveTab('tasks')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Layers size={18} /> 任务记录
                    </button>
                    
                    <div className="text-xs font-bold text-gray-500 px-3 mt-6 mb-2 uppercase tracking-wider">系统管理</div>
                    <button onClick={() => setActiveTab('engines')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'engines' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Database size={18} /> 引擎中枢
                    </button>
                    <button onClick={() => setActiveTab('calls')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calls' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Terminal size={18} /> 总调用记录
                    </button>
                    <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <DollarSign size={18} /> 扣费记录
                    </button>
                    <button onClick={() => setActiveTab('pageviews')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pageviews' ? 'bg-brand-purple text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                        <Activity size={18} /> 浏览足迹
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
                             activeTab === 'reports' ? '统计排行' :
                             activeTab === 'users' ? '用户管理' : 
                             activeTab === 'tasks' ? '任务记录' :
                             activeTab === 'engines' ? '引擎中枢' : 
                             activeTab === 'calls' ? '总调用记录' :
                             activeTab === 'billing' ? '扣费记录' :
                             activeTab === 'pageviews' ? '浏览足迹' :
                             activeTab === 'logs' ? '审计日志' : '全局配置'}
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
                                    activeTab === 'reports' ? '统计排行' :
                                    activeTab === 'users' ? '用户账户管理' : 
                                    activeTab === 'tasks' ? '全站任务记录' :
                                    activeTab === 'engines' ? 'AI 引擎状态控制' : 
                                    activeTab === 'calls' ? '全站调用记录' :
                                    activeTab === 'billing' ? '全站扣费记录' :
                                    activeTab === 'pageviews' ? '全站浏览足迹' :
                                    activeTab === 'logs' ? '系统审计日志' : '全局系统设置'}
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

                        {globalRunDetail && (
                            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setGlobalRunDetail(null)}></div>
                                <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <div className="font-bold text-gray-900">调用详情</div>
                                        <button onClick={() => setGlobalRunDetail(null)} className="text-gray-400 hover:text-gray-600">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto space-y-4">
                                        <div className="text-xs text-gray-500">
                                            RunID: <span className="font-mono text-gray-700">{globalRunDetail.id}</span>
                                        </div>
                                        {globalRunDetail.error && (
                                            <div className="p-3 rounded-xl border border-red-100 bg-red-50 text-xs text-red-700 whitespace-pre-wrap">
                                                {globalRunDetail.error}
                                            </div>
                                        )}
                                        {(globalRunDetail.prompt || globalRunDetail.responseText || globalRunDetail.responseJson) && (
                                            <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                                                {JSON.stringify(
                                                    {
                                                        taskId: globalRunDetail.taskId,
                                                        modelKey: globalRunDetail.modelKey,
                                                        provider: globalRunDetail.provider,
                                                        modelName: globalRunDetail.modelName,
                                                        purpose: globalRunDetail.purpose,
                                                        status: globalRunDetail.status,
                                                        startedAt: globalRunDetail.startedAt,
                                                        completedAt: globalRunDetail.completedAt,
                                                        prompt: globalRunDetail.prompt,
                                                        responseText: globalRunDetail.responseText,
                                                        responseJson: globalRunDetail.responseJson,
                                                    },
                                                    null,
                                                    2
                                                )}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {globalTaskDetail && (
                            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setGlobalTaskDetail(null)}></div>
                                <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <div className="font-bold text-gray-900">任务详情 / 报告</div>
                                        <button onClick={() => setGlobalTaskDetail(null)} className="text-gray-400 hover:text-gray-600">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto space-y-3">
                                        <div className="text-xs text-gray-500">
                                            任务ID: <span className="font-mono text-gray-700">{globalTaskDetail.id}</span>
                                        </div>
                                        <div className="text-sm font-bold text-gray-900">{globalTaskDetail.keyword}</div>
                                        <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(globalTaskDetail.result || globalTaskDetail, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

const ExternalLinkIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);
