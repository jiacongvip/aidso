import React, { useState } from 'react';
import { X, User, Mail, CreditCard, CheckCircle } from 'lucide-react';
import { apiFetch } from '../services/api';

interface AddUserDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddUserDrawer = ({ isOpen, onClose, onSuccess }: AddUserDrawerProps) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [plan, setPlan] = useState('免费版');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await apiFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, plan })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && data.error) || '创建用户失败');

            if (data?.initialPassword) {
                alert(`✅ 用户已创建\n默认初始密码：${data.initialPassword}\n请提醒用户尽快修改密码`);
            }
            onSuccess();
            onClose();
            // Reset form
            setName('');
            setEmail('');
            setPlan('免费版');
        } catch (error) {
            console.error('Failed to create user', error);
            alert('创建用户失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900">添加新用户</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="add-user-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">基本信息</label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="用户姓名" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50 transition-all" 
                                        />
                                    </div>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input 
                                            type="email" 
                                            required
                                            placeholder="电子邮箱" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50 transition-all" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                                <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">订阅方案</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {['免费版', '开发者版', '企业版'].map((p) => (
                                        <label key={p} className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${plan === p ? 'border-brand-purple bg-purple-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value={p} 
                                                checked={plan === p} 
                                                onChange={(e) => setPlan(e.target.value)}
                                                className="hidden" 
                                            />
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${plan === p ? 'border-brand-purple' : 'border-gray-300'}`}>
                                                {plan === p && <div className="w-2 h-2 rounded-full bg-brand-purple"></div>}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{p}</div>
                                                <div className="text-xs text-gray-500">
                                                    {p === '免费版' ? '基础功能限制' : p === '开发者版' ? '更高 API 配额' : '无限调用与专属支持'}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <button 
                        type="submit" 
                        form="add-user-form"
                        disabled={loading}
                        className="w-full bg-brand-purple text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-200 hover:bg-brand-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? '创建中...' : <><CheckCircle size={18} /> 确认创建用户</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
