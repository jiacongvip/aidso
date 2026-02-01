import React from 'react';
import { Users, TrendingUp, PieChart } from 'lucide-react';
import { PLATFORMS } from '../constants';

const WhyGeo: React.FC = () => {
  // Helper to get platform by ID for the orbit visual
  const getPlat = (id: string) => PLATFORMS.find(p => p.id === id);
  const kimi = getPlat('kimi-web');
  const deepseek = getPlat('deepseek-web');
  const yuanbao = getPlat('yuanbao-web');
  const doubao = getPlat('doubao-web');
  const wenxin = getPlat('wenxin-web');
  const douyin = getPlat('douyin-web');

  return (
    <section className="w-full py-16 bg-[#f8f9fc] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative">
        
        {/* Title */}
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-4">为什么做GEO</h2>

        {/* Orbit Visual Area */}
        <div className="relative h-[350px] flex items-center justify-center mb-[-60px] z-0">
            
            {/* Concentric Rings */}
            <div className="absolute w-[600px] h-[600px] rounded-full border border-purple-100/50"></div>
            <div className="absolute w-[450px] h-[450px] rounded-full border border-purple-100"></div>
            
            {/* Central Glowing Orb */}
            <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-200 via-blue-200 to-transparent blur-[60px] opacity-60 rounded-full"></div>
                <div className="relative z-10 w-48 h-48 bg-gradient-to-b from-white to-[#f0f9ff] rounded-full shadow-[0_10px_40px_rgba(139,92,246,0.15)] flex flex-col items-center justify-center border border-white">
                     <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7] tracking-tight">
                        AI带来流量革命
                     </span>
                </div>
            </div>

            {/* Orbiting Icons - positioned absolutely */}
            
            {/* Kimi - Top Left */}
            <div className="absolute top-[15%] left-[25%] lg:left-[35%] animate-float-slow">
                <div className="w-12 h-12 bg-black rounded-xl shadow-lg flex items-center justify-center text-white font-bold border-2 border-white">
                    {kimi?.iconLetter || 'K'}
                </div>
            </div>

            {/* Yuanbao - Top Center */}
            <div className="absolute top-[8%] left-[45%] lg:left-[48%] animate-float-medium">
                 <div className="w-12 h-12 bg-green-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold border-2 border-white">
                    {yuanbao?.iconLetter || 'T'}
                </div>
            </div>

            {/* DeepSeek - Top Right */}
            <div className="absolute top-[20%] right-[25%] lg:right-[35%] animate-float-fast">
                <div className="w-12 h-12 bg-blue-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold border-2 border-white transform rotate-12">
                    {deepseek?.iconLetter || 'DS'}
                </div>
            </div>

             {/* Doubao - Right */}
             <div className="absolute top-[50%] right-[20%] lg:right-[32%] animate-float-slow">
                 <div className="w-12 h-12 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold border-2 border-white">
                    {doubao?.iconLetter || 'D'}
                </div>
            </div>

             {/* Wenxin - Bottom Right */}
             <div className="absolute bottom-[25%] right-[28%] lg:right-[38%] animate-float-medium">
                 <div className="w-12 h-12 bg-blue-500 rounded-lg shadow-lg flex items-center justify-center text-white font-bold border-2 border-white -rotate-6">
                    {wenxin?.iconLetter || 'W'}
                </div>
            </div>

             {/* Douyin - Bottom Left */}
             <div className="absolute bottom-[30%] left-[28%] lg:left-[36%] animate-float-fast">
                <div className="w-12 h-12 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold border-2 border-white">
                     <span className="text-xs">AI</span>
                </div>
            </div>

        </div>

        {/* Content Card */}
        <div className="relative z-10 bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 md:p-14 shadow-xl border border-white/60">
            
            {/* Text Paragraph */}
            <div className="text-center max-w-4xl mx-auto mb-16">
                <p className="text-gray-500 leading-8 text-[15px]">
                    随着<span className="text-[#7c3aed] font-bold">AI</span>问答搜索的快速发展，用户搜索方式从传统信息检索向AI驱动的复杂任务直接交付转变，搜索的内容适配从“点击跳转”转向“直接引用”。<br/>
                    根据第六届中国互联网基础资源大会上发布的报告，截至<span className="text-[#7c3aed] font-bold">2025年6月</span>，用户规模已达到<span className="text-[#7c3aed] font-bold text-lg">5.15亿人</span>，半年内增长<span className="text-[#7c3aed] font-bold">106%↑</span>，且<span className="text-[#f97316] font-bold">19岁及以下</span>用户占比最高，达到<span className="text-[#f97316] font-bold">33.8%</span>。这意味着即将成长起来的人们更多获取新信息的方式通过AI平台。
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
                
                {/* Stat 1 */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                            <Users size={24} />
                        </div>
                        <span className="text-5xl font-black text-[#6d28d9]">5.15</span>
                        <span className="text-xl font-bold text-[#c4b5fd] mt-3">亿人</span>
                    </div>
                    <span className="text-gray-800 font-bold text-lg">用户规模</span>
                </div>

                {/* Stat 2 */}
                <div className="flex flex-col items-center relative">
                    {/* Divider for desktop */}
                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-16 bg-gray-100"></div>
                    
                    <div className="flex items-center gap-2 mb-2">
                         <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-5xl font-black text-[#6d28d9]">106</span>
                        <span className="text-xl font-bold text-[#c4b5fd] mt-3">%</span>
                    </div>
                    <span className="text-gray-800 font-bold text-lg">半年内增长</span>

                    {/* Divider for desktop */}
                     <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 bg-gray-100"></div>
                </div>

                {/* Stat 3 */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-2">
                            <PieChart size={24} />
                        </div>
                        <span className="text-5xl font-black text-[#f97316]">33.8</span>
                        <span className="text-xl font-bold text-[#fdba74] mt-3">%</span>
                    </div>
                    <span className="text-gray-800 font-bold text-lg">19岁及以下用户占比</span>
                </div>

            </div>

        </div>

      </div>
    </section>
  );
};

export default WhyGeo;