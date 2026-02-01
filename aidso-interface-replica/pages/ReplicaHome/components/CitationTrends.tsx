import React from 'react';
import { PLATFORMS } from '../constants';
import { Trophy, Medal, Globe } from 'lucide-react';

interface CitationSource {
  rank: number;
  name: string;
  rate: string;
  color: string;
}

// Generate a color palette similar to the chart
const COLORS = [
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6'
];

// Mock Data based on the image
const SOURCE_DATA: CitationSource[] = [
  { rank: 1, name: '搜狐', rate: '8%', color: COLORS[0] },
  { rank: 2, name: '今日头条', rate: '4%', color: COLORS[1] },
  { rank: 3, name: '网易', rate: '4%', color: COLORS[2] },
  { rank: 4, name: '微信公众号', rate: '4%', color: COLORS[3] },
  { rank: 5, name: '百家号', rate: '3%', color: COLORS[4] },
  { rank: 6, name: '夸克', rate: '3%', color: COLORS[5] },
  { rank: 7, name: '什么值得买', rate: '3%', color: COLORS[6] },
  { rank: 8, name: '抖音', rate: '2%', color: COLORS[7] },
  { rank: 9, name: '买购网', rate: '2%', color: COLORS[8] },
  { rank: 10, name: '淘宝', rate: '2%', color: COLORS[9] },
  { rank: 11, name: '博客园', rate: '2%', color: COLORS[10] },
  { rank: 12, name: '京东', rate: '2%', color: COLORS[11] },
  { rank: 13, name: '哔哩哔哩', rate: '1%', color: COLORS[12] },
  { rank: 14, name: 'CSDN博客', rate: '1%', color: COLORS[13] },
  { rank: 15, name: '太平洋汽车', rate: '1%', color: COLORS[14] },
  { rank: 16, name: '新浪财经', rate: '1%', color: COLORS[15] },
  { rank: 17, name: '汽车之家', rate: '1%', color: COLORS[16] },
  { rank: 18, name: '懂车帝', rate: '1%', color: COLORS[17] },
  { rank: 19, name: '抖音商城', rate: '1%', color: COLORS[18] },
  { rank: 20, name: '百度百科', rate: '1%', color: COLORS[19] },
  { rank: 21, name: '网易新闻客户端', rate: '1%', color: COLORS[20] },
  { rank: 22, name: '品牌网云杉', rate: '1%', color: COLORS[21] },
  { rank: 23, name: '咸宁新闻网', rate: '1%', color: COLORS[22] },
  { rank: 24, name: '原创力文档', rate: '1%', color: COLORS[23] },
  { rank: 25, name: '知乎', rate: '1%', color: COLORS[24] },
  { rank: 26, name: '腾讯网', rate: '1%', color: COLORS[25] },
  { rank: 27, name: '十大品牌网', rate: '1%', color: COLORS[26] },
  { rank: 28, name: '新浪', rate: '1%', color: COLORS[27] },
  { rank: 29, name: '排行榜123网', rate: '1%', color: COLORS[28] },
  { rank: 30, name: '百度知道', rate: '1%', color: COLORS[29] },
  { rank: 31, name: 'IT之家', rate: '1%', color: COLORS[30] },
  { rank: 32, name: '个人图书馆', rate: '1%', color: COLORS[31] },
  { rank: 33, name: '金山网', rate: '1%', color: COLORS[32] },
  { rank: 34, name: '中国报告大厅', rate: '1%', color: COLORS[33] },
  { rank: 35, name: '搜狐新闻', rate: '1%', color: COLORS[34] },
  { rank: 36, name: '百度', rate: '1%', color: COLORS[35] },
  { rank: 37, name: '豌豆荚', rate: '1%', color: COLORS[36] },
  { rank: 38, name: '豆瓣', rate: '1%', color: COLORS[37] },
  { rank: 39, name: 'QQ', rate: '1%', color: COLORS[38] },
  { rank: 40, name: 'expired_url', rate: '1%', color: COLORS[39] },
];

const CitationTrends: React.FC = () => {
  // Construct conic gradient string
  // We'll distribute colors evenly for the visual effect, as exact percentages would be tedious to calc for this demo
  const generateConicGradient = () => {
    let gradientString = 'conic-gradient(';
    const segmentSize = 360 / 40; // 40 segments
    
    SOURCE_DATA.forEach((item, index) => {
      const start = index * segmentSize;
      const end = (index + 1) * segmentSize;
      // Add a small gap by adjusting start/end slightly or just using the colors directly
      // To mimic the white separators in the image, we can add white stops
      gradientString += `${item.color} ${start}deg ${end - 1.5}deg, white ${end - 1.5}deg ${end}deg${index < SOURCE_DATA.length - 1 ? ', ' : ''}`;
    });
    
    gradientString += ')';
    return gradientString;
  };

  const RankIcon = ({ rank }: { rank: number }) => {
      if (rank === 1) return <Trophy size={14} className="text-yellow-500 fill-yellow-500" />;
      if (rank === 2) return <Medal size={14} className="text-gray-400 fill-gray-300" />;
      if (rank === 3) return <Medal size={14} className="text-amber-700 fill-amber-600" />;
      return <span className="text-gray-500 font-semibold text-xs w-4 text-center">{rank}</span>;
  };

  return (
    <section className="w-full py-10 bg-[#f8f9fc]">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">GEO引用来源倾向</h2>
          
           {/* Platform Filters - Reused style */}
            <div className="flex flex-wrap justify-center gap-3">
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
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left: Donut Chart */}
          <div className="w-full lg:w-1/3 flex justify-center py-6">
            <div className="relative w-[320px] h-[320px] rounded-full flex items-center justify-center" style={{ background: generateConicGradient() }}>
               {/* Inner White Circle */}
               <div className="absolute w-[200px] h-[200px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner z-10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mb-2 opacity-80 blur-[1px]"></div>
                  <span className="text-xl font-bold text-gray-800">全部平台</span>
               </div>
            </div>
          </div>

          {/* Right: Data List */}
          <div className="w-full lg:w-2/3">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
                {/* Headers for columns - Visual trick: repeat headers for grid columns? 
                    Actually, let's just make it a single grid flow.
                    To match the image perfectly, let's render 4 columns explicitly. 
                */}
                
                {[0, 10, 20, 30].map((startIndex) => (
                    <div key={startIndex} className="flex flex-col">
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-4 px-2">
                            <span>引用媒体来源</span>
                            <span>引用率</span>
                        </div>
                        <div className="space-y-3">
                            {SOURCE_DATA.slice(startIndex, startIndex + 10).map((item) => (
                                <div key={item.rank} className="flex items-center justify-between text-xs group hover:bg-gray-50 p-1 rounded transition-colors cursor-default">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 flex justify-center shrink-0">
                                            <RankIcon rank={item.rank} />
                                        </div>
                                        {/* Color block */}
                                        <div className="w-3 h-3 rounded-[2px] shrink-0" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-gray-600 truncate max-w-[80px]" title={item.name}>{item.name}</span>
                                    </div>
                                    <span className="font-semibold text-gray-800">{item.rate}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
             </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default CitationTrends;