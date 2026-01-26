import React, { useEffect, useState } from 'react';
import { Lock, Unlock, Save, CheckCircle, Shield, Globe, Server, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import { BRANDS } from '../data';
import { invalidateBillingPricing } from '../services/billing';

interface PermissionConfig {
    plan: string;
    features: string[];
}

interface ProviderConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
    enabled: boolean;
}

interface NewApiConfig {
    // Legacy support (optional)
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    
    // New multi-model support
    models?: {
        [key: string]: ProviderConfig;
    };
}

interface BillingConfig {
    dailyUnitsByPlan: {
        FREE: number;
        PRO: number;
        ENTERPRISE: number;
    };
    searchMultiplier: {
        quick: number;
        deep: number;
    };
    modelUnitPrice: Record<string, number>;
}

const DEFAULT_MODELS: { [key: string]: ProviderConfig } = Object.fromEntries(
    (Array.isArray(BRANDS) ? BRANDS : []).map((b: any) => [
        b.name,
        { baseUrl: 'https://api.newapi.com/v1', apiKey: '', model: '', enabled: false }
    ])
);

const DEFAULT_FIRST_MODEL = Object.keys(DEFAULT_MODELS)[0] || 'default';

const DEFAULT_MODEL_UNIT_PRICE: Record<string, number> = Object.fromEntries(
    (Array.isArray(BRANDS) ? BRANDS : []).map((b: any) => [b.name, 1])
);

const DEFAULT_BILLING: BillingConfig = {
    dailyUnitsByPlan: { FREE: 2, PRO: 100, ENTERPRISE: 1000 },
    searchMultiplier: { quick: 1, deep: 2 },
    modelUnitPrice: DEFAULT_MODEL_UNIT_PRICE
};

const DEFAULT_PERMISSIONS: PermissionConfig[] = [
    { plan: 'FREE', features: ['search'] },
    { plan: 'PRO', features: ['search', 'agent', 'optimization'] },
    { plan: 'ENTERPRISE', features: ['search', 'agent', 'optimization', 'monitoring', 'api'] },
];

const FEATURES = [
    { id: 'search', name: '基础搜索', desc: 'Landing Page & Results' },
    { id: 'agent', name: '智能对话 Agent', desc: 'AI Workflow' },
    { id: 'monitoring', name: '品牌监测', desc: 'Brand Monitoring' },
    { id: 'optimization', name: '内容优化', desc: 'Content Optimization' },
    { id: 'api', name: 'API 访问', desc: 'Developer API' },
];

export const PermissionSettings = () => {
    const [permissions, setPermissions] = useState<PermissionConfig[]>([]);
    const [fullConfig, setFullConfig] = useState<any>({});
    const [newApiConfig, setNewApiConfig] = useState<NewApiConfig>({ models: DEFAULT_MODELS });
    const [billingConfig, setBillingConfig] = useState<BillingConfig>(DEFAULT_BILLING);
    const [activeModelTab, setActiveModelTab] = useState<string>(DEFAULT_FIRST_MODEL);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [permLoadError, setPermLoadError] = useState('');
    const permLoadErrorText =
        typeof permLoadError === 'string'
            ? permLoadError
            : (() => {
                  try {
                      return JSON.stringify(permLoadError);
                  } catch {
                      return String(permLoadError);
                  }
              })();

    useEffect(() => {
        setLoading(true);
        // Fetch permissions
        apiFetch('/api/admin/permissions')
            .then(async (res) => {
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    const raw = data && (data.error || data.message);
                    const msg =
                        typeof raw === 'string'
                            ? raw
                            : raw
                              ? (() => {
                                    try {
                                        return JSON.stringify(raw);
                                    } catch {
                                        return String(raw);
                                    }
                                })()
                              : `加载失败（HTTP ${res.status}）`;
                    setPermLoadError(msg);
                    return DEFAULT_PERMISSIONS;
                }
                if (Array.isArray(data)) return data as PermissionConfig[];
                return DEFAULT_PERMISSIONS;
            })
            .then((data) => {
                const merged = ['FREE', 'PRO', 'ENTERPRISE'].map((plan) => {
                    const existing = (data || []).find((p) => p && p.plan === plan);
                    const fallback = DEFAULT_PERMISSIONS.find((p) => p.plan === plan)!;
                    const features = Array.isArray(existing?.features) ? existing!.features : fallback.features;
                    return { plan, features };
                });
                setPermissions(merged);
            })
            .catch((err) => {
                console.error("Failed to load permissions:", err);
                setPermLoadError(String(err?.message || err || '加载失败'));
                setPermissions(DEFAULT_PERMISSIONS);
            });

        // Fetch config
        apiFetch('/api/admin/config')
            .then(res => res.json())
            .then(data => {
                setFullConfig(data || {});
                if (data && data.newApi) {
                    // Merge with defaults to ensure all fields exist
                    const mergedModels = { ...DEFAULT_MODELS, ...(data.newApi.models || {}) };
                    
                    // Migrate legacy single config if exists and models is empty
                    if (!data.newApi.models && data.newApi.baseUrl) {
                         mergedModels[DEFAULT_FIRST_MODEL] = {
                             baseUrl: data.newApi.baseUrl,
                             apiKey: data.newApi.apiKey,
                             model: data.newApi.model,
                             enabled: true
                         };
                    }

                    setNewApiConfig({ ...data.newApi, models: mergedModels });
                }
                if (data && data.billing) {
                    setBillingConfig({
                        dailyUnitsByPlan: { ...DEFAULT_BILLING.dailyUnitsByPlan, ...(data.billing.dailyUnitsByPlan || {}) },
                        searchMultiplier: { ...DEFAULT_BILLING.searchMultiplier, ...(data.billing.searchMultiplier || {}) },
                        modelUnitPrice: { ...DEFAULT_BILLING.modelUnitPrice, ...(data.billing.modelUnitPrice || {}) }
                    });
                } else {
                    setBillingConfig(DEFAULT_BILLING);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const updateGlobalNewApi = (field: 'baseUrl' | 'apiKey' | 'model', value: string) => {
        setNewApiConfig((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const updateModelConfig = (platform: string, field: keyof ProviderConfig, value: any) => {
        setNewApiConfig(prev => ({
            ...prev,
            models: {
                ...prev.models,
                [platform]: {
                    ...(prev.models?.[platform] || DEFAULT_MODELS[platform] || { baseUrl: '', apiKey: '', model: '', enabled: false }),
                    [field]: value
                }
            }
        }));
    };

    const handleAddModel = () => {
        const name = prompt("请输入新模型源名称 (例如: moonshot, minimax):");
        if (name && name.trim()) {
            const key = name.trim();
            const exists = Object.keys(newApiConfig.models || {}).some((k) => k.toLowerCase() === key.toLowerCase());
            if (exists) {
                alert("该模型源已存在");
                return;
            }
            
            setNewApiConfig(prev => ({
                ...prev,
                models: {
                    ...prev.models,
                    [key]: { baseUrl: '', apiKey: '', model: '', enabled: false }
                }
            }));
            setActiveModelTab(key);
        }
    };

    const handleDeleteModel = (key: string) => {
        if (confirm(`确定要删除模型源 "${key}" 吗?`)) {
            setNewApiConfig(prev => {
                const newModels = { ...prev.models };
                delete newModels[key];
                return { ...prev, models: newModels };
            });
            // Switch to first available tab
            const remainingKeys = Object.keys(newApiConfig.models || {}).filter(k => k !== key);
            if (remainingKeys.length > 0) {
                setActiveModelTab(remainingKeys[0]);
            } else {
                setActiveModelTab(DEFAULT_FIRST_MODEL); // Fallback
            }
        }
    };

    const toggleFeature = (plan: string, featureId: string) => {
        setPermissions((prev) => {
            const hasPlan = prev.some((p) => p.plan === plan);
            const next = (hasPlan ? prev : [...prev, { plan, features: [] }]).map((p) => {
                if (p.plan !== plan) return p;
                const features = Array.isArray(p.features) ? p.features : [];
                const hasFeature = features.includes(featureId);
                return {
                    ...p,
                    features: hasFeature ? features.filter((f) => f !== featureId) : [...features, featureId],
                };
            });

            // Keep stable order
            const order = ['FREE', 'PRO', 'ENTERPRISE'];
            next.sort((a, b) => order.indexOf(a.plan) - order.indexOf(b.plan));
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save permissions
            const permRes = await apiFetch('/api/admin/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(permissions)
            });
            if (!permRes.ok) throw new Error(`Permission save failed: ${permRes.statusText}`);

            // Save config
            const configRes = await apiFetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...fullConfig, newApi: newApiConfig, billing: billingConfig })
            });
            if (!configRes.ok) throw new Error(`Config save failed: ${configRes.statusText}`);

            invalidateBillingPricing();
            alert('✅ 配置已成功保存');
        } catch (err: any) {
            console.error(err);
            alert(`❌ 保存失败: ${err.message || '未知错误'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleTestNewApi = async () => {
        try {
            const cfg = newApiConfig.models?.[activeModelTab];
            const res = await apiFetch('/api/admin/newapi/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: activeModelTab, config: cfg })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && (data.message || data.error)) || '测试失败');

            alert(`✅ 连接成功\nprovider: ${data.provider}\nmodel: ${data.model}\npreview: ${data.preview || '-'}`);
        } catch (err: any) {
            alert(`❌ 测试失败: ${err?.message || '未知错误'}`);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading permissions...</div>;

    return (
        <div className="space-y-6">
            {/* Multi-Platform Model Config */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Server size={18} className="text-gray-500" />
                        多模型接口配置 (Model Router)
                    </h3>
                </div>

                {/* Global Defaults */}
                <div className="p-6 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-bold text-gray-900">全站默认（可选）</div>
                        <div className="text-xs text-gray-500">填一次 KEY，模型源里可留空继承</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">Base URL</label>
                            <input
                                type="text"
                                value={newApiConfig.baseUrl || ''}
                                onChange={(e) => updateGlobalNewApi('baseUrl', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none"
                                placeholder="https://api.newapi.com/v1"
                            />
                            <div className="text-[10px] text-gray-400 mt-1">留空则使用各模型源自己的 Base URL</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">API Key</label>
                            <input
                                type="password"
                                value={newApiConfig.apiKey || ''}
                                onChange={(e) => updateGlobalNewApi('apiKey', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none font-mono"
                                placeholder="sk-..."
                            />
                            <div className="text-[10px] text-gray-400 mt-1">模型源 API Key 留空时，会继承这里的 KEY</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">Default Model</label>
                            <input
                                type="text"
                                value={newApiConfig.model || ''}
                                onChange={(e) => updateGlobalNewApi('model', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none"
                                placeholder="gpt-4o-mini"
                            />
                            <div className="text-[10px] text-gray-400 mt-1">留空则使用各模型源自己的 Model</div>
                        </div>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/30 overflow-x-auto no-scrollbar items-center">
                    {newApiConfig.models && Object.keys(newApiConfig.models).map(platform => (
                        <button
                            key={platform}
                            onClick={() => setActiveModelTab(platform)}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${
                                activeModelTab === platform 
                                    ? 'border-brand-purple text-brand-purple bg-white' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {platform}
                        </button>
                    ))}
                    <button 
                        onClick={handleAddModel}
                        className="px-4 py-3 text-gray-400 hover:text-brand-purple hover:bg-purple-50 transition-colors border-b-2 border-transparent"
                        title="添加新模型源"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="p-6">
                    {activeModelTab && newApiConfig.models && newApiConfig.models[activeModelTab] && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${newApiConfig.models[activeModelTab].enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <span className="text-sm font-bold text-gray-700 capitalize">{activeModelTab} Provider</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleTestNewApi}
                                        className="text-xs font-bold text-brand-purple hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                                    >
                                        测试连接
                                    </button>
                                    {!DEFAULT_MODELS[activeModelTab] && (
                                        <button 
                                            onClick={() => handleDeleteModel(activeModelTab)}
                                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors mr-2"
                                            title="删除此配置"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    <span className="text-xs text-gray-500">启用此模型源</span>
                                    <button 
                                        onClick={() => updateModelConfig(activeModelTab, 'enabled', !newApiConfig.models![activeModelTab].enabled)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${newApiConfig.models[activeModelTab].enabled ? 'bg-brand-purple' : 'bg-gray-200'}`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${newApiConfig.models[activeModelTab].enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Base URL</label>
                                    <input 
                                        type="text" 
                                        value={newApiConfig.models[activeModelTab].baseUrl}
                                        onChange={(e) => updateModelConfig(activeModelTab, 'baseUrl', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none" 
                                        placeholder="https://api.example.com/v1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Model Name</label>
                                    <input 
                                        type="text" 
                                        value={newApiConfig.models[activeModelTab].model}
                                        onChange={(e) => updateModelConfig(activeModelTab, 'model', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none" 
                                        placeholder="gpt-4"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-2">API Key</label>
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            value={newApiConfig.models[activeModelTab].apiKey}
                                            onChange={(e) => updateModelConfig(activeModelTab, 'apiKey', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple outline-none font-mono" 
                                            placeholder="sk-..."
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        留空将使用「全站默认 API Key」。Keys are stored in local JSON config (demo mode).
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Billing Config */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Globe size={18} className="text-gray-500" />
                        计费与配额 (按次数/模型扣费)
                    </h3>
                    <div className="text-xs text-gray-500">
                        Asia/Shanghai · 深度倍率默认 <span className="font-bold">2</span>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <div className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">每日次数上限</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((plan) => (
                                <div key={plan} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                    <div className="text-xs font-bold text-gray-600 mb-2">{plan}</div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={billingConfig.dailyUnitsByPlan[plan]}
                                        onChange={(e) =>
                                            setBillingConfig((prev) => ({
                                                ...prev,
                                                dailyUnitsByPlan: {
                                                    ...prev.dailyUnitsByPlan,
                                                    [plan]: Number.parseInt(e.target.value || '0', 10),
                                                },
                                            }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                    <div className="text-[10px] text-gray-400 mt-2">单位：次 / 天</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">搜索倍率</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(['quick', 'deep'] as const).map((k) => (
                                <div key={k} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                    <div className="text-xs font-bold text-gray-600 mb-2">{k}</div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={billingConfig.searchMultiplier[k]}
                                        onChange={(e) =>
                                            setBillingConfig((prev) => ({
                                                ...prev,
                                                searchMultiplier: {
                                                    ...prev.searchMultiplier,
                                                    [k]: Number.parseInt(e.target.value || '0', 10),
                                                },
                                            }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                                    />
                                    <div className="text-[10px] text-gray-400 mt-2">costUnits = Σ(单价) × 倍率</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">模型单价</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(Array.isArray(BRANDS) ? BRANDS : []).map((b: any) => (
                                <div key={b.name} className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 p-3">
                                    <img src={b.icon} className="w-8 h-8 rounded-full border border-gray-100" alt={b.name} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800 truncate">{b.name}</div>
                                        <div className="text-[10px] text-gray-400">默认：1</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={billingConfig.modelUnitPrice[b.name] ?? 1}
                                        onChange={(e) =>
                                            setBillingConfig((prev) => ({
                                                ...prev,
                                                modelUnitPrice: {
                                                    ...prev.modelUnitPrice,
                                                    [b.name]: Number.parseInt(e.target.value || '0', 10),
                                                },
                                            }))
                                        }
                                        className="w-24 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50 tabular-nums"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Settings */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Shield size={18} className="text-gray-500" />
                        会员等级权限配置
                    </h3>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand-purple text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-brand-hover flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? '保存中...' : <><Save size={14} /> 保存全部配置</>}
                    </button>
                </div>
                
                <div className="p-6">
                    {permLoadError && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs rounded-lg px-4 py-3">
                            权限配置加载异常：{permLoadErrorText}（已使用默认值展示；请确认你是管理员登录且后端正常）
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-3 px-4 font-bold text-gray-500 w-1/4">功能模块</th>
                                    {['FREE', 'PRO', 'ENTERPRISE'].map(plan => (
                                        <th key={plan} className="py-3 px-4 font-bold text-center text-gray-900">
                                            {plan === 'FREE' ? '免费版' : plan === 'PRO' ? '开发者版' : '企业版'}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {FEATURES.map(feature => (
                                    <tr key={feature.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="font-bold text-gray-900">{feature.name}</div>
                                            <div className="text-xs text-gray-400">{feature.desc}</div>
                                        </td>
                                        {['FREE', 'PRO', 'ENTERPRISE'].map(plan => {
                                            const config = permissions.find(p => p.plan === plan) || { features: [] };
                                            const isEnabled = config.features?.includes(feature.id);
                                            return (
                                                <td key={plan} className="py-4 px-4 text-center">
                                                    <button 
                                                        onClick={() => toggleFeature(plan, feature.id)}
                                                        className={`p-2 rounded-lg transition-all ${isEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                                    >
                                                        {isEnabled ? <Unlock size={18} /> : <Lock size={18} />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
