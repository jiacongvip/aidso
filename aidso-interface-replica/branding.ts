// Centralized branding. Prefer env override for deployments.
export const SITE_NAME: string = (import.meta as any)?.env?.VITE_SITE_NAME || '轻快搜';

