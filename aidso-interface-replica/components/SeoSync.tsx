import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePublicConfig } from '../contexts/PublicConfigContext';
import { useSearch } from '../contexts/SearchContext';

function upsertMeta(attrs: { name?: string; property?: string; content: string }) {
  const selector = attrs.name
    ? `meta[name="${attrs.name}"]`
    : attrs.property
      ? `meta[property="${attrs.property}"]`
      : null;
  if (!selector) return;

  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    if (attrs.name) el.setAttribute('name', attrs.name);
    if (attrs.property) el.setAttribute('property', attrs.property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', attrs.content);
}

function upsertLinkCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function buildMeta(params: { siteName: string; pathname: string; query: string }) {
  const siteName = params.siteName || '轻快搜';
  const path = params.pathname;

  const baseDesc = '新一代 AI 聚合搜索与 GEO 优化分析平台，助力品牌/商品/服务在 AI 时代获得更多曝光。';

  if (path === '/') {
    return {
      title: `${siteName} - GEO 优化与多平台 AI 搜索`,
      description: baseDesc,
      robots: 'index,follow',
    };
  }

  if (path === '/pricing') {
    return {
      title: `价格方案 - ${siteName}`,
      description: `查看 ${siteName} 的价格方案与使用权益。`,
      robots: 'index,follow',
    };
  }

  if (path === '/api-docs') {
    return {
      title: `API 文档 - ${siteName}`,
      description: `${siteName} 开发者 API 文档与接入说明。`,
      robots: 'index,follow',
    };
  }

  if (path === '/results') {
    const q = (params.query || '').trim();
    return {
      title: `${q ? `搜索：${q}` : '搜索结果'} - ${siteName}`,
      description: q ? `查看「${q}」的多模型聚合搜索结果与引用来源。` : `查看多模型聚合搜索结果与引用来源。`,
      robots: 'noindex,nofollow',
    };
  }

  if (path === '/login') {
    return { title: `登录 - ${siteName}`, description: `登录 ${siteName} 以创建任务与管理配置。`, robots: 'noindex,nofollow' };
  }

  if (path === '/maintenance') {
    return { title: `系统维护 - ${siteName}`, description: `${siteName} 系统维护中。`, robots: 'noindex,nofollow' };
  }

  if (path === '/admin') {
    return { title: `后台 - ${siteName}`, description: `${siteName} 后台管理。`, robots: 'noindex,nofollow' };
  }

  if (path === '/me') {
    return { title: `个人中心 - ${siteName}`, description: `${siteName} 个人中心。`, robots: 'noindex,nofollow' };
  }

  if (path.startsWith('/agent')) {
    return { title: `Agent 工作流 - ${siteName}`, description: `${siteName} Agent 工作流。`, robots: 'noindex,nofollow' };
  }

  if (path.startsWith('/monitoring')) {
    return { title: `品牌监测 - ${siteName}`, description: `${siteName} 品牌监测。`, robots: 'noindex,nofollow' };
  }

  if (path.startsWith('/optimization')) {
    return { title: `内容优化 - ${siteName}`, description: `${siteName} 内容优化。`, robots: 'noindex,nofollow' };
  }

  return { title: siteName, description: baseDesc, robots: 'noindex,nofollow' };
}

export function SeoSync() {
  const location = useLocation();
  const { config } = usePublicConfig();
  const { query } = useSearch();

  useEffect(() => {
    const meta = buildMeta({ siteName: config.siteName, pathname: location.pathname, query });

    document.title = meta.title;

    upsertMeta({ name: 'description', content: meta.description });
    upsertMeta({ name: 'robots', content: meta.robots });

    upsertMeta({ property: 'og:title', content: meta.title });
    upsertMeta({ property: 'og:description', content: meta.description });
    upsertMeta({ property: 'og:type', content: 'website' });
    upsertMeta({ property: 'og:locale', content: 'zh_CN' });
    upsertMeta({ property: 'og:url', content: window.location.href });

    upsertMeta({ name: 'twitter:card', content: 'summary' });
    upsertMeta({ name: 'twitter:title', content: meta.title });
    upsertMeta({ name: 'twitter:description', content: meta.description });

    // Best-effort canonical (drop query/hash)
    const canonical = `${window.location.origin}${location.pathname}`;
    upsertLinkCanonical(canonical);
  }, [config.siteName, location.pathname, location.search, query]);

  return null;
}

