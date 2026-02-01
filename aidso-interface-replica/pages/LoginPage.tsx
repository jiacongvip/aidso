
import React, { useState } from 'react';
import { Search, Mail, Lock, Github, MessageCircle, Shield } from 'lucide-react';

type ViewState = 'landing' | 'results' | 'login' | 'pricing' | 'api' | 'monitoring' | 'admin';

export const LoginPage = ({ onNavigate, onLoginSuccess }: { onNavigate: (page: ViewState) => void, onLoginSuccess?: (user: any) => void }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const showLocalAdminHint =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '0.0.0.0');

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const raw = await res.text().catch(() => '');
            let data: any = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = null;
            }
            
            if (res.ok) {
                // Login Success
                if (!data || !data.user) {
                    setError('登录接口返回异常（非 JSON 或缺少 user），请确认后端已启动且 /api 代理正常。');
                    return;
                }
                if (onLoginSuccess) onLoginSuccess(data);
                
                if (data?.user?.role === 'ADMIN') {
                    onNavigate('admin');
                } else {
                    onNavigate('landing'); 
                }
            } else {
                const msg =
                    (data && (data.error || data.message)) ||
                    `请求失败（HTTP ${res.status}）${raw ? `：${raw.slice(0, 200)}` : ''}`;
                setError(msg);
            }
        } catch (err) {
            setError(
                '网络错误：无法连接到后端 API。请先确认 http://localhost:3005/health 能打开，然后再重试（也可打开 /test-proxy.html 测试 /api 代理是否正常）。'
            );
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#fafafa]">
             <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-purple-50/50 via-white/80 to-transparent -z-10"></div>
             
             <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative z-10 animate-scale-in">
                 <div className="p-8">
                     <div className="text-center mb-8">
                         <div onClick={() => onNavigate('landing')} className="inline-flex items-center gap-2 text-xl font-bold text-gray-800 cursor-pointer mb-2">
                            <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center text-white shadow-md">
                                <Search size={18} strokeWidth={2.5} />
                            </div>
                            <span className="tracking-tight">轻快搜</span>
                         </div>
                         <h2 className="text-gray-500 text-sm">{mode === 'login' ? '欢迎回来，请登录您的账户' : '创建新账户，开启 AI 探索之旅'}</h2>
                     </div>

                     <div className="space-y-4">
                         {error && (
                             <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg border border-red-100">
                                 {error}
                             </div>
                         )}
                         <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700 ml-1">邮箱</label>
                             <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-brand-purple focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                                 <Mail size={16} className="text-gray-400 mr-2" />
                                 <input 
                                     type="email" 
                                     placeholder="name@example.com" 
                                     className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400" 
                                     value={email}
                                     onChange={(e) => setEmail(e.target.value)}
                                 />
                             </div>
                         </div>
                         <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700 ml-1">密码</label>
                             <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-brand-purple focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                                 <Lock size={16} className="text-gray-400 mr-2" />
                                 <input 
                                     type="password" 
                                     placeholder="••••••••" 
                                     className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400" 
                                     value={password}
                                     onChange={(e) => setPassword(e.target.value)}
                                 />
                             </div>
                         </div>
                         
                         {mode === 'login' && (
                             <div className="flex justify-end">
                                 <span className="text-xs text-brand-purple font-medium cursor-pointer hover:underline">忘记密码?</span>
                             </div>
                         )}

                         <button 
                             onClick={handleLogin}
                             disabled={loading}
                             className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                         >
                             {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                             {mode === 'login' ? '登 录' : '注册账户'}
                         </button>
                     </div>

                     <div className="relative my-6">
                         <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                         <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <button className="flex items-center justify-center gap-2 bg-white border border-gray-200 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                             <Github size={16} /> GitHub
                         </button>
                         <button className="flex items-center justify-center gap-2 bg-white border border-gray-200 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                             <MessageCircle size={16} className="text-green-500" /> WeChat
                         </button>
                     </div>
                 </div>
                 
                 <div className="bg-gray-50 p-4 flex justify-between items-center text-xs font-medium border-t border-gray-100">
                     <div className="text-gray-500">
                         {mode === 'login' ? '还没有账号? ' : '已有账号? '}
                         <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-brand-purple cursor-pointer hover:underline ml-1">
                             {mode === 'login' ? '立即注册' : '直接登录'}
                         </span>
                     </div>
                     
                     <div className="text-right">
                        <div 
                            onClick={() => onNavigate('admin')}
                            className="flex items-center justify-end gap-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                            <Shield size={12} />
                            <span>管理员入口</span>
                        </div>
                        {showLocalAdminHint && (
                            <div className="mt-1 text-[10px] text-gray-400 font-normal">
                                默认管理员：<span className="font-mono">admin / 111111</span>
                            </div>
                        )}
                     </div>
                 </div>
                 <div className="bg-gray-50 px-4 pb-4 text-center text-[11px] text-gray-400">
                     不登录也可浏览首页：
                     <span onClick={() => onNavigate('landing')} className="ml-1 text-brand-purple cursor-pointer hover:underline font-bold">
                         进入首页
                     </span>
                 </div>
             </div>
        </div>
    );
};
