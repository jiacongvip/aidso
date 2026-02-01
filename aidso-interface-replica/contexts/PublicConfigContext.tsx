import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiErrorToMessage, apiJson } from '../services/api';
import { SITE_NAME as FALLBACK_SITE_NAME } from '../branding';

export type PublicConfig = {
  siteName: string;
  enabledModels: string[];
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
  const [config, setConfig] = useState<PublicConfig>({ siteName: FALLBACK_SITE_NAME, enabledModels: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const { res, data } = await apiJson<{ siteName: string | null; enabledModels: string[] }>('/api/config/public');
      if (!res.ok) throw new Error(apiErrorToMessage(data, `加载失败（HTTP ${res.status}）`));
      const siteNameRaw = (data && (data as any).siteName) as any;
      const enabledModelsRaw = (data && (data as any).enabledModels) as any;
      const siteName = typeof siteNameRaw === 'string' && siteNameRaw.trim() ? siteNameRaw.trim() : FALLBACK_SITE_NAME;
      const enabledModels = Array.isArray(enabledModelsRaw) ? enabledModelsRaw.filter((x) => typeof x === 'string') : [];
      setConfig({ siteName, enabledModels });
    } catch (e: any) {
      setError(e?.message || '加载失败');
      setConfig({ siteName: FALLBACK_SITE_NAME, enabledModels: [] });
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

