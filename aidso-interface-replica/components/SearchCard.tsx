
import React from 'react';
import { Sparkles, ChevronDown, Check, Loader2 } from 'lucide-react';
import { BRANDS } from '../data';

interface SearchCardProps {
    searchType: 'quick' | 'deep';
    setSearchType: (type: 'quick' | 'deep') => void;
    selectedBrands: string[];
    toggleBrand: (name: string) => void;
    onSearch: () => void;
    isSearching: boolean;
    query: string;
    setQuery: (query: string) => void;
    estimatedCostUnits?: number;
    placeholder?: string;
    className?: string;
}

export const SearchCard = ({ searchType, setSearchType, selectedBrands, toggleBrand, onSearch, isSearching, query, setQuery, estimatedCostUnits, placeholder, className }: SearchCardProps) => (
    <div className={`w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-card ring-1 ring-black/5 p-8 mt-8 relative z-10 transition-shadow hover:shadow-lg duration-500 ${className || ''}`}>
        {/* Tab Header with Interactive State */}
        <div className="flex gap-6 mb-6 border-b border-gray-100 relative">
            <span 
                onClick={() => setSearchType('quick')}
                className={`font-bold text-base pb-3 px-1 cursor-pointer transition-all duration-300 border-b-2 ${searchType === 'quick' ? 'text-brand-purple border-brand-purple' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
            >
                快速搜索
            </span>
            <span 
                onClick={() => setSearchType('deep')}
                className={`font-bold text-base pb-3 px-1 cursor-pointer transition-all duration-300 border-b-2 ${searchType === 'deep' ? 'text-brand-purple border-brand-purple' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
            >
                深度搜索
            </span>
        </div>
        
        <div className="relative mb-6 group">
            {/* Input Container with improved visual depth */}
            <div className="bg-gray-50 rounded-xl p-2.5 flex items-center border border-gray-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-within:border-brand-purple focus-within:ring-4 focus-within:ring-purple-500/10 focus-within:bg-white transition-all duration-300">
                <div className="flex items-center gap-1.5 text-gray-600 text-sm px-3 py-1.5 cursor-pointer hover:bg-gray-200/50 rounded-lg transition-colors border-r border-transparent hover:border-gray-300 mr-2 select-none active:scale-95 transform">
                    <Sparkles size={14} className="text-brand-purple" />
                    <span className="font-medium">AI问题</span>
                    <ChevronDown size={14} className="text-gray-400" />
                </div>
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder || "向AI咨询的问题，如：抖音GEO哪家公司最好？"}
                    className="flex-1 bg-transparent border-none outline-none text-gray-700 font-medium text-sm py-2 placeholder-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                />
                <div className="hidden md:flex items-center gap-2 mr-2">
                    <span className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-100 text-[10px] text-gray-500 font-mono">⌘ K</span>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between">
            {/* Interactive Brand Selection */}
            <div className="flex flex-wrap gap-5">
                {BRANDS.map((brand) => {
                    const isSelected = selectedBrands.includes(brand.name);
                    return (
                        <div 
                            key={brand.name} 
                            onClick={() => toggleBrand(brand.name)}
                            className="flex items-center gap-2 cursor-pointer select-none group/item active:scale-95 transition-transform duration-100"
                        >
                            {/* Enhanced Checkbox state */}
                            <div className={`relative w-4 h-4 rounded flex items-center justify-center text-white text-[10px] shadow-sm ring-1 transition-all duration-200 ${isSelected ? 'bg-brand-purple ring-purple-100 shadow-purple-200' : 'bg-white ring-gray-200'}`}>
                                <Check size={10} strokeWidth={4} className={`transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                            </div>
                            <img 
                                src={brand.icon} 
                                className={`w-6 h-6 rounded-full border border-gray-100 shadow-sm transition-all duration-300 ${isSelected ? 'grayscale-0' : 'grayscale opacity-60'}`} 
                                alt={brand.name} 
                            />
                            <span className={`text-sm font-medium transition-colors duration-200 group-hover/item:text-brand-purple ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                                {brand.name}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            <div className="flex items-center gap-4">
                {typeof estimatedCostUnits === 'number' && (
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                        预计扣费 <span className="font-bold text-gray-800 tabular-nums">{estimatedCostUnits}</span> 次
                    </div>
                )}
                <button 
                    onClick={onSearch}
                    disabled={isSearching}
                    className={`bg-brand-purple hover:bg-brand-hover text-white px-10 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all transform active:scale-[0.98] hover:-translate-y-0.5 flex items-center gap-2 ${isSearching ? 'opacity-80 cursor-wait' : ''}`}
                >
                    {isSearching && <Loader2 size={16} className="animate-spin" />}
                    {isSearching ? '正在爬取...' : '启动蠕虫'}
                </button>
            </div>
        </div>
    </div>
);
