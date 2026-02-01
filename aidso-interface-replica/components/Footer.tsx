
import React from 'react';
import { Search, Github, Twitter, MessageCircle, Globe, ChevronDown } from 'lucide-react';
import { usePublicConfig } from '../contexts/PublicConfigContext';

export const Footer = () => {
    const { config } = usePublicConfig();
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8 relative z-10 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-16">
                {/* Brand Column */}
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-4 cursor-pointer group">
                        <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                            <Search size={18} strokeWidth={2.5} />
                        </div>
                        <span>{config.siteName}</span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
                        打破信息茧房，洞察算法逻辑。
                        <br />
                        新一代 AI 聚合搜索与 GEO 优化分析平台，助力企业在 AI 时代获得更多曝光。
                    </p>
                    <div className="flex gap-4">
                        <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-brand-purple hover:text-white transition-all">
                            <Github size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-brand-purple hover:text-white transition-all">
                            <Twitter size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-brand-purple hover:text-white transition-all">
                            <MessageCircle size={16} />
                        </button>
                    </div>
                </div>

                {/* Links Columns */}
                <div>
                    <h4 className="font-bold text-gray-900 mb-6">产品</h4>
                    <ul className="space-y-4 text-sm text-gray-500">
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">实时搜索</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">品牌监测</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">API 服务</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">价格方案</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-gray-900 mb-6">资源</h4>
                    <ul className="space-y-4 text-sm text-gray-500">
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">开发者文档</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">GEO 白皮书</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">社区论坛</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors flex items-center gap-2">
                            系统状态
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-gray-900 mb-6">公司</h4>
                    <ul className="space-y-4 text-sm text-gray-500">
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">关于我们</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">招贤纳士</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">联系方式</li>
                        <li className="hover:text-brand-purple cursor-pointer transition-colors">合作伙伴</li>
                    </ul>
                </div>
                
                 <div>
                    <h4 className="font-bold text-gray-900 mb-6">订阅动态</h4>
                    <p className="text-xs text-gray-400 mb-4">获取最新的 GEO 优化技巧与行业报告。</p>
                    <div className="flex flex-col gap-2">
                         <input type="email" placeholder="输入您的邮箱" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple transition-colors" />
                         <button className="bg-gray-900 text-white text-sm font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors">订阅</button>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-gray-400 text-xs font-medium flex flex-col md:flex-row items-center gap-4">
                    <span>© {new Date().getFullYear()} {config.siteName}. All rights reserved.</span>
                    <span className="hidden md:inline text-gray-200">|</span>
                    <span className="hover:text-gray-600 cursor-pointer">隐私政策</span>
                    <span className="hover:text-gray-600 cursor-pointer">服务条款</span>
                    <span className="hidden md:inline text-gray-200">|</span>
                    <span>{config.icp}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-400 hover:text-gray-600 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-full transition-colors">
                    <Globe size={14} />
                    <span className="text-xs font-medium">Global (简体中文)</span>
                    <ChevronDown size={12} />
                </div>
            </div>
        </div>
    </footer>
    );
};
