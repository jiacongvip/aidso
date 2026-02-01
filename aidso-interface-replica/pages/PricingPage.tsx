
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { SITE_NAME } from '../branding';

type ViewState = 'landing' | 'results' | 'login' | 'pricing' | 'api' | 'monitoring';

export const PricingPage = () => {
    return (
        <div className="min-h-screen bg-[#fafafa]">
             <div className="max-w-7xl mx-auto px-6 py-16">
                 <div className="text-center mb-16 space-y-4">
                     <h1 className="text-4xl font-bold text-gray-900">解锁完整的 GEO 洞察力</h1>
                     <p className="text-gray-500 max-w-2xl mx-auto">选择最适合您的计划。无论您是独立开发者还是企业团队，{SITE_NAME} 都能为您提供最精准的 AI 搜索引擎优化数据。</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                     {/* Basic Plan */}
                     <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative group">
                         <div className="mb-6">
                             <h3 className="text-lg font-bold text-gray-900">基础版</h3>
                             <div className="text-3xl font-bold text-gray-900 mt-4">¥0 <span className="text-sm font-medium text-gray-400">/月</span></div>
                             <p className="text-sm text-gray-500 mt-2">适合个人体验和轻度使用。</p>
                         </div>
                         <ul className="space-y-4 mb-8">
                             {['每日 5 次 AI 搜索', '基础数据概览', '社区支持', '标准 API 速率限制'].map((feat, i) => (
                                 <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                     <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                     {feat}
                                 </li>
                             ))}
                         </ul>
                         <button className="w-full py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">当前计划</button>
                     </div>

                     {/* Pro Plan */}
                     <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl relative transform md:-translate-y-4">
                         <div className="absolute top-0 right-0 bg-gradient-to-r from-[#fbbf24] to-[#d97706] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">RECOMMENDED</div>
                         <div className="mb-6">
                             <h3 className="text-lg font-bold text-white">开发者版</h3>
                             <div className="text-3xl font-bold text-white mt-4">¥99 <span className="text-sm font-medium text-gray-400">/月</span></div>
                             <p className="text-sm text-gray-400 mt-2">为专业 SEO 和开发者打造。</p>
                         </div>
                         <ul className="space-y-4 mb-8">
                             {['无限次 AI 搜索', '完整 DOM 快照分析', 'Trace Log 深度追踪', '优先 API 支持', '私有知识库接入'].map((feat, i) => (
                                 <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                     <CheckCircle size={16} className="text-[#fbbf24] flex-shrink-0" />
                                     {feat}
                                 </li>
                             ))}
                         </ul>
                         <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#fbbf24] to-[#d97706] font-bold text-white hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-[0.98]">立即升级</button>
                     </div>

                     {/* Enterprise Plan */}
                     <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative group">
                         <div className="mb-6">
                             <h3 className="text-lg font-bold text-gray-900">企业版</h3>
                             <div className="text-3xl font-bold text-gray-900 mt-4">Custom <span className="text-sm font-medium text-gray-400">/年</span></div>
                             <p className="text-sm text-gray-500 mt-2">针对大规模数据需求定制。</p>
                         </div>
                         <ul className="space-y-4 mb-8">
                             {['专属私有化部署', 'SLA 服务保障', '定制化数据源接入', '企业级 SSO 登录', '专属客户经理'].map((feat, i) => (
                                 <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                     <CheckCircle size={16} className="text-brand-purple flex-shrink-0" />
                                     {feat}
                                 </li>
                             ))}
                         </ul>
                         <button className="w-full py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">联系销售</button>
                     </div>
                 </div>
             </div>
        </div>
    );
};
