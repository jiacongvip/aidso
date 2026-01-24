import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiJson, setAuthToken } from '../services/api';

export type UserPlan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: number;
  email: string;
  name?: string | null;
  role: UserRole;
  plan: UserPlan;
}

type PermissionConfig = { plan: UserPlan; features: string[] };

const AuthContext = React.createContext<{
  user: AuthUser | null;
  token: string | null;
  login: (payload: { token: string; user: AuthUser } | AuthUser) => void;
  logout: () => void;
  checkPermission: (feature: string) => boolean;
}>({ user: null, token: null, login: () => {}, logout: () => {}, checkPermission: () => false });

export const useAuth = () => React.useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionConfig[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }

    // Public permissions config (plan -> feature list)
    fetch('/api/permissions')
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setPermissions(data) : setPermissions([])))
      .catch(() => setPermissions([]));
  }, []);

  // If we have a token but no user (or stale user), refresh /me.
  useEffect(() => {
    if (!token) return;
    if (user) return;
    apiJson<{ user: AuthUser }>('/api/auth/me')
      .then(({ res, data }) => {
        if (!res.ok) return;
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch(() => {});
  }, [token, user]);

  const login = (payload: { token: string; user: AuthUser } | AuthUser) => {
    if ((payload as any)?.token && (payload as any)?.user) {
      const p = payload as { token: string; user: AuthUser };
      setToken(p.token);
      setAuthToken(p.token);
      setUser(p.user);
      localStorage.setItem('user', JSON.stringify(p.user));
      return;
    }

    const u = payload as AuthUser;
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem('user');
  };

  const checkPermission = useMemo(() => {
    return (feature: string) => {
      // Search UI is public; execution is enforced by backend + UI action check.
      if (feature === 'search') return true;

      if (!user) return false;
      if (user.role === 'ADMIN') return true;

      const config = permissions.find((p) => p.plan === user.plan);
      return config ? config.features.includes(feature) : false;
    };
  }, [permissions, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const PermissionGuard = ({ feature, children }: { feature: string; children: React.ReactNode }) => {
  const { checkPermission, user } = useAuth();

  if (!checkPermission(feature)) {
    if (!user && feature !== 'search') {
      return <Navigate to="/login" replace />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">无权访问此功能</h2>
        <p className="text-gray-500 mb-6 max-w-md">您的当前套餐不支持访问此模块。请升级您的订阅计划以解锁更多高级功能。</p>
        <a
          href="/pricing"
          className="bg-brand-purple text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-brand-hover transition-all"
        >
          查看升级方案
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

export const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 pt-20">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-xl font-extrabold text-gray-900">需要管理员权限</div>
          <div className="text-sm text-gray-500 mt-2">当前账号无权访问后台管理，请切换管理员账号登录。</div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="/login"
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              去登录
            </a>
            <a
              href="/"
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              返回首页
            </a>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
