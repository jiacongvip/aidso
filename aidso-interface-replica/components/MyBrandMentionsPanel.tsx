import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandKeywordModal } from './BrandKeywordModal';
import { useTasks } from '../contexts/TaskContext';
import { apiFetch, apiJson } from '../services/api';

type BrandKeyword = {
  id: number;
  keyword: string;
  aliases: string[];
  category: string | null;
  isOwn: boolean;
  color?: string | null;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { mentions: number };
};

type BrandMention = {
  id: number;
  brandKeywordId: number;
  taskId: string;
  modelKey: string;
  mentionCount: number;
  rank: number | null;
  sentiment: 'positive' | 'negative' | 'neutral' | string | null;
  context: string | null;
  createdAt: string;
};

type MentionsResponse = {
  keyword: BrandKeyword;
  mentions: BrandMention[];
  stats: {
    totalMentions: number;
    avgRank: number | null;
    sentimentCounts: { positive: number; negative: number; neutral: number };
  };
};

function formatDateTime(input: string) {
  if (!input) return '-';
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return input;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  } catch {
    return input;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toMessage(data: any, fallback: string) {
  const raw = data?.error ?? data?.message;
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

export const MyBrandMentionsPanel = () => {
  const navigate = useNavigate();
  const { restoreTask } = useTasks();

  const [keywords, setKeywords] = useState<BrandKeyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [keywordsError, setKeywordsError] = useState('');

  const [selectedKeywordId, setSelectedKeywordId] = useState<number | null>(null);

  const [mentions, setMentions] = useState<MentionsResponse | null>(null);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const [mentionsError, setMentionsError] = useState('');

  const [showKeywordModal, setShowKeywordModal] = useState(false);

  const [q, setQ] = useState('');
  const [modelKey, setModelKey] = useState('');
  const [sentiment, setSentiment] = useState<'ALL' | 'positive' | 'neutral' | 'negative'>('ALL');

  const loadKeywords = async () => {
    setKeywordsLoading(true);
    setKeywordsError('');
    try {
      const { res, data } = await apiJson<BrandKeyword[]>('/api/brand-keywords');
      if (!res.ok) {
        setKeywords([]);
        setKeywordsError(toMessage(data, '加载失败'));
        return;
      }
      const next = Array.isArray(data) ? data : [];
      setKeywords(next);
    } catch (err: any) {
      setKeywords([]);
      setKeywordsError(err?.message || '加载失败');
    } finally {
      setKeywordsLoading(false);
    }
  };

  const loadMentions = async (id: number) => {
    setMentionsLoading(true);
    setMentionsError('');
    try {
      const { res, data } = await apiJson<MentionsResponse>(`/api/brand-keywords/${id}/mentions`);
      if (!res.ok) {
        setMentions(null);
        setMentionsError(toMessage(data, '加载失败'));
        return;
      }
      setMentions(data || null);
    } catch (err: any) {
      setMentions(null);
      setMentionsError(err?.message || '加载失败');
    } finally {
      setMentionsLoading(false);
    }
  };

  useEffect(() => {
    loadKeywords();
  }, []);

  useEffect(() => {
    if (keywordsLoading) return;
    if (keywords.length === 0) {
      setSelectedKeywordId(null);
      setMentions(null);
      return;
    }
    if (selectedKeywordId && keywords.some((k) => k.id === selectedKeywordId)) return;
    setSelectedKeywordId(keywords[0].id);
  }, [keywords, keywordsLoading, selectedKeywordId]);

  useEffect(() => {
    if (!selectedKeywordId) {
      setMentions(null);
      return;
    }
    loadMentions(selectedKeywordId);
  }, [selectedKeywordId]);

  const availableModels = useMemo(() => {
    const list = mentions?.mentions || [];
    const set = new Set<string>();
    for (const m of list) if (m?.modelKey) set.add(m.modelKey);
    return Array.from(set).sort();
  }, [mentions?.mentions]);

  const filteredMentions = useMemo(() => {
    const list = mentions?.mentions || [];
    const qq = q.trim().toLowerCase();
    return list.filter((m) => {
      if (modelKey && m.modelKey !== modelKey) return false;
      if (sentiment !== 'ALL' && String(m.sentiment || '').toLowerCase() !== sentiment) return false;
      if (qq) {
        const hay = `${m.taskId} ${m.modelKey} ${m.context || ''}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [mentions?.mentions, modelKey, q, sentiment]);

  const activeKeyword = useMemo(() => {
    if (!selectedKeywordId) return null;
    return keywords.find((k) => k.id === selectedKeywordId) || null;
  }, [keywords, selectedKeywordId]);

  const exportMentionsCsv = async () => {
    if (!selectedKeywordId) return;
    const res = await apiFetch(`/api/brand-keywords/${selectedKeywordId}/mentions.csv`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      alert(`导出失败（HTTP ${res.status}）${text ? `：${text.slice(0, 200)}` : ''}`);
      return;
    }
    const blob = await res.blob();
    downloadBlob(blob, `brand_mentions_${selectedKeywordId}_${Date.now()}.csv`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-bold text-brand-purple flex items-center gap-2">
            <Tag size={14} />
            品牌沉淀（基于你的任务结果）
          </div>
          <div className="text-sm text-gray-500 mt-1">
            自动从你已完成的任务中匹配品牌词（含别名），沉淀「提及次数 / 情感 / 上下文 / 模型来源」。
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadKeywords()}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} /> 刷新
          </button>
          <button
            onClick={() => setShowKeywordModal(true)}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            管理品牌词
          </button>
          <button
            onClick={exportMentionsCsv}
            disabled={!selectedKeywordId}
            className="px-4 py-2 rounded-xl bg-brand-purple text-white text-sm font-bold hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download size={16} /> 导出 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left: keyword list */}
        <div className="lg:col-span-4 xl:col-span-3 border-b lg:border-b-0 lg:border-r border-gray-100">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">品牌词</div>
            <div className="text-xs text-gray-500 tabular-nums">{keywords.length} 个</div>
          </div>

          {keywordsLoading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl"></div>
              ))}
            </div>
          ) : keywordsError ? (
            <div className="p-5 text-sm text-red-600 bg-red-50 border-t border-red-100">{keywordsError}</div>
          ) : keywords.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-bold text-gray-900">还没有品牌词</div>
              <div className="text-sm text-gray-500 mt-1">先添加你要追踪的品牌词（支持别名、竞品）。</div>
              <button
                onClick={() => setShowKeywordModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-purple text-white text-sm font-bold hover:bg-brand-hover transition-colors"
              >
                立即添加
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {keywords.map((k) => {
                const active = k.id === selectedKeywordId;
                const mentionCount = k._count?.mentions ?? 0;
                return (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKeywordId(k.id)}
                    className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                      active ? 'bg-purple-50/60' : 'bg-white'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: k.color || (k.isOwn ? '#7c3aed' : '#ef4444') }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-gray-900 truncate">{k.keyword}</div>
                        {!k.enabled && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-white">
                            已停用
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        别名：{Array.isArray(k.aliases) && k.aliases.length > 0 ? k.aliases.join('、') : '无'}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-gray-700 tabular-nums">{mentionCount}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: mentions */}
        <div className="lg:col-span-8 xl:col-span-9 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">
                {activeKeyword ? `提及记录 · ${activeKeyword.keyword}` : '提及记录'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">展示最近 100 条提及（可检索/筛选/导出）</div>
            </div>
            <button
              onClick={() => selectedKeywordId && loadMentions(selectedKeywordId)}
              disabled={!selectedKeywordId || mentionsLoading}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw size={14} className={mentionsLoading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>

          {!selectedKeywordId ? (
            <div className="py-10 text-center text-sm text-gray-500">请先在左侧选择一个品牌词。</div>
          ) : mentionsLoading ? (
            <div className="py-10 text-center text-sm text-gray-400">加载中...</div>
          ) : mentionsError ? (
            <div className="mt-4 p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">{mentionsError}</div>
          ) : !mentions ? (
            <div className="py-10 text-center text-sm text-gray-500">暂无数据</div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <div className="text-xs font-bold text-gray-500">总提及次数</div>
                  <div className="text-2xl font-extrabold text-gray-900 mt-1 tabular-nums">
                    {mentions.stats?.totalMentions ?? 0}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <div className="text-xs font-bold text-gray-500">平均推荐排名</div>
                  <div className="text-2xl font-extrabold text-gray-900 mt-1 tabular-nums">{mentions.stats?.avgRank ?? '-'}</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <div className="text-xs font-bold text-gray-500">情感分布</div>
                  <div className="text-sm font-bold text-gray-900 mt-2 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs">
                      正面 {mentions.stats?.sentimentCounts?.positive ?? 0}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-xs">
                      中性 {mentions.stats?.sentimentCounts?.neutral ?? 0}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs">
                      负面 {mentions.stats?.sentimentCounts?.negative ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-5 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="搜索 taskId / 模型 / 上下文..."
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                  />
                </div>
                <select
                  value={modelKey}
                  onChange={(e) => setModelKey(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple"
                >
                  <option value="">全部模型</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={sentiment}
                  onChange={(e) => setSentiment(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple"
                >
                  <option value="ALL">全部情感</option>
                  <option value="positive">正面</option>
                  <option value="neutral">中性</option>
                  <option value="negative">负面</option>
                </select>
                <div className="text-xs text-gray-500 tabular-nums md:ml-auto">{filteredMentions.length} 条</div>
              </div>

              {/* List */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="py-2.5 px-2 text-left font-bold">时间</th>
                      <th className="py-2.5 px-2 text-left font-bold">模型</th>
                      <th className="py-2.5 px-2 text-left font-bold">次数</th>
                      <th className="py-2.5 px-2 text-left font-bold">情感</th>
                      <th className="py-2.5 px-2 text-left font-bold">上下文</th>
                      <th className="py-2.5 px-2 text-right font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMentions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                          没有匹配的记录
                        </td>
                      </tr>
                    ) : (
                      filteredMentions.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-2 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                            {formatDateTime(m.createdAt)}
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-50 text-brand-purple border border-purple-100">
                              {m.modelKey}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-gray-700 font-bold tabular-nums">{m.mentionCount}</td>
                          <td className="py-3 px-2">
                            {String(m.sentiment || '').toLowerCase() === 'positive' ? (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                正面
                              </span>
                            ) : String(m.sentiment || '').toLowerCase() === 'negative' ? (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                                负面
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                中性
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-gray-700">
                            <div className="max-w-[520px] truncate">{m.context || '-'}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-1 truncate">{m.taskId}</div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => {
                                restoreTask(m.taskId);
                                navigate('/results');
                              }}
                              className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
                            >
                              查看任务
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <BrandKeywordModal
        isOpen={showKeywordModal}
        onClose={() => {
          setShowKeywordModal(false);
          loadKeywords();
        }}
      />
    </div>
  );
};

