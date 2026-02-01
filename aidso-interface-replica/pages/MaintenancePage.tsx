import React from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Wrench, RefreshCcw } from 'lucide-react';
import { usePublicConfig } from '../contexts/PublicConfigContext';

export const MaintenancePage = () => {
  const { config, loading } = usePublicConfig();

  if (!loading && !config.maintenanceMode) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#fafafa] px-6">
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-amber-50/70 via-white/80 to-transparent -z-10"></div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 relative z-10 animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700">
            <Wrench size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500">{config.siteName}</div>
            <div className="text-xl font-extrabold text-gray-900 mt-0.5">系统维护中</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 leading-relaxed">
          我们正在进行系统升级维护，期间普通用户暂时无法使用搜索与任务功能。请稍后再试。
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            <Shield size={16} />
            管理员登录
          </a>
          <a
            href="/maintenance"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            <RefreshCcw size={16} />
            刷新页面
          </a>
        </div>

        <div className="mt-6 text-xs text-gray-400">维护结束后将自动恢复正常访问。</div>
      </div>
    </div>
  );
};

