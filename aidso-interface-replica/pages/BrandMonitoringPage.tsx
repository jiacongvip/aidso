import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
    Home, PieChart, BookOpen, Link, MessageCircle, History, Settings, Plus, ChevronDown, 
    Calendar, HelpCircle, ChevronRight, Activity, BarChart3, ThumbsUp, TrendingUp, 
    ArrowUpRight, ArrowDownRight, Globe, Zap, FileText, Search, Filter, AlertTriangle,
    Save, Tag, Users, Target, Download, Share2, X, MoreHorizontal, LayoutGrid, RefreshCw
} from 'lucide-react';
import { ConfigModal, type MonitoringProject } from '../components/ConfigModal';
import { AddTrackingModal } from '../components/AddTrackingModal';
import { BrandMonitoringSkeleton } from '../components/BrandMonitoringSkeleton';
import { MONITOR_PLATFORMS, BRANDS } from '../data';
import { apiErrorToMessage, apiJson } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../contexts/TaskContext';

type MonitoringMetricsResponse = {
    project: {
        id: string;
        brandName: string;
        enabled: boolean;
        searchType: 'quick' | 'deep';
        intervalMinutes: number;
        lastRunAt: string | null;
        nextRunAt: string | null;
        lastError: string | null;
    };
    rangeDays: number;
    metrics: {
        score: number;
        mentionRate: number;
        avgRank: number | null;
        weeklyMentions: number;
        positiveRatio: number;
        sentimentCounts: { positive: number; negative: number; neutral: number };
    };
    trend?: { date: string; tasks: number; mentions: number }[];
    modelStats?: { modelKey: string; runs: number; mentions: number; mentionRate: number }[];
    competitors: { keyword: string; count: number }[];
    recentTasks: { id: string; createdAt: string; status: string; keyword: string }[];
};

type MonitoringKeywordStatsResponse = {
    rangeDays: number;
    items: {
        keyword: string;
        taskCount: number;
        models: Record<string, { mentions: number; avgRank: number | null }>;
    }[];
};

type MonitoringAlertsResponse = {
    rangeDays?: number;
    items: { id: string; taskId: string; modelKey: string; mentionCount?: number; sentiment?: string | null; context: string | null; createdAt: string }[];
};

type WorksReportResponse = {
    rangeDays: number;
    items: {
        id: string;
        title: string;
        url: string;
        enabled: boolean;
        mentionCount: number;
        lastSeenAt: string | null;
        sample: any;
    }[];
};

type MonitoringTask = any;

// --- Widget Components (Reused in Dashboard) ---

const ScoreWidget = ({ score }: { score: number }) => {
    const s = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
    const circumference = 477;
    const dashOffset = Math.round(circumference - (circumference * s) / 100);
    return (
    <div className="flex flex-col items-center justify-center h-full relative py-2">
        <div className="relative w-40 h-40 flex-shrink-0">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 176 176">
                <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.3"/>
                    </filter>
                </defs>
                {/* Track */}
                <circle cx="88" cy="88" r="76" fill="none" stroke="#f3f4f6" strokeWidth="12" strokeLinecap="round" />
                {/* Progress */}
                <circle 
                    cx="88" cy="88" r="76" 
                    fill="none" 
                    stroke="url(#scoreGradient)" 
                    strokeWidth="12" 
                    strokeDasharray="477" 
                    strokeDashoffset={dashOffset} 
                    strokeLinecap="round" 
                    className="transition-all duration-1000 ease-out drop-shadow-sm" 
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-gray-900 tracking-tighter">{s}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">GEO Score</span>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-xs font-bold text-green-600 border border-green-100 mt-4 shadow-sm">
            <TrendingUp size={12} />
            <span>较上周 +12%</span>
        </div>
        <div className="text-xs text-gray-400 mt-3 text-center leading-relaxed">
            表现优异：<span className="text-gray-700 font-bold bg-gray-50 px-1 rounded">SCRM</span> 领域
        </div>
    </div>
);
};

type RankWidgetItem = { kw: string; engine: string; rank: number | null; change?: number };

const RankWidget = ({
    items,
    total,
    onViewAll,
}: {
    items: RankWidgetItem[];
    total: number;
    onViewAll?: () => void;
}) => (
    <div className="h-full flex flex-col">
        <div className="space-y-3 flex-1 overflow-auto pr-2 custom-scrollbar">
            {(items || []).length === 0 ? (
                <div className="text-xs text-gray-400 py-6 text-center">暂无数据（请先运行一次品牌监测）。</div>
            ) : (
                (items || []).slice(0, 5).map((item, idx) => {
                    const rankNum = typeof item.rank === 'number' && Number.isFinite(item.rank) ? item.rank : null;
                    const displayRank = rankNum === null ? '-' : String(Math.round(rankNum));
                    const progress = Math.max(8, Math.min(100, 100 - (rankNum === null ? 9 : rankNum) * 10));
                    const change = typeof item.change === 'number' ? item.change : 0;
                    return (
                        <div
                            key={`${item.kw}-${idx}`}
                            className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm border ${
                                        rankNum !== null && rankNum <= 3
                                            ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200'
                                            : 'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}
                                >
                                    {displayRank}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-bold text-gray-800 truncate">{item.kw}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500 font-medium">
                                            {item.engine || '-'}
                                        </span>
                                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-[50px]">
                                            <div className="bg-brand-purple h-full rounded-full opacity-80" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right ml-2">
                                <div
                                    className={`text-xs font-bold flex items-center justify-end gap-1 ${
                                        change > 0
                                            ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded'
                                            : change < 0
                                              ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded'
                                              : 'text-gray-300'
                                    }`}
                                >
                                    {change !== 0 ? (change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />) : null}
                                    {change !== 0 ? Math.abs(change) : '-'}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
        <div className="mt-2 text-center pt-2 border-t border-gray-50">
            <button
                onClick={onViewAll}
                disabled={!onViewAll}
                className="text-xs text-gray-500 hover:text-brand-purple disabled:text-gray-300 font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
            >
                查看全部 {total || 0} 个关键词 <ChevronRight size={12} />
            </button>
        </div>
    </div>
);

const MentionsWidget = ({
    trend,
    totalMentions,
    rangeDays,
    onSelectDate,
}: {
    trend: { date: string; mentions: number }[];
    totalMentions: number;
    rangeDays: number;
    onSelectDate?: (date: string) => void;
}) => {
    const safeTrend = useMemo(() => {
        const points = Array.isArray(trend) ? trend.slice(-7) : [];
        if (points.length > 0) return points;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const generated = Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(today.getTime() - (6 - idx) * 24 * 60 * 60 * 1000);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return { date: `${y}-${m}-${day}`, mentions: 0 };
        });
        return generated;
    }, [trend]);

    const maxDaily = Math.max(0, ...safeTrend.map((p) => (typeof p.mentions === 'number' ? p.mentions : 0)));
    const max = Math.max(1, maxDaily);

    return (
        <div className="h-full flex flex-col justify-end pb-2">
            <div className="flex items-end justify-between gap-3 h-48 pb-4">
                {safeTrend.map((p, i) => {
                    const cnt = typeof p.mentions === 'number' ? p.mentions : 0;
                    const h = Math.round((cnt / max) * 100);
                    const label = p.date ? p.date.slice(5) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] || '-';
                    return (
                        <div
                            key={`${p.date || i}`}
                            className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                            onClick={() => onSelectDate && p.date ? onSelectDate(p.date) : null}
                        >
                            <div className="w-full relative h-full flex items-end">
                                <div
                                    className="w-full bg-gradient-to-t from-purple-100 to-purple-300 rounded-t-md relative transition-all duration-300 group-hover:from-brand-purple group-hover:to-purple-500"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none z-10">
                                        {cnt}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-brand-purple">
                        <Activity size={16} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400">近 {rangeDays} 天总提及</div>
                        <div className="text-sm font-bold text-gray-900">{Number.isFinite(totalMentions) ? totalMentions : 0} 次</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400">最高单日</div>
                    <div className="text-sm font-bold text-gray-900 flex items-center justify-end gap-1 tabular-nums">
                        {maxDaily}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TrendWidget = ({
    items,
    onSelectModel,
}: {
    items: { modelKey: string; mentionRate: number }[];
    onSelectModel?: (modelKey: string) => void;
}) => {
    const colors = ['bg-indigo-600', 'bg-blue-500', 'bg-green-500', 'bg-gray-800', 'bg-purple-600', 'bg-orange-500'];
    const rows = Array.isArray(items) && items.length > 0 ? items.slice(0, 6) : [];
    return (
        <div className="h-full flex flex-col justify-center space-y-5 px-2">
            {rows.length === 0 ? (
                <div className="text-xs text-gray-400 py-6 text-center">暂无数据（请先运行一次品牌监测）。</div>
            ) : (
                rows.map((item, i) => {
                    const val = Number.isFinite(item.mentionRate) ? Math.max(0, Math.min(100, item.mentionRate)) : 0;
                    const color = colors[i % colors.length];
                    return (
                        <div
                            key={`${item.modelKey}-${i}`}
                            className="group cursor-pointer"
                            onClick={() => (onSelectModel ? onSelectModel(item.modelKey) : null)}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-gray-700">{item.modelKey}</span>
                                <span className="text-xs font-mono text-gray-500 group-hover:text-gray-900 transition-colors">{val}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${color} opacity-80 group-hover:opacity-100 transition-opacity relative overflow-hidden`}
                                    style={{ width: `${val}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20"></div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
            <p className="mt-4 text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100 leading-relaxed">
                * 这里用「提及率」近似 SOV：模型成功输出中出现品牌的比例。
            </p>
        </div>
    );
};

const SourcesWidget = ({
    items,
    onViewAll,
}: {
    items: { title: string; url: string; mentionCount: number; lastSeenAt: string | null }[];
    onViewAll?: () => void;
}) => {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-gray-800', 'bg-purple-600', 'bg-orange-500'];
    return (
        <div className="space-y-3">
            {(items || []).length === 0 ? (
                <div className="text-xs text-gray-400 py-6 text-center">暂无数据（请先添加追踪作品并运行监测）。</div>
            ) : (
                (items || []).slice(0, 4).map((item, i) => {
                    let host = '-';
                    try {
                        host = new URL(item.url).host || '-';
                    } catch {
                        host = '-';
                    }
                    const icon = host && host !== '-' ? host.replace(/^www\\./, '').slice(0, 2).toUpperCase() : 'NA';
                    const color = colors[i % colors.length];
                    const lastSeen = item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleDateString() : '-';
                    return (
                        <div
                            key={`${item.url}-${i}`}
                            className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer bg-white group hover:border-purple-100"
                            onClick={() => window.open(item.url, '_blank')}
                        >
                            <div
                                className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0`}
                            >
                                {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="text-xs font-bold text-gray-800 truncate group-hover:text-brand-purple transition-colors">
                                        {item.title || item.url}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100">{host}</span>
                                    <span className="text-[10px] text-gray-400">最近命中 {lastSeen}</span>
                                    <span className="text-[9px] ml-auto px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        命中 {item.mentionCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
            {onViewAll && (
                <div className="pt-2">
                    <button onClick={onViewAll} className="text-xs text-brand-purple hover:underline font-bold">
                        查看全部
                    </button>
                </div>
            )}
        </div>
    );
};

type LogSnapshot = { platform: string; q: string; a: string; time?: string };

const LogsWidget = ({ items }: { items: LogSnapshot[] }) => (
    <div className="space-y-3">
        {(items || []).map((log, i) => (
            <div key={i} className="text-xs p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-default group">
                <div className="flex items-center gap-2 mb-3">
                    <img
                        src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                            (log.platform || 'AI').slice(0, 2)
                        )}&backgroundColor=3b82f6`}
                        className="w-5 h-5 rounded-full shadow-sm"
                        alt={log.platform}
                    />
                    <span className="font-bold text-gray-700">{log.platform}</span>
                    <span className="text-gray-300 text-[10px] ml-auto">{log.time || '-'}</span>
                </div>
                <div className="space-y-2">
                    <div className="flex gap-2">
                         <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold flex-shrink-0">Q</div>
                         <div className="text-gray-600 font-medium pt-0.5">{log.q}</div>
                    </div>
                    <div className="flex gap-2">
                         <div className="w-5 h-5 rounded-full bg-brand-purple/10 flex items-center justify-center text-[10px] text-brand-purple font-bold flex-shrink-0">A</div>
                         <div className="text-gray-800 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm leading-relaxed group-hover:border-purple-100 transition-colors">
                            {log.a}
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// --- Sub-Views ---

const DashboardView = ({
    project,
    metrics,
    keywordStats,
    worksReport,
    onOpenConfig,
    onRefresh,
    snapshots,
    onRunNow,
    runNowLoading,
    runNotice,
    onGoRank,
    onGoSources,
    lastRefreshAt,
    rangeDays,
    onChangeRangeDays,
    onDrilldownDate,
    onDrilldownModel,
}: {
    project: MonitoringProject | null;
    metrics: MonitoringMetricsResponse | null;
    keywordStats: MonitoringKeywordStatsResponse | null;
    worksReport: WorksReportResponse | null;
    onOpenConfig: () => void;
    onRefresh: () => void;
    snapshots: LogSnapshot[];
    onRunNow: () => void;
    runNowLoading: boolean;
    runNotice: { type: 'success' | 'error'; message: string } | null;
    onGoRank: () => void;
    onGoSources: () => void;
    lastRefreshAt: Date | null;
    rangeDays: number;
    onChangeRangeDays: (days: number) => void;
    onDrilldownDate: (date: string) => void;
    onDrilldownModel: (modelKey: string) => void;
}) => {
    const score = metrics?.metrics?.score ?? 0;
    const mentionRate = metrics?.metrics?.mentionRate ?? 0;
    const avgRank = metrics?.metrics?.avgRank;
    const weeklyMentions = metrics?.metrics?.weeklyMentions ?? 0;
    const positiveRatio = metrics?.metrics?.positiveRatio ?? 0;
    const projectMeta = metrics?.project || null;

    const enabled = (projectMeta?.enabled ?? (project as any)?.enabled) ? true : false;
    const intervalMinutes = projectMeta?.intervalMinutes ?? (project as any)?.intervalMinutes ?? null;
    const lastRunAt = projectMeta?.lastRunAt ?? (project as any)?.lastRunAt ?? null;
    const nextRunAt = projectMeta?.nextRunAt ?? (project as any)?.nextRunAt ?? null;
    const lastError = projectMeta?.lastError ?? (project as any)?.lastError ?? null;

    const formatTs = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : '-');
    const trackedWorksCount =
        (project as any)?._count?.trackedWorks ??
        (Array.isArray((project as any)?.trackedWorks) ? (project as any).trackedWorks.length : 0);
    const totalTasksCount = (project as any)?._count?.tasks ?? (Array.isArray(metrics?.recentTasks) ? metrics!.recentTasks.length : 0);
    const runningTasksCount = (metrics?.recentTasks || []).filter((t) => {
        const s = String(t?.status || '').toUpperCase();
        return s === 'PENDING' || s === 'RUNNING';
    }).length;
    const lastRefreshText = lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString() : '-';

    const rankPreview = useMemo(() => {
        const rows = (keywordStats?.items || []).slice();
        if (rows.length === 0) return [] as RankWidgetItem[];
        rows.sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0));
        return rows.slice(0, 5).map((row) => {
            const entries = Object.entries(row.models || {});
            const bestRank = entries
                .filter(([, v]) => typeof (v as any)?.avgRank === 'number' && Number.isFinite((v as any).avgRank))
                .sort((a, b) => ((a[1] as any).avgRank as number) - ((b[1] as any).avgRank as number))[0];
            const bestMentions = entries.sort((a, b) => ((b[1] as any).mentions || 0) - ((a[1] as any).mentions || 0))[0];
            const pick = bestRank || bestMentions;
            const engine = pick ? pick[0] : '-';
            const rank = pick && typeof (pick[1] as any)?.avgRank === 'number' ? ((pick[1] as any).avgRank as number) : null;
            return { kw: row.keyword, engine, rank, change: 0 };
        });
    }, [keywordStats]);

    const sourcesPreview = useMemo(() => {
        const rows = (worksReport?.items || []).slice();
        rows.sort((a, b) => {
            const mc = (b.mentionCount || 0) - (a.mentionCount || 0);
            if (mc !== 0) return mc;
            const at = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
            const bt = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
            return bt - at;
        });
        return rows.slice(0, 4);
    }, [worksReport]);

    const mentionsTrend = useMemo(() => {
        const t = metrics?.trend || [];
        return (Array.isArray(t) ? t : []).map((p) => ({ date: p.date, mentions: p.mentions }));
    }, [metrics?.trend]);

    const exportDashboardPdf = () => {
        const escapeHtml = (s: any) =>
            String(s ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\"/g, '&quot;')
                .replace(/'/g, '&#39;');

        const reportTitle = `${project?.brandName || '品牌监测'} 报告`;
        const nowText = new Date().toLocaleString();
        const modelStats = Array.isArray(metrics?.modelStats) ? metrics!.modelStats : [];
        const topKeywords = (keywordStats?.items || []).slice(0, 20);
        const topSources = (worksReport?.items || []).slice(0, 20);
        const competitors = (metrics?.competitors || []).slice(0, 20);

        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(reportTitle)}</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; color: #111827; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 6px; }
      .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 12px 0 18px; }
      .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
      .card .k { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
      .card .v { font-size: 18px; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0 18px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; vertical-align: top; }
      th { background: #f9fafb; text-align: left; }
      .section-title { font-size: 14px; font-weight: 800; margin: 18px 0 8px; }
      .muted { color: #6b7280; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(reportTitle)}</h1>
    <div class="meta">生成时间：${escapeHtml(nowText)} · 统计周期：近 ${escapeHtml(rangeDays)} 天 · 上次运行：${escapeHtml(
            formatTs(lastRunAt)
        )} · 下次运行：${escapeHtml(formatTs(nextRunAt))}</div>
    ${
        lastError
            ? `<div class="card" style="border-color:#fecaca;background:#fef2f2;color:#991b1b;margin-bottom:14px;"><div class="k">最近错误</div><div style="white-space:pre-wrap;">${escapeHtml(
                  lastError
              )}</div></div>`
            : ''
    }

    <div class="section-title">核心指标</div>
    <div class="grid">
      <div class="card"><div class="k">品牌综合得分</div><div class="v">${escapeHtml(score)}/100</div></div>
      <div class="card"><div class="k">全网提及率</div><div class="v">${escapeHtml(mentionRate)}%</div></div>
      <div class="card"><div class="k">平均推荐排名</div><div class="v">${escapeHtml(avgRank ?? '-')}</div></div>
      <div class="card"><div class="k">近 ${escapeHtml(rangeDays)} 天提及次数</div><div class="v">${escapeHtml(weeklyMentions)} 次</div></div>
      <div class="card"><div class="k">正面情感占比</div><div class="v">${escapeHtml(positiveRatio)}%</div></div>
      <div class="card"><div class="k">监测平台</div><div class="v">${escapeHtml(Array.isArray(project?.selectedModels) ? project!.selectedModels.length : 0)} 个</div></div>
    </div>

    <div class="section-title">各平台提及率（SOV近似）</div>
    <table>
      <thead><tr><th>平台</th><th>成功输出次数</th><th>提及次数</th><th>提及率</th></tr></thead>
      <tbody>
        ${
            modelStats.length === 0
                ? `<tr><td colspan="4" class="muted">暂无数据（请先运行一次监测）</td></tr>`
                : modelStats
                      .slice(0, 30)
                      .map(
                          (m) =>
                              `<tr><td>${escapeHtml(m.modelKey)}</td><td>${escapeHtml(m.runs)}</td><td>${escapeHtml(
                                  m.mentions
                              )}</td><td>${escapeHtml(m.mentionRate)}%</td></tr>`
                      )
                      .join('')
        }
      </tbody>
    </table>

    <div class="section-title">竞品提及 Top</div>
    <table>
      <thead><tr><th>竞品</th><th>提及次数</th></tr></thead>
      <tbody>
        ${
            competitors.length === 0
                ? `<tr><td colspan="2" class="muted">暂无数据</td></tr>`
                : competitors.map((c) => `<tr><td>${escapeHtml(c.keyword)}</td><td>${escapeHtml(c.count)}</td></tr>`).join('')
        }
      </tbody>
    </table>

    <div class="section-title">关键词（Top 20）</div>
    <table>
      <thead><tr><th>#</th><th>关键词</th><th>任务量</th></tr></thead>
      <tbody>
        ${
            topKeywords.length === 0
                ? `<tr><td colspan="3" class="muted">暂无数据</td></tr>`
                : topKeywords
                      .map((k, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(k.keyword)}</td><td>${escapeHtml(k.taskCount)}</td></tr>`)
                      .join('')
        }
      </tbody>
    </table>

    <div class="section-title">收录来源（Top 20）</div>
    <table>
      <thead><tr><th>#</th><th>标题</th><th>URL</th><th>命中次数</th><th>最近命中</th></tr></thead>
      <tbody>
        ${
            topSources.length === 0
                ? `<tr><td colspan="5" class="muted">暂无数据</td></tr>`
                : topSources
                      .map(
                          (w, idx) =>
                              `<tr><td>${idx + 1}</td><td>${escapeHtml(w.title)}</td><td>${escapeHtml(w.url)}</td><td>${escapeHtml(
                                  w.mentionCount
                              )}</td><td>${escapeHtml(w.lastSeenAt ? new Date(w.lastSeenAt).toLocaleString() : '-')}</td></tr>`
                      )
                      .join('')
        }
      </tbody>
    </table>
    <div class="meta">提示：可在浏览器打印对话框选择“另存为 PDF”。</div>
  </body>
</html>`;

        const w = window.open('', '_blank');
        if (!w) {
            alert('浏览器拦截了弹窗：请允许打开新窗口后再导出 PDF。');
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        try {
            w.focus();
        } catch {}
        setTimeout(() => {
            try {
                w.print();
            } catch {}
        }, 300);
    };

    const METRIC_CARDS = [
        { label: '品牌综合得分', value: String(score), sub: '/100', icon: <Activity size={18} className="text-brand-purple" />, bg: "bg-purple-50" },
        { label: '全网提及率', value: String(mentionRate), sub: '%', icon: <PieChart size={18} className="text-blue-500" />, bg: "bg-blue-50" },
        { label: '平均推荐排名', value: avgRank === null || avgRank === undefined ? '-' : String(avgRank), sub: '名', icon: <BarChart3 size={18} className="text-orange-500" />, bg: "bg-orange-50" },
        { label: '本周提及次数', value: String(weeklyMentions), sub: '次', icon: <MessageCircle size={18} className="text-green-500" />, bg: "bg-green-50" },
        { label: '正面情感占比', value: String(positiveRatio), sub: '%', icon: <ThumbsUp size={18} className="text-red-500" />, bg: "bg-red-50" },
    ];

    return (
        <div className="animate-fade-in pb-20">
             {/* Header Controls */}
	             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
	                <div>
	                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
	                        数据大盘
	                        <span className="text-xs font-normal text-white bg-green-500 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
	                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span> 实时
	                        </span>
	                    </h1>
	                    <p className="text-sm text-gray-400 mt-1 font-medium">
	                        实时追踪 <span className="text-gray-700 font-bold">"{project?.brandName || '未配置'}"</span> 在主流 AI 引擎中的表现
	                    </p>
	                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
	                        <span
	                            className={`px-2 py-1 rounded-full font-bold border ${
	                                enabled ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-200'
	                            }`}
	                        >
	                            {enabled ? '自动监测：已开启' : '自动监测：已暂停'}
	                        </span>
	                        <span className="px-2 py-1 rounded-full font-bold border bg-white text-gray-600 border-gray-200">
	                            频率：{intervalMinutes ? `${intervalMinutes} 分钟` : '-'}
	                        </span>
	                        <span className="px-2 py-1 rounded-full font-bold border bg-white text-gray-600 border-gray-200">
	                            上次运行：{formatTs(lastRunAt)}
	                        </span>
	                        <span className="px-2 py-1 rounded-full font-bold border bg-white text-gray-600 border-gray-200">
	                            下次运行：{formatTs(nextRunAt)}
	                        </span>
	                    </div>
	                    {lastError && (
	                        <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 whitespace-pre-wrap">
	                            <div className="font-bold flex items-center gap-2 mb-1">
	                                <AlertTriangle size={14} /> 最近错误
	                            </div>
	                            <div className="text-[11px] leading-relaxed">{lastError}</div>
	                        </div>
	                    )}
	                    {runNotice && (
	                        <div
	                            className={`mt-3 text-xs rounded-xl px-4 py-3 whitespace-pre-wrap border ${
	                                runNotice.type === 'success'
	                                    ? 'bg-green-50 text-green-700 border-green-100'
	                                    : 'bg-amber-50 text-amber-800 border-amber-200'
	                            }`}
	                        >
	                            <div className="font-bold flex items-center gap-2 mb-1">
	                                {runNotice.type === 'success' ? <ThumbsUp size={14} /> : <AlertTriangle size={14} />}
	                                {runNotice.type === 'success' ? '已提交运行' : '部分失败 / 需处理'}
	                            </div>
	                            <div className="text-[11px] leading-relaxed">{runNotice.message}</div>
	                        </div>
	                    )}
	                </div>
	                
	                <div className="flex flex-wrap items-center gap-3">
	                    <button 
	                        onClick={onOpenConfig}
	                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-gray-200 hover:shadow-xl active:scale-95"
	                    >
	                        <Plus size={14} /> 配置品牌
	                    </button>

	                    <button
	                        onClick={onRunNow}
	                        disabled={!project || runNowLoading}
	                        className="flex items-center gap-2 bg-brand-purple hover:bg-brand-hover disabled:bg-gray-200 disabled:text-gray-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-200 hover:shadow-purple-300 active:scale-95 disabled:shadow-none"
	                    >
	                        <RefreshCw size={14} className={runNowLoading ? 'animate-spin' : ''} />
	                        <span>立即运行</span>
	                    </button>

	                    <button
	                        onClick={exportDashboardPdf}
	                        disabled={!project}
	                        className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
	                    >
	                        <Download size={14} /> 导出 PDF
	                    </button>

	                    <button
	                        onClick={onRefresh}
	                        className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
	                    >
                        <RefreshCw size={14} className="text-gray-500" />
                        <span className="font-medium">刷新</span>
                    </button>
                    
                    <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
                        <LayoutGrid size={14} />
                        <span className="font-medium">
                            全部平台 ({Array.isArray(project?.selectedModels) ? project!.selectedModels.length : 0})
                        </span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </div>

	                    <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
	                        <Calendar size={14} />
	                        <select
	                            value={String(rangeDays)}
	                            onChange={(e) => onChangeRangeDays(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 7)))}
	                            className="font-medium bg-transparent outline-none cursor-pointer"
	                        >
	                            {[7, 14, 30].map((d) => (
	                                <option key={d} value={String(d)}>
	                                    近 {d} 天
	                                </option>
	                            ))}
	                        </select>
	                        <ChevronDown size={14} className="text-gray-400" />
	                    </div>
	                </div>
	            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {METRIC_CARDS.map((card, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[130px] hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 hover:-translate-y-1 relative group cursor-default">
                        <div className="flex justify-between items-start mb-3">
                             <div className={`p-2.5 rounded-xl ${card.bg} transition-transform group-hover:scale-110`}>
                                {card.icon}
                             </div>
                             {idx === 0 && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold">Hot</span>}
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900 tracking-tight flex items-baseline gap-1">
                                {card.value}
                                <span className="text-sm font-medium text-gray-400">{card.sub}</span>
                            </div>
                            <div className="text-xs text-gray-500 font-medium mt-1">
                                {card.label} 
                            </div>
                        </div>
                    </div>
                ))}
            </div>

	            {/* Monitoring Status Strip */}
	            <div className="mb-8 flex items-center gap-3 text-xs bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
	                <div className="bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-gray-700 whitespace-nowrap">
	                     <Activity size={14} className="text-brand-purple" /> 监测状态
	                </div>
	                <div className="w-px h-6 bg-gray-100 mx-1"></div>
	                <div className="flex items-center gap-6 whitespace-nowrap flex-1 px-2">
	                    <div className="flex flex-col">
	                        <span className="text-[10px] text-gray-400 font-bold uppercase">Crawled</span>
	                        <span className="font-bold text-gray-800">{trackedWorksCount} Works</span>
	                    </div>
	                    <div className="flex flex-col">
	                         <span className="text-[10px] text-gray-400 font-bold uppercase">Analyzing</span>
	                         <span className="font-bold text-brand-purple flex items-center gap-1">
	                             {runningTasksCount} Running
	                             {runningTasksCount > 0 && (
	                                 <span className="relative flex h-2 w-2">
	                                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
	                                     <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
	                                 </span>
	                             )}
	                             <span className="text-[10px] text-gray-400 font-medium ml-1">/ {totalTasksCount}</span>
	                         </span>
	                    </div>
	                    <div className="flex flex-col">
	                         <span className="text-[10px] text-gray-400 font-bold uppercase">Mentions</span>
	                         <span className="font-bold text-gray-800">
	                            +{weeklyMentions} ({metrics?.rangeDays || 7}d)
	                         </span>
	                    </div>
	                </div>
	                <div className="ml-auto flex items-center gap-3 pl-4 border-l border-gray-100">
	                    <span className="text-gray-400 tabular-nums">Update: {lastRefreshText}</span>
	                    <button
	                        onClick={onGoSources}
	                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
	                        title="查看收录报表"
	                    >
	                        <History size={14}/>
	                    </button>
	                </div>
	            </div>

            {/* Main Charts & Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Brand Score */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                            <Zap size={16} className="text-brand-purple fill-purple-100" /> 品牌GEO健康度
                        </h3>
                        <MoreHorizontal size={16} className="text-gray-300 cursor-pointer hover:text-gray-600" />
                    </div>
                    <div className="flex-1 min-h-[240px]">
                        <ScoreWidget score={score} />
                    </div>
                </div>

	                {/* Rank List */}
	                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                            <Target size={16} className="text-orange-500" /> 核心关键词排名
                        </h3>
                        <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-bold border border-orange-100">Top 5</span>
                    </div>
	                    <div className="flex-1 min-h-[240px]">
	                        <RankWidget items={rankPreview} total={keywordStats?.items?.length || 0} onViewAll={onGoRank} />
	                    </div>
	                </div>

                {/* Optimization Suggestion (New) */}
                <div className="bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] rounded-2xl p-6 shadow-xl text-white relative overflow-hidden group flex flex-col justify-between">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/30 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                            </div>
                            <h3 className="font-bold text-sm">GEO 优化建议</h3>
                        </div>
                        <p className="text-indigo-100 text-xs leading-relaxed mb-4">
                            检测到在 <strong className="text-white border-b border-dashed border-white/30">DeepSeek</strong> 引擎中，关于 "私域运营" 的回答中，您的品牌提及率低于竞品 <strong className="text-white">微盟</strong>。
                        </p>
                        <div className="bg-white/10 rounded-xl p-3 mb-4 backdrop-blur-sm border border-white/10">
                            <div className="text-[10px] text-indigo-300 uppercase font-bold mb-1 flex items-center gap-1"><AlertTriangle size={10}/> Action Item</div>
                            <div className="text-xs font-medium text-white">增加 "私域运营案例" 类的高质量技术文章，并在 GitHub/CSDN 增加相关引用。</div>
                        </div>
                    </div>
                    <button className="relative z-10 w-full bg-white text-brand-purple py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-lg">
                        生成优化方案 <ArrowUpRight size={14} />
                    </button>
                </div>
            </div>

            {/* Secondary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
	                {/* Mentions Trend */}
	                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[300px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-sm">品牌提及趋势</h3>
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs p-0.5 bg-gray-50">
                            <button className="bg-white text-gray-800 px-3 py-1 rounded-md shadow-sm font-medium">日</button>
                            <button className="text-gray-500 px-3 py-1 hover:bg-gray-200/50 rounded-md transition-colors">周</button>
                        </div>
	                    </div>
	                    <MentionsWidget
	                        trend={mentionsTrend}
	                        totalMentions={weeklyMentions}
	                        rangeDays={rangeDays}
	                        onSelectDate={onDrilldownDate}
	                    />
	                </div>

	                {/* Share of Voice */}
	                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[300px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-sm">各平台推荐概率 (SOV)</h3>
                        <MoreHorizontal size={16} className="text-gray-300 cursor-pointer hover:text-gray-600" />
	                    </div>
	                    <TrendWidget items={metrics?.modelStats || []} onSelectModel={onDrilldownModel} />
	                </div>

	                {/* Sources List */}
	                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[300px] lg:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-sm">最新高权重引用来源</h3>
                        <span className="text-xs text-brand-purple cursor-pointer hover:underline font-bold">查看全部</span>
                    </div>
	                    <SourcesWidget items={sourcesPreview as any} onViewAll={onGoSources} />
	                </div>

                {/* Logs Preview (Full Width on Large) */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow lg:col-span-2 xl:col-span-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                            <MessageCircle size={16} className="text-gray-500" />
                            最新 AI 对话快照
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-500 rounded border border-red-100">负面: 2</span>
                            <span className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-500 rounded border border-green-100">正面: 45</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <LogsWidget items={snapshots} />
                    </div>
                </div>
            </div>
        </div>
    );
}

const RankView = ({
    project,
    keywordStats,
}: {
    project: MonitoringProject | null;
    keywordStats: MonitoringKeywordStatsResponse | null;
}) => {
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const rows = (keywordStats?.items || []).filter((r) => (q ? r.keyword.includes(q.trim()) : true));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    useEffect(() => setPage(1), [q, pageSize]);
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);
    const startIndex = (page - 1) * pageSize;
    const pageRows = rows.slice(startIndex, startIndex + pageSize);

    const exportCsv = () => {
        if (!keywordStats) return;
        const headers = [
            'keyword',
            'taskCount',
            'DeepSeek_mentions',
            'DeepSeek_avgRank',
            '豆包_mentions',
            '豆包_avgRank',
            '腾讯元宝_mentions',
            '腾讯元宝_avgRank',
        ];
        const lines = [headers.join(',')];
        for (const r of rows) {
            const ds = r.models?.['DeepSeek'];
            const db = r.models?.['豆包'];
            const wx = r.models?.['腾讯元宝'];
            const line = [
                JSON.stringify(r.keyword),
                String(r.taskCount),
                String(ds?.mentions ?? 0),
                String(ds?.avgRank ?? ''),
                String(db?.mentions ?? 0),
                String(db?.avgRank ?? ''),
                String(wx?.mentions ?? 0),
                String(wx?.avgRank ?? ''),
            ].join(',');
            lines.push(line);
        }
        const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `keyword_ranks_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">关键词排名追踪</h2>
                <button
                    onClick={exportCsv}
                    className="flex items-center gap-1.5 bg-brand-purple text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-200 hover:shadow-purple-300 active:scale-95 disabled:opacity-60"
                    disabled={!keywordStats}
                >
                    <Download size={14} /> 导出报表
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            type="text"
                            placeholder="搜索关键词..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50 transition-all"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-medium">
                        <span>{project?.brandName ? `品牌：${project.brandName}` : '请先配置品牌监测'}</span>
                        <span>{keywordStats ? `近 ${keywordStats.rangeDays} 天` : ''}</span>
                        <span>共 {total} 条</span>
                        <select
                            value={String(pageSize)}
                            onChange={(e) => setPageSize(Math.max(5, parseInt(e.target.value, 10) || 20))}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                        >
                            {[10, 20, 50, 100].map((n) => (
                                <option key={n} value={String(n)}>
                                    {n}/页
                                </option>
                            ))}
                        </select>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                上一页
                            </button>
                            <span className="tabular-nums text-gray-500">
                                {page}/{totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 w-16">#</th>
                            <th className="px-6 py-4">监测关键词</th>
                            <th className="px-6 py-4">任务量</th>
                            <th className="px-6 py-4 text-center">DeepSeek 平均排名</th>
                            <th className="px-6 py-4 text-center">豆包 平均排名</th>
                            <th className="px-6 py-4 text-center">腾讯元宝 平均排名</th>
                            <th className="px-6 py-4 text-center">趋势</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                                    暂无数据（请先在“配置品牌”里保存并运行一次监测）
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row, idx) => {
                                const ds = row.models?.['DeepSeek'];
                                const db = row.models?.['豆包'];
                                const wx = row.models?.['腾讯元宝'];
                                const heat = row.taskCount >= 10 ? 'High' : row.taskCount >= 5 ? 'Med' : 'Low';
                                return (
                                    <tr key={row.keyword} className="hover:bg-purple-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{startIndex + idx + 1}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800 group-hover:text-brand-purple transition-colors">
                                            {row.keyword}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                    heat === 'High'
                                                        ? 'bg-red-50 text-red-500'
                                                        : heat === 'Med'
                                                          ? 'bg-yellow-50 text-yellow-600'
                                                          : 'bg-green-50 text-green-600'
                                                }`}
                                            >
                                                {row.taskCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-indigo-600">{ds?.avgRank ?? '-'}</td>
                                        <td className="px-6 py-4 text-center font-bold text-blue-500">{db?.avgRank ?? '-'}</td>
                                        <td className="px-6 py-4 text-center font-bold text-green-600">{wx?.avgRank ?? '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-gray-400 font-bold bg-gray-50 py-0.5 rounded px-1.5 w-16 mx-auto block">-</span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <div>共 {total} 条 · 第 {page}/{totalPages} 页</div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                上一页
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SentimentView = ({
    metrics,
    alerts,
}: {
    metrics: MonitoringMetricsResponse | null;
    alerts: MonitoringAlertsResponse | null;
}) => {
    const counts = metrics?.metrics?.sentimentCounts || { positive: 0, negative: 0, neutral: 0 };
    const total = Math.max(0, (counts.positive || 0) + (counts.neutral || 0) + (counts.negative || 0));
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
    const positivePct = pct(counts.positive || 0);
    const neutralPct = pct(counts.neutral || 0);
    const negativePct = pct(counts.negative || 0);

    const [q, setQ] = useState('');
    const [minMentions, setMinMentions] = useState(0);
    const [modelKey, setModelKey] = useState('ALL');

    const rangeDays = alerts?.rangeDays || metrics?.rangeDays || 7;

    const modelOptions = useMemo(() => {
        const set = new Set<string>();
        for (const a of alerts?.items || []) {
            const mk = String((a as any).modelKey || '').trim();
            if (mk) set.add(mk);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [alerts?.items]);

    const rows = useMemo(() => {
        const qq = q.trim().toLowerCase();
        const items = (alerts?.items || []).slice();
        const filtered = items.filter((a) => {
            const mk = String((a as any).modelKey || '');
            if (modelKey !== 'ALL' && mk !== modelKey) return false;
            const cnt = typeof (a as any).mentionCount === 'number' ? ((a as any).mentionCount as number) : 0;
            if (minMentions > 0 && cnt < minMentions) return false;
            if (!qq) return true;
            const hay = `${a.context || ''} ${mk}`.toLowerCase();
            return hay.includes(qq);
        });
        return filtered;
    }, [alerts?.items, minMentions, modelKey, q]);

    const exportCsv = () => {
        const headers = ['createdAt', 'taskId', 'modelKey', 'mentionCount', 'sentiment', 'context'];
        const lines = [headers.join(',')];
        for (const item of rows) {
            const createdAt = item.createdAt ? new Date(item.createdAt).toISOString() : '';
            const cnt = typeof (item as any).mentionCount === 'number' ? (item as any).mentionCount : '';
            lines.push(
                [
                    JSON.stringify(createdAt),
                    JSON.stringify(item.taskId || ''),
                    JSON.stringify((item as any).modelKey || ''),
                    JSON.stringify(cnt),
                    JSON.stringify((item as any).sentiment || ''),
                    JSON.stringify(item.context || ''),
                ].join(',')
            );
        }
        const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const linkEl = document.createElement('a');
        linkEl.href = href;
        linkEl.download = `alerts_${Date.now()}.csv`;
        document.body.appendChild(linkEl);
        linkEl.click();
        linkEl.remove();
        URL.revokeObjectURL(href);
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">品牌情感倾向分析</h2>
                    <div className="text-xs text-gray-500 mt-1">统计周期：近 {rangeDays} 天</div>
                </div>
                <button
                    onClick={exportCsv}
                    disabled={rows.length === 0}
                    className="bg-white text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-2 border border-gray-200 shadow-sm disabled:opacity-50"
                >
                    <Download size={16} /> 导出
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 rounded-2xl p-6 border border-green-100 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <ThumbsUp size={64} className="text-green-600" />
                    </div>
                    <div className="text-sm font-bold text-green-600 mb-2 relative z-10">正面评价</div>
                    <div className="text-5xl font-extrabold text-green-700 relative z-10">{positivePct}%</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center relative overflow-hidden">
                    <div className="text-sm font-bold text-gray-600 mb-2">中性评价</div>
                    <div className="text-5xl font-extrabold text-gray-700">{neutralPct}%</div>
                </div>
                <div className="bg-red-50 rounded-2xl p-6 border border-red-100 text-center relative overflow-hidden">
                    <div className="text-sm font-bold text-red-600 mb-2">负面评价</div>
                    <div className="text-5xl font-extrabold text-red-700">{negativePct}%</div>
                    <div className="text-xs text-red-500 mt-2 flex items-center justify-center gap-1 font-bold">
                        <AlertTriangle size={10} /> 需关注
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <MessageCircle size={18} className="text-brand-purple" />
                        负面舆情预警 (Alerts)
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="搜索预警内容/平台..."
                                className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                            />
                        </div>
                        <select
                            value={modelKey}
                            onChange={(e) => setModelKey(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                        >
                            <option value="ALL">全部平台</option>
                            {modelOptions.map((mk) => (
                                <option key={mk} value={mk}>
                                    {mk}
                                </option>
                            ))}
                        </select>
                        <select
                            value={String(minMentions)}
                            onChange={(e) => setMinMentions(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50"
                        >
                            <option value="0">命中不限</option>
                            <option value="1">命中 ≥ 1</option>
                            <option value="2">命中 ≥ 2</option>
                            <option value="3">命中 ≥ 3</option>
                            <option value="5">命中 ≥ 5</option>
                        </select>
                        <div className="text-xs text-gray-400 font-medium">共 {rows.length} 条</div>
                    </div>
                </div>
                <div className="space-y-4">
                    {rows.length === 0 ? (
                        <div className="text-sm text-gray-400">暂无负面舆情（或尚未运行监测任务）。</div>
                    ) : (
                        rows.slice(0, 50).map((a, i) => (
                            <div key={i} className="flex gap-4 p-5 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base text-gray-800 font-medium mb-1.5 truncate">"{a.context || '（无摘要）'}"</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded">
                                            {(a as any).modelKey || '-'} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}
                                        </span>
                                        <span className="text-xs text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-bold">
                                            命中 {(a as any).mentionCount ?? 0}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
                                            Task {a.taskId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const SourcesView = ({
    report,
    onAddTracking,
}: {
    report: WorksReportResponse | null;
    onAddTracking: () => void;
}) => {
    const [q, setQ] = useState('');
    const [minMentions, setMinMentions] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const rows = useMemo(() => {
        const items = (report?.items || []).slice();
        const qq = q.trim();
        const filtered = items.filter((row) => {
            if (minMentions > 0 && (row.mentionCount || 0) < minMentions) return false;
            if (!qq) return true;
            const hay = `${row.title || ''} ${row.url || ''}`.toLowerCase();
            return hay.includes(qq.toLowerCase());
        });
        filtered.sort((a, b) => {
            const mc = (b.mentionCount || 0) - (a.mentionCount || 0);
            if (mc !== 0) return mc;
            const at = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
            const bt = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
            return bt - at;
        });
        return filtered;
    }, [minMentions, q, report]);

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    useEffect(() => setPage(1), [q, minMentions, pageSize]);
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);
    const startIndex = (page - 1) * pageSize;
    const pageRows = rows.slice(startIndex, startIndex + pageSize);

    const exportCsv = () => {
        const headers = ['site', 'title', 'url', 'mentionCount', 'lastSeenAt'];
        const lines = [headers.join(',')];
        for (const row of rows) {
            let host = '-';
            try {
                host = new URL(row.url).hostname.replace(/^www\./, '');
            } catch {}
            lines.push(
                [
                    JSON.stringify(host),
                    JSON.stringify(row.title || ''),
                    JSON.stringify(row.url || ''),
                    String(row.mentionCount || 0),
                    JSON.stringify(row.lastSeenAt || ''),
                ].join(',')
            );
        }
        const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `works_report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">收录报表 / 追踪作品</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportCsv}
                        disabled={rows.length === 0}
                        className="bg-white text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-2 border border-gray-200 shadow-sm disabled:opacity-50"
                    >
                        <Download size={16} /> 导出
                    </button>
                    <button
                        onClick={onAddTracking}
                        className="bg-[#7c3aed] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#6d28d9] transition-all flex items-center gap-2 shadow-lg shadow-purple-200 active:scale-95"
                    >
                        <Plus size={16} /> 添加追踪作品
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            type="text"
                            placeholder="搜索标题/链接..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50 transition-all"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-medium">
                        <select
                            value={String(minMentions)}
                            onChange={(e) => setMinMentions(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                        >
                            <option value="0">命中不限</option>
                            <option value="1">命中 ≥ 1</option>
                            <option value="5">命中 ≥ 5</option>
                            <option value="10">命中 ≥ 10</option>
                        </select>
                        <span>共 {total} 条</span>
                        <select
                            value={String(pageSize)}
                            onChange={(e) => setPageSize(Math.max(5, parseInt(e.target.value, 10) || 20))}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                        >
                            {[10, 20, 50, 100].map((n) => (
                                <option key={n} value={String(n)}>
                                    {n}/页
                                </option>
                            ))}
                        </select>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                上一页
                            </button>
                            <span className="tabular-nums text-gray-500">
                                {page}/{totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 w-16">#</th>
                            <th className="px-6 py-4">站点</th>
                            <th className="px-6 py-4">作品标题</th>
                            <th className="px-6 py-4 text-center">命中次数</th>
                            <th className="px-6 py-4 text-center">最近命中</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                                    暂无数据（请先添加追踪作品，并运行监测任务）
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row, i) => {
                                let host = '-';
                                try {
                                    host = new URL(row.url).hostname.replace(/^www\./, '');
                                } catch {}
                                const lastSeen = row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString() : '-';
                                const openUrl = row.sample?.sourceUrl || row.url;
                                return (
                                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{startIndex + i + 1}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2">
                                            <Globe size={14} className="text-gray-400" /> {host}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={row.title}>
                                            {row.title}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-brand-purple font-bold">{row.mentionCount}</td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-500 tabular-nums whitespace-nowrap">{lastSeen}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => window.open(openUrl, '_blank')}
                                                className="text-brand-purple hover:underline text-xs font-bold flex items-center justify-end gap-1"
                                            >
                                                <Link size={12} /> 查看
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const LogsView = ({
    tasks,
    onOpenTask,
    preset,
}: {
    tasks: MonitoringTask[];
    onOpenTask: (taskId: string) => void;
    preset?: { dateFrom?: string; dateTo?: string; modelKey?: string } | null;
}) => {
    const pickFirstResponse = (task: any) => {
        const pd = task?.result?.platformData || {};
        const keys = Object.keys(pd || {});
        if (keys.length === 0) return { engine: '-', ai: '' };
        const mk = keys[0];
        const resp = (pd as any)?.[mk]?.response;
        const ai = typeof resp === 'string' ? resp : '';
        return { engine: mk, ai };
    };

    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'>('ALL');
    const [engineFilter, setEngineFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const appliedPresetRef = useRef<string>('');

    useEffect(() => {
        if (!preset) return;
        const key = JSON.stringify(preset);
        if (appliedPresetRef.current === key) return;
        appliedPresetRef.current = key;
        if (preset.modelKey) setEngineFilter(preset.modelKey);
        if (preset.dateFrom !== undefined) setDateFrom(preset.dateFrom || '');
        if (preset.dateTo !== undefined) setDateTo(preset.dateTo || '');
        if (preset.modelKey || preset.dateFrom || preset.dateTo) setStatusFilter('ALL');
    }, [preset]);

    const rows = useMemo(() => {
        const all = Array.isArray(tasks) ? tasks : [];
        const qq = q.trim().toLowerCase();
        const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
        const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
        const mapped = all.map((t: any) => {
            const { engine, ai } = pickFirstResponse(t);
            const createdAtMs = t.createdAt ? new Date(t.createdAt).getTime() : 0;
            const createdAt = t.createdAt ? new Date(t.createdAt).toLocaleString() : '-';
            const status = String(t.status || '').toUpperCase();
            return {
                id: String(t.id || ''),
                keyword: String(t.keyword || '-'),
                engine,
                ai,
                createdAt,
                createdAtMs,
                status,
                task: t,
            };
        });
        const filtered = mapped.filter((row) => {
            if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
            if (engineFilter !== 'ALL' && row.engine !== engineFilter) return false;
            if (fromMs !== null && row.createdAtMs < fromMs) return false;
            if (toMs !== null && row.createdAtMs > toMs) return false;
            if (!qq) return true;
            const hay = `${row.keyword} ${row.engine} ${row.ai}`.toLowerCase();
            return hay.includes(qq);
        });
        return filtered;
    }, [dateFrom, dateTo, engineFilter, q, statusFilter, tasks]);

    const engineOptions = useMemo(() => {
        const all = Array.isArray(tasks) ? tasks : [];
        const set = new Set<string>();
        for (const t of all as any[]) {
            const { engine } = pickFirstResponse(t);
            if (engine && engine !== '-') set.add(engine);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [tasks]);

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    useEffect(() => setPage(1), [dateFrom, dateTo, engineFilter, pageSize, q, statusFilter]);
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);
    const startIndex = (page - 1) * pageSize;
    const pageRows = rows.slice(startIndex, startIndex + pageSize);

    const exportCsv = () => {
        const headers = ['createdAt', 'status', 'keyword', 'engine', 'snippet'];
        const lines = [headers.join(',')];
        for (const row of rows) {
            const snippet = row.ai ? row.ai.replace(/\s+/g, ' ').slice(0, 500) : '';
            lines.push([JSON.stringify(row.createdAt), JSON.stringify(row.status), JSON.stringify(row.keyword), JSON.stringify(row.engine), JSON.stringify(snippet)].join(','));
        }
        const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `monitoring_logs_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">实时任务日志</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportCsv}
                        disabled={rows.length === 0}
                        className="bg-white text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-2 border border-gray-200 shadow-sm disabled:opacity-50"
                    >
                        <Download size={16} /> 导出
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            type="text"
                            placeholder="搜索关键词/平台/回答..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-purple-50 transition-all"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-medium">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                            title="开始日期"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                            title="结束日期"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter((e.target.value as any) || 'ALL')}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                        >
                            <option value="ALL">全部状态</option>
                            <option value="PENDING">PENDING</option>
                            <option value="RUNNING">RUNNING</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="FAILED">FAILED</option>
                        </select>
                        <select
                            value={engineFilter}
                            onChange={(e) => setEngineFilter(e.target.value || 'ALL')}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                        >
                            <option value="ALL">全部平台</option>
                            {engineOptions.map((mk) => (
                                <option key={mk} value={mk}>
                                    {mk}
                                </option>
                            ))}
                        </select>
                        <span>共 {total} 条</span>
                        <select
                            value={String(pageSize)}
                            onChange={(e) => setPageSize(Math.max(5, parseInt(e.target.value, 10) || 10))}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 outline-none focus:border-brand-purple"
                        >
                            {[5, 10, 20, 50].map((n) => (
                                <option key={n} value={String(n)}>
                                    {n}/页
                                </option>
                            ))}
                        </select>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                上一页
                            </button>
                            <span className="tabular-nums text-gray-500">
                                {page}/{totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                {pageRows.length === 0 ? (
                    <div className="text-sm text-gray-400">暂无任务（请先运行一次品牌监测）。</div>
                ) : (
                    pageRows.map((row, i: number) => {
                        const t = row.task;
                        const snippet = row.ai ? row.ai.slice(0, 220) + (row.ai.length > 220 ? '…' : '') : '（暂无返回或仍在运行）';
                        return (
                            <div key={row.id || i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm bg-indigo-600">
                                            {row.engine}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium">{row.createdAt}</span>
                                    </div>
                                    <span
                                        className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold border ${
                                            row.status === 'COMPLETED'
                                                ? 'bg-green-50 text-green-600 border-green-100'
                                                : row.status === 'FAILED'
                                                  ? 'bg-red-50 text-red-600 border-red-100'
                                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                                        }`}
                                    >
                                        {row.status || '-'}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 shadow-inner">Q</div>
                                        <p className="text-sm font-medium text-gray-900 pt-1.5">{row.keyword || '-'}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand-purple shadow-inner">A</div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
                                                {snippet}
                                            </p>
                                            <div className="mt-2 flex justify-end">
                                                <button
                                                    onClick={() => onOpenTask(t.id)}
                                                    className="text-xs font-bold text-brand-purple hover:underline"
                                                >
                                                    查看任务
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                </div>
            </div>
        </div>
    );
};

const SettingsView = ({
    project,
    onOpenConfig,
}: {
    project: MonitoringProject | null;
    onOpenConfig: () => void;
}) => (
    <div className="animate-fade-in space-y-6 pb-20 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">品牌监测设置</h2>
                <p className="text-sm text-gray-500">当前项目配置（编辑会立即影响后续定时监测）。</p>
            </div>
            <button
                onClick={onOpenConfig}
                className="flex items-center gap-2 bg-brand-purple text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-hover transition-colors shadow-lg shadow-purple-200 active:scale-95"
            >
                <Settings size={14} /> 编辑配置
            </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">品牌</div>
                    <div className="text-sm font-bold text-gray-900">{project?.brandName || '-'}</div>
                    <div className="text-xs text-gray-400 mt-1 break-all">{project?.brandWebsiteUrl || '-'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">监测参数</div>
                    <div className="text-sm text-gray-700">
                        模式：<span className="font-bold">{project?.searchType || '-'}</span> · 频率：
                        <span className="font-bold"> {project?.intervalMinutes || '-'} </span>分钟 · 平台：
                        <span className="font-bold">{Array.isArray(project?.selectedModels) ? project!.selectedModels.length : 0}</span>
                    </div>
                </div>
            </div>

            <div>
                <div className="text-xs font-bold text-gray-500 mb-2">关键词</div>
                <div className="flex flex-wrap gap-2">
                    {(project?.monitorKeywords || []).slice(0, 50).map((k) => (
                        <span key={k} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                            {k}
                        </span>
                    ))}
                    {(project?.monitorKeywords || []).length === 0 && <div className="text-xs text-gray-400">-</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-2">竞品</div>
                    <div className="flex flex-wrap gap-2">
                        {(project?.competitors || []).slice(0, 30).map((k) => (
                            <span key={k} className="bg-purple-50 text-brand-purple px-2.5 py-1 rounded-lg text-xs font-bold">
                                {k}
                            </span>
                        ))}
                        {(project?.competitors || []).length === 0 && <div className="text-xs text-gray-400">-</div>}
                    </div>
                </div>
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-2">排除词</div>
                    <div className="flex flex-wrap gap-2">
                        {(project?.negativeKeywords || []).slice(0, 30).map((k) => (
                            <span key={k} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                {k}
                            </span>
                        ))}
                        {(project?.negativeKeywords || []).length === 0 && <div className="text-xs text-gray-400">-</div>}
                    </div>
                </div>
            </div>

            <div>
                <div className="text-xs font-bold text-gray-500 mb-2">原始配置预览（永久保留在数据库）</div>
                <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(project || {}, null, 2)}
                </pre>
            </div>
        </div>
    </div>
);

export const BrandMonitoringPage = () => {
    const navigate = useNavigate();
    const { restoreTask, refreshTasks } = useTasks();
    const pollLockRef = useRef(false);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'rank' | 'sources' | 'sentiment' | 'logs' | 'settings'>('dashboard');
    const [rangeDays, setRangeDays] = useState(7);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [runNowLoading, setRunNowLoading] = useState(false);
    const [runNotice, setRunNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

    const [projects, setProjects] = useState<any[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    const activeProject = useMemo(() => {
        if (activeProjectId) {
            const found = projects.find((p) => p && p.id === activeProjectId);
            if (found) return found as MonitoringProject;
        }
        return (projects[0] as MonitoringProject) || null;
    }, [activeProjectId, projects]);

    const [metrics, setMetrics] = useState<MonitoringMetricsResponse | null>(null);
    const [keywordStats, setKeywordStats] = useState<MonitoringKeywordStatsResponse | null>(null);
    const [alerts, setAlerts] = useState<MonitoringAlertsResponse | null>(null);
    const [worksReport, setWorksReport] = useState<WorksReportResponse | null>(null);
    const [monitoringTasks, setMonitoringTasks] = useState<MonitoringTask[]>([]);
    const [logsPreset, setLogsPreset] = useState<{ dateFrom?: string; dateTo?: string; modelKey?: string } | null>(null);

    const MENU_ITEMS = [
        { id: 'dashboard', label: '数据大盘', icon: <Home size={18} /> },
        { id: 'rank', label: '竞品分析', icon: <PieChart size={18} /> },
        { id: 'sources', label: '收录报表', icon: <BookOpen size={18} /> },
        { id: 'sentiment', label: '舆情预警', icon: <MessageCircle size={18} /> },
        { id: 'logs', label: '实时日志', icon: <History size={18} /> },
    ] as const;

    const loadProjects = async (keepLoading = false) => {
        if (!keepLoading) setIsLoading(true);
        setLoadError('');
        try {
	            const { res, data } = await apiJson('/api/monitoring/projects');
	            if (!res.ok) {
	                setProjects([]);
	                setActiveProjectId(null);
	                setLoadError(apiErrorToMessage(data, `加载失败（HTTP ${res.status}）`));
	                return;
	            }
            const items = Array.isArray(data) ? data : [];
            setProjects(items);

            const nextId =
                activeProjectId && items.some((p: any) => p && p.id === activeProjectId) ? activeProjectId : items[0]?.id || null;
            setActiveProjectId(nextId);
            if (!nextId) setShowConfigModal(true);
        } catch (e: any) {
            setLoadError(e?.message || '网络错误');
        } finally {
            if (!keepLoading) setIsLoading(false);
        }
    };

    const reloadProjectData = async (projectId: string) => {
        setLoadError('');
        try {
            const [m, k, a, w, t] = await Promise.all([
                apiJson<MonitoringMetricsResponse>(`/api/monitoring/projects/${projectId}/metrics?days=${rangeDays}`),
                apiJson<MonitoringKeywordStatsResponse>(`/api/monitoring/projects/${projectId}/keywords?days=${rangeDays}`),
                apiJson<MonitoringAlertsResponse>(`/api/monitoring/projects/${projectId}/alerts?limit=50&days=${rangeDays}`),
                apiJson<WorksReportResponse>(`/api/monitoring/projects/${projectId}/works/report?days=${rangeDays}`),
                apiJson<MonitoringTask[]>(`/api/monitoring/projects/${projectId}/tasks?limit=200`),
            ]);

            setMetrics(m.res.ok ? (m.data as any) : null);
            setKeywordStats(k.res.ok ? (k.data as any) : null);
            setAlerts(a.res.ok ? (a.data as any) : null);
            setWorksReport(w.res.ok ? (w.data as any) : null);
            setMonitoringTasks(t.res.ok && Array.isArray(t.data) ? (t.data as any) : []);

            const firstFailed = [m, k, a, w, t].find((r: any) => r && r.res && !r.res.ok);
            if (firstFailed) {
                setLoadError(apiErrorToMessage(firstFailed.data, `加载失败（HTTP ${firstFailed.res.status}）`));
            }
            setLastRefreshAt(new Date());
        } catch (e: any) {
            setLoadError(e?.message || '网络错误');
        }
    };

    useEffect(() => {
        loadProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!activeProjectId) return;
        setRunNotice(null);
        reloadProjectData(activeProjectId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProjectId]);

    useEffect(() => {
        if (!activeProjectId) return;
        reloadProjectData(activeProjectId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeDays]);

    const runProjectNow = async () => {
        if (!activeProjectId) return;
        setRunNowLoading(true);
        setRunNotice(null);
        try {
            const { res, data } = await apiJson(`/api/monitoring/projects/${activeProjectId}/run`, { method: 'POST' });
            if (!res.ok) {
                setRunNotice({ type: 'error', message: apiErrorToMessage(data, `运行失败（HTTP ${res.status}）`) });
                return;
            }
            const createdCount = Array.isArray((data as any)?.createdTasks) ? (data as any).createdTasks.length : 0;
            const errors = Array.isArray((data as any)?.errors) ? (data as any).errors : [];
            const failedCount = errors.length;
            let msg = `已创建 ${createdCount} 个任务`;
            if (failedCount > 0) {
                const brief = errors
                    .slice(0, 3)
                    .map((e: any) => `${e?.keyword || '-'}: ${e?.error || 'Failed'}`)
                    .join('；');
                msg += `，失败 ${failedCount} 个`;
                if (brief) msg += `（${brief}${failedCount > 3 ? '…' : ''}）`;
            } else {
                msg += '。任务会在后台执行，稍后可在“实时日志/任务结果”查看输出。';
            }
            setRunNotice({ type: failedCount > 0 ? 'error' : 'success', message: msg });
            await reloadProjectData(activeProjectId);
        } catch (e: any) {
            setRunNotice({ type: 'error', message: e?.message || '网络错误' });
        } finally {
            setRunNowLoading(false);
        }
    };

    const snapshots = useMemo(() => {
        const items = (Array.isArray(monitoringTasks) ? monitoringTasks : []).slice(0, 3);
        const pick = (task: any) => {
            const pd = task?.result?.platformData || {};
            const keys = Object.keys(pd || {});
            const mk = keys[0] || '-';
            const resp = mk && (pd as any)?.[mk]?.response;
            const a = typeof resp === 'string' ? resp.replace(/\s+/g, ' ').slice(0, 80) : '（暂无输出）';
            return {
                platform: mk,
                q: String(task?.keyword || '-'),
                a,
                time: task?.createdAt ? new Date(task.createdAt).toLocaleString() : '-',
            } as LogSnapshot;
        };
        return items.map(pick);
    }, [monitoringTasks]);

    const hasRunningMonitoringTasks = useMemo(() => {
        const list = Array.isArray(monitoringTasks) ? monitoringTasks : [];
        return list.some((t: any) => {
            const s = String(t?.status || '').toUpperCase();
            return s === 'PENDING' || s === 'RUNNING';
        });
    }, [monitoringTasks]);

    useEffect(() => {
        if (!activeProjectId) return;
        if (!hasRunningMonitoringTasks) return;
        const projectId = activeProjectId;
        const interval = setInterval(() => {
            if (pollLockRef.current) return;
            pollLockRef.current = true;
            reloadProjectData(projectId).finally(() => {
                pollLockRef.current = false;
            });
        }, 4000);
        return () => clearInterval(interval);
    }, [activeProjectId, hasRunningMonitoringTasks]);

    const onOpenTask = async (taskId: string) => {
        try {
            if (typeof refreshTasks === 'function') await refreshTasks();
        } catch {
            // ignore
        }
        if (typeof restoreTask === 'function') restoreTask(taskId);
        navigate('/results');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardView
                        project={activeProject}
                        metrics={metrics}
                        keywordStats={keywordStats}
                        worksReport={worksReport}
                        onOpenConfig={() => setShowConfigModal(true)}
                        onRefresh={() => activeProjectId && reloadProjectData(activeProjectId)}
                        snapshots={snapshots}
                        onRunNow={runProjectNow}
                        runNowLoading={runNowLoading}
                        runNotice={runNotice}
                        onGoRank={() => setActiveTab('rank')}
                        onGoSources={() => setActiveTab('sources')}
                        lastRefreshAt={lastRefreshAt}
                        rangeDays={rangeDays}
                        onChangeRangeDays={setRangeDays}
                        onDrilldownDate={(date) => {
                            setLogsPreset({ dateFrom: date, dateTo: date });
                            setActiveTab('logs');
                        }}
                        onDrilldownModel={(modelKey) => {
                            setLogsPreset({ modelKey });
                            setActiveTab('logs');
                        }}
                    />
                );
            case 'rank':
                return <RankView project={activeProject} keywordStats={keywordStats} />;
            case 'sentiment':
                return <SentimentView metrics={metrics} alerts={alerts} />;
            case 'sources':
                return <SourcesView report={worksReport} onAddTracking={() => setShowTrackingModal(true)} />;
            case 'logs':
                return <LogsView tasks={monitoringTasks} onOpenTask={onOpenTask} preset={logsPreset} />;
            case 'settings':
                return <SettingsView project={activeProject} onOpenConfig={() => setShowConfigModal(true)} />;
            default:
                return (
                    <DashboardView
                        project={activeProject}
                        metrics={metrics}
                        keywordStats={keywordStats}
                        worksReport={worksReport}
                        onOpenConfig={() => setShowConfigModal(true)}
                        onRefresh={() => activeProjectId && reloadProjectData(activeProjectId)}
                        snapshots={snapshots}
                        onRunNow={runProjectNow}
                        runNowLoading={runNowLoading}
                        runNotice={runNotice}
                        onGoRank={() => setActiveTab('rank')}
                        onGoSources={() => setActiveTab('sources')}
                        lastRefreshAt={lastRefreshAt}
                        rangeDays={rangeDays}
                        onChangeRangeDays={setRangeDays}
                        onDrilldownDate={(date) => {
                            setLogsPreset({ dateFrom: date, dateTo: date });
                            setActiveTab('logs');
                        }}
                        onDrilldownModel={(modelKey) => {
                            setLogsPreset({ modelKey });
                            setActiveTab('logs');
                        }}
                    />
                );
        }
    };

    const trackingItems = (worksReport?.items || []).slice(0, 6);

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans pt-20">
            <ConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                project={activeProject}
                onSaved={(p) => {
                    loadProjects(true).then(() => {
                        if (p?.id) setActiveProjectId(p.id);
                        if (p?.id) reloadProjectData(p.id);
                    });
                }}
            />
            <AddTrackingModal
                isOpen={showTrackingModal}
                onClose={() => setShowTrackingModal(false)}
                projectId={activeProject?.id || null}
                onSaved={() => {
                    if (activeProjectId) reloadProjectData(activeProjectId);
                }}
            />

            <div className="flex-1 flex max-w-[1600px] mx-auto w-full px-6 gap-6">
                {/* Sidebar Navigation */}
                <div className="w-64 hidden lg:block sticky top-24 h-[calc(100vh-100px)] flex-shrink-0 overflow-y-auto pb-10 scrollbar-hide">
                    <div className="px-4 mb-6">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">监测项目</div>
                        <select
                            value={activeProjectId || ''}
                            onChange={(e) => setActiveProjectId(e.target.value || null)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-brand-purple"
                        >
                            {projects.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.brandName}
                                </option>
                            ))}
                            {projects.length === 0 && <option value="">（暂无项目）</option>}
                        </select>
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="mt-3 w-full px-3 py-2 text-xs font-bold bg-purple-50 text-brand-purple border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors"
                        >
                            + 新建/编辑项目
                        </button>
                        {loadError && (
                            <div className="mt-3 text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 whitespace-pre-wrap">
                                {loadError}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1 mb-8 px-3">
                        {MENU_ITEMS.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 cursor-pointer transition-all ${
                                    activeTab === item.id
                                        ? 'bg-purple-50 text-brand-purple shadow-sm border border-purple-100'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </div>
                        ))}
                    </div>

                    <div className="px-3">
                        <div className="flex items-center justify-between px-4 mb-3">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tracking</div>
                            <Settings
                                size={12}
                                className={`text-gray-300 hover:text-gray-500 cursor-pointer ${activeTab === 'settings' ? 'text-brand-purple' : ''}`}
                                onClick={() => setActiveTab('settings')}
                            />
                        </div>
                        <div className="space-y-1">
                            {trackingItems.map((row) => (
                                <div
                                    key={row.id}
                                    onClick={() => window.open(row.url, '_blank')}
                                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-colors group"
                                >
                                    <div className={`w-2 h-2 rounded-full ${row.mentionCount > 0 ? 'bg-green-500' : 'bg-gray-300 group-hover:bg-gray-400'}`}></div>
                                    <span className="truncate flex-1">{row.title}</span>
                                    <span className="text-[10px] text-gray-400 tabular-nums">{row.mentionCount}</span>
                                    <ChevronRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                            <button
                                onClick={() => setShowTrackingModal(true)}
                                className="w-full mt-3 px-3 py-2.5 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-dashed border-gray-200 hover:border-purple-200"
                            >
                                <Plus size={14} /> 添加监测项
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    {isLoading ? <BrandMonitoringSkeleton /> : renderContent()}
                </div>
            </div>
        </div>
    );
};
