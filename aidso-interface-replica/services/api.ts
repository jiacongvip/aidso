export function getAuthToken() {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (!token) localStorage.removeItem('auth_token');
    else localStorage.setItem('auth_token', token);
  } catch {
    // ignore
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // Always use relative URLs - Vite proxy will handle them in dev mode
  // In production, the frontend and backend should be on the same origin
  return fetch(input, {
    ...init,
    headers,
  });
}

export async function apiJson<T = any>(input: RequestInfo | URL, init: RequestInit = {}) {
  const res = await apiFetch(input, init);
  const data = await res.json().catch(() => null);
  return { res, data: data as T };
}

export function apiErrorToMessage(data: any, fallback: string) {
  const raw = data?.error ?? data?.message ?? data;
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}
