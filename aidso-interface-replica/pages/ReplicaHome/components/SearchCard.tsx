import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLATFORMS } from '../constants';
import { useSearch } from '../../../contexts/SearchContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTasks } from '../../../contexts/TaskContext';
import { useAuth } from '../../../contexts/AuthContext';
import { usePublicConfig } from '../../../contexts/PublicConfigContext';

const PENDING_SEARCH_KEY = 'qingkuaisou_pending_search';
const FALLBACK_ENABLED_MODEL_KEYS = new Set(['豆包', 'DeepSeek', '腾讯元宝', '文心', '通义千问', 'Kimi', '百度AI']);

function normalizeModelKey(name: string) {
  // Backend uses "通义千问" as the model key.
  if (name === '千问') return '通义千问';
  return name;
}

function platformIdToModelKey(id: string) {
  const map: Record<string, string> = {
    'doubao-web': '豆包',
    'doubao-app': '豆包',
    'deepseek-web': 'DeepSeek',
    'deepseek-app': 'DeepSeek',
    'yuanbao-web': '腾讯元宝',
    'qianwen-web': '通义千问',
    'baidu-web': '百度AI',
    'wenxin-web': '文心',
    'kimi-web': 'Kimi',
    'douyin-web': 'AI抖音',
  };
  return map[id] || '';
}

function modelKeysToPlatformIds(modelKeys: string[]) {
  const map: Record<string, string[]> = {
    '豆包': ['doubao-web', 'doubao-app'],
    'DeepSeek': ['deepseek-web', 'deepseek-app'],
    '腾讯元宝': ['yuanbao-web'],
    '通义千问': ['qianwen-web'],
    '百度AI': ['baidu-web'],
    '文心': ['wenxin-web'],
    'Kimi': ['kimi-web'],
    'AI抖音': ['douyin-web'],
  };

  const ids = modelKeys.flatMap((k) => map[normalizeModelKey(k)] || []);
  const set = new Set(ids);
  // Only keep ids that exist in the current PLATFORMS list.
  return Array.from(set).filter((id) => PLATFORMS.some((p) => p.id === id));
}

const SearchCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addTask } = useTasks();
  const { query: savedQuery, selectedBrands: savedSelectedBrands, searchType: savedSearchType, setQuery, setSelectedBrands, setSearchType } = useSearch();
  const { config: publicConfig, error: publicConfigError } = usePublicConfig();
  const formatCount = (n: number) => new Intl.NumberFormat('en-US').format(n);

  const enabledModelStates = useMemo(() => {
    const fromStates = Array.isArray(publicConfig.models) ? publicConfig.models : [];
    if (fromStates.length > 0) return fromStates;

    const keys = Array.isArray(publicConfig.enabledModels)
      ? publicConfig.enabledModels.map(normalizeModelKey).filter(Boolean)
      : [];
    if (keys.length > 0) {
      return Array.from(new Set(keys)).map((key) => ({ key, enabled: true, ready: true, missing: [] as string[] }));
    }

    // If config cannot be loaded, fall back to a safe demo list to keep UI usable.
    if (publicConfigError) {
      return Array.from(FALLBACK_ENABLED_MODEL_KEYS).map((key) => ({ key, enabled: true, ready: true, missing: [] as string[] }));
    }

    return [];
  }, [publicConfig.enabledModels, publicConfig.models, publicConfigError]);

  const enabledModelKeySet = useMemo(
    () => new Set(enabledModelStates.filter((m) => m && m.enabled !== false).map((m) => normalizeModelKey(m.key))),
    [enabledModelStates]
  );

  const readyModelKeySet = useMemo(
    () => new Set(enabledModelStates.filter((m) => m && m.enabled !== false && m.ready === true).map((m) => normalizeModelKey(m.key))),
    [enabledModelStates]
  );

  const platforms = useMemo(() => {
    return PLATFORMS.filter((p) => enabledModelKeySet.has(normalizeModelKey(platformIdToModelKey(p.id))));
  }, [enabledModelKeySet]);

  const readyPlatforms = useMemo(() => {
    return platforms.filter((p) => readyModelKeySet.has(normalizeModelKey(platformIdToModelKey(p.id))));
  }, [platforms, readyModelKeySet]);

  const [activeTab, setActiveTab] = useState<'search' | 'diagnosis'>('search');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(() => {
    if (Array.isArray(savedSelectedBrands) && savedSelectedBrands.length > 0) {
      return modelKeysToPlatformIds(savedSelectedBrands);
    }
    return [];
  });
  const [selectAll, setSelectAll] = useState(false);
  const [deepThink, setDeepThink] = useState(savedSearchType === 'deep');
  const [input, setInput] = useState(savedQuery || '');

  const selectedModels = useMemo(() => {
    const keys = selectedPlatforms
      .map((id) => platformIdToModelKey(id))
      .filter(Boolean)
      .map(normalizeModelKey);
    const unique = Array.from(new Set(keys));
    return unique.filter((k) => readyModelKeySet.has(k));
  }, [readyModelKeySet, selectedPlatforms]);

  const executeSearch = async (params: { keyword: string; searchType: 'quick' | 'deep'; models: string[] }) => {
    setQuery(params.keyword);
    setSelectedBrands(params.models);
    setSearchType(params.searchType);

    try {
      await addTask({ keyword: params.keyword, searchType: params.searchType, models: params.models });
      addToast('任务已创建，正在执行中...', 'success');
      navigate('/results');
    } catch (err: any) {
      addToast(err?.message || '创建任务失败', 'error');
    }
  };

  // If user just logged in, auto-run the pending search and redirect to results.
  useEffect(() => {
    if (!user) return;
    const raw = sessionStorage.getItem(PENDING_SEARCH_KEY);
    if (!raw) return;

    sessionStorage.removeItem(PENDING_SEARCH_KEY);
    try {
      const parsed = JSON.parse(raw) as any;
      const keyword = typeof parsed?.keyword === 'string' ? parsed.keyword.trim() : '';
      const searchType = parsed?.searchType === 'deep' ? 'deep' : 'quick';
      const models = Array.isArray(parsed?.models) ? parsed.models.filter((x: any) => typeof x === 'string') : [];
      if (!keyword || models.length === 0) return;
      executeSearch({ keyword, searchType, models });
    } catch {
      // ignore invalid payload
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Toggle individual platform
  const togglePlatform = (id: string) => {
    const modelKey = normalizeModelKey(platformIdToModelKey(id));
    if (!modelKey || !readyModelKeySet.has(modelKey)) return;
    setSelectedPlatforms(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id];
      return newSelection;
    });
  };

  // If enabled platforms change (admin config), prune invalid selections.
  useEffect(() => {
    const allowedIds = new Set(readyPlatforms.map((p) => p.id));
    setSelectedPlatforms((prev) => prev.filter((id) => allowedIds.has(id)));
  }, [readyPlatforms]);

  // Sync Select All state
  useEffect(() => {
    if (readyPlatforms.length > 0 && selectedPlatforms.length === readyPlatforms.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [readyPlatforms.length, selectedPlatforms]);

  // Handle Select All click
  const handleSelectAll = () => {
    if (readyPlatforms.length === 0) return;
    if (selectAll) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(readyPlatforms.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSubmit = async () => {
    if (activeTab === 'diagnosis') {
      navigate('/monitoring');
      return;
    }

    const keyword = input.trim();
    if (!keyword) {
      addToast('请输入搜索内容', 'info');
      return;
    }
    if (enabledModelKeySet.size === 0) {
      addToast('暂无可用模型，请管理员在后台启用模型源', 'info');
      return;
    }
    if (selectedModels.length === 0) {
      addToast('请至少选择一个已配置的AI模型', 'info');
      return;
    }

    const searchType = deepThink ? 'deep' : 'quick';

    // Tasks require login (backend enforces). Store intent then redirect to login.
    if (!user) {
      sessionStorage.setItem(
        PENDING_SEARCH_KEY,
        JSON.stringify({ keyword, searchType, models: selectedModels })
      );
      addToast('请先登录后执行任务', 'info');
      navigate('/login');
      return;
    }

    await executeSearch({ keyword, searchType, models: selectedModels });
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
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
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const modelKey = normalizeModelKey(platformIdToModelKey(platform.id));
          const isReady = modelKey ? readyModelKeySet.has(modelKey) : false;
          return (
            <div 
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={`
                flex items-center gap-2 p-2 rounded-lg border transition-all select-none relative
                ${isReady ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                ${isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100'}
                ${isReady ? 'hover:bg-gray-50' : ''}
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
                 {!isReady && <span className="text-[9px] text-gray-400">未配置</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white px-8 py-2.5 rounded-lg font-medium shadow-lg shadow-purple-200 hover:shadow-purple-300 transform hover:-translate-y-0.5 transition-all text-sm"
          onClick={handleSubmit}
        >
          {publicConfig.siteName}一下
        </button>
      </div>
      
      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
         <span>监测AI对话 <span className="text-purple-500">{formatCount(publicConfig.homeStats.aiChats)}</span></span>
         <span>追踪AI提及品牌 <span className="text-purple-500">{formatCount(publicConfig.homeStats.brandMentions)}</span></span>
         <span>收录引用文章 <span className="text-purple-500">{formatCount(publicConfig.homeStats.referencedArticles)}</span></span>
      </div>

    </div>
  );
};

export default SearchCard;
