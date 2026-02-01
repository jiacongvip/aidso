import React from 'react';
import { Search, Star, LineChart, MessageSquareMore, Circle } from 'lucide-react';
import { SITE_NAME } from '../../../branding';

const ServiceCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
  active?: boolean;
}> = ({ icon, title, description, items, active }) => {
  return (
    <div className={`bg-white rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group border-t-4 ${active ? 'border-purple-600 shadow-xl' : 'border-transparent hover:border-purple-600 shadow-sm'}`}>
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed mb-6 min-h-[80px]">
        {description}
      </p>

      {/* List */}
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></div>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const GeoServices: React.FC = () => {
  const services = [
    {
      icon: <Search size={28} />,
      title: "价值搜索词推荐",
      description: "基于AI语义分析技术，从品牌认知、产品特点、使用场景三个维度解析搭建品牌词、竞品词、AI提问词，为GEO优化找到最有价值切入点",
      items: [
        "语义分词分析",
        "品牌特点挖掘",
        "洞察用户搜索意图",
        "最有价值推荐词"
      ],
      active: true // Simulating the active state in the image
    },
    {
      icon: <Star size={28} fill="currentColor" className="text-white" />,
      title: "内容创作提升建议",
      description: "根据各个AI平台的引用平台倾向，结合EEAT原则（经验、专业性，权威性、可信度），为内容创作提供专业建议",
      items: [
        "权威性与可信度建设",
        "内容深度与完整性",
        "内容结构化和可读性",
        "结构化数据与知识图谱"
      ]
    },
    {
      icon: <LineChart size={28} />,
      title: "实时效果监测",
      description: "洞察每天数据表现与优化内容引用情况，实时监测各个AI平台回答中的品牌提及情况与情感倾向，及时发现问题，调整GEO优化计划",
      items: [
        "多个AI平台监测",
        "多个品牌同时监测",
        "提及率变化追踪",
        "竞品对比分析"
      ]
    },
    {
      icon: <MessageSquareMore size={28} />,
      title: "优化方案专家咨询",
      description: "专业的GEO优化师团队，团队成员经历了ASO 到 DSO ，再到GEO，对各种类型搜索流量与用户搜索习惯有资深经验，可以提供个性化的优化方案指导",
      items: [
        "资深优化师沟通",
        "优化方案指导",
        "专业提升建议",
        "疑难问题解答"
      ]
    }
  ];

  return (
    <section className="w-full py-16 bg-[#f8f9fc]">
      <div className="max-w-7xl mx-auto px-4">
        
          {/* Title */}
        <div className="text-center mb-16 relative">
          <h2 className="text-3xl font-extrabold text-gray-900 inline-block relative z-10">
            {SITE_NAME}<span className="text-[#8b5cf6]">GEO</span>优化服务
          </h2>
          {/* Decorative underline for GEO */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-10px] w-12 h-1 bg-[#8b5cf6] rounded-full opacity-30 blur-[1px]"></div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-10px] w-8 h-1 bg-[#8b5cf6] rounded-full"></div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <ServiceCard 
              key={index}
              {...service}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default GeoServices;
