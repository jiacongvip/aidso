
import React, { useState } from 'react';
import { Search, History, Clock, Trash2, Lock, Coins } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePublicConfig } from '../contexts/PublicConfigContext';

export const Navbar = ({ isLanding: propIsLanding }: { isLanding?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Keep nav consistent across most pages. "Landing" style is only for the legacy /landing page.
  const isLanding = propIsLanding ?? (location.pathname === '/landing');
  const { checkPermission, user, logout } = useAuth();
  const { config } = usePublicConfig();
  
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([
    "常州小程序开发公司哪家好",
    "DeepSeek V3 深度评测",
    "SCRM 系统私有化部署价格",
    "React 19 Server Components",
    "如何优化 AI 搜索排名"
  ]);

  const handleDeleteItem = (e: React.MouseEvent, itemToDelete: string) => {
    e.stopPropagation();
    setHistory(history.filter(item => item !== itemToDelete));
  };

  const handleHistoryClick = (item: string) => {
    setShowHistory(false);
    navigate('/results');
  };

  return (
  <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isLanding ? 'bg-white/50 backdrop-blur-sm border-transparent py-4' : 'bg-white border-b border-gray-200/80 h-16 shadow-sm'
  }`}>
    <div className={`mx-auto px-6 h-full flex items-center justify-between ${isLanding ? 'max-w-7xl' : ''}`}>
        <div className="flex items-center gap-8">
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 text-2xl font-bold tracking-tight cursor-pointer group">
            <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center text-white shadow-md shadow-purple-200 group-hover:scale-105 transition-transform duration-200">
                <Search size={18} strokeWidth={2.5} />
            </div>
            <span className="text-gray-900 group-hover:text-brand-purple transition-colors duration-300">{config.siteName}</span>
            <div className="flex items-center text-[10px] ml-1 border border-brand-purple rounded-full overflow-hidden shadow-sm">
                <span className="px-1.5 py-0.5 text-brand-purple font-bold bg-purple-50">AI</span>
                <span className="px-1.5 py-0.5 bg-brand-purple text-white font-bold">GEO</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <span onClick={() => navigate('/')} className={`cursor-pointer transition-colors duration-200 ${isLanding ? 'text-gray-900 font-bold' : 'hover:text-brand-purple'}`}>首页</span>
            
            <div onClick={() => checkPermission('monitoring') && navigate('/monitoring')} className={`flex items-center gap-1 cursor-pointer transition-colors duration-200 ${checkPermission('monitoring') ? 'hover:text-brand-purple' : 'text-gray-300 cursor-not-allowed'}`}>
                品牌监测 {!checkPermission('monitoring') && <Lock size={12} />}
            </div>
            
            <div onClick={() => checkPermission('optimization') && navigate('/optimization')} className={`flex items-center gap-1 cursor-pointer transition-colors duration-200 ${checkPermission('optimization') ? 'hover:text-brand-purple' : 'text-gray-300 cursor-not-allowed'}`}>
                内容优化 {!checkPermission('optimization') && <Lock size={12} />}
            </div>
            
            <div onClick={() => checkPermission('agent') && navigate('/agent')} className={`flex items-center gap-1 cursor-pointer transition-colors duration-200 ${checkPermission('agent') ? 'hover:text-brand-purple font-medium' : 'text-gray-300 cursor-not-allowed'}`}>
              {checkPermission('agent') && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
              )}
              Agent调研 {!checkPermission('agent') && <Lock size={12} />}
            </div>
            
            <span onClick={() => navigate('/pricing')} className="cursor-pointer transition-colors duration-200 hover:text-brand-purple">价格</span>
            
            <div onClick={() => checkPermission('api') && navigate('/api-docs')} className={`flex items-center gap-1 cursor-pointer transition-colors duration-200 ${checkPermission('api') ? 'hover:text-brand-purple' : 'text-gray-300 cursor-not-allowed'}`}>
                API文档 {!checkPermission('api') && <Lock size={12} />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            {!isLanding && (
                <div className="hidden lg:flex bg-gray-100/50 hover:bg-white border border-transparent hover:border-purple-200 rounded-full items-center px-4 py-1.5 w-72 transition-all duration-300 group focus-within:bg-white focus-within:border-purple-200 focus-within:shadow-md focus-within:ring-2 focus-within:ring-purple-50">
                    <span className="text-gray-400 text-xs mr-2 whitespace-nowrap group-focus-within:text-brand-purple transition-colors font-medium">AI问题</span>
                    <input type="text" placeholder="向AI咨询的问题" className="bg-transparent border-none outline-none text-xs w-full text-gray-700 placeholder-gray-400" />
                    <div className="w-6 h-6 bg-brand-purple rounded-full flex items-center justify-center text-white ml-2 cursor-pointer hover:bg-brand-hover hover:scale-105 active:scale-95 transition-all shadow-sm">
                        <Search size={12} />
                    </div>
                </div>
            )}

            {/* History Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-purple-50 text-brand-purple' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                    title="搜索历史"
                >
                    <History size={20} />
                </button>

                {showHistory && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)}></div>
                        <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-in origin-top-right">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 mb-1">
                                <span className="text-xs font-bold text-gray-500">最近搜索</span>
                                <span 
                                    onClick={() => setHistory([])}
                                    className="text-[10px] text-gray-400 cursor-pointer hover:text-red-500 transition-colors"
                                >
                                    清空
                                </span>
                            </div>
                            
                            {history.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <Clock size={24} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">暂无搜索记录</p>
                                </div>
                            ) : (
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {history.map((item, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => handleHistoryClick(item)}
                                            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 truncate">{item}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => handleDeleteItem(e, item)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                                title="删除"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <button
              onClick={() => navigate('/pricing')}
              className="bg-gray-900 text-[#fbbf24] px-4 py-1.5 text-xs rounded-md font-bold hover:bg-gray-800 transition-colors shadow-sm active:scale-95 transform"
            >
              会员特权
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Points Display */}
                <div 
                  onClick={() => navigate('/me')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-full cursor-pointer hover:shadow-md transition-all"
                  title="剩余点数"
                >
                  <Coins size={14} className="text-orange-600" />
                  <span className="text-sm font-bold text-orange-600">{user.points || 0}</span>
                  <span className="text-[10px] text-orange-500">点</span>
                </div>
                
                <div
                  onClick={() => navigate('/me')}
                  className="flex items-center gap-3 text-sm font-medium p-1 rounded-full pr-3 hover:bg-gray-50 text-gray-900 cursor-pointer"
                  title="个人中心"
                >
                  <div className="w-8 h-8 rounded-full border shadow-sm flex items-center justify-center bg-gray-100 border-gray-200 text-gray-600">
                    <span className="text-xs font-bold">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="hidden md:block leading-tight">
                    <div className="text-xs font-bold text-gray-800 max-w-[140px] truncate">{user.name || user.email}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{user.plan}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <div
                onClick={() => navigate('/login')}
                className="flex items-center gap-3 text-sm font-medium cursor-pointer p-1 rounded-full pr-3 transition-colors active:scale-95 hover:bg-gray-50 text-gray-900"
              >
                <div className="w-8 h-8 rounded-full border shadow-sm flex items-center justify-center bg-gray-100 border-gray-200 text-gray-500">
                  <span className="text-xs font-bold">登录</span>
                </div>
              </div>
            )}
        </div>
    </div>
  </nav>
  );
}
