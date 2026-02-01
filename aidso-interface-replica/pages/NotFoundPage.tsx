import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Home, LifeBuoy } from 'lucide-react';
import { usePublicConfig } from '../contexts/PublicConfigContext';

export const NotFoundPage = () => {
  const { config } = usePublicConfig();

  return (
    <div className="flex-1 px-6 relative z-10 pb-20 pt-24">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-purple-50 blur-2xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-blue-50 blur-2xl"></div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-500">
              <div className="w-9 h-9 bg-brand-purple rounded-xl flex items-center justify-center text-white shadow-md">
                <Search size={18} strokeWidth={2.5} />
              </div>
              {config.siteName}
            </div>

            <div className="mt-6 text-5xl font-extrabold text-gray-900 tracking-tight">404</div>
            <div className="mt-2 text-lg font-bold text-gray-900">页面不存在</div>
            <div className="mt-2 text-sm text-gray-500 leading-relaxed">
              你访问的链接可能已失效或被移动。你可以返回首页继续使用搜索，也可以联系管理员协助处理。
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                <Home size={16} />
                返回首页
              </Link>
              <a
                href={`mailto:${config.supportEmail}?subject=${encodeURIComponent(`${config.siteName} - 页面不存在/链接失效`)}&body=${encodeURIComponent(
                  `我访问了一个不存在的页面：${typeof window !== 'undefined' ? window.location.href : ''}\n\n请协助查看。`
                )}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
                title={config.supportEmail}
              >
                <LifeBuoy size={16} />
                联系管理员
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

