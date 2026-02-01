import React from 'react';
import { ChevronsUpDown, Trophy, Medal } from 'lucide-react';
import { PLATFORMS } from '../constants';

interface RankingItem {
  rank: number;
  name: string;
  score: number;
  rate: string;
  count: number;
}

const SKINCARE_DATA: RankingItem[] = [
  { rank: 1, name: '珀莱雅', score: 61, rate: '55%', count: 777 },
  { rank: 2, name: '兰蔻', score: 50, rate: '39%', count: 469 },
  { rank: 3, name: '雅诗兰黛', score: 49, rate: '37%', count: 430 },
  { rank: 4, name: '欧莱雅', score: 48, rate: '37%', count: 479 },
  { rank: 5, name: '赫莲娜', score: 45, rate: '32%', count: 371 },
  { rank: 6, name: 'SK-II', score: 43, rate: '30%', count: 294 },
  { rank: 7, name: '百雀羚', score: 41, rate: '26%', count: 286 },
];

const MENSWEAR_DATA: RankingItem[] = [
  { rank: 1, name: '海澜之家', score: 70, rate: '70%', count: 657 },
  { rank: 2, name: '雅戈尔', score: 55, rate: '49%', count: 358 },
  { rank: 3, name: 'GXG', score: 52, rate: '45%', count: 337 },
  { rank: 4, name: '七匹狼', score: 42, rate: '29%', count: 210 },
  { rank: 5, name: '罗蒙', score: 41, rate: '26%', count: 151 },
  { rank: 6, name: '九牧王', score: 38, rate: '24%', count: 150 },
  { rank: 7, name: '杰克琼斯', score: 33, rate: '14%', count: 105 },
];

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <div className="w-6 h-6 flex items-center justify-center"><Trophy size={18} className="text-yellow-500 fill-yellow-500" /></div>;
  if (rank === 2) return <div className="w-6 h-6 flex items-center justify-center"><Medal size={18} className="text-gray-400 fill-gray-300" /></div>;
  if (rank === 3) return <div className="w-6 h-6 flex items-center justify-center"><Medal size={18} className="text-amber-700 fill-amber-600" /></div>;
  return <span className="text-gray-500 font-medium w-6 text-center">{rank}</span>;
};

const TableHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
    {label}
    <ChevronsUpDown size={12} className="text-gray-300" />
  </div>
);

const RankingTable = ({ title, colorClass, data }: { title: string, colorClass: string, data: RankingItem[] }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1">
      {/* Header */}
      <div className={`${colorClass} p-4`}>
        <h3 className="text-white text-lg font-bold">{title}</h3>
      </div>
      
      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
        <div className="col-span-2 text-center">排名</div>
        <div className="col-span-4 pl-2">品牌名称</div>
        <div className="col-span-2 text-center"><TableHeader label="品牌得分" /></div>
        <div className="col-span-2 text-center"><TableHeader label="提及率" /></div>
        <div className="col-span-2 text-center"><TableHeader label="提及次数" /></div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-50">
        {data.map((item) => (
          <div key={item.name} className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-gray-50 transition-colors text-sm text-gray-700">
            <div className="col-span-2 flex justify-center">
              <RankIcon rank={item.rank} />
            </div>
            <div className="col-span-4 flex items-center gap-2 pl-2">
               {/* Mock Logo */}
               <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold border border-gray-200">
                  {item.name.charAt(0)}
               </div>
               <span className="font-medium text-gray-800">{item.name}</span>
            </div>
            <div className="col-span-2 text-center font-medium">{item.score}</div>
            <div className="col-span-2 text-center text-gray-500">{item.rate}</div>
            <div className="col-span-2 text-center text-gray-500">{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BrandRanking: React.FC = () => {
  return (
    <section className="w-full py-16 bg-[#f8f9fc]">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">GEO行业品牌排行榜</h2>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            分析大模型内容中品牌的各项提及指标，给出行业排名，反映其在大模型认知中的行业地位。
          </p>
        </div>

        {/* Platform Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button className="px-6 py-2 rounded-lg bg-white border border-purple-500 text-purple-700 font-medium text-sm shadow-sm">
            全部平台
          </button>
          {PLATFORMS.slice(0, 5).map(platform => (
            <button key={platform.id} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition-colors">
               <div className={`w-4 h-4 rounded-full ${platform.iconColor} text-white flex items-center justify-center text-[8px]`}>
                 {platform.iconLetter}
               </div>
               {platform.name} · {platform.type === 'Web' ? '网页版' : 'App'}
            </button>
          ))}
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <RankingTable 
             title="护肤品行业排行" 
             colorClass="bg-[#9fa2f5]"
             data={SKINCARE_DATA} 
           />
           <RankingTable 
             title="男装行业排行" 
             colorClass="bg-[#f59ebc]"
             data={MENSWEAR_DATA} 
           />
        </div>

      </div>
    </section>
  );
};

export default BrandRanking;