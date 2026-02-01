import React from 'react';
import { Box, Database, Brain, Sparkles, MessageSquare } from 'lucide-react';

const GeoPrinciples: React.FC = () => {
  return (
    <section className="w-full py-16 bg-[#f8f9fc]">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Title */}
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">GEO优化原理</h2>

        {/* Main Diagram Container */}
        <div className="relative w-full bg-gradient-to-br from-[#dbeafe] via-[#e0e7ff] to-[#e9d5ff] rounded-[3rem] p-8 md:p-12 overflow-hidden min-h-[700px] flex flex-col md:flex-row items-center justify-between gap-8 border border-white shadow-sm">
            
            {/* Background Decorative Lines (Abstract Neural Flow) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 1000 700" preserveAspectRatio="none">
                <path d="M0,600 C300,550 400,400 500,350 C600,300 800,100 1000,50" stroke="url(#grad1)" strokeWidth="4" fill="none" />
                <path d="M0,650 C250,600 450,450 500,400 C550,350 750,200 1000,150" stroke="url(#grad2)" strokeWidth="4" fill="none" />
                <path d="M0,700 C200,650 400,500 500,450 C600,400 700,300 1000,250" stroke="url(#grad1)" strokeWidth="4" fill="none" />
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
                        <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Left Column: User Question */}
            <div className="relative z-10 w-full md:w-[30%] flex flex-col justify-center h-full">
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/50 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-center gap-3 mb-3">
                         <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                            <MessageSquare size={16} />
                         </div>
                         <h3 className="text-lg font-bold text-gray-800">用户发出提问</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        用户在AI搜索平台输入问题并发送后，大模型开始解析问题，并预处理。
                    </p>
                    <div className="bg-[#fff7ed] rounded-lg p-3 border-l-4 border-orange-400">
                        <span className="block text-[10px] font-bold text-orange-600 mb-1">GEO优化点：</span>
                        <p className="text-[10px] text-gray-600">选择用户提问最多的方式与关键词</p>
                    </div>
                </div>
                
                {/* Decorative connecting line for mobile/desktop layout logic */}
                <div className="hidden md:block absolute right-[-20px] top-1/2 w-10 h-[2px] bg-gradient-to-r from-orange-300 to-transparent"></div>
            </div>

            {/* Center Column: Visual Cube */}
            <div className="relative z-10 w-full md:w-[30%] h-[300px] md:h-auto flex items-center justify-center">
                 <div className="relative w-48 h-48 md:w-64 md:h-64">
                    {/* Glowing effects */}
                    <div className="absolute inset-0 bg-blue-400 blur-[80px] opacity-30 rounded-full animate-pulse"></div>
                    
                    {/* Abstract Cube Construction */}
                    <div className="relative w-full h-full flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                         {/* Back Face */}
                         <div className="absolute w-32 h-32 bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 rounded-xl transform rotate-45 translate-x-4 translate-y-4"></div>
                         
                         {/* Main Face */}
                         <div className="relative w-32 h-32 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-2xl border border-white/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm transform -rotate-6">
                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-purple-600 mb-1">AI</div>
                            <div className="text-2xl font-black text-blue-400">GEO</div>
                         </div>

                         {/* Floating Elements */}
                         <div className="absolute top-0 right-10 w-16 h-16 bg-white/40 backdrop-blur-md rounded-lg z-30 border border-white/60 transform rotate-12 animate-float-slow"></div>
                         <div className="absolute bottom-10 left-6 w-12 h-12 bg-purple-500/20 backdrop-blur-md rounded-lg z-10 border border-purple-300/30 transform -rotate-12 animate-float-medium"></div>
                    </div>
                 </div>
            </div>

            {/* Right Column: AI Logic Stack */}
            <div className="relative z-10 w-full md:w-[35%] flex flex-col gap-4">
                
                <div className="text-right md:text-left mb-2">
                    <h3 className="text-lg font-bold text-purple-700 bg-white/50 inline-block px-4 py-1 rounded-full backdrop-blur-sm">AI大模型实现逻辑</h3>
                </div>

                {/* Card 1: Training */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/50 hover:-translate-x-1 transition-transform duration-300">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <Brain size={16} />
                         </div>
                         <h4 className="text-sm font-bold text-gray-800">训练：对齐与微调</h4>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                        教大模型如何能回答人类的提问(分词)，同时根据用户提问答案的互动反馈进行答案内容调整(赞/踩/追问)
                    </p>
                    <div className="bg-[#f3e8ff] rounded-lg p-2.5 border-l-4 border-purple-400">
                        <span className="block text-[10px] font-bold text-purple-700 mb-0.5">GEO优化点：</span>
                        <p className="text-[10px] text-gray-600">AI问答结果互动优化，告诉AI什么内容有用</p>
                    </div>
                </div>

                {/* Card 2: Learning */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/50 hover:-translate-x-1 transition-transform duration-300 ml-0 md:ml-4">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Sparkles size={16} />
                         </div>
                         <h4 className="text-sm font-bold text-gray-800">学习：预处理与预训练</h4>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                        让大模型学会语言的通用规律和世界知识，去除重复、低质、有害的数据
                    </p>
                    <div className="bg-[#e0e7ff] rounded-lg p-2.5 border-l-4 border-indigo-400">
                        <span className="block text-[10px] font-bold text-indigo-700 mb-0.5">GEO优化点：</span>
                        <p className="text-[10px] text-gray-600">模型喜欢采用、高质量的创作内容</p>
                    </div>
                </div>

                {/* Card 3: Foundation */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/50 hover:-translate-x-1 transition-transform duration-300 ml-0 md:ml-8">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Database size={16} />
                         </div>
                         <h4 className="text-sm font-bold text-gray-800">基础：海量数据收集</h4>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                        互联网上爬取各种样数据，收集大模型学习原始材料(不同AI搜索平台的爬取占比不一样)
                    </p>
                    <div className="bg-[#dbeafe] rounded-lg p-2.5 border-l-4 border-blue-400">
                        <span className="block text-[10px] font-bold text-blue-700 mb-0.5">GEO优化点：</span>
                        <p className="text-[10px] text-gray-600">针对优化平台，选择发布站点</p>
                    </div>
                </div>

            </div>

        </div>
      </div>
    </section>
  );
};

export default GeoPrinciples;