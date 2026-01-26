import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, BarChart3, ArrowRight, Settings, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiJson } from '../services/api';
import { useTasks } from '../contexts/TaskContext';
import { MyBrandMentionsPanel } from '../components/MyBrandMentionsPanel';

type BillingSummary = {
  usageDate: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  dailyLimit: number;
  usedUnits: number;
  remainingUnits: number;
};

type Insights = {
  rangeDays: number;
  tasks: { total: number; last7d: number; quick: number; deep: number };
  cost: { costUnits7d: number; quotaUnits7d: number; pointsUnits7d: number };
  modelUsage: Record<string, number>;
  brandMentions: {
    sentimentCounts: { positive: number; negative: number; neutral: number };
    topOwn: { keyword: string; count: number }[];
    topCompetitors: { keyword: string; count: number }[];
  };
};

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, restoreTask, activeTaskId } = useTasks();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiJson<BillingSummary>('/api/billing/summary')
      .then(({ res, data }) => {
        if (!res.ok) return;
        setSummary(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setInsightsLoading(true);
    apiJson<Insights>('/api/me/insights')
      .then(({ res, data }) => {
        if (!res.ok) return;
        setInsights(data);
      })
      .finally(() => setInsightsLoading(false));
  }, []);

  const planLabel = useMemo(() => {
    if (!summary?.plan) return '-';
    if (summary.plan === 'FREE') return '免费版';
    if (summary.plan === 'PRO') return '开发者版';
    return '企业版';
  }, [summary?.plan]);

  if (!user) return null;

  return (
    <div className="flex-1 px-6 relative z-10 pb-20 pt-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">个人中心</h1>
            <div className="text-sm text-gray-500 mt-1">
              {user.name || user.email} · <span className="font-bold text-gray-700">{planLabel}</span>
            </div>
          </div>
          {user.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
            >
              <Settings size={16} /> 后台管理 <ArrowRight size={16} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-500">当前套餐</div>
              <CreditCard size={18} className="text-brand-purple" />
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mt-2">{planLabel}</div>
            <button
              onClick={() => navigate('/pricing')}
              className="mt-4 w-full bg-purple-50 text-brand-purple border border-purple-100 py-2 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors"
            >
              查看/升级方案
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-500">今日次数</div>
              <BarChart3 size={18} className="text-green-600" />
            </div>
            <div className="mt-2">
              {loading ? (
                <div className="text-sm text-gray-400">加载中...</div>
              ) : summary ? (
                <>
                  <div className="text-2xl font-extrabold text-gray-900 tabular-nums">
                    {summary.remainingUnits} <span className="text-sm font-medium text-gray-400">剩余</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 tabular-nums">
                    已用 {summary.usedUnits} / {summary.dailyLimit} · {summary.usageDate} (Asia/Shanghai)
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">暂无数据</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-xs font-bold text-gray-500">快捷入口</div>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => navigate('/results')}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 transition-colors"
              >
                我的任务 / 结果 <span className="text-gray-400 font-medium">→</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 transition-colors"
              >
                发起新任务 <span className="text-gray-400 font-medium">→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm font-bold text-gray-900 mb-2">说明</div>
          <div className="text-sm text-gray-500 leading-relaxed">
            当前计费按「所选模型单价 × 数量 × 搜索倍率」扣除。深度搜索倍率默认为 2；所有模型默认单价为 1，可在后台配置中调整。
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-gray-900">近 {insights?.rangeDays || 7} 天沉淀</div>
            <button onClick={() => navigate('/results')} className="text-xs font-bold text-brand-purple hover:underline">
              去看任务 →
            </button>
          </div>
          {insightsLoading ? (
            <div className="text-sm text-gray-400">加载中...</div>
          ) : insights ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs font-bold text-gray-500">任务</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 tabular-nums">{insights.tasks.last7d}</div>
                <div className="text-xs text-gray-500 mt-1 tabular-nums">
                  快速 {insights.tasks.quick} · 深度 {insights.tasks.deep}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs font-bold text-gray-500">消耗</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 tabular-nums">{insights.cost.costUnits7d}</div>
                <div className="text-xs text-gray-500 mt-1 tabular-nums">
                  免费抵扣 {insights.cost.quotaUnits7d} · 扣点 {insights.cost.pointsUnits7d}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs font-bold text-gray-500">品牌提及（Top）</div>
                <div className="mt-2 space-y-1">
                  {(insights.brandMentions.topOwn || []).length === 0 ? (
                    <div className="text-xs text-gray-400">暂无（先去结果页添加品牌词）</div>
                  ) : (
                    (insights.brandMentions.topOwn || []).slice(0, 3).map((i) => (
                      <div key={i.keyword} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700 truncate">{i.keyword}</span>
                        <span className="font-mono text-gray-500 tabular-nums">{i.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">暂无数据</div>
          )}
        </div>

        <div className="mt-6">
          <MyBrandMentionsPanel />
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">我的任务</div>
            <div className="text-xs text-gray-500 tabular-nums">{tasks.length} 条</div>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">暂无任务，先去首页发起一次搜索吧。</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tasks.slice(0, 10).map((t) => (
                <div key={t.id} className="p-5 flex items-start gap-4 hover:bg-gray-50/60 transition-colors">
                  <div className="mt-0.5">
                    {t.status === 'running' || t.status === 'pending' ? (
                      <Loader2 size={18} className="text-brand-purple animate-spin" />
                    ) : t.status === 'failed' ? (
                      <XCircle size={18} className="text-red-500" />
                    ) : (
                      <CheckCircle2 size={18} className="text-green-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-gray-900 truncate">{t.keyword}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-white">
                        {t.searchType === 'deep' ? '深度' : '快速'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-100 text-brand-purple bg-purple-50 tabular-nums">
                        -{t.costUnits} 次
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 tabular-nums">
                      {t.usageDate ? `${t.usageDate} (Asia/Shanghai)` : ''} · {t.selectedModels.join('、')}
                    </div>
                    {(t.status === 'running' || t.status === 'pending') && t.logs?.length > 0 && (
                      <div className="text-xs text-gray-400 mt-2 truncate">{t.logs[t.logs.length - 1]}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        restoreTask(t.id);
                        navigate('/results');
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        activeTaskId === t.id
                          ? 'bg-brand-purple text-white border-brand-purple'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      查看
                    </button>
                    <div className="text-[10px] font-bold text-gray-400 px-2">永久保留</div>
                  </div>
                </div>
              ))}

              {tasks.length > 10 && (
                <div className="p-4 text-center">
                  <button
                    onClick={() => navigate('/results')}
                    className="text-sm font-bold text-brand-purple hover:underline"
                  >
                    查看全部任务 →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
