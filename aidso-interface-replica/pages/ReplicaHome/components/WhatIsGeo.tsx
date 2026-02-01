import React from 'react';
import { Star,  Disc, Box } from 'lucide-react';

const WhatIsGeo: React.FC = () => {
  return (
    <section className="w-full py-12 bg-[#f8f9fc]">
      <div className="max-w-7xl mx-auto px-4">
        {/* Title */}
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">GEO是什么</h2>

        {/* Main Content Container */}
        <div className="bg-gradient-to-b from-[#f0f6ff] to-[#f5f3ff] rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-white relative overflow-hidden">
             
             {/* 3 Cards Grid */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-12">
                
                {/* Card 1 */}
                <div className="bg-white rounded-[2rem] p-8 flex flex-col items-center text-center shadow-sm h-[260px] justify-center transition-transform hover:-translate-y-1 duration-300">
                    <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
                        {/* 3D Star Simulation */}
                        <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 rounded-full"></div>
                        <Star size={72} className="text-[#8b5cf6] fill-[#ddd6fe] drop-shadow-lg relative z-10" strokeWidth={1.5} />
                        <Star size={72} className="text-[#7c3aed] absolute top-0.5 left-0.5 opacity-20 blur-[1px]" strokeWidth={0} fill="currentColor" />
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                        从“关键词”到<br/>“懂你”
                    </h3>
                </div>

                {/* Card 2 */}
                <div className="bg-white rounded-[2rem] p-8 flex flex-col items-center text-center shadow-sm h-[260px] justify-center transition-transform hover:-translate-y-1 duration-300">
                    <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
                        {/* 3D Ring Simulation */}
                        <div className="absolute inset-0 bg-indigo-400 blur-2xl opacity-20 rounded-full"></div>
                        <Disc size={72} className="text-[#8b5cf6] fill-[#ddd6fe] drop-shadow-lg relative z-10" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                        从“匹配字符”到<br/>“理解人心”
                    </h3>
                </div>

                {/* Card 3 */}
                 <div className="bg-white rounded-[2rem] p-8 flex flex-col items-center text-center shadow-sm h-[260px] justify-center transition-transform hover:-translate-y-1 duration-300">
                    <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
                        {/* 3D Cube Simulation */}
                        <div className="absolute inset-0 bg-purple-400 blur-2xl opacity-20 rounded-full"></div>
                        <Box size={72} className="text-[#8b5cf6] fill-[#ddd6fe] drop-shadow-lg relative z-10" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                        从“搜索—点击—浏览”到<br/>“提问—获取—决策”
                    </h3>
                </div>
             </div>

             {/* Description Text */}
             <div className="relative z-10 text-sm md:text-[15px] leading-7 text-gray-600 px-2 md:px-4">
                <p>
                    <span className="font-bold text-[#7c3aed]">GEO</span>(生成式引擎优化，Generative Engine Optimization)是一套优化<span className="font-bold text-[#7c3aed]">AI</span>搜索内容的策略和技术，目的让自己的产品和服务在AI平台上(
                    <span className="font-bold text-[#7c3aed]">如豆包、DeepSeek、腾讯元宝等</span>
                    )的回答中获得更优先的提及，在用户不同的问题中获取更高提及率、发布在网络上的内容被更频繁引用。与传统<span className="font-bold text-[#7c3aed]">SEO</span>优化不同，GEO是优化创作的内容被AI理解、提问引用、回答提及的过程。目标是让品牌/商务/服务直接成为<span className="font-bold text-[#7c3aed]">AI</span>答案。
                </p>
             </div>

        </div>
      </div>
    </section>
  );
};

export default WhatIsGeo;