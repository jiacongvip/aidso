import React from 'react';
import { PenTool, Target, BarChart2 } from 'lucide-react';

const Features: React.FC = () => {
  return (
    <div className="w-full bg-white py-12 border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Item 1 */}
        <div className="flex items-start gap-4 group cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
             <PenTool size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1">
              选词优化 <span className="text-gray-400 text-sm">›</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">需要优化的品牌词与AI问题</p>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-start gap-4 group cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
             <Target size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1">
              创作分发 <span className="text-gray-400 text-sm">›</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">运用AI批量创作文章与作品并发布</p>
          </div>
        </div>

        {/* Item 3 */}
        <div className="flex items-start gap-4 group cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
             <BarChart2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1">
              监测效果 <span className="text-gray-400 text-sm">›</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">实时了解优化结果与竞品差距</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Features;