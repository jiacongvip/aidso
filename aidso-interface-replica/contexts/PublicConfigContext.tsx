import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiErrorToMessage, apiJson } from '../services/api';
import { SITE_NAME as FALLBACK_SITE_NAME } from '../branding';

const FALLBACK_ICP = '苏ICP备20250001号-1';
const FALLBACK_SUPPORT_EMAIL = 'admin@qingkuaisou.com';
const FALLBACK_HOME_STATS = {
  aiChats: 718_959,
  brandMentions: 3_519_392,
  referencedArticles: 2_042_929,
};

export type PublicConfig = {
  siteName: string;
  maintenanceMode: boolean;
  signupEnabled: boolean;
  icp: string;
  supportEmail: string;
  homeStats: { aiChats: number; brandMentions: number; referencedArticles: number };
  enabledModels: string[];
  models: { key: string; enabled: boolean; ready: boolean; missing: string[] }[];
};

type PublicConfigContextValue = {
  config: PublicConfig;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const PublicConfigContext = createContext<PublicConfigContextValue | undefined>(undefined);

export function usePublicConfig() {
  const ctx = useContext(PublicConfigContext);
  if (!ctx) throw new Error('usePublicConfig must be used within PublicConfigProvider');
  return ctx;
}

export function PublicConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PublicConfig>({
    siteName: FALLBACK_SITE_NAME,
    maintenanceMode: false,
    signupEnabled: true,
    icp: FALLBACK_ICP,
    supportEmail: FALLBACK_SUPPORT_EMAIL,
    homeStats: FALLBACK_HOME_STATS,
    enabledModels: [],
    models: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const { res, data } = await apiJson<{
        siteName: string | null;
        maintenanceMode?: boolean;
        signupEnabled?: boolean;
        icp?: string | null;
        supportEmail?: string | null;
        homeStats?: { aiChats?: number; brandMentions?: number; referencedArticles?: number };
        enabledModels: string[];
        models?: { key: string; enabled: boolean; ready: boolean; missing?: string[] }[];
      }>('/api/config/public');
      if (!res.ok) throw new Error(apiErrorToMessage(data, `加载失败（HTTP ${res.status}）`));
      const siteNameRaw = (data && (data as any).siteName) as any;
      const maintenanceModeRaw = (data && (data as any).maintenanceMode) as any;
      const signupEnabledRaw = (data && (data as any).signupEnabled) as any;
      const icpRaw = (data && (data as any).icp) as any;
      const supportEmailRaw = (data && (data as any).supportEmail) as any;
      const homeStatsRaw = (data && (data as any).homeStats) as any;
      const enabledModelsRaw = (data && (data as any).enabledModels) as any;
      const modelsRaw = (data && (data as any).models) as any;
      const siteName = typeof siteNameRaw === 'string' && siteNameRaw.trim() ? siteNameRaw.trim() : FALLBACK_SITE_NAME;
      const maintenanceMode = maintenanceModeRaw === true;
      const signupEnabled = signupEnabledRaw !== false;
      const icp = typeof icpRaw === 'string' && icpRaw.trim() ? icpRaw.trim() : FALLBACK_ICP;
      const supportEmail =
        typeof supportEmailRaw === 'string' && supportEmailRaw.trim() ? supportEmailRaw.trim() : FALLBACK_SUPPORT_EMAIL;
      const homeStats = {
        aiChats: typeof homeStatsRaw?.aiChats === 'number' ? homeStatsRaw.aiChats : FALLBACK_HOME_STATS.aiChats,
        brandMentions:
          typeof homeStatsRaw?.brandMentions === 'number' ? homeStatsRaw.brandMentions : FALLBACK_HOME_STATS.brandMentions,
        referencedArticles:
          typeof homeStatsRaw?.referencedArticles === 'number'
            ? homeStatsRaw.referencedArticles
            : FALLBACK_HOME_STATS.referencedArticles,
      };
      const enabledModels = Array.isArray(enabledModelsRaw) ? enabledModelsRaw.filter((x) => typeof x === 'string') : [];
      const models = Array.isArray(modelsRaw)
        ? modelsRaw
            .filter((m: any) => m && typeof m.key === 'string')
            .map((m: any) => ({
              key: m.key,
              enabled: m.enabled !== false,
              ready: m.ready === true,
              missing: Array.isArray(m.missing) ? m.missing.filter((x: any) => typeof x === 'string') : [],
            }))
        : [];
      setConfig({ siteName, maintenanceMode, signupEnabled, icp, supportEmail, homeStats, enabledModels, models });
    } catch (e: any) {
      setError(e?.message || '加载失败');
      setConfig({
        siteName: FALLBACK_SITE_NAME,
        maintenanceMode: false,
        signupEnabled: true,
        icp: FALLBACK_ICP,
        supportEmail: FALLBACK_SUPPORT_EMAIL,
        homeStats: FALLBACK_HOME_STATS,
        enabledModels: [],
        models: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ config, loading, error, refresh }), [config, error, loading]);
  return <PublicConfigContext.Provider value={value}>{children}</PublicConfigContext.Provider>;
}
