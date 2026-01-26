import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Building2, Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiJson } from '../services/api';

interface BrandKeyword {
    id: number;
    keyword: string;
    aliases: string[];
    category: string | null;
    isOwn: boolean;
    color: string;
    enabled: boolean;
    _count?: { mentions: number };
}

interface BrandKeywordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function errorToMessage(data: any, fallback: string) {
    const raw = data?.error ?? data?.message;
    if (!raw) return fallback;
    if (typeof raw === 'string') return raw;
    try {
        return JSON.stringify(raw);
    } catch {
        return String(raw);
    }
}

export const BrandKeywordModal = ({ isOpen, onClose }: BrandKeywordModalProps) => {
    const [keywords, setKeywords] = useState<BrandKeyword[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // 新增表单
    const [newKeyword, setNewKeyword] = useState('');
    const [newAliases, setNewAliases] = useState('');
    const [newIsOwn, setNewIsOwn] = useState(true);
    const [newCategory, setNewCategory] = useState('');

    // 加载品牌词列表
    const fetchKeywords = async () => {
        try {
            setLoading(true);
            const { res, data } = await apiJson<BrandKeyword[]>('/api/brand-keywords');
            if (!res.ok) {
                setError(errorToMessage(data, '加载品牌词失败'));
                setKeywords([]);
                return;
            }
            setKeywords(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('网络错误');
            setKeywords([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchKeywords();
        }
    }, [isOpen]);

    // 添加品牌词
    const handleAdd = async () => {
        if (!newKeyword.trim()) {
            setError('品牌词不能为空');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const { res, data } = await apiJson('/api/brand-keywords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    keyword: newKeyword.trim(),
                    aliases: newAliases.split(/[,，]/).map(a => a.trim()).filter(a => a),
                    isOwn: newIsOwn,
                    category: newCategory || null,
                    color: newIsOwn ? '#7c3aed' : '#ef4444'
                })
            });

            if (res.ok) {
                setSuccess('品牌词添加成功！');
                setNewKeyword('');
                setNewAliases('');
                setNewCategory('');
                fetchKeywords();
                setTimeout(() => setSuccess(null), 2000);
            } else {
                setError(errorToMessage(data, '添加失败'));
            }
        } catch (err) {
            setError('网络错误');
        } finally {
            setSaving(false);
        }
    };

    // 删除品牌词
    const handleDelete = async (id: number) => {
        if (!confirm('确定删除该品牌词？相关的提及记录也会被删除。')) return;

        try {
            const { res, data } = await apiJson(`/api/brand-keywords/${id}`, { method: 'DELETE' });

            if (res.ok) {
                setKeywords(keywords.filter(k => k.id !== id));
                setSuccess('删除成功');
                setTimeout(() => setSuccess(null), 2000);
            } else {
                setError(errorToMessage(data, '删除失败'));
            }
        } catch (err) {
            setError('网络错误');
        }
    };

    // 切换启用状态
    const handleToggle = async (id: number, enabled: boolean) => {
        try {
            const { res, data } = await apiJson(`/api/brand-keywords/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ enabled: !enabled })
            });

            if (res.ok) {
                setKeywords(keywords.map(k => k.id === id ? { ...k, enabled: !enabled } : k));
            } else {
                setError(errorToMessage(data, '更新失败'));
            }
        } catch (err) {
            setError('更新失败');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-scale-in flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center">
                            <Tag size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">品牌词管理</h2>
                            <p className="text-xs text-gray-500">添加您要追踪的品牌词，AI 分析时会自动匹配</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* 提示消息 */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                            <X size={14} />
                        </button>
                    </div>
                )}
                {success && (
                    <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {success}
                    </div>
                )}

                {/* 添加表单 */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Plus size={14} />
                        添加新品牌词
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">品牌词 *</label>
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                placeholder="如：聚推传媒"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple focus:ring-1 focus:ring-purple-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">别名（逗号分隔）</label>
                            <input
                                type="text"
                                value={newAliases}
                                onChange={(e) => setNewAliases(e.target.value)}
                                placeholder="如：江苏聚推, 聚推科技"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-purple focus:ring-1 focus:ring-purple-100 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">类型：</label>
                            <button
                                onClick={() => setNewIsOwn(true)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    newIsOwn
                                    ? 'bg-brand-purple text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Building2 size={12} />
                                我方品牌
                            </button>
                            <button
                                onClick={() => setNewIsOwn(false)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    !newIsOwn
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Users size={12} />
                                竞品
                            </button>
                        </div>
                        <div className="flex-1"></div>
                        <button
                            onClick={handleAdd}
                            disabled={saving || !newKeyword.trim()}
                            className="px-4 py-2 bg-brand-purple text-white rounded-lg text-sm font-bold hover:bg-brand-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            添加
                        </button>
                    </div>
                </div>

                {/* 品牌词列表 */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-gray-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    ) : keywords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Tag size={40} className="mb-3 opacity-50" />
                            <p className="text-sm">暂无品牌词</p>
                            <p className="text-xs mt-1">添加品牌词后，AI 分析时会自动追踪</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {keywords.map((kw) => (
                                <div
                                    key={kw.id}
                                    className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
                                        kw.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* 颜色标识 */}
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: kw.color || '#7c3aed' }}
                                        ></div>
                                        
                                        {/* 品牌词信息 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900">{kw.keyword}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    kw.isOwn
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {kw.isOwn ? '我方品牌' : '竞品'}
                                                </span>
                                                {kw._count && kw._count.mentions > 0 && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                                                        {kw._count.mentions} 次提及
                                                    </span>
                                                )}
                                            </div>
                                            {kw.aliases && kw.aliases.length > 0 && (
                                                <div className="text-xs text-gray-400">
                                                    别名：{kw.aliases.join('、')}
                                                </div>
                                            )}
                                        </div>

                                        {/* 操作按钮 */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggle(kw.id, kw.enabled)}
                                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                                                    kw.enabled
                                                    ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {kw.enabled ? '启用中' : '已禁用'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(kw.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            💡 提示：添加品牌词后，每次 AI 分析都会自动检测并记录提及情况
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-all"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
