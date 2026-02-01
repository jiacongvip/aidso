import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLATFORMS } from '../constants';

const SearchCard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'search' | 'diagnosis'>('search');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(PLATFORMS.map(p => p.id));
  const [selectAll, setSelectAll] = useState(true);
  const [deepThink, setDeepThink] = useState(false);

  // Toggle individual platform
  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id];
      return newSelection;
    });
  };

  // Sync Select All state
  useEffect(() => {
    if (selectedPlatforms.length === PLATFORMS.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedPlatforms]);

  // Handle Select All click
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(PLATFORMS.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 w-full max-w-[880px] relative z-10">
      
      {/* Tabs & History */}
      <div className="flex justify-between items-center mb-4">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button 
            onClick={() => setActiveTab('search')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'search' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            实时搜索
          </button>
          <button 
            onClick={() => setActiveTab('diagnosis')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'diagnosis' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            品牌诊断
          </button>
        </div>
        <button className="text-gray-400 text-sm flex items-center hover:text-purple-600">
           历史记录
        </button>
      </div>

      {/* Input Area */}
      <div className="relative mb-6 group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 cursor-pointer">
          <span className="text-gray-800 font-semibold text-sm">AI问题</span>
          <ChevronDown size={14} className="text-gray-400" />
          <div className="w-px h-4 bg-gray-300 mx-3"></div>
        </div>
        <input 
          type="text"
          placeholder="向AI咨询的问题，如：抖音DSO哪家公司最好？"
          className="w-full h-14 pl-[110px] pr-4 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder-gray-400 text-gray-700"
        />
      </div>

      {/* Platform Selection Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-gray-800">AI平台</span>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <div 
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectAll ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'}`}
              onClick={handleSelectAll}
            >
              {selectAll && <Check size={12} className="text-white" />}
            </div>
            <span className="text-gray-600">全选</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
             <div 
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${deepThink ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'}`}
              onClick={() => setDeepThink(!deepThink)}
            >
              {deepThink && <Check size={12} className="text-white" />}
            </div>
            <span className="text-gray-500">开启深度思考</span>
          </label>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          return (
            <div 
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={`
                flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all select-none
                ${isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100 hover:bg-gray-50'}
              `}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 ${isSelected ? 'bg-purple-600' : 'bg-gray-300'}`}>
                {isSelected && <Check size={10} />}
              </div>
              <div className={`w-5 h-5 rounded-full ${platform.iconColor} flex items-center justify-center text-[8px] text-white shrink-0`}>
                 {platform.iconLetter}
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">
                   {platform.name} · {platform.type === 'Web' ? '网页版' : '手机版'}
                 </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white px-8 py-2.5 rounded-lg font-medium shadow-lg shadow-purple-200 hover:shadow-purple-300 transform hover:-translate-y-0.5 transition-all text-sm"
          onClick={() => navigate('/results')}
        >
          爱搜一下
        </button>
      </div>
      
      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
         <span>监测AI对话 <span className="text-purple-500">718,959</span></span>
         <span>追踪AI提及品牌 <span className="text-purple-500">3,519,392</span></span>
         <span>收录引用文章 <span className="text-purple-500">2,042,929</span></span>
      </div>

    </div>
  );
};

export default SearchCard;
