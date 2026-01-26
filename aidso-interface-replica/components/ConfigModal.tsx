import React, { useEffect, useMemo, useState } from 'react';
import { X, FileText, Link as LinkIcon, Check, Tag, Target, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { MONITOR_PLATFORMS } from '../data';
import { apiErrorToMessage, apiJson } from '../services/api';
import { estimateCostUnits, getBillingPricing, type BillingPricing } from '../services/billing';

export type MonitoringProject = {
  id?: string;
  brandName: string;
  brandWebsiteUrl: string | null;
  monitorKeywords: string[];
  competitors: string[];
  negativeKeywords: string[];
  selectedModels: string[];
  searchType: 'quick' | 'deep';
  intervalMinutes: number;
  enabled: boolean;
};

function normalizeCsv(input: string) {
  return input
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function platformNameToModelKey(name: string) {
  const s = (name || '').toLowerCase();
  if (s.includes('deepseek')) return 'DeepSeek';
  if (s.includes('豆包')) return '豆包';
  if (s.includes('腾讯元宝') || s.includes('元宝')) return '腾讯元宝';
  if (s.includes('文心')) return '文心';
  if (s.includes('千问')) return '通义千问';
  if (s.includes('百度')) return '百度AI';
  if (s.includes('kimi')) return 'Kimi';
  return name;
}

export const ConfigModal = ({
  isOpen,
  onClose,
  project,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  project?: MonitoringProject | null;
  onSaved?: (project: MonitoringProject) => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState<BillingPricing | null>(null);

  const [brandName, setBrandName] = useState('');
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState('');
  const [monitorKeywords, setMonitorKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [competitorsText, setCompetitorsText] = useState('');
  const [negativeText, setNegativeText] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [searchType, setSearchType] = useState<'quick' | 'deep'>('quick');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    getBillingPricing().then(setPricing);

    const p = project || null;
    setBrandName(p?.brandName || '微盛网络');
    setBrandWebsiteUrl(p?.brandWebsiteUrl || 'https://www.wshoto.com');
    setMonitorKeywords(
      Array.isArray(p?.monitorKeywords) && p!.monitorKeywords.length > 0 ? p!.monitorKeywords : ['小程序开发', 'SCRM系统', '私域流量']
    );
    setCompetitorsText((Array.isArray(p?.competitors) ? p!.competitors : ['有赞', '微盟']).join(', '));
    setNegativeText((Array.isArray(p?.negativeKeywords) ? p!.negativeKeywords : ['招聘', '兼职', '实习']).join(', '));
    setSelectedModels(Array.isArray(p?.selectedModels) && p!.selectedModels.length > 0 ? p!.selectedModels : ['豆包', 'DeepSeek', '腾讯元宝']);
    setIntervalMinutes(typeof p?.intervalMinutes === 'number' ? p!.intervalMinutes : 1440);
    setSearchType(p?.searchType === 'deep' ? 'deep' : 'quick');
    setKeywordInput('');
  }, [isOpen, project?.id]);

  const costPreview = useMemo(() => {
    const perTask = estimateCostUnits({ models: selectedModels, searchType, pricing });
    if (perTask === null) return null;
    const perDayRuns = Math.max(1, Math.round((24 * 60) / Math.max(5, intervalMinutes)));
    const daily = perTask * Math.max(1, monitorKeywords.length) * perDayRuns;
    return { perTask, perDayRuns, daily: Math.max(0, Math.round(daily)) };
  }, [intervalMinutes, monitorKeywords.length, pricing, searchType, selectedModels]);

  const togglePlatform = (platformName: string) => {
    const modelKey = platformNameToModelKey(platformName);
    setSelectedModels((prev) => {
      const has = prev.includes(modelKey);
      const next = has ? prev.filter((m) => m !== modelKey) : [...prev, modelKey];
      return Array.from(new Set(next));
    });
  };

  const removeKeyword = (kw: string) => setMonitorKeywords((prev) => prev.filter((k) => k !== kw));
  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw) return;
    setMonitorKeywords((prev) => Array.from(new Set([...prev, kw])).slice(0, 50));
    setKeywordInput('');
  };

  const saveAndRun = async () => {
    const bn = brandName.trim();
    if (!bn) return setError('品牌名称不能为空');
    if (monitorKeywords.length === 0) return setError('请至少添加 1 个监测关键词');
    if (selectedModels.length === 0) return setError('请至少选择 1 个监测平台/模型');

    setSaving(true);
    setError('');
    try {
      const payload = {
        brandName: bn,
        brandWebsiteUrl: brandWebsiteUrl.trim() || null,
        monitorKeywords,
        competitors: normalizeCsv(competitorsText),
        negativeKeywords: normalizeCsv(negativeText),
        selectedModels,
        searchType,
        intervalMinutes,
        enabled: true,
      };

      const saved = project?.id
        ? await apiJson(`/api/monitoring/projects/${project.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await apiJson('/api/monitoring/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!saved.res.ok) {
        setError(apiErrorToMessage(saved.data, `保存失败（HTTP ${saved.res.status}）`));
        return;
      }

      const savedProject = saved.data as MonitoringProject;

      // B 方案：保存后立即跑一轮任务
      const runRes = await apiJson(`/api/monitoring/projects/${savedProject.id}/run`, { method: 'POST' });
      if (!runRes.res.ok) {
        setError(apiErrorToMessage(runRes.data, `启动失败（HTTP ${runRes.res.status}）`));
        if (onSaved) onSaved(savedProject);
        return;
      }

      if (onSaved) onSaved(savedProject);
      onClose();
    } catch (e: any) {
      setError(e?.message || '网络错误');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl animate-scale-in border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-brand-purple">品牌监控配置</h2>
          </div>
          <div className="absolute right-6 top-4 flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs font-medium text-gray-600">
              <span className="font-bold">A</span> 1 购买
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-8 py-4 border-b border-gray-100 text-sm">
          <div className="font-bold text-gray-900 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-brand-purple text-white flex items-center justify-center text-xs">1</div>
            基本信息
          </div>
          <div className="text-gray-300">{'>>>'}</div>
          <div className="font-bold text-gray-900 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-brand-purple text-white flex items-center justify-center text-xs">2</div>
            关键词配置
          </div>
          <div className="text-gray-300">{'>>>'}</div>
          <div className="text-gray-400 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs">3</div>
            开始监测
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-4 py-3 flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-l-4 border-brand-purple pl-3">品牌基础信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  <span className="text-red-500 mr-1">*</span>品牌名称
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="请输入品牌名称"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-brand-purple focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                  />
                  <div className="absolute left-3.5 top-2.5 text-gray-400">
                    <FileText size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">品牌官网URL</label>
                <div className="relative">
                  <input
                    type="text"
                    value={brandWebsiteUrl}
                    onChange={(e) => setBrandWebsiteUrl(e.target.value)}
                    placeholder="请输入官网地址"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-brand-purple focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                  />
                  <div className="absolute left-3.5 top-2.5 text-gray-400">
                    <LinkIcon size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Keywords */}
          <div className="space-y-4 pt-4 border-t border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 border-l-4 border-brand-purple pl-3">监测关键词配置</h3>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label className="text-xs font-bold text-gray-700 mb-2 block">核心监测词 (Core Keywords)</label>
              <div className="flex flex-wrap gap-2">
                {monitorKeywords.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1.5 hover:border-brand-purple hover:text-brand-purple transition-all cursor-pointer"
                  >
                    {tag}
                    <X size={12} className="text-gray-300 hover:text-red-500" onClick={() => removeKeyword(tag)} />
                  </span>
                ))}
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  type="text"
                  placeholder="输入回车添加..."
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-brand-purple"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">系统会按频率自动创建任务，并沉淀提及/情感/收录情况。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Target size={14} /> 竞品对标 (Competitors)
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg bg-gray-50">
                    <Target size={16} className="text-gray-400" />
                    <input
                      type="text"
                      value={competitorsText}
                      onChange={(e) => setCompetitorsText(e.target.value)}
                      placeholder="如：有赞, 微盟"
                      className="bg-transparent outline-none text-sm w-full"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Users size={14} /> 排除词 (Negative Keywords)
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg bg-gray-50">
                    <Users size={16} className="text-gray-400" />
                    <input
                      type="text"
                      value={negativeText}
                      onChange={(e) => setNegativeText(e.target.value)}
                      placeholder="如：招聘, 兼职, 实习"
                      className="bg-transparent outline-none text-sm w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Platforms */}
          <div className="space-y-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 border-l-4 border-brand-purple pl-3">监测平台范围</h3>
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setSelectedModels(Array.from(new Set(MONITOR_PLATFORMS.map((p) => platformNameToModelKey(p.name)))).slice(0, 8))}
              >
                <div className="w-4 h-4 bg-brand-purple rounded flex items-center justify-center text-white">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span className="text-xs font-bold text-brand-purple">全选主流引擎</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {MONITOR_PLATFORMS.map((platform, idx) => {
                const modelKey = platformNameToModelKey(platform.name);
                const enabled = selectedModels.includes(modelKey);
                return (
                  <div
                    key={idx}
                    onClick={() => togglePlatform(platform.name)}
                    className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 hover:border-brand-purple cursor-pointer transition-all bg-white relative overflow-hidden group"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        enabled ? 'bg-brand-purple border-brand-purple text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {enabled && <Check size={10} strokeWidth={3} />}
                    </div>
                    <img src={platform.icon} className="w-5 h-5 rounded-full" alt={platform.name} />
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{platform.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-gray-50">
            <div className="text-xs font-bold text-gray-700">监测频率</div>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-brand-purple outline-none"
            >
              <option value={60}>每小时</option>
              <option value={360}>每 6 小时</option>
              <option value={720}>每 12 小时</option>
              <option value={1440}>每天</option>
            </select>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] text-gray-400">
                扣费按「关键词数量 × 所选模型单价 × 倍率」累计；倍率由后台配置。
              </div>
              <button
                type="button"
                onClick={() => setSearchType((p) => (p === 'deep' ? 'quick' : 'deep'))}
                className="text-[10px] font-bold text-brand-purple hover:underline flex items-center gap-1"
              >
                <RefreshCw size={12} /> 切换{searchType === 'deep' ? '快速' : '深度'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-xl">
          <div className="text-xs text-gray-500">
            预计消耗 <span className="font-bold text-gray-900">{costPreview ? costPreview.daily : '--'}</span> 次/天
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={saveAndRun}
              disabled={saving}
              className="bg-brand-purple hover:bg-brand-hover text-white font-bold py-2.5 px-8 rounded-lg transition-all shadow-lg shadow-purple-200 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} /> {saving ? '启动中...' : '启动监测'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
